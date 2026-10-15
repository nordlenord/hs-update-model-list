# NextProb project configuration

## Editing a project

The configuration is strict JSON named `nextprob.config.json` at the project's root. It is user-owned, portable with the project, and separate from this installed skill. The supported config version is `1`. Comments and trailing commas are not valid JSON.

Read the existing file first and make the smallest change that fulfills the request. Preserve unrelated collections, section entries, paths, and settings. If the file is missing and the user requests customization, copy `../assets/project-config.default.json` to the project root as the starting point. Installing the skill alone does not call for creating a config.

Validate JSON syntax and the structure against `../assets/project-config.schema.json`, if a schema validator is available. Check the documented rule subset and references as well; the schema deliberately does not encode all runtime checks. Do not add a `$schema` property to the config: unknown fields are rejected. NextProb reloads valid changes automatically. Invalid edits produce diagnostics and retain the last valid configuration; on initial load that is the built-in default. Removing the config restores defaults.

## Defaults and replacement behavior

With no config, NextProb displays Favorites and a Notes tree. Favorites selects user-favorited items and retains their manually assigned order. The default tree hides `.claude`, `.vscode`, `.context`, and `_templates`. `hideDotFolders` is `true`, which additionally hides dot-prefixed folders and files from tree sections.

- `version` is required and must be `1`.
- Omitted sidebar settings retain defaults.
- `collections` merges by collection ID with the built-in collections. A supplied definition replaces the whole collection definition with that ID. An empty object does not remove built-in Favorites.
- An explicit `surfaces.sidebar.sections` array replaces the entire default section array; entries are not merged by ID. Preserve the default Favorites and Notes entries when adding a group unless the user wants them removed. `[]` intentionally shows no sections.
- Section fields have no inheritance from a similarly named default section. An explicit section without `hiddenFolders` hides no ordinary folders through that setting. Keep the existing exclusion list when adding a path.
- Only the `sidebar` surface is supported today. Collections are reusable definitions; other surfaces are not configurable yet.

## Collections and sections

A collection has a required `source`, an optional JSONLogic `where` filter, and an optional `sort`.

- `source: "items"` includes navigable folders, folder notes, and files.
- `source: "notes"` selects folder notes with `index.html`, plus `.html`, `.htm`, `.md`, and `.txt` files.
- An omitted `where` selects all items in that source.
- Available sorts are `title`, `name`, `path`, `modifiedAt`, and `favoriteOrder`. `modifiedAt` puts newest first. Text sorts ascend; `favoriteOrder` retains user favorite order. Without a sort, folders precede other items and names sort ascending.

A section has required `id`, `title`, `view`, and exactly one of `source` or `collection`:

| Field | Meaning |
| --- | --- |
| `id` | Stable unique section ID; retain it when changing a title so personal section state remains associated. |
| `title` | Nonempty display name, at most 200 characters. |
| `view` | `"list"` or `"tree"`. |
| `source` | `"items"` or `"notes"` for a direct source section. |
| `collection` | ID of an existing collection, including built-in `favorites`. |
| `sort` | Optional supported sort that overrides collection sorting. |
| `enabled` | Optional boolean, default `true`. Set `false` to hide a section while keeping its configuration (NextProb 0.3.2+). |
| `hideWhenEmpty` | Optional boolean; if true, omit the section when it has no displayed entries. |
| `hiddenFolders` | Optional exact project-relative directory paths, supported only for tree sections. |

Filtering belongs in a collection's `where`, not directly on a section. `hideDotFolders` belongs to `surfaces.sidebar`, not individual sections, and affects tree views only. Sections are displayed in array order. A note may appear in multiple sections.

Collection and section IDs must start with an ASCII letter, followed by letters, digits, `_`, or `-`, up to 64 characters total. `constructor`, `prototype`, and `__proto__` are reserved. Section IDs must be unique. There can be at most 100 custom collections and 100 sections.

## Hiding folders

For “hide tmp,” add `"tmp"` to the intended tree section's `hiddenFolders`. For a missing config, start from the bundled default; then append to the existing list:

```json
{
  "id": "files",
  "title": "Notes",
  "view": "tree",
  "source": "items",
  "hiddenFolders": [".claude", ".vscode", ".context", "_templates", "tmp"]
}
```

This snippet is a section entry, not a whole config. Keep its sibling sections.

Paths are exact project-relative directory paths using `/`. `tmp` matches the root directory `tmp` and its descendants; `work/tmp` matches that nested directory. No globbing, basename matching, absolute paths, trailing slash, backslash, empty segments, `.` segments, or `..` segments are supported. At most 1,000 paths are allowed per section. A listed path that points to a file does not hide it.

