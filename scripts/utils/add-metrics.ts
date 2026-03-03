/**
 * One-off script: wraps every Next.js API route handler with withMetrics().
 * Run with: npx tsx scripts/utils/add-metrics.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

const ROOT = resolve(__dirname, '../../');
const API_ROOT = resolve(ROOT, 'src/app/api');

// Map from file path (relative to API_ROOT) → route label
// Excludes /api/metrics (our endpoint) and /api/auth/[...all] (BetterAuth catch-all)
const ROUTES: Record<string, string> = {
  'admin/backup-jobs/route.ts': '/api/admin/backup-jobs',
  'admin/backup-settings/route.ts': '/api/admin/backup-settings',
  'admin/backup-settings/test/route.ts': '/api/admin/backup-settings/test',
  'admin/changelog/route.ts': '/api/admin/changelog',
  'admin/cleanup-drafts/route.ts': '/api/admin/cleanup-drafts',
  'admin/import/route.ts': '/api/admin/import',
  'admin/settings/route.ts': '/api/admin/settings',
  'auth/session/route.ts': '/api/auth/session',
  'auth/signin-username/route.ts': '/api/auth/signin-username',
  'drawio/render/route.ts': '/api/drawio/render',
  'groups/route.ts': '/api/groups',
  'health/route.ts': '/api/health',
  'images/route.ts': '/api/images',
  'images/[id]/route.ts': '/api/images/[id]',
  'pages/route.ts': '/api/pages',
  'pages/[id]/route.ts': '/api/pages/[id]',
  'pages/[id]/admin/route.ts': '/api/pages/[id]/admin',
  'pages/[id]/autosave/route.ts': '/api/pages/[id]/autosave',
  'pages/[id]/edit/route.ts': '/api/pages/[id]/edit',
  'pages/[id]/edit-locks/route.ts': '/api/pages/[id]/edit-locks',
  'pages/[id]/edit-locks/[lockId]/route.ts': '/api/pages/[id]/edit-locks/[lockId]',
  'pages/[id]/versions/route.ts': '/api/pages/[id]/versions',
  'pages/[id]/versions/[version]/route.ts': '/api/pages/[id]/versions/[version]',
  'ready/route.ts': '/api/ready',
  'search/route.ts': '/api/search',
  'search/pages/route.ts': '/api/search/pages',
  'search/pages/recent/route.ts': '/api/search/pages/recent',
  'upload/route.ts': '/api/upload',
  'users/route.ts': '/api/users',
  'users/[id]/route.ts': '/api/users/[id]',
};

const IMPORT_LINE = `import { withMetrics } from '@/lib/metrics/withMetrics';`;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

for (const [relPath, routeLabel] of Object.entries(ROUTES)) {
  const filePath = resolve(API_ROOT, relPath);
  let src = readFileSync(filePath, 'utf-8');

  // --- 1. Skip if already instrumented ---
  if (src.includes('withMetrics')) {
    console.log(`SKIP (already done): ${relPath}`);
    continue;
  }

  // --- 2. Find which HTTP methods are exported ---
  const exportedMethods: string[] = [];
  for (const method of HTTP_METHODS) {
    // Match: export async function GET( or export async function GET()
    if (new RegExp(`^export\\s+async\\s+function\\s+${method}\\b`, 'm').test(src)) {
      exportedMethods.push(method);
    }
  }

  if (exportedMethods.length === 0) {
    console.log(`SKIP (no exported handlers found): ${relPath}`);
    continue;
  }

  // --- 3. Add the withMetrics import after the last import line ---
  const lastImportIdx = (() => {
    let idx = -1;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) idx = i;
    }
    return idx;
  })();

  if (lastImportIdx === -1) {
    console.log(`WARN (no imports found): ${relPath}`);
    continue;
  }

  const lines = src.split('\n');
  lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  src = lines.join('\n');

  // --- 4. Rename `export async function METHOD(` → `async function METHODHandler(` ---
  for (const method of exportedMethods) {
    src = src.replace(
      new RegExp(`^export\\s+async\\s+function\\s+${method}\\b`, 'm'),
      `async function ${method}Handler`
    );
  }

  // --- 5. Append export consts at the end ---
  const exportLines = exportedMethods
    .map(m => `export const ${m} = withMetrics('${routeLabel}', ${m}Handler);`)
    .join('\n');

  src = src.trimEnd() + '\n\n' + exportLines + '\n';

  writeFileSync(filePath, src, 'utf-8');
  console.log(`OK  ${relPath}  [${exportedMethods.join(', ')}]`);
}

console.log('\nDone.');
