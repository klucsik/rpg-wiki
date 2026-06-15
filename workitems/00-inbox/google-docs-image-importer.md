---
id: google-docs-image-importer
title: 08- google-docs-image-importer
status: inbox
priority: medium
created: 2026-06-06
updated: 2026-06-08
completed: 
target_release: next
estimate: M
risk: medium
tags: [feature, images, google-docs]
owner: pi
---

# 08- google-docs-image-importer

## 🎯 Context & Goal
[Context for 08- google-docs-image-importer: Implement a pipeline to handle images found within the imported files (Markdown or HTML). This invol...]

## 🔗 Dependencies & Relationships
- **Prerequisites**: 
- **Master Plan**: [src/design_docs/google-docs-import.md]

## 🛠️ Technical Constraints & Rules
- Use ESM (`import`/`export`) exclusively.
- Strictly avoid content alteration by the LLM.

## 📝 Summary
Implement a pipeline to handle images found within the imported files (Markdown or HTML). This involves identifying image references, retrieving the image data (locally from extracted folder contents or via remote URL), uploading it to the Wiki's internal media storage, and updating the HTML content with the new local media URLs.

## 🚧 Blockers
[No blockers]

## ✅ Acceptance Criteria
- [ ] Detects all image elements within the parsed content.
- [ ] For Markdown: Resolves relative image paths next to the extracted document.
- [ ] For HTML: Resolves relative paths or handles remote URLs.
- [ ] Uploads the image bytes to the Wiki's `Media` table.
- [ ] Replaces the original image source in the HTML with the new `/api/images/[id]` URL.
- [ ] Handles different image formats (JPEG, PNG, WebP, etc.) correctly.

## 🚀 Implementation Paths
- Coordinate with the `google-docs-parser` to identify image locations and source info.
- Use the existing `Media` model and upload logic.

## 🤖 LLM Instructions (If applicable)
[Placeholder for LLM instructions]

## 🧪 Test Plan
- [ ] Test with a document containing multiple images (local and remote).
- [ ] Verify image integrity (no corruption) after upload.
- [ ] Verify that the HTML `<img>` tags point to the correct internal URLs.

## 🏁 Definition of Done
- Images are correctly migrated from the imported files to the Wiki media store.

## 🔄 Updates
[No updates]

## 📓 Notes
[No notes]

## 🔗 Links
[No links]