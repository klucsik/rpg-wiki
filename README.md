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

## Docker Build & Push

### 1. Build the Docker image
```bash
docker build -t registry.klucsik.hu/rpg-wiki:latest .
```

### 2. Login to the registry
```bash
docker login registry.klucsik.hu
```

### 3. Push the image
```bash
docker push registry.klucsik.hu/rpg-wiki:latest
```

### 4. (Optional) Run the image locally
```bash
docker run --env-file .env.local -p 3000:3000 registry.klusik.hu/rpg-wiki:latest
```
