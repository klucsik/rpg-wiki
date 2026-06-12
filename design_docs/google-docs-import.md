---
id: google-docs-import
title: Import Documents from Google Docs (AI-Driven)
status: doing
priority: medium
created: 2026-06-06
updated: 2026-06-08
completed: 
target_release: next
estimate: XL
risk: high
tags: [feature, import, ai, async]
owner: pi
---

# Import Documents from Google Docs (AI-Driven)

## Summary

Implement an AI-driven, asynchronous import pipeline that allows users to upload documents (Markdown, HTML, or DOCX) and have them automatically sliced into wiki pages based on semantic structure. The system uses a local LLM to generate page titles, hierarchical paths, and metadata, while ensuring the original content remains untouched.

## Blockers

- [ ] `DATABASE_URL` configuration (Phase 1).
- [ ] ESM refactor (Phase 1).

## Acceptance Criteria

- [ ] **Asynchronous Execution**: Imports run as background jobs with real-time status tracking.
- [ ] **AI-Driven Slicing**: LLM identifies semantic boundaries and generates metadata.
- [ ] **Content Fidelity**: Original text and images are preserved without LLM alteration.
- [ ] **Path-Based Hierarchy**: LLM generates full, unique `path/to/page` strings.
- [ ] **Atomic Imports**: All-or-nothing transaction for every import.
- [ ] **Safety First**: New pages default to `visibility: owner` for user review.
- [ ] **Management & Review**: A Manifest page and a Management Dashboard are provided.

## Implementation Paths

### Phase 1: Foundation & Stability
- Resolve DB connectivity and refactor scaffolding to ESM.
- *See: [google-docs-import-foundation](workitems/00-inbox/google-docs-import-foundation.md)*

### Phase 2: MVP Orchestrator (LLM-Powered)
- Build the Async Job Engine and LLM integration (via `llama.cpp`).
- Implement the Single-Pass (Stripped) logic and atomic import pipeline.
- *See: [google-docs-import-orchestrator](workitems/00-inbox/google-docs-import-orchestrator.md)*
- *See: [google-docs-import-metadata-alignment](workitems/00-inbox/google-docs-import-metadata-alignment.md)*

### Phase 3: Web UI & Visual Editor
- Implement the "Imports" header, Job Dashboard, and Manifest/Management pages.
- Implement the high-fidelity Visual Slice Editor for manual refinement.
- *See: [google-docs-import-web-ui](workitems/00-inbox/google-docs-import-web-ui.md)*
- *See: [google-docs-import-visual-editor](workitems/00-inbox/google-docs-import-visual-editor.md)*

### Phase 4: Advanced Features
- Add `.docx` support via pluggable parsers.
- *See: [google-docs-import-docx-support](workitems/00-inbox/google-docs-import-docx-support.md)*

## Test Plan

- [ ] Test end-to-end pipeline from upload to completed wiki pages.
- [ ] Verify LLM's "No-Alteration" guarantee.
- [ ] Test job recovery and retry logic.
- [ ] Validate path-based hierarchy and collision handling.

## Definition of Done

- [ ] Feature is fully implemented, tested, and documented.
- [ ] Users can import documents with high confidence in content and structure.

## Updates

- **2026-06-06**: Initial research completed.
- **2026-06-08**: Major redesign: Shifted from manual parsing to AI-driven semantic slicing with an asynchronous job architecture.

## Notes

- **Core Principle**: The LLM is a "Structural Architect," not a writer.
- **Storage**: Original files are stored as DB BLOBs.

## Links
