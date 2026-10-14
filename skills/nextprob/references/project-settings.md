# File-backed project settings

The Project Settings UI discovers resources through a declarative catalog. Each target project file owns its values; the catalog supplies paths, descriptions, editor formats, optional schemas, and managed-section markers. No settings database mirrors those values.

## Editing a project's settings

Inspect the target file before editing. [The bundled catalog](../assets/project-settings/catalog.json) identifies supported paths and their meaning; it is a reference snapshot, not a project settings override. Preserve unrelated fields, comments, ordering, and omitted defaults. Missing files should be created only for a requested configuration change.

For line-rule documents preserve the sequence, comments, blank lines, and negation rules. For JSON use the definition's schema when supplied, but preserve unknown content for source repair. Schema validation does not replace the consuming tool's semantic validation. NextProb's sidebar runtime additionally validates its documented rule subset.

Definitions can identify marked sections that NextProb refreshes automatically. Preserve their delimiters and content and place personal settings outside them. Installed NextProb skill resources are app-managed: make user changes in project files or a separate custom skill instead of this installed package.

Changes by an agent, a text editor, or the UI have the same effect. NextProb reloads supported files; another tool may require its own reload. Displaying a file in Project Settings does not cause NextProb to implement the file's external-tool behavior.

## Extending supported settings

For content maintainers, the authoritative catalog is `settings/catalog.json` in the NextProb content repository (`hs-update-model-list`). Edit that source, not its generated installed-skill snapshot. The version 1 contract is [catalog.schema.json](../assets/project-settings/catalog.schema.json).

Add a definition with a unique ID, label, group, explanation, exact project-relative `match.paths` or bounded `match.directories`, supported `format`, `views`, explicit creation template, and optional managed-section markers or a schema relative to the catalog. Empty file templates are appropriate for text and rules; JSON templates must form a valid initial document. The supported formats are `text`, `markdown`, `json`, and `line-rules`. Views are `source`, `preview`, `structured`, and `rules`, as appropriate to the format. Directory matches expose text children; individual file definitions can specialize their interpretation.

The catalog contains data, never executable JavaScript, shell commands, or copied setting values. Generic editors handle newly registered resources. New grammars, runtime application behaviors, and editor capabilities require engine changes rather than invented catalog options.

From the application repository, run `npm run sync:official-skills -- ../hs-update-model-list/skills` to generate schema assets, the agent reference snapshot, and the app's offline catalog/skill snapshot. Increment `skills/manifest.json`'s NextProb package version when skill content changes. Run `npm run check:official-skills` before packaging. Content updates supply the catalog from the trusted content archive; project-installed skill copies are never the engine's catalog source.
