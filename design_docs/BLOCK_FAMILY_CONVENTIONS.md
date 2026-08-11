# Block Family Conventions

## Purpose
This document defines conventions for statblock-like editor blocks so we can scale beyond DaggerHeart without reworking core editor plumbing.

Current and planned families:
- dh-adversary
- dh-environment
- pf2e-monster
- pf2e-trap
- ds-monster

## Naming Convention
Use a namespaced block type in `system-entity` format:
- `dh-adversary`
- `dh-environment`
- `pf2e-monster`
- `pf2e-trap`
- `ds-monster`

Node names remain camelCase for TipTap node types:
- `dhAdversary`
- `dhEnvironment`
- future examples: `pf2eMonster`, `pf2eTrap`, `dsMonster`

## Single Source of Truth
Use central constants from [src/lib/block-types.ts](../src/lib/block-types.ts):
- `BLOCK_TYPES` for persisted `data-block-type` values.
- `NODE_TYPES` for TipTap node identifiers.
- `isDhBlockType` for family-level behavior gates in the editor.

Do not hardcode block-type strings in editor, parser, or extensions.

## Required Integration Surfaces For Any New Family
When adding a new family (example: pf2e-monster), update all of the following:
1. Extension schema
- Add TipTap node extension with parse/render attributes.
- Serialize with `data-block-type` using `BLOCK_TYPES`.

2. Editor node view
- Add form view component for authoring.
- Include `DhForm-root` only if formatting toolbar should be disabled while focused.

3. Toolbar insertion
- Add dropdown option in `TiptapEditor`.
- Insert with sensible default attributes.

4. Block selection and embed controls
- Include the node in block-type detection and embed selection handling.
- Define default width/alignment/wrap values.

5. Read-mode parser
- Add rendering in `parseWikiContentWithRestrictedBlocks` for saved HTML.

6. CSS namespace
- Add `.system-entity-html` render styles and `.FamilyEditor-*` form styles.

## Shared Components
Prefer shared authoring primitives to minimize per-family code:
- Rich text field: [src/components/editor/DhRichTextField.tsx](../src/components/editor/DhRichTextField.tsx)
- Embed sizing/alignment helpers: [src/components/editor/embedFormatting.ts](../src/components/editor/embedFormatting.ts)

## Current Applied State
Applied for DH families:
- `dh-adversary`
- `dh-environment`

Both now consume centralized block type constants across:
- extensions
- node views
- toolbar integration
- restricted content parser

## Future Direction
For growth to PF2E and DS families, consider a small config registry where each family defines:
- labels
- default attributes
- node type
- block type
- parser render function

This keeps `TiptapEditor` and parser logic table-driven instead of branching by family.
