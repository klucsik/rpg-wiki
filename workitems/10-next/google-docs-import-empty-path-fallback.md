---
id: google-docs-import-empty-path-fallback
title: Google Docs Import — Handle empty paths for headingless documents
status: next
priority: medium
created: 2026-06-17
updated: 2026-06-17T13:58:00Z
completed: 
target_release: next
estimate: S
risk: low
tags: [google-docs, enhancement, phase-2-prep]
owner: pi
---

# Google Docs Import — Handle empty paths for headingless documents

## 🎯 Context & Goal
Documents without h1/h2 headings produce `path: ''` (empty string) from parser.ts. The schema requires a non-null String, and empty strings may collide or be rejected by the wiki's routing logic. Generate a fallback path from document title with timestamp suffix for uniqueness.

## 🔗 Dependencies & Relationships
- **Prerequisites**: [none]
- **Related to**: google-docs-import-metadata-alignment-audit (audit finding #3)
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Path format: lowercase-slug with optional timestamp for uniqueness.

## 📝 Summary
Add a fallback path generator in parser.ts or orchestrator.ts that produces meaningful paths when no heading structure is available (i.e., the document has no h1/h2 headings). Use slugified document title + short timestamp suffix.

Example: Document titled "Meeting Notes June 2026" with no headings → `path: "meeting-notes-june-2026"` or `path: "meeting-notes-june-2026-20260617"`.

## 🚧 Blockers
None.

## ✅ Acceptance Criteria
- [ ] Documents without h1/h2 headings produce a non-empty, slugified path from document title
- [ ] Fallback path includes timestamp suffix when no title is available (edge case)
- [ ] Empty-string paths are never written to the database
- [ ] Test: import a headingless document → verify it gets a valid unique path

## 🚀 Implementation Paths
1. In `parser.ts`, modify path generation for documents with empty pathStack:
   ```typescript
   if (pathStack.length === 0) {
     const fallback = title ? slugify(title).toLowerCase() : 'untitled';
     return `${fallback}-${Date.now().toString(36)}`;
   }
   return pathStack.join('/');
   ```
2. Or alternatively in `orchestrator.ts` — check page.path before creating and apply fallback there (keeps parser pure, adds logic at the DB boundary).

## 🤖 LLM Instructions (If applicable)
Simple string transformation — use existing slugify utility if available, or a basic one using `.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`.

## 🧪 Test Plan
- Import document with no headings but a title → verify path is slugified title
- Import document with no title and no headings → verify fallback like "untitled-ab12cd"
- Verify wiki can resolve both paths correctly

## 🏁 Definition of Done
- [ ] No empty-string paths written to database
- [ ] Headingless documents get meaningful, unique paths
- [ ] Integration test covers the edge case

## 🔄 Updates
- **2026-06-17**: Created from audit finding #3 (Important) — google-docs-import-metadata-alignment-audit.md

## 📓 Notes
Low-severity but practical issue. Without this, headingless documents get `path: ''` which may fail at the schema or routing layer.

## 🔗 Links
- [Master Plan](src/design_docs/google-docs-import.md)
- [Audit Report](../50-done/google-docs-import-metadata-alignment-audit.md)
