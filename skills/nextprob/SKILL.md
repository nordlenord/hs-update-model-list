---
name: nextprob
description: Edit file-backed NextProb project settings, including sidebar configuration, ignore rules, and agent instructions; extend the declarative settings catalog when maintaining NextProb content.
---

# NextProb

NextProb reads settings directly from project files. Change those files for user requests; the UI is another editor over the same source of truth.

For ignore rules, agent instructions, or other project settings, read [file-backed settings](references/project-settings.md). That reference also explains catalog extensions for maintainers. For sidebar customization, use `nextprob.config.json` and the guidance below.

Read [project configuration](references/project-config.md) before making a configuration change. It documents supported fields, filtering rules, defaults, and examples.

Inspect and preserve an existing config. When the user requests customization and the config is missing, start with `{"version": 1}` and add the requested overrides. Consult [the default configuration](assets/project-config.default.json) to understand omitted values without persisting every default. Do not create a config merely because this skill is installed or read.

Use [the version 1 schema](assets/project-config.schema.json) for structural validation. Runtime validation also restricts rule operators, metadata variables, section IDs, and collection references. Use the documented subset rather than adding arbitrary JavaScript or unsupported fields.

NextProb manages this installed skill folder. Change the project config for user requests; keep personal instructions and custom skills separate from this package.
