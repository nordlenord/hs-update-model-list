# Task-based project settings

NextProb 0.3.3+ separates navigation pages from file definitions. Use these defaults when extending the catalog-driven interface. Present tasks and packages; keep supporting files out of navigation. A setting's source file remains authoritative. Custom HTML can provide its own navigation; see [HTML settings interfaces](settings-html.md). Do not create a file or copy the demo just because this skill was read.

## Resource policy

| Resources | Page and editor | Exposure |
| --- | --- | --- |
| `nextprob.config.json` | Appearance → Sidebar, declarative form | Common fields visible; collections and filters collapsed |
| `.syncignore` | Files & sync → Excluded files, ordered rules | Visible; comments, exceptions, and full order under Advanced patterns |
| `.gitignore` | Same page, separate Git exclusions | Initially collapsed; never merge Git and sync semantics |
| `AGENTS.md` | AI assistance → Instructions, shared guidance | Editor/preview; managed blocks collapsed and protected |
| `CLAUDE.md`, `.claude/CLAUDE.md` | Instructions → Claude | One tool section, distinct project-root and tool-folder documents |
| `GEMINI.md`, `.gemini/GEMINI.md` | Instructions → Gemini | Same treatment; retain both locations without inventing precedence |
| `.agents/skills/*`, `.claude/skills/*`, `.gemini/skills/*` with `SKILL.md` | Skills, package cards | Combine identical inventories; keep modified copies distinct |
| `.claude/settings.json`, `.claude/settings.local.json`, corresponding Gemini paths | Tool settings | Collapsed per tool; explicit source editor until a supported schema/form is provided |
| `.editorconfig` | Advanced → Editor conventions | Generic INI editor: common conventions, collapsed per-file sections, unknown properties preserved |
| `nextprob.settings.json` | Advanced → Customize settings panel | Registry form; layout/discovery/page authoring collapsed |
| Other text in `.claude`, `.agents`, `.gemini`, including custom guidance | Advanced → Other configuration files | Lazy hierarchical browser, never a flat descendant list |
| Package instructions/references/examples/schemas | Skill details: Instructions, Documentation, Examples, Package files | Never individual navigation entries; managed packages read-only |
| Credentials, caches, logs, internal state | No general settings editor | Excluded by explicit discovery policies |

A missing file shows a meaningful empty state and an explicit Configure/Add action. Opening a page never materializes defaults. Unknown tool options get a source editor rather than invented switches. Tool-specific configuration is interpreted by that tool; registering a file does not make NextProb implement its behavior.

Managed package status comes from application ownership and inventory checks, not just a directory name. Identical copies across tools share a card with all installation locations. A changed copy remains inspectable/editable and is shown separately. Do not conceal user modifications as app internals.

## Catalog updates

NextProb 0.3.4+ compares catalog publication `revision` independently of format `version: 1`, checks `minAppVersion`, and chooses the newest compatible bundled or cached catalog. Equal revisions prefer the bundled copy. Older/incompatible downloads do not replace it, and unversioned legacy catalogs count as revision zero. A normal app update does not require clearing the cache. Project definitions/pages remain overrides on the selected defaults; their file values are preserved.

Publication metadata belongs to maintained distribution catalogs. Users registering settings in `nextprob.settings.json` need only the version/definitions/pages contract, without revision fields.

## Page contract

`nextprob.settings.json` can contain `pages` alongside `version: 1` and `definitions`. Local pages extend built-ins or replace matching page IDs. Removing the local file restores defaults; invalid updates retain the last valid pages and definitions for the session.

A page has `id`, `title`, `group`, and ordered `sections`; optional `description`, `order`, and `advanced`. Every section has `title`, a `definitions` array of definition IDs, and a `view`:

- `resource`: an inline file editor; the first noncollapsed resource opens automatically.
- `documents`: separate named documents with configured/empty states and explicit Open/Add actions. Multiple exact paths remain distinct.
- `packages`: cards for resources discovered as packages, with instructions, optional documentation/example views, installation metadata, and an explicit package-file browser.
- `browser`: directory roots, initially closed; fetch one level only when expanded.

Sections may use `collapsed`, `description`, and `emptyMessage`. The page is the navigation entry; its files and descendants are not. Unclaimed local definitions remain under Additional settings, so adding a definition without a page remains compatible. Editors keep file-specific drafts when switching documents; saving is explicit for the open file. Other documents on the page remain available through their cards.

For example, group two registered resources:

```json
{
  "id": "team-guidance",
  "title": "Team guidance",
  "group": "AI assistance",
  "sections": [
    {"title": "Shared guidance", "definitions": ["team-instructions"], "view": "documents"},
    {"title": "Additional resources", "definitions": ["team-resources"], "view": "browser", "collapsed": true}
  ]
}
```

Supply the referenced definitions through the normal registration contract. See [catalog.schema.json](../assets/project-settings/catalog.schema.json) for the complete schema and [form layouts](settings-forms.md) for JSON controls.

## Discovery and editing

A directory definition can declare `discovery.mode: "browser"` or `"packages"`. Browser mode lists only its root initially. Package mode examines immediate child directories for `packageFile` (default `SKILL.md`), while internal files stay in the detail browser. `packageViews` provides optional `{title, path}` entries relative to each package, for example Documentation at `references` and Examples at `assets/settings-demo`.

`discovery.exclude` is an array of `{patterns, reason}` policies. Patterns use Git-ignore syntax relative to the matched directory root. Excluded resources are not browsed through that definition. Known exact definitions can give a resource its dedicated page; do not broadly register credentials or internal state. Exclusions must not remove skill documentation/examples from their explicit package details view.

Use `ui.editor: "document"` with Markdown preview for instruction documents, `"rules"` with the rules view for ordered exclusion files, and `"ini"` with a structured view for INI files. `ui.iniFields` supplies `key`, `title`, `scope` (`root` or `section`), optional `options`, and optional `type`. These are reusable adapters; unknown content remains in Source. `ui.saveLabel`, `createLabel`, and `emptyMessage` keep the page language appropriate to its task.

## Complete demo

[The demo folder](../assets/settings-demo/) includes the full page catalog and definitions, portable schemas, a sidebar configuration, exclusion files, project/tool instructions, editor conventions, a custom skill, and an additional document available through the browser. Its `nextprob.settings.json` is generated from the same maintained catalog as the app defaults; all built-in definitions are covered, including those intentionally excluded from navigation.

For a requested demo in a new/scratch project, copy the folder contents including dotfiles. In an existing project, inspect first and merge only requested changes; never replace the user's configuration or instructions with demo content. Copying this example is unnecessary for normal projects: the built-in catalog already applies this design.

## Replaceable HTML presentation

These task pages describe the maintained default HTML renderer. A project can select a custom HTML note in the application host, retain its own navigation and controls, and use the same versioned settings bridge. Catalog pages and form layouts remain metadata rather than a restriction on custom HTML. Maintainers edit `settings/ui/` in the content repository; the installed skill's UI assets are generated reference copies. See [file-backed settings](project-settings.md#html-settings-interfaces).
