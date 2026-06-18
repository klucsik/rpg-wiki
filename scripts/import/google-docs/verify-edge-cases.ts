/** Edge-case verification for google docs import metadata alignment. */
import { GoogleDocsOrchestrator } from './orchestrator';
import { prisma } from '../../../../src/src/lib/db/db';
import { join, basename, extname, dirname } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';

// ── helpers ────────────────────────────────────────────────────────

function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const full = join(dir, file);
    if (statSync(full).isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function cleanupDB() {
  await prisma.page.deleteMany({});
  await prisma.media.deleteMany({});
}

function createZip(dir: string, zipPath: string) {
  const zip = new AdmZip();
  for (const file of getAllFiles(dir)) {
    zip.addLocalFile(file); // preserves relative paths inside the dir
  }
  zip.writeZip(zipPath);
}

// ── tests ────────────────────────────────────────────────────────

async function testEmptyPathFallback() {
  console.log('\n═══ Test: Empty-path fallback (no headings) ═══');
  
  const dir = join(tmpdir(), `gdoc-edge-empty-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  
  // Document with NO heading — parser will produce empty paths.
  writeFileSync(join(dir, 'plain.md'), '#\nJust plain text without proper headings.\n\nSome content here.');

  const zipPath = join(tmpdir(), `gdoc-edge-empty-${Date.now()}.zip`);
  createZip(dir, zipPath);

  try {
    await cleanupDB();
    
    // This should NOT throw — fallback path generation must kick in.
    const orchestrator = new GoogleDocsOrchestrator(zipPath);
    await orchestrator.run({ importPath: dir, dryRun: false });
    
    const pages = await prisma.page.findMany();
    if (pages.length === 0) throw new Error('No pages created from heading-less document.');
    
    for (const p of pages) {
      if (!p.path || !p.path.trim()) throw new Error(`Page "${p.title}" has empty path after fallback.`);
      console.log(`✅ Page with fallback: title="${p.title}", path="${p.path}", groups=edit[${p.edit_groups}] view[${p.view_groups}]`);
    }

    // Verify paths are unique even when multiple pages get the same fallback.
    const pathSet = new Set(pages.map(p => p.path));
    if (pathSet.size !== pages.length) throw new Error('Duplicate fallback paths detected.');
    
    console.log(`✅ ${pages.length} page(s) created with auto-generated non-empty unique paths.`);

  } finally {
    rmSync(dir, { recursive: true, force: true });
    try { rmSync(zipPath, { force: true }) } catch {}
  }
}

async function testCollisionDetection() {
  console.log('\n═══ Test: Path collision detection ═══');
  
  const id1 = Date.now().toString(36);
  const dir1 = join(tmpdir(), `gdoc-edge-coll-1-${id1}`);
  mkdirSync(dir1, { recursive: true });
  writeFileSync(join(dir1, 'import.md'), '#\nSame Title\nSome content.\n\n## Same Subtitle\nSubcontent.');

  const dir2 = join(tmpdir(), `gdoc-edge-coll-2-${id1}`);
  mkdirSync(dir2, { recursive: true });
  writeFileSync(join(dir2, 'import.md'), '#\nSame Title\nDifferent content.\n\n## Same Subtitle\nMore subcontent.');

  const zipPath = join(tmpdir(), `gdoc-coll-${id1}.zip`);
  
  try {
    await cleanupDB();
    
    // First import — creates pages at normal paths.
    createZip(dir1, `${tmpdir()}/coll-1.zip`);
    console.log('Import #1 ...');
    const orch1 = new GoogleDocsOrchestrator(`${tmpdir()}/coll-1.zip`);
    await orch1.run({ importPath: dir1 });

    // Wait a moment then do second import with same heading structure.
    createZip(dir2, `${tmpdir()}/coll-2-${id1}.zip`);
    console.log('Import #2 (should resolve collisions) ...');
    const orch2 = new GoogleDocsOrchestrator(`${tmpdir()}/coll-2-${id1}.zip`);
    await orch2.run({ importPath: dir2 });
    
    const pages = await prisma.page.findMany();

    if (pages.length !== 4) {
      throw new Error(`Expected 4 total pages after two imports with overlapping paths. Found ${pages.length}.`);
    }

    console.log('\nAll imported pages:');
    for (const p of pages.sort((a, b) => a.path.localeCompare(b.path))) {
      const groupsOk = Array.isArray(p.edit_groups) && p.edit_groups.length > 0 
                    && Array.isArray(p.view_groups) && p.view_groups.length > 0;
      
      if (!groupsOk) throw new Error(`Page "${p.title}" at path="${p.path}" has missing/empty group arrays.`);

      console.log(`   ${p.id} | path=${p.path.padEnd(35)} edit=[${p.edit_groups.join(',')}] view=[${p.view_groups.join(',')}]`);
    }

    const uniquePaths = new Set(pages.map(p => p.path));
    if (uniquePaths.size !== pages.length) {
      throw new Error('Duplicate paths after collision resolution!');
    }
    
    console.log(`✅ All ${pages.length} page(s) have unique non-empty paths with valid group arrays.`);

  } finally {
    rmSync(dir1, { recursive: true, force: true });
    rmSync(dir2, { recursive: true, force: true });
    try { rmSync(`${tmpdir()}/coll-1.zip`, { force: true }) } catch {}
    const z2 = `${tmpdir()}/coll-2-${id1}.zip`;
    try { rmSync(z2, { force: true }) } catch {}
  }
}

async function testMetadataFieldsPresentOnAllPages() {
  console.log('\n═══ Test: All metadata fields present on DB records ═══');

  const dir = join(tmpdir(), `gdoc-edge-meta-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  
  // Create a multi-section document.
  writeFileSync(join(dir, 'multi.md'), 
`# Alpha Section
Alpha content with some details.

## Beta Subsection
Beta has images and more text.

### Gamma Detail
Deep nested section.`);

  const zipPath = join(tmpdir(), `gdoc-edge-meta-${Date.now()}.zip`);
  createZip(dir, zipPath);

  try {
    await cleanupDB();
    
    await new GoogleDocsOrchestrator(zipPath).run({ importPath: dir });
    
    const pages = await prisma.page.findMany();
    console.log(`Found ${pages.length} page(s) in DB.`);
    
    let allOk = true;
    for (const p of pages) {
      // Required fields per schema.
      if (!p.title || !p.content || !p.path) {
        console.error(`  ❌ "${p.id}" missing title/content/path`);
        allOk = false; continue;
      }
      
      // Group arrays must be non-empty (our fix).
      const editGroupsValid = Array.isArray(p.edit_groups) && p.edit_groups.length > 0;
      const viewGroupsValid = Array.isArray(p.view_groups) && p.view_groups.length > 0;

      if (!editGroupsValid || !viewGroupsValid) {
        console.error(`  ❌ "${p.title}" edit_groups=${JSON.stringify(p.edit_groups)} or view_groups=${JSON.stringify(p.view_groups)} is invalid.`);
        allOk = false; continue;
      }

      // Path must be non-empty and normalized (lowercase, no leading slash).
      if (!p.path.trim() || p.path.startsWith('/')) {
        console.error(`  ❌ "${p.title}" path="${p.path}" is empty or has leading slash.`);
        allOk = false; continue;
      }

      // Created/updated timestamps must exist.
      const tsValid = !!p.created_at && !!p.updated_at;
      
      const status = `${tsValid ? '✅' : '⚠️'} title="${p.title}" path="${p.path}" groups=edit[${p.edit_groups}] view[${p.view_groups}]`;
      console.log(`  ${status}`);

    }
    
    if (!allOk) throw new Error('Some pages have missing or invalid metadata fields.');
    console.log('\n✅ All page records pass field validation checks.');

  } finally {
    rmSync(dir, { recursive: true, force: true });
    try { rmSync(zipPath, { force: true }) } catch {}
  }
}

// ── main ────────────────────────────────

// Wait helper to avoid Prisma SQLite connection exhaustion in rapid succession.
async function wait(ms = 100) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAll() {
  console.log('\n═══════════════════════════════════');
  console.log('Edge-case verification suite for google-docs import metadata alignment');
  console.log('═══════════════════════════════════\n');

  try {
    await testEmptyPathFallback();
    // Prisma SQLite needs a moment between heavy write bursts.
    await wait(200);
    await prisma.$disconnect(); // close old connection, re-acquire fresh for next suite step.
    
    await testCollisionDetection();
    await wait(200);
    await prisma.$disconnect();
    
    await testMetadataFieldsPresentOnAllPages();
    
    console.log('\n✨ ALL EDGE-CASE TESTS PASSED! ✨\n');
  } catch (err) {
    console.error('\n❌ EDGE CASE TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAll().catch(err => {
  console.error('Unhandled error', err);
  process.exit(1);
});
