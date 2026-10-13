---
name: nextprob
description: Create or edit NextProb project display configuration when the user asks to hide folders, customize sidebar groups, or define note collections and filters in nextprob.config.json.
---

# NextProb

Use the project's `nextprob.config.json` to customize NextProb's display. This official skill currently covers project configuration, with the sidebar as its supported surface.

Read [project configuration](references/project-config.md) before making a configuration change. It documents supported fields, filtering rules, defaults, and examples.

Inspect and preserve an existing config. When the user requests customization and the config is missing, copy [the default configuration](assets/project-config.default.json) to the project root and make the requested changes. Do not create a config merely because this skill is installed or read.

Use [the version 1 schema](assets/project-config.schema.json) for structural validation. Runtime validation also restricts rule operators, metadata variables, section IDs, and collection references. Use the documented subset rather than adding arbitrary JavaScript or unsupported fields.

NextProb manages this installed skill folder. Change the project config for user requests; keep personal instructions and custom skills separate from this package.
