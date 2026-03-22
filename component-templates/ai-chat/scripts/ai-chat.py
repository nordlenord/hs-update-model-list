#!/usr/bin/env python3
"""
AI Chat backend — multi-provider support.
Streams output to ai-stream.log for frontend polling.

Providers (set via AI_PROVIDER env var):
  claude-cli     — shells out to `claude -p` (default)
  anthropic-api  — calls api.anthropic.com directly (needs ANTHROPIC_API_KEY)
  openai-compat  — calls any OpenAI-compatible endpoint (needs OPENAI_BASE_URL, OPENAI_API_KEY)

Usage:
  noteScripts.run('ai-chat.py', [JSON.stringify({ message, history, systemPrompt, context })])
"""

import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

WORKSPACE = os.environ.get("WORKSPACE_PATH", ".")
NOTE_ID = os.environ.get("NOTE_ID", "")
ITEM_PATH = os.path.join(WORKSPACE, NOTE_ID)
STREAM_LOG = os.path.join(ITEM_PATH, "scripts", "logs", "ai-stream.log")

# Provider config from env
AI_PROVIDER = os.environ.get("AI_PROVIDER", "claude-cli")
AI_MODEL = os.environ.get("AI_MODEL", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def write_stream(text, mode="a"):
    os.makedirs(os.path.dirname(STREAM_LOG), exist_ok=True)
    with open(STREAM_LOG, mode) as f:
        f.write(text)


def build_messages(payload):
    """Build a messages array from the payload."""
    messages = []
    system_prompt = payload.get("systemPrompt", "")
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for msg in payload.get("history", []):
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    user_message = payload.get("message", "")
    context = payload.get("context")
    if context:
        user_message = f"[Context: {json.dumps(context)}]\n\n{user_message}"
    messages.append({"role": "user", "content": user_message})
    return messages, system_prompt


def build_claude_prompt(messages, system_prompt):
    """Build a flat prompt string for claude -p from messages."""
    parts = []
    if system_prompt:
        parts.append(system_prompt)
    for msg in messages:
        if msg["role"] == "system":
            continue
        if msg["role"] == "user":
            parts.append(f"\n\nHuman: {msg['content']}")
        elif msg["role"] == "assistant":
            parts.append(f"\n\nAssistant: {msg['content']}")
    return "\n".join(parts) if len(parts) <= 2 else "\n".join(parts)


def run_claude_cli(messages, system_prompt, allowed_tools=None):
    """Run via claude CLI."""
    # For claude -p, we pass the latest user message as stdin
    # and use --system-prompt for system prompt, --resume for history
    prompt = build_claude_prompt(messages, system_prompt)

    cmd = ["claude", "-p"]
    if AI_MODEL:
        cmd += ["--model", AI_MODEL]
    if allowed_tools:
        cmd += ["--allowedTools", allowed_tools]

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    proc.stdin.write(prompt)
    proc.stdin.close()

    full_output = []
    for line in proc.stdout:
        full_output.append(line)
        write_stream(line)

    proc.wait()

    if proc.returncode != 0:
        stderr = proc.stderr.read() if proc.stderr else ""
        raise RuntimeError(f"Claude CLI failed (exit {proc.returncode}): {stderr}")

    return "".join(full_output).strip()


def run_anthropic_api(messages, system_prompt):
    """Call Anthropic Messages API directly."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    model = AI_MODEL or "claude-sonnet-4-20250514"

    # Anthropic API uses separate system param, not in messages
    api_messages = [m for m in messages if m["role"] != "system"]

    body = {
        "model": model,
        "max_tokens": 4096,
        "messages": api_messages,
        "stream": True,
    }
    if system_prompt:
        body["system"] = system_prompt

    data = json.dumps(body).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )

    full_output = []
    with urllib.request.urlopen(req) as resp:
        buffer = ""
        for chunk in iter(lambda: resp.read(1024).decode("utf-8", errors="replace"), ""):
            buffer += chunk
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line or not line.startswith("data: "):
                    continue
                payload_str = line[6:]
                if payload_str == "[DONE]":
                    break
                try:
                    event = json.loads(payload_str)
                    if event.get("type") == "content_block_delta":
                        text = event.get("delta", {}).get("text", "")
                        if text:
                            full_output.append(text)
                            write_stream(text)
                except json.JSONDecodeError:
                    pass

    return "".join(full_output).strip()


def run_openai_compat(messages, system_prompt):
    """Call any OpenAI-compatible /chat/completions endpoint."""
    base_url = OPENAI_BASE_URL
    if not base_url:
        raise RuntimeError("OPENAI_BASE_URL not set")

    model = AI_MODEL or "gpt-4"
    url = f"{base_url.rstrip('/')}/chat/completions"

    body = {
        "model": model,
        "messages": messages,
        "stream": True,
    }

    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if OPENAI_API_KEY:
        headers["Authorization"] = f"Bearer {OPENAI_API_KEY}"

    req = urllib.request.Request(url, data=data, headers=headers)

    full_output = []
    with urllib.request.urlopen(req) as resp:
        buffer = ""
        for chunk in iter(lambda: resp.read(1024).decode("utf-8", errors="replace"), ""):
            buffer += chunk
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line or not line.startswith("data: "):
                    continue
                payload_str = line[6:]
                if payload_str == "[DONE]":
                    break
                try:
                    event = json.loads(payload_str)
                    delta = event.get("choices", [{}])[0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        full_output.append(text)
                        write_stream(text)
                except (json.JSONDecodeError, IndexError):
                    pass

    return "".join(full_output).strip()


PROVIDERS = {
    "claude-cli": run_claude_cli,
    "anthropic-api": run_anthropic_api,
    "openai-compat": run_openai_compat,
}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        payload = {"message": sys.argv[1]}

    messages, system_prompt = build_messages(payload)

    # Clear stream log and write start marker
    write_stream("__STREAMING__\n", mode="w")

    provider = payload.get("provider", AI_PROVIDER)
    run_fn = PROVIDERS.get(provider)
    if not run_fn:
        error = f"Unknown provider: {provider}. Available: {', '.join(PROVIDERS.keys())}"
        write_stream(f"__ERROR__\n{error}\n", mode="w")
        print(json.dumps({"error": error}))
        sys.exit(1)

    try:
        # claude-cli accepts allowed_tools; others don't
        if provider == "claude-cli":
            allowed_tools = payload.get("allowedTools")
            reply = run_fn(messages, system_prompt, allowed_tools=allowed_tools)
        else:
            reply = run_fn(messages, system_prompt)

        write_stream("\n__DONE__\n")
        print(json.dumps({"reply": reply}))

    except FileNotFoundError:
        msg = "claude CLI not found. Make sure it's installed and in PATH."
        write_stream(f"__ERROR__\n{msg}\n", mode="w")
        print(json.dumps({"error": msg}))
        sys.exit(1)
    except Exception as e:
        write_stream(f"__ERROR__\n{str(e)}\n", mode="w")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
