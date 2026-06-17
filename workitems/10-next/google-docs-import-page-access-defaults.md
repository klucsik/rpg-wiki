---
id: google-docs-import-page-access-defaults
title: Google Docs Import — Fix page edit_groups/view_groups defaults
status: next
priority: critical
created: 2026-06-17
updated: 2026-06-17T13:58:00Z
completed: 
target_release: next
estimate: S
risk: low
tags: [google-docs, bugfix, phase-2-prep]
owner: pi
---

# Google Docs Import — Fix page edit_groups/view_groups defaults

## 🎯 Context & Goal
Pages created by `createWikiPages()` in orchestrator.ts are initialized with empty `edit_groups` and `view_groups` arrays. This makes imported pages unusable in the wiki UI — they have no editors and may be invisible even to their owner. Fix this by setting sensible defaults per the design doc's "visibility: owner" semantics.

## 🔗 Dependencies & Relationships
- **Prerequisites**: [none]
- **Related to**: google-docs-import-metadata-alignment-audit (audit finding #1)
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.
- Defaults must match design doc's "visibility: owner" concept.

## 📝 Summary
Add default `edit_groups` and `view_groups` values to page creation in `orchestrator.ts`. Pages created during import should at minimum grant access to the importer user/group, per the design spec.

Reference implementation: `import-from-filesystem.ts` already handles this correctly with YAML frontmatter + group mapping (see audit finding #7).

## 🚧 Blockers
None. This is a straightforward code fix.

## ✅ Acceptance Criteria
- [ ] `createWikiPages()` in orchestrator.ts sets default `edit_groups` and `view_groups` when not explicitly provided
- [ ] Default access grants at least the importer user visibility (per "visibility: owner" semantics)
- [ ] Existing tests updated to verify group arrays are non-empty on created pages
- [ ] Application can view and edit newly imported wiki pages

## 🚀 Implementation Paths
1. In `orchestrator.ts`, modify `createWikiPages()` Prisma call:
   ```typescript
   await prisma.page.create({
     data: {
       title: page.title,
       content: page.content,
       path: page.path,
       edit_groups: page.edit_groups || [importerUser],  // default
       view_groups: page.view_groups || [importerUser],    // default
     }
   });
   ```
2. If `importerUser` is not available at call time (e.g., fresh DB), use a safe fallback group name or require user seeding with clear error message.
3. Update verify-implementation tests to assert non-empty groups on created pages.

## 🤖 LLM Instructions (If applicable)
When implementing: respect existing code style, no new dependencies needed, this is purely adding default values at page creation time.

## 🧪 Test Plan
- Run `verify-implementation.ts` — verify created pages have non-empty edit_groups/view_groups
- Manually import a test document → open in wiki UI → confirm page is visible and editable by importer
- Unit test: mock prisma.page.create should return object with groups populated

## 🏁 Definition of Done
- [ ] Pages created via google-docs import have sensible default access groups
- [ ] Existing tests pass with group assertions added
- [ ] No regression in page creation flow for existing users

## 🔄 Updates
- **2026-06-17**: Created from audit finding #1 (Critical) — google-docs-import-metadata-alignment-audit.md

## 📓 Notes
This is a blocking issue for any Phase 2 import work. Without group defaults, imported pages are effectively broken in the wiki UI.

## 🔗 Links
- [Master Plan](src/design_docs/google-docs-import.md)
- [Audit Report](../50-done/google-docs-import-metadata-alignment-audit.md)
