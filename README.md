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

## Configuration

### Environment Variables

The following environment variables are supported:

- `DATABASE_URL`: PostgreSQL connection string (required)
- `NEXTAUTH_SECRET`: Secret for NextAuth.js session signing (required)
- `ADMIN_PASSWORD`: Password for the admin user (optional, defaults to 'admin123')
- `IMPORT_API_KEY`: API key for import scripts (optional)
- `KEYCLOAK_CLIENT_ID`: Keycloak client ID for OIDC authentication (optional)
- `KEYCLOAK_CLIENT_SECRET`: Keycloak client secret for OIDC authentication (optional)
- `KEYCLOAK_ISSUER`: Keycloak issuer URL for OIDC authentication (optional)

### Admin User

The admin user is automatically created/updated on every application startup:
- Username: `admin`
- Password: Set via `ADMIN_PASSWORD` environment variable (defaults to `admin123`)
- The password is updated every time the application starts to match the environment variable

To change the admin password, update the `ADMIN_PASSWORD` environment variable and restart the application.

## Wiki Import

### Complete Import (Recommended)
For a complete wiki import from existing sources (supports HTML, Markdown, and AsciiDoc):

```bash
# Import everything with default settings
npm run import:all

# Import with custom source and update existing pages
npx tsx scripts/import-all.ts /path/to/wiki --update-existing

# Dry run to see what would happen
npx tsx scripts/import-all.ts --dry-run

# Skip certain steps if already done
npx tsx scripts/import-all.ts --skip-images --update-existing
```

The complete import process includes:
1. **Image Import**: Uploads all images and creates database mappings
2. **Page Import**: Imports wiki pages with proper AsciiDoc/HTML processing  
3. **Link Fixing**: Updates all image links to use correct `/api/images/:id` URLs

### Individual Import Scripts
If you need more control, you can run individual steps:

```bash
# Import images only
npm run import:images /path/to/wiki

# Import pages only  
npm run import:wikijs /path/to/wiki --update-existing

# Fix image links only
npm run fix:image-links
```

### Supported Formats
- **HTML**: Wiki.js HTML exports with frontmatter metadata
- **Markdown**: Standard Markdown with YAML frontmatter
- **AsciiDoc**: AsciiDoc files with proper header/list/image processing

## Tech Stack
- Next.js (App Router, SSR/SSG)
- TypeScript
- Tailwind CSS
- TipTap (editor)
- PostgreSQL

## License
MIT

## Docker Build & Push

### Build Optimization Notes
The Docker image has been optimized for minimal size:
- Uses Alpine Linux base images (~200-400MB vs ~1.2GB+ with Ubuntu)
- Multi-stage build with standalone Next.js output
- Production-only dependencies in final image
- Non-root user for security

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
