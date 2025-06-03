# RPG Wiki Roadmap

## 1. Core Features (MVP)
- Routing & Navigation: Home, Pages, Editor routes (done)
- Sample Page & Viewer: Render sample page with formatting, images, and restricted blocks (done)
- Restricted Content Blocks: Show reveal/hidden button based on usergroup (done)
- Style & Void Element Handling: Properly render inline styles and void elements (done)

## 2. User & Auth System
- Implement user authentication (login/logout)
- Add usergroup management (assign users to groups)
- Store user session (localStorage or backend)

## 3. Page Management
- List all pages
- View individual pages by route (e.g., `/pages/:id`)
- Add, edit, and delete pages (UI and state)

## 4. Editor
- Integrate TipTap editor for rich text, images, and links
- Support custom crosslink extension ([[PageName]])
- Allow inserting restricted blocks in the editor

## 5. Search
- Integrate Fuse.js for full-text search across pages
- Add search UI and highlight results

## 6. Content Restriction Enhancements
- UI to select usergroups for restricted blocks in the editor
- Show/hide content based on current user’s groups

## 7. Polish & Extensibility
- Improve UI/UX (styling, error handling)
- Modularize code for easy extension
- Add tests (unit, integration)
- Documentation (usage, contributing)

## 8. (Optional) Backend Integration
- Persist users, pages, and groups to a backend/database
- Real authentication (OAuth, JWT, etc.)
