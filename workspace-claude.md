# Workspace

This is an HTML workspace. Each item is a standalone `.html` file in the root of this folder — ranging from simple notes to interactive micro-applications. Beyond the HTML itself, each item can have per-note memory and up to three storage layers — some items may already have data in these stores. See sections below for details.

```
workspace/
├── my-item.html                    ← the item itself
├── other-item.html
├── .note-data/
│   ├── my-item.html/
│   │   ├── memory.md               ← per-item context for AI
│   │   ├── kv.json                 ← key-value store (auto-saved form state in `__autosave` key)
│   │   ├── db.sqlite               ← SQLite database
│   │   └── files/                  ← arbitrary file storage
│   │       └── ...
│   └── other-item.html/
│       └── ...
```

## When you receive a request

1. If asked to create something, create a new .html file using the Write tool in this folder
2. If asked to edit an existing item, read the file first then edit it
3. If asked about existing items, read the relevant files first

## Notes

When asked to create a note, use this structure: an `<article class="note">` with `data-title` and `data-created` (today's date, YYYY-MM-DD) attributes, an `<h1>` matching the title, and semantic HTML for content (h2, h3, p, ul, ol, blockquote, code, pre, table, etc.). Optionally add a `<head>` with `<meta name="tags" content="tag1, tag2">` for tagging. Tags: letters, digits, hyphens, underscores only; must start with a letter or digit; use hyphens for multi-word tags. Write substantive, well-structured, readable content.

## Rules

- Create items as .html files in the ROOT of this folder (not in subfolders)
- Filenames: lowercase, kebab-case (e.g., cooking-pasta.html)
- NO full HTML document wrappers — no doctype, html, or body tags
- An optional `<head>` section is allowed for metadata (e.g., `<meta name="tags">`)

## Per-Item Storage

Each item can store data in up to three storage layers. All data lives under `.note-data/{itemFilename}/` (e.g., `.note-data/cooking-pasta.html/`).

| Storage | Path | Format | How to access |
|---------|------|--------|---------------|
| KV Store | `kv.json` | Plain JSON object | Read the file directly |
| Files | `files/{name}` | Any binary/text file | Read/list files in the directory |
| SQL Database | `db.sqlite` | SQLite 3 | Use `sqlite3 .note-data/{item}/db.sqlite` |

- **KV Store**: a flat JSON object (`{ "key": value }`). Read it with the Read tool.
- **Files**: arbitrary files stored by the item. List with Glob, read with Read.
- **SQL Database**: a standard SQLite database. Query with `sqlite3` in the Bash tool (e.g., `sqlite3 .note-data/my-item.html/db.sqlite "SELECT * FROM tablename"`). To discover tables: `sqlite3 ... ".tables"`.

### Auto-Persisted Form State

Interactive elements — `<input>` (except password/hidden), `<textarea>`, `<select>`, and `[contenteditable]` — are automatically saved to the item's KV store (under the `__autosave` key) and restored on reload. No extra code is needed. To opt an element out, add the `data-no-persist` attribute. Because dynamic content (e.g., text typed into a textarea) exists only at runtime, it won't appear in the HTML file — read the `__autosave` key in `kv.json` to see current form values.

### Per-Item Memory

Each item can have a `memory.md` file at `.note-data/{itemFilename}/memory.md`.

**You should write to `memory.md` when:**
- An item is first created — record its purpose (why it exists), requirements (what it should do), and key design decisions (how it works). Revise these if they change over time.
- You read or modify an item's KV store, SQL database, or files — summarize what's stored and its structure
- You learn important context about the item's purpose or state that wouldn't be obvious from the HTML alone
- The user tells you something about the item's data or usage that future conversations should know

**Keep `memory.md` concise** — it's included in every prompt when the item is active. Focus on what an AI assistant needs to know to work with the item effectively. Update rather than append when information changes.

Not every item uses storage — these paths only exist for items that have created data.
