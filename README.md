# NextProb official content

This repository distributes model lists, presets, workspace instructions, templates, component templates, and official agent skills to NextProb projects. NextProb downloads templates and skills together from the repository archive; each family has its own version manifest and installation policy.

## Official skills

`skills/manifest.json` lists official skill versions, minimum compatible app versions, and supported project-config versions. `skills/nextprob/` is the portable Agent Skills package for NextProb project configuration. Its entry point is `SKILL.md`; detailed documentation, the default config, and its schema are included as relative resources.

NextProb installs the package automatically into a project's `.agents/skills/nextprob/` and `.claude/skills/nextprob/`. Codex discovers the first location, Claude Code discovers the second, and OpenCode recognizes both. No manual skill installation is required. The app preserves user-owned folders and edits; installing guidance does not create or change the user's `nextprob.config.json`.

When changing the skill, increment its manifest version. If instructions require a newer app or config format, update the compatibility fields too. Keep examples within the runtime's supported fields and rule operators.

The config assets are generated from NextProb's implementation. From a sibling `html-notes-app` checkout, run:

```sh
npm run sync:official-skills -- ../hs-update-model-list/skills
npm run check:official-skills
```

This refreshes the generated assets here and the app's bundled offline snapshot. Commit the content changes and the matching app snapshot together in their respective repositories. Publishing the content repository makes compatible remote updates available; the bundled copy lets the app install skills without a network connection.


## Project settings definitions

`settings/catalog.json` is the authoritative, versioned catalog of file-backed project settings shown by NextProb. The target files own their values; definitions supply discovery paths, labels, descriptions, reusable editor formats, creation templates, schemas, and managed-section markers. To add a resource supported by an existing editor, add a definition and any referenced schema here. `settings/catalog.schema.json` documents the contract. New runtime behavior or parser capabilities can still require application changes.

From the NextProb application repository run `npm run sync:official-skills -- ../hs-update-model-list/skills` to refresh generated schemas, app offline definitions, and the agent-reference assets inside the NextProb skill. Do not edit the generated `skills/nextprob/assets/project-settings/` copies. Increment the NextProb skill manifest version when its content changes and run `npm run check:official-skills` before packaging.
