/**
 * NoteChat — Drop-in AI chat component for workspace items.
 *
 * Wires up chat UI by class names. Expects the HTML structure from the template
 * to already exist in the container. Handles sending messages, poll-based
 * streaming via read-stream.py, conversation persistence via noteDB,
 * and lightweight markdown rendering.
 *
 * Usage:
 *   const chat = new NoteChat('#my-chat', {
 *     systemPrompt: 'You are a helpful assistant.',
 *     storageKey: 'chat-history',
 *     placeholder: 'Ask something...',
 *   });
 */
class NoteChat {
  constructor(containerSelector, options = {}) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;

    if (!this.container) throw new Error(`NoteChat: container "${containerSelector}" not found`);

    this.options = {
      systemPrompt: '',
      storageKey: 'note-chat-history',
      placeholder: 'Type a message...',
      pollInterval: 500,
      scriptName: 'ai-chat.py',
      streamScript: 'read-stream.py',
      context: null,          // function returning context object, or null
      onResponse: null,       // callback after AI responds: (reply) => {}
      provider: null,         // override AI_PROVIDER env var
      allowedTools: null,     // claude-cli only: e.g. "Bash(sqlite3*)"
      ...options,
    };

    // State
    this.conversations = [];   // [{ id, title, messages, createdAt }]
    this.activeConvId = null;
    this.isStreaming = false;
    this.streamOffset = 0;
    this.pollTimer = null;

    // Bind DOM elements
    this._bindElements();
    this._bindEvents();
    this._loadConversations().then(() => {
      if (this.conversations.length === 0) {
        this._newConversation();
      } else {
        this._switchConversation(this.conversations[0].id);
      }
    });
  }

  // ---- DOM Binding ----

  _bindElements() {
    const q = (sel) => this.container.querySelector(sel);
    this.elMessages     = q('.note-chat-messages');
    this.elInput        = q('.note-chat-input');
    this.elSendBtn      = q('.note-chat-send-btn');
    this.elHistoryPanel = q('.note-chat-history');
    this.elHistoryList  = q('.note-chat-history-list');
    this.elNewBtn       = q('[data-chat-action="new"]');
    this.elHistoryBtn   = q('[data-chat-action="history"]');
    this.elHistoryClose = q('[data-chat-action="history-close"]');
    this.elClearBtn     = q('[data-chat-action="clear"]');

    if (this.elInput) {
      this.elInput.placeholder = this.options.placeholder;
    }
  }

  _bindEvents() {
    // Send on button click
    if (this.elSendBtn) {
      this.elSendBtn.addEventListener('click', () => this.send());
    }

    // Input: auto-resize + Enter to send
    if (this.elInput) {
      this.elInput.addEventListener('input', () => {
        this.elInput.style.height = 'auto';
        this.elInput.style.height = Math.min(this.elInput.scrollHeight, 120) + 'px';
      });
      this.elInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
    }

    // New conversation
    if (this.elNewBtn) {
      this.elNewBtn.addEventListener('click', () => {
        this._newConversation();
        if (this.elHistoryPanel) this.elHistoryPanel.classList.remove('open');
      });
    }

    // Toggle history panel
    if (this.elHistoryBtn) {
      this.elHistoryBtn.addEventListener('click', () => {
        if (this.elHistoryPanel) {
          this.elHistoryPanel.classList.toggle('open');
          if (this.elHistoryPanel.classList.contains('open')) this._renderHistoryList();
        }
      });
    }

    // Close history panel
    if (this.elHistoryClose) {
      this.elHistoryClose.addEventListener('click', () => {
        if (this.elHistoryPanel) this.elHistoryPanel.classList.remove('open');
      });
    }

    // Clear current conversation
    if (this.elClearBtn) {
      this.elClearBtn.addEventListener('click', () => {
        const conv = this._activeConversation();
        if (conv) {
          conv.messages = [];
          conv.title = null;
          this._renderMessages();
          this._saveConversations();
        }
      });
    }
  }

  // ---- Public API ----

  async send(text) {
    const message = text || (this.elInput ? this.elInput.value.trim() : '');
    if (!message || this.isStreaming) return;

    if (this.elInput) {
      this.elInput.value = '';
      this.elInput.style.height = 'auto';
    }

    const conv = this._activeConversation();
    if (!conv) return;

    // Set title from first message
    if (!conv.title) {
      conv.title = message.length > 50 ? message.slice(0, 50) + '...' : message;
    }

    // Add user message
    conv.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    this._addBubble(message, 'user');
    this._saveConversations();

    // Build payload
    const payload = {
      message,
      history: conv.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      systemPrompt: this.options.systemPrompt,
    };

    if (this.options.context) {
      payload.context = typeof this.options.context === 'function'
        ? this.options.context()
        : this.options.context;
    }
    if (this.options.provider) payload.provider = this.options.provider;
    if (this.options.allowedTools) payload.allowedTools = this.options.allowedTools;

    // Show streaming bubble
    const streamBubble = this._addBubble('...', 'assistant', true);
    this.isStreaming = true;
    this.streamOffset = 0;
    if (this.elSendBtn) this.elSendBtn.disabled = true;

    try {
      const scriptPromise = noteScripts.run(this.options.scriptName, [JSON.stringify(payload)]);
      this._startPolling(streamBubble);
      const result = await scriptPromise;
      this._stopPolling();

      if (result.error === 'not_approved') {
        this._finalizeBubble(streamBubble, 'Script not approved. Open the Scripts panel and approve it.', true);
        return;
      }

      if (result.exitCode !== 0) {
        this._finalizeBubble(streamBubble, `Error: ${result.stderr || 'Script failed'}`, true);
        return;
      }

      let reply;
      try {
        const data = JSON.parse(result.stdout);
        if (data.error) {
          this._finalizeBubble(streamBubble, `Error: ${data.error}`, true);
          return;
        }
        reply = data.reply;
      } catch {
        reply = result.stdout || 'No response';
      }

      streamBubble.innerHTML = this._renderMarkdown(reply);
      streamBubble.classList.remove('note-chat-msg-streaming');

      conv.messages.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
      this._saveConversations();
      this._scrollToBottom();

      if (this.options.onResponse) this.options.onResponse(reply);

    } catch (e) {
      this._stopPolling();
      this._finalizeBubble(streamBubble, `Error: ${e.message || 'Failed'}`, true);
    } finally {
      this.isStreaming = false;
      if (this.elSendBtn) this.elSendBtn.disabled = false;
    }
  }

  // ---- Streaming ----

  _startPolling(bubble) {
    this.pollTimer = setInterval(async () => {
      try {
        const r = await noteScripts.run(this.options.streamScript, [String(this.streamOffset)]);
        if (r.exitCode !== 0 || r.error === 'not_approved') return;
        const data = JSON.parse(r.stdout);
        if (data.content && data.content.trim()) {
          if (this.streamOffset === 0) {
            bubble.innerHTML = this._renderMarkdown(data.content);
          } else {
            // Re-render full accumulated text for correct markdown
            const prev = bubble.getAttribute('data-raw') || '';
            const full = prev + data.content;
            bubble.setAttribute('data-raw', full);
            bubble.innerHTML = this._renderMarkdown(full);
          }
          if (this.streamOffset === 0) {
            bubble.setAttribute('data-raw', data.content);
          }
          this.streamOffset = data.offset;
        }
        if (data.status === 'done' || data.status === 'error') {
          this._stopPolling();
        }
      } catch {}
    }, this.options.pollInterval);
  }

  _stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ---- Conversation Management ----

  _activeConversation() {
    return this.conversations.find(c => c.id === this.activeConvId) || null;
  }

  _newConversation() {
    const conv = {
      id: this._uuid(),
      title: null,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    this.conversations.unshift(conv);
    this.activeConvId = conv.id;
    this._renderMessages();
    this._saveConversations();
    return conv;
  }

  _switchConversation(id) {
    this.activeConvId = id;
    this._renderMessages();
  }

  _deleteConversation(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.activeConvId === id) {
      if (this.conversations.length > 0) {
        this._switchConversation(this.conversations[0].id);
      } else {
        this._newConversation();
      }
    }
    this._saveConversations();
    this._renderHistoryList();
  }

  async _loadConversations() {
    try {
      const data = await noteDB.get(this.options.storageKey);
      if (data && Array.isArray(data)) {
        this.conversations = data;
        if (data.length > 0) this.activeConvId = data[0].id;
      }
    } catch {}
  }

  async _saveConversations() {
    try {
      await noteDB.set(this.options.storageKey, this.conversations);
    } catch {}
  }

  // ---- Rendering ----

  _renderMessages() {
    if (!this.elMessages) return;
    this.elMessages.innerHTML = '';
    const conv = this._activeConversation();
    if (!conv || conv.messages.length === 0) return;
    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        this._addBubble(msg.content, 'user');
      } else if (msg.role === 'assistant') {
        this._addBubble(msg.content, 'assistant');
      }
    }
  }

  _addBubble(text, role, streaming = false) {
    if (!this.elMessages) return null;
    const el = document.createElement('div');
    el.className = `note-chat-msg note-chat-msg-${role}`;
    if (streaming) el.classList.add('note-chat-msg-streaming');

    if (role === 'assistant' && !streaming) {
      el.innerHTML = this._renderMarkdown(text);
    } else {
      el.textContent = text;
    }

    this.elMessages.appendChild(el);
    this._scrollToBottom();
    return el;
  }

  _finalizeBubble(bubble, text, isError = false) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('note-chat-msg-streaming');
    if (isError) {
      bubble.classList.remove('note-chat-msg-assistant');
      bubble.classList.add('note-chat-msg-error');
    }
  }

  _scrollToBottom() {
    if (this.elMessages) {
      this.elMessages.scrollTop = this.elMessages.scrollHeight;
    }
  }

  _renderHistoryList() {
    if (!this.elHistoryList) return;
    if (this.conversations.length === 0) {
      this.elHistoryList.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);text-align:center;">No conversations</div>';
      return;
    }
    this.elHistoryList.innerHTML = this.conversations.map(c => {
      const title = this._escHtml(c.title || 'New conversation');
      const date = this._formatDate(c.createdAt);
      return `<div class="note-chat-history-item" data-conv-id="${c.id}">
        <button class="note-chat-history-item-delete" data-delete-id="${c.id}" title="Delete">&times;</button>
        <div class="note-chat-history-item-title">${title}</div>
        <div class="note-chat-history-item-date">${date}</div>
      </div>`;
    }).join('');

    // Bind click events
    this.elHistoryList.querySelectorAll('.note-chat-history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('note-chat-history-item-delete')) return;
        const id = el.getAttribute('data-conv-id');
        this._switchConversation(id);
        if (this.elHistoryPanel) this.elHistoryPanel.classList.remove('open');
      });
    });
    this.elHistoryList.querySelectorAll('.note-chat-history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        this._deleteConversation(id);
      });
    });
  }

  // ---- Lightweight Markdown ----

  _renderMarkdown(text) {
    if (!text) return '';
    let html = this._escHtml(text);

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs: convert double newlines
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs and paragraphs wrapping block elements
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<(?:h[1-3]|pre|ul|ol|blockquote))/g, '$1');
    html = html.replace(/(<\/(?:h[1-3]|pre|ul|ol|blockquote)>)<\/p>/g, '$1');

    return html;
  }

  // ---- Utils ----

  _escHtml(s) {
    if (!s) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return s.replace(/[&<>"]/g, c => map[c]);
  }

  _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
