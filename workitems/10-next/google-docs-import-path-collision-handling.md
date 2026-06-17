---
id: google-docs-import-path-collision-handling
title: Google Docs Import — Path collision detection and resolution
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

# Google Docs Import — Path collision detection and resolution

## 🎯 Context & Goal
The current path generation in parser.ts produces identical paths for documents with matching heading structures. When two imported pages share the same `path`, Prisma creates both silently, but the wiki's routing breaks due to ambiguous page access. Add pre-create uniqueness checking with suffix-based collision resolution.

## 🔗 Dependencies & Relationships
- **Prerequisites**: [none]
- **Related to**: google-docs-import-metadata-alignment-audit (audit finding #2)
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.
- Path format must remain lowercase-slug: `^([a-z0-9]+(-[a-z0-9]+)*/)*[a-z0-9]+$`

## 📝 Summary
Implement path collision detection before page creation in `orchestrator.ts`. When a generated path already exists, append a numeric suffix (e.g., `/topic` → `/topic-1`, then `/topic-2`) to ensure uniqueness.

The design doc explicitly requires "path-based hierarchy and collision handling."

## 🚧 Blockers
None. Straightforward addition to the page creation flow.

## ✅ Acceptance Criteria
- [ ] Pre-create check queries existing pages by path before creating new ones
- [ ] On collision, append numeric suffix: `/topic` → `/topic-1`, then `/topic-2`, etc.
- [ ] Suffix generation stops at first non-colliding value (no infinite loop on extreme collisions)
- [ ] Path uniqueness is verified by existing page count after import

## 🚀 Implementation Paths
1. Add helper function `resolveUniquePath(path: string, prisma): Promise<string>`:
   ```typescript
   async function resolveUniquePath(basePath: string, prisma: PrismaClient): Promise<string> {
     if (basePath === '') return 'untitled';  // edge case from empty-path issue
     let candidate = basePath;
     let counter = 1;
     while (await prisma.page.findFirst({ where: { path: candidate } })) {
       candidate = `${basePath}-${counter}`;
       counter++;
     }
     return candidate;
   }
   ```
2. Call this in `createWikiPages()` before each `prisma.page.create()`.
3. Add integration test: import two documents with identical paths → verify both created with distinct paths.

## 🤖 LLM Instructions (If applicable)
Add path resolution logic only — do not change the existing parser.ts heading-to-path generation, just add a uniqueness wrapper around it.

## 🧪 Test Plan
- Import document A with path "my-topic/subtopic" → verify created at that exact path
- Import document B with same heading structure → verify created at "my-topic/subtopic-1"
- Verify wiki routing resolves to correct page for both paths

## 🏁 Definition of Done
- [ ] Duplicate-path imports are resolved automatically with numeric suffixes
- [ ] Integration test verifies collision handling works end-to-end
- [ ] No regression in normal (non-colliding) path generation

## 🔄 Updates
- **2026-06-17**: Created from audit finding #2 (Critical) — google-docs-import-metadata-alignment-audit.md

## 📓 Notes
This is the second critical blocker for Phase 2. Without collision handling, imported content silently corrupts wiki hierarchy.

## 🔗 Links
- [Master Plan](src/design_docs/google-docs-import.md)
- [Audit Report](../50-done/google-docs-import-metadata-alignment-audit.md)
