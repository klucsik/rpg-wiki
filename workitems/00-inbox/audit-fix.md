---
id: audit-fix-google-docs
title: 00- audit-fix
status: inbox
priority: high
created: 2026-06-08
updated: 2026-06-08
completed: 
target_release: next
estimate: M
risk: medium
tags: [bug, audit, google-docs]
owner: pi
---

# 00- audit-fix

## 🎯 Context & Goal
[Context for 00- audit-fix: The Google Docs import feature has a partially implemented codebase in `src/scripts/import/google-do...]

## 🔗 Dependencies & Relationships
- **Prerequisites**: 
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.

## 📝 Summary
The Google Docs import feature has a partially implemented codebase in `src/scripts/import/google-docs/`. However, it is currently non-functional due to database connectivity issues and requires validation of the existing logic. This ticket covers auditing the existing code, resolving the database blocker, and ensuring the implementation matches the Master Plan.

## 🚧 Blockers
[No blockers]

## ✅ Acceptance Criteria
- [ ] The import script runs without `PrismaClientInitializationError`.
- [ ] All existing implementation tests pass.
- [ ] A test import with a ZIP file containing a Markdown file and an `images/` folder succeeds.
- [ ] The parsed Wiki pages have correct hierarchical paths (H1/H2).
- [ ] Images are correctly uploaded to the Wiki and their URLs are updated in the content.

## 🚀 Implementation Paths
[No implementation paths provided]

## 🤖 LLM Instructions (If applicable)
[Placeholder for LLM instructions]

## 🧪 Test Plan
[No test plan provided]

## 🏁 Definition of Done
- [ ] Code is audited and fixed.
- [ ] Tests pass.
- [ ] Implementation is verified with a sample import.

## 🔄 Updates
[No updates]

## 📓 Notes
[No notes]

## 🔗 Links
[No links]