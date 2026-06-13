---
id: google-docs-import-metadata-alignment
title: 03- google-docs-import-metadata-alignment
status: done
priority: medium
created: 2026-06-08
updated: 2026-06-13T07:50:00Z
completed: 2026-06-13T07:45Z 
target_release: next
estimate: S
risk: low
tags: [feature, import, refactor]
owner: pi
---

# 03- google-docs-import-metadata-alignment

## 🎯 Context & Goal
[Context for 03- google-docs-import-metadata-alignment: Perform a deep audit of the existing codebase to ensure the LLM's JSON output for slicing and metada...]

## 🔗 Dependencies & Relationships
- **Prerequisites**: 
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.

## 📝 Summary
Perform a deep audit of the existing codebase to ensure the LLM's JSON output for slicing and metadata perfectly aligns with the current database schema, path-handling logic, and wiki requirements.

## 🚧 Blockers
- Completion of the Feature Refinement Flow.

## ✅ Acceptance Criteria
- [x] LLM JSON schema verified against `schema.prisma`. See audit report for full field mapping + draft JSON Schema. Key finding: no `visibility` column exists — use group arrays instead.
- [x] Path generation logic tested/audited against existing wiki path fields. Found 4 issues (empty paths, collisions, normalization) all fixed in orchestrator.ts.
- [x] All metadata fields correctly mapped to database. Fixed `createWikiPages()` to set `edit_groups` and `view_groups`; added Phase-2-ready optional fields on types.

## 🚀 Implementation Paths
### 1. Schema Audit
- Review the `Page` and `Media` models in `schema.prisma`.
- Define a strict JSON schema for the LLM's output.

### 2. Path Logic Verification
- Test the path-reconciliation logic against a variety of existing wiki structures.

## 🤖 LLM Instructions (If applicable)
[Placeholder for LLM instructions]

## 🧪 Test Plan
- [x] Verified Bun compilation of orchestrator.ts, types.ts — no type errors (confirmed via `bun run` import test).
- [x] Integration tests in verify-implementation.ts updated with checks for edit_groups/view_groups, path uniqueness, empty-path fallback.
- ⏭️ Full end-to-end requires database connection and is covered by Phase 2 integration suite.

## 🏁 Definition of Done
- [x] LLM output schema defined and verified against `schema.prisma`.
- [x] Path handling fixed: sanitization, fallback generation, collision detection all implemented.
- [x] Metadata mapping complete: edit_groups/view_groups defaults applied per design doc's "visibility: owner" requirement.

## 🔄 Updates
- **2026-06-08**: Ticket created as a follow-up to the Feature Refinement Flow.

## 📓 Notes
- This is a "pre-flight" task before Phase 2 implementation.

## 🔗 Links
- [Master Plan](src/design_docs/google-docs-import.md)