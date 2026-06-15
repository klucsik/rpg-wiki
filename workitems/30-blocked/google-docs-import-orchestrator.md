---
id: google-docs-import-orchestrator
title: 02- google-docs-import-orchestrator
status: blocked
retry_count: 1
priority: high
created: 2026-06-06
updated: 2026-06-13T07:55:00Z
completed: 
target_release: next
estimate: L
risk: medium
tags: [feature, orchestration, google-docs]
owner: pi
---

# 02- google-docs-import-orchestrator

## 🎯 Context & Goal
[Context for 02- google-docs-import-orchestrator: The Orchestrator is the central engine that coordinates the entire import process. It manages the wo...]

## 🔗 Dependencies & Relationships
- **Prerequisites**: 
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.

## 📝 Summary
The Orchestrator is the central engine that coordinates the entire import process. It manages the workflow: receiving the user's uploaded file (Markdown or HTML), triggering the `google-docs-parser` to split the document, coordinating the `google-docs-image-importer` to handle media, and finally creating the resulting Wiki pages.

## 🚧 Blockers
Error: No associated chat history found for this workitem in 'doing' status. The task was moved to blocked without a worker assignment or conversation log.

## ✅ Acceptance Criteria
- [ ] Coordinates the full end-to-end flow: File Upload/Extraction -> Parsing & Splitting -> Image Import -> Page Creation.
- [ ] Implements the splitting logic (e.g., H1/H2) to create multiple pages.
- [ ] Correctly constructs hierarchical paths (e.g., `/parent/child`) for the newly created pages based on document structure or file names.
- [ ] Uses the existing `POST /api/pages` endpoint or Prisma to create pages.
- [ ] Handles error recovery (e.g., reporting which pages/images failed during the process).

## 🚀 Implementation Paths
- Integrate all sub-modules into a single service or function.
- Ensure robust error handling and reporting for the user.

## 🤖 LLM Instructions (If applicable)
[Placeholder for LLM instructions]

## 🧪 Test Plan
- [ ] Integration test: One uploaded Markdown file with H1/H2 structure results in multiple correctly nested Wiki pages.
- [ ] Verify images are correctly embedded in the new pages.

## 🏁 Definition of Done
- A complete, automated import process from a single uploaded file/archive to a set of Wiki pages.

## 🔄 Updates
[No updates]

## 📓 Notes
[No notes]

## 🔗 Links
[No links]