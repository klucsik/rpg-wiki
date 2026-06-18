/** 
 * Wrapper script that runs the GoogleDocsOrchestrator.
 * Called by the API route as a child process to avoid Next.js bundling issues.
 * 
 * Usage: bun scripts/import/google-docs/run-import-job.ts <jobId> <filePath>
 */

// Shared Prisma client — same path as orchestrator.ts for consistent module resolution
import { GoogleDocsOrchestrator } from './orchestrator';
import { prisma } from '../../../src/lib/db/db';
import path from 'path';
import fs from 'fs';

async function main() {
  const jobId = parseInt(process.argv[2], 10);
  const filePath = process.argv[3];

  if (isNaN(jobId) || !filePath) {
    console.error('Usage: run-import-job.ts <jobId> <filePath>');
    process.exit(1);
  }

  // Ensure job record exists (may have been created by API route, or run standalone)
  let existingJob = await prisma.importJob.findUnique({ where: { id: jobId } });
  
  if (!existingJob) {
    console.log(`[ImportJob ${jobId}] No job found in DB — creating one`);
    existingJob = await prisma.importJob.create({
      data: {
        status: 'running',
        sourceFileName: path.basename(filePath),
        triggeredBy: 'standalone',
        log: JSON.stringify([{ ts: new Date().toISOString(), msg: 'Running via standalone script' }]),
      },
    });
  } else {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        log: JSON.stringify([{ ts: new Date().toISOString(), msg: 'Starting import...' }]),
      },
    });
  }

  // Run the orchestrator
  try {
    console.log(`[ImportJob ${jobId}] Running orchestrator on ${filePath}`);
    const orchestrator = new GoogleDocsOrchestrator(filePath);
    await orchestrator.run({ importPath: path.dirname(filePath), dryRun: false });
    console.log(`[ImportJob ${jobId}] Orchestrator completed`);
  } catch (orchError) {
    // If orchestrator fails, mark job as failed and exit
    const errMsg = orchError instanceof Error ? orchError.message : String(orchError);
    console.error(`❌ Import job ${jobId} orchestrator failed:`, errMsg);

    try {
      await prisma.importJob.upsert({
        where: { id: jobId },
        create: { status: 'failed', triggeredBy: existingJob?.triggeredBy || 'unknown', error: errMsg },
        update: {
          status: 'failed', completedAt: new Date(), error: errMsg,
          log: JSON.stringify([{ ts: new Date().toISOString(), msg: `ERROR: ${errMsg}` }]),
        },
      });
    } catch (err) {
      console.error(`[ImportJob ${jobId}] Could not update job status:`, err);
    }

    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    process.exit(1);
  }

  // Count pages and images created during this job's time window
  const startTime = existingJob.startedAt;
  let pagesCreated = 0;
  let imagesImported = 0;

  if (startTime) {
    [pagesCreated, imagesImported] = await Promise.all([
      prisma.page.count({ where: { created_at: { gte: startTime } } }),
      prisma.media.count({ where: { createdAt: { gte: startTime } } }),
    ]);
  }

  // Generate manifest page (non-fatal)
  let manifestPageId = null;
  try {
    manifestPageId = await createManifestPage(jobId, pagesCreated, imagesImported);
  } catch (err) {
    console.warn(`[ImportJob ${jobId}] Manifest creation failed:`, err instanceof Error ? err.message : err);
  }

  // Mark job as completed — use upsert to handle PrismaClient instance mismatch
  try {
    await prisma.importJob.upsert({
      where: { id: jobId },
      create: {
        status: 'completed', triggeredBy: existingJob?.triggeredBy || 'unknown',
        sourceFileName: existingJob?.sourceFileName, pagesCreated, imagesImported, manifestPageId,
      },
      update: {
        status: 'completed', completedAt: new Date(),
        log: JSON.stringify([{ ts: new Date().toISOString(), msg: `Completed: ${pagesCreated} pages, ${imagesImported} images` }]),
        pagesCreated, imagesImported, manifestPageId,
      },
    });

    console.log(`✅ Import job ${jobId} completed successfully (${pagesCreated} pages, ${imagesImported} images)`);
  } catch (err) {
    console.error(`[ImportJob ${jobId}] Could not mark as completed:`, err instanceof Error ? err.message : err);
  }

  // Cleanup temp file
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  
  await prisma.$disconnect();
}

// ─── Generate a Manifest Wiki Page for the import ──────────────────────
async function createManifestPage(jobId: number, pagesCreated: number, imagesImported: number): Promise<number | null> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  // Find the admin user to assign ownership
  const adminUser = await prisma.user.findFirst({
    where: { groups: { some: { group: { name: 'admin' } } } },
  });
  const ownerGroup = adminUser ? (adminUser.username || `user-${adminUser.id}`) : 'importer';

  // Build page content as HTML
  const manifestContent = [
    '<div class="gdoc-manifest">',
    `<h1>Import Manifest #${jobId}</h1>`,
    `<p><strong>Source file:</strong> ${job.sourceFileName || 'N/A'}</p>`,
    `<p><strong>Type:</strong> ${job.fileType || 'unknown'}</p>`,
    `<p><strong>Date:</strong> ${new Date(job.startedAt).toLocaleString()}</p>`,
    `<p><strong>Triggered by:</strong> User #${job.triggeredBy}</p>`,
    '<hr/>',
    `<h2>Summary</h2>`,
    `<ul>`,
    `  <li>Pages created: <strong>${pagesCreated}</strong></li>`,
    `  <li>Images imported: <strong>${imagesImported}</strong></li>`,
    '</ul>',
  ];

  // Link to created pages
  if (pagesCreated > 0) {
    const pages = await prisma.page.findMany({
      where: { created_at: { gte: job.startedAt } },
      select: { id: true, title: true, path: true },
    });

    manifestContent.push('<h2>Pages Created</h2><ul>');
    for (const page of pages) {
      manifestContent.push(
        `<li><a href="/pages/${page.path}">${page.title}</a></li>`
      );
    }
    manifestContent.push('</ul>');
  }

  manifestContent.push('</div>');

  const manifestPath = `imports/manifest-${jobId}`;

  // Check if path already exists (shouldn't, but safety check)
  const existingPage = await prisma.page.findUnique({ where: { path: manifestPath } });
  if (existingPage) return existingPage.id;

  const page = await prisma.page.create({
    data: {
      title: `Import Manifest #${jobId}`,
      content: manifestContent.join('\n'),
      path: manifestPath,
      edit_groups: [ownerGroup],
      view_groups: ['public'],
    },
  });

  return page.id;
}

main();
