---
id: google-docs-import-llm-types-expansion
title: Google Docs Import — Expand types.ts for LLM output readiness
status: doing
retry_count: 0
priority: medium
created: 2026-06-17
updated: 2026-06-18T09:30:00Z
completed: 
target_release: next
estimate: S
risk: low
tags: [google-docs, enhancement, phase-2-prep]
owner: pi
---

# Google Docs Import — Expand types.ts for LLM output readiness

## 🎯 Context & Goal
The `GoogleDocsPage` interface in `types.ts` only has `{ title, content, path }`. For Phase 2 LLM integration, it needs to include visibility/group fields so the LLM's JSON output can be mapped cleanly to the database schema (specifically `edit_groups`/`view_groups`).

## 🔗 Dependencies & Relationships
- **Prerequisites**: [none]
- **Related to**: google-docs-import-metadata-alignment-audit (audit finding #4)
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- All new fields must be optional to preserve backward compatibility with current parser output.

## 📝 Summary
Expand the `GoogleDocsPage` interface and any related LLM output types in `types.ts` to include:

```typescript
interface GoogleDocsPage {
  title: string;
  content: string;
  path: string;
  
  // Phase 2 additions (optional for now):
  visibility?: 'public' | 'owner';
  targetGroups?: string[];
}

// Also add LLM JSON schema wrapper if not present:
interface LLMSliceOutput {
  pages: GoogleDocsPage[];
  _meta?: {
    sourceDocumentTitle?: string;
    totalPagesExpected?: number;
  };
}
```

Reference the draft LLM JSON Schema from the audit report (`src/workitems/50-done/google-docs-import-metadata-alignment-audit.md` → "LLM JSON Schema" section) for exact field definitions.

## 🚧 Blockers
None.

## ✅ Acceptance Criteria
- [ ] `GoogleDocsPage` includes optional `visibility` and `targetGroups` fields
- [ ] New `LLMSliceOutput` interface defined with pages array + _meta
- [ ] Existing parser code still compiles (new fields are optional)
- [ ] Type definitions match the draft LLM JSON Schema from audit

## 🚀 Implementation Paths
1. Open `src/scripts/import/google-docs/types.ts`
2. Add visibility and targetGroups to GoogleDocsPage interface:
   ```typescript
   export interface GoogleDocsPage {
     title: string;
     content: string;
     path: string;
     
     // Phase 2: LLM output support (optional, backward compatible)
     visibility?: 'public' | 'owner';
     targetGroups?: string[];
   }
   
   export interface LLMSliceOutput {
     pages: GoogleDocsPage[];
     _meta?: {
       sourceDocumentTitle?: string;
       totalPagesExpected?: number;
     };
   }
   ```
3. Verify existing code compiles with `tsc --noEmit` or equivalent.

## 🤖 LLM Instructions (If applicable)
This is purely a type definition change — no runtime behavior affected. Just add the fields and interfaces as shown above. Ensure all new fields are optional (`field?:`).

## 🧪 Test Plan
- Run TypeScript compiler: `tsc --noEmit` should pass with zero errors
- Verify existing `verify-implementation.ts` still works (parser output doesn't set visibility/targetGroups, so they remain undefined — acceptable since fields are optional)

## 🏁 Definition of Done
- [ ] types.ts includes visibility and targetGroups on GoogleDocsPage
- [ ] LLMSliceOutput interface is defined
- [ ] TypeScript compiles without errors
- [ ] Existing tests still pass (no behavioral change)

## 🔄 Updates
- **2026-06-17**: Created from audit finding #4 (Important) — google-docs-import-metadata-alignment-audit.md

## 📓 Notes
This is a prerequisite for the LLM integration in Phase 2. Without it, there's no type-safe bridge between LLM output and database write. The mock prisma in verify-implementation.test.ts should also be updated to include these fields (audit finding #6).

## 🔗 Links
- [Master Plan](src/design_docs/google-docs-import.md)
- [Audit Report](../50-done/google-docs-import-metadata-alignment-audit.md)
