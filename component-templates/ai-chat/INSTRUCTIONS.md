# AI Chat Component Template

Drop-in AI chat panel for workspace items. Supports multiple providers, poll-based streaming, conversation history, and lightweight markdown rendering.

## Quick Start

### 1. Copy scripts into the item

Copy these files into `{item}/scripts/`:
- `.component-templates/ai-chat/scripts/ai-chat.py`
- `.component-templates/ai-chat/scripts/read-stream.py`

### 2. Add CSS to the item's `<style>`

Copy the contents of `.component-templates/ai-chat/chat.css` into the item's `<style>` block. You may adjust colors by redefining the CSS custom properties (see Theming below).

### 3. Add HTML structure to the item

Paste this HTML where you want the chat panel:

```html
<div class="note-chat" id="chatPanel" style="position: relative;">
  <!-- Header -->
  <div class="note-chat-header">
    <h3>AI Assistant</h3>
    <div class="note-chat-header-actions">
      <button class="note-chat-header-btn" data-chat-action="new" title="New conversation">+</button>
      <button class="note-chat-header-btn" data-chat-action="history" title="History">&#9776;</button>
      <button class="note-chat-header-btn" data-chat-action="clear" title="Clear">&#128465;</button>
    </div>
  </div>

  <!-- Messages -->
  <div class="note-chat-messages"></div>

  <!-- Input -->
  <div class="note-chat-input-area">
    <textarea class="note-chat-input" rows="1" data-no-persist></textarea>
    <button class="note-chat-send-btn" title="Send">&#9654;</button>
  </div>

  <!-- Conversation history overlay -->
  <div class="note-chat-history">
    <div class="note-chat-history-header">
      <h4>Conversations</h4>
      <button class="note-chat-header-btn" data-chat-action="history-close">&times;</button>
    </div>
    <div class="note-chat-history-list"></div>
  </div>
</div>
```

Elements you can remove if not needed:
- `data-chat-action="history"` button + `.note-chat-history` div — removes conversation history
- `data-chat-action="new"` button — removes new conversation button
- `data-chat-action="clear"` button — removes clear button

Elements you must keep:
- `.note-chat-messages` — message display area
- `.note-chat-input` — text input
- `.note-chat-send-btn` — send button

### 4. Add JS to the item

Copy the contents of `.component-templates/ai-chat/chat.js` into a `<script>` block, then initialize:

```html
<script>
  // ... (paste chat.js contents here) ...

  const chat = new NoteChat('#chatPanel', {
    systemPrompt: 'You are a helpful assistant.',
  });
</script>
```

### 5. Approve scripts

The user must approve `ai-chat.py` and `read-stream.py` in the app's Scripts sidebar panel before the chat will work.

## Configuration

All options passed to `new NoteChat(selector, options)`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `systemPrompt` | string | `''` | System prompt sent with every request |
| `storageKey` | string | `'note-chat-history'` | noteDB key for persisting conversations |
| `placeholder` | string | `'Type a message...'` | Input placeholder text |
| `pollInterval` | number | `500` | Milliseconds between stream polls |
| `scriptName` | string | `'ai-chat.py'` | Backend script filename |
| `streamScript` | string | `'read-stream.py'` | Stream reader script filename |
| `context` | function/object | `null` | Context sent with each message. If a function, called per-message: `() => ({ key: value })` |
| `onResponse` | function | `null` | Callback after AI responds: `(reply) => {}`. Use this to trigger side effects (e.g., reload data). |
| `provider` | string | `null` | Override provider (see Providers below). If null, uses `AI_PROVIDER` env var. |
| `allowedTools` | string | `null` | Claude CLI only. Restrict tools, e.g. `'Bash(sqlite3*)'` |

## Providers

The backend script (`ai-chat.py`) supports three providers. Set via the `AI_PROVIDER` environment variable or the `provider` option.

### claude-cli (default)

Shells out to `claude -p`. No API key needed — uses the user's existing Claude CLI session.

```
AI_PROVIDER=claude-cli
AI_MODEL=sonnet          # optional: sonnet, opus, haiku
```

Supports `allowedTools` option to restrict what tools Claude can use.

### anthropic-api

Calls the Anthropic Messages API directly. Requires `ANTHROPIC_API_KEY`.

```
AI_PROVIDER=anthropic-api
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514   # optional, defaults to claude-sonnet-4-20250514
```

### openai-compat

Calls any OpenAI-compatible `/chat/completions` endpoint. Works with Ollama, vLLM, OpenRouter, LM Studio, etc.

```
AI_PROVIDER=openai-compat
OPENAI_BASE_URL=http://localhost:11434/v1    # required
OPENAI_API_KEY=...                           # optional, depends on endpoint
AI_MODEL=llama3                              # required
```

## Theming

The CSS uses custom properties with dark-theme fallback defaults. To match your item's theme, define these on `:root`:

```css
:root {
  --bg: #1c1c1e;
  --bg-secondary: #2c2c2e;
  --bg-tertiary: #3a3a3c;
  --text: #e5e5e7;
  --text-secondary: #8e8e93;
  --text-tertiary: #636366;
  --accent: #ffd60a;
  --accent-soft: rgba(255, 214, 10, 0.15);
  --border: #38383a;
  --danger: #ff453a;
}
:root[data-theme="light"] {
  --bg: #ffffff;
  --bg-secondary: #f2f2f7;
  --bg-tertiary: #e5e5ea;
  --text: #1c1c1e;
  --text-secondary: #6e6e73;
  --text-tertiary: #aeaeb2;
  --accent: #ff9500;
  --accent-soft: rgba(255, 149, 0, 0.12);
  --border: #d1d1d6;
  --danger: #ff3b30;
}
```

## Customization Examples

### Chat with context from the current item state

```js
const chat = new NoteChat('#chatPanel', {
  systemPrompt: 'You are a recipe assistant.',
  context: () => ({
    currentRecipe: document.getElementById('recipeName').textContent,
    ingredients: getIngredientsList(),
  }),
});
```

### Reload data after AI modifies the database

```js
const chat = new NoteChat('#chatPanel', {
  systemPrompt: 'You are a notes assistant. You can modify the SQLite database.',
  allowedTools: 'Bash(sqlite3*)',
  onResponse: async (reply) => {
    await loadNotesFromDB();  // your function to refresh UI from SQLite
  },
});
```

### Use a different provider per-item

```js
const chat = new NoteChat('#chatPanel', {
  systemPrompt: 'You are a local AI assistant.',
  provider: 'openai-compat',  // uses OPENAI_BASE_URL from env
});
```

## How Streaming Works

1. Frontend calls `noteScripts.run('ai-chat.py', [payload])`
2. `ai-chat.py` writes `__STREAMING__` to `scripts/logs/ai-stream.log`, then appends output line-by-line
3. Frontend polls `noteScripts.run('read-stream.py', [offset])` every 500ms
4. `read-stream.py` returns new content since the byte offset, plus status (`streaming` | `done` | `error`)
5. When `ai-chat.py` finishes, it writes `__DONE__` marker and prints final JSON to stdout
6. Frontend gets the final result from the script's stdout, finalizes the message bubble

## File Structure After Setup

```
my-item/
├── index.html          ← contains chat HTML + inlined CSS/JS
├── scripts/
│   ├── ai-chat.py      ← copied from template
│   ├── read-stream.py  ← copied from template
│   └── logs/
│       └── ai-stream.log  ← auto-created at runtime
└── storage/
    └── kv.json         ← conversations persisted here under storageKey
```
