# Notes Workspace

This is a notes workspace. Each note is an HTML file in the root of this folder.

## When you receive a request

1. If asked to create a note, create a new .html file using the Write tool in this folder
2. If asked to edit a note, read the existing file first then edit it
3. If asked about existing notes, read the relevant files first

## Note Format

Each note is a standalone HTML fragment (NOT a full HTML document). Use this structure:

```html
<head><meta name="tags" content="tag1, tag2"></head>
<article class="note" data-title="Note Title" data-created="YYYY-MM-DD">
  <h1>Note Title</h1>
  <!-- content here -->
</article>
```

The `<head>` section is optional — omit it when the note has no tags.

## Rules

- Create notes as .html files in the ROOT of this folder (not in subfolders)
- Use semantic HTML: h1, h2, h3, p, ul, ol, li, blockquote, code, pre, table, strong, em, a, img
- Filenames: lowercase, kebab-case (e.g., cooking-pasta.html)
- NO full HTML document wrappers — no doctype, html, or body tags
- An optional `<head>` section is allowed for metadata (e.g., `<meta name="tags">`)
- The h1 must match the data-title attribute
- Set data-created to today's date in YYYY-MM-DD format
- Write substantive, well-structured, readable content
- Tags: comma-separated in `<meta name="tags" content="...">`. Tag names: letters, digits, hyphens, underscores only; must start with a letter or digit; no spaces (use hyphens for multi-word tags, e.g., `project-alpha`)

## Per-Note Storage

Each note can store data in up to three storage layers. All data lives under `.note-data/{noteFilename}/` (e.g., `.note-data/cooking-pasta.html/`).

| Storage | Path | Format | How to access |
|---------|------|--------|---------------|
| KV Store | `kv.json` | Plain JSON object | Read the file directly |
| Files | `files/{name}` | Any binary/text file | Read/list files in the directory |
| SQL Database | `db.sqlite` | SQLite 3 | Use `sqlite3 .note-data/{note}/db.sqlite` |

- **KV Store**: a flat JSON object (`{ "key": value }`). Read it with the Read tool.
- **Files**: arbitrary files stored by the note. List with Glob, read with Read.
- **SQL Database**: a standard SQLite database. Query with `sqlite3` in the Bash tool (e.g., `sqlite3 .note-data/my-note.html/db.sqlite "SELECT * FROM tablename"`). To discover tables: `sqlite3 ... ".tables"`.

Not every note uses storage — these paths only exist for notes that have created data.