Hiding is presentation-only for that tree section. Notes inside the hidden directory remain available to collections, including Favorites and Templates. `hideDotFolders: false` exposes discoverable dot folders and files to tree sections; explicit `hiddenFolders` still applies. Internal technical exclusions remain outside display configuration, including `.git`, `node_modules`, `storage`, and `.notes-app`. Configuration cannot expose those excluded items. Folder notes are cataloged as one item; their internal files are not separately listed.

## Filtering rules

Rules use a restricted JSONLogic expression language. Each expression object has exactly one supported operator. No executable JavaScript, regex, arbitrary filesystem reads, or custom operators are allowed.

Supported operators: `===`, `!==`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `and`, `or`, `!`, `!!`, `in`, and `var`. Prefer strict comparisons (`===`, `!==`). `in` tests membership in an array or a substring in a string. Rules select an item when their result is truthy using JSONLogic semantics.

`var` may reference only these metadata fields:

| Field | Meaning |
| --- | --- |
| `relativePath` | Project-relative item path using `/`. A folder note uses its directory path, not its `index.html` path. |
| `kind` | `"folder"`, `"note"` for folder notes, or `"file"` for standalone files. |
| `title` | Extracted HTML title or a fallback name. |
| `name` | File or directory basename, including extension for files. |
| `extension` | Lowercase file extension without `.`, or `""` for directories and folder notes. |
| `ancestorPaths` | Exact project-relative ancestor directory paths, from outermost to innermost; does not include the item itself. |
| `modifiedAt` | Filesystem modification time in milliseconds since the Unix epoch. Folder notes use the directory's timestamp. |
| `favorite` | Whether the user favorited the item. |
| `favoriteOrder` | Zero-based user favorite order, or `null` when not favorited. |
| `capabilities` | Object containing `open` and `createFromTemplate`. |
| `capabilities.open` | Whether the item can be opened; false for ordinary folders. |
| `capabilities.createFromTemplate` | True for folder notes and standalone HTML/HTM files. This metadata alone does not extend template-picker discovery. |

For favorites:

```json
{ "===": [{ "var": "favorite" }, true] }
```

For notes under `_templates`, including nested descendants:

```json
{ "in": ["_templates", { "var": "ancestorPaths" }] }
```

For favorited Markdown files:

```json
{
  "and": [
    { "===": [{ "var": "favorite" }, true] },
    { "===": [{ "var": "extension" }, "md"] }
  ]
}
```

For notes under either `_templates` or `examples/templates`:

```json
{
  "or": [
    { "in": ["_templates", { "var": "ancestorPaths" }] },
    { "in": ["examples/templates", { "var": "ancestorPaths" }] }
  ]
}
```

Rules are bounded to 20 levels of depth, 256 nodes, and 50 entries per array. Comparisons and `in` take two arguments; `<` and `<=` can also take three for a chained comparison. `and` and `or` take 1–50 arguments; `!` and `!!` take one; `var` takes a field name and an optional default. No tags, body text, full-text search, computed current time, or additional variables are supported.

## Adding a Templates group

This complete example preserves the default groups and exclusions while adding Templates:

```json
{
  "version": 1,
  "collections": {
    "favorites": {
      "source": "items",
      "where": { "===": [{ "var": "favorite" }, true] },
      "sort": "favoriteOrder"
    },
    "templates": {
      "source": "notes",
      "where": { "in": ["_templates", { "var": "ancestorPaths" }] },
      "sort": "title"
    }
  },
  "surfaces": {
    "sidebar": {
      "hideDotFolders": true,
      "sections": [
        {
          "id": "favorites",
          "title": "Favorites",
          "view": "list",
          "collection": "favorites",
          "hideWhenEmpty": true
        },
        {
          "id": "templates",
          "title": "Templates",
          "view": "list",
          "collection": "templates",
          "hideWhenEmpty": true
        },
        {
          "id": "files",
          "title": "Notes",
          "view": "tree",
          "source": "items",
          "hiddenFolders": [".claude", ".vscode", ".context", "_templates"]
        }
      ]
    }
  }
}
```

Adapt an existing config instead of replacing it wholesale with this example. Grouping notes as Templates changes sidebar display only. The existing create-from-template picker still discovers immediate template directories under `_templates`; a collection pointed at another directory does not change that behavior.

## User interaction state

Favorites membership and manual ordering come from NextProb's existing favorite storage. A filter reads that state; editing the config does not favorite or unfavorite a note. Collapse state, selection, and personal sorting preferences are separate from project declarations. Do not rewrite that storage to accomplish a display-configuration request.
