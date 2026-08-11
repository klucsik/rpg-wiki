# Development Environment Setup

This guide covers local development setup for RPG Wiki:

1. Install dependencies with npm
2. Start databases (dev + test)
3. Apply Prisma migrations
4. Start the development server

## Prerequisites

- Node.js 20+
- npm
- Docker + Docker Compose

## 1) Install Dependencies

From repository root:

```bash
npm install
```

## 2) Start PostgreSQL Containers

### 2.1 Start Development DB (port 5432)

The app uses `DATABASE_URL` from `.env` for normal local development.

```bash
docker compose up -d db
```

Check health:

```bash
docker compose ps
```

### 2.2 Start Test DB (port 5433)

Used by Playwright/E2E tests.

```bash
docker compose -f docker-compose.test.yml up -d
```

Check health:

```bash
docker compose -f docker-compose.test.yml ps
```

## 3) Environment Variables

Make sure your local `.env` has at least:

- `DATABASE_URL` for the dev database (usually localhost:5432)
- `BETTER_AUTH_SECRET` (or `NEXTAUTH_SECRET` as fallback)

Without an auth secret, build/runtime auth initialization will fail.

Optional for E2E convenience in your shell:

```bash
export TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test'
```

## 4) Apply Prisma Migrations

### 4.1 Dev Database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4.2 Test Database

Run migrations against the test DB as well:

```bash
DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx prisma migrate deploy
```

## 5) Start the Development Server

```bash
npm run dev
```

The app should be available at:

- http://localhost:3000

## 6) Optional: Run E2E Tests

```bash
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npm run test:e2e
```

## Useful Stop/Cleanup Commands

Stop dev DB:

```bash
docker compose stop db
```

Stop test DB:

```bash
docker compose -f docker-compose.test.yml down
```

Reset test DB volume (clean slate):

```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
```
