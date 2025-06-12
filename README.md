# RPG Wiki Next.js

A full-stack wiki app for RPGs using Next.js (App Router, TypeScript, Tailwind CSS, PostgreSQL, TipTap).

## Features
- Rich text editing with TipTap
- Usergroup-based content restriction
- Image support
- Crosslinking ([[PageName]])
- Full-text search (planned)
- PostgreSQL persistence via API routes

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your PostgreSQL connection string.
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Tech Stack
- Next.js (App Router, SSR/SSG)
- TypeScript
- Tailwind CSS
- TipTap (editor)
- PostgreSQL

## License
MIT
