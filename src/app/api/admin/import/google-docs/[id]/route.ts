import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/better-auth';
import { prisma } from '@/lib/db/db';
import { withMetrics } from '@/lib/metrics/withMetrics';

// ─── GET /api/admin/import/google-docs/[id] — single job query ──────────
async function getHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuth();
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching import job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/import/google-docs/[id] — delete import + pages ──
async function deleteHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuth();
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    // If there's a manifest page, delete it too
    if (job.manifestPageId) {
      try {
        await prisma.page.delete({ where: { id: job.manifestPageId } });
      } catch {
        // Manifest may have been deleted manually already
      }
    }

    await prisma.importJob.delete({ where: { id: jobId } });

    return NextResponse.json({ 
      message: `Import job ${jobId} deleted`,
    });
  } catch (error) {
    console.error('Error deleting import job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/import/google-docs/[id] — archive or re-run import ──
async function patchHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuth();
    if (!session?.user?.groups?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Support archive and re-run actions via query param or body
    const url = new URL(_req.url);
    const action = url.searchParams.get('action') || 'archive';

    if (action === 'archive') {
      const updated = await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'archived' },
      });
      return NextResponse.json({ message: `Import ${jobId} archived`, job: updated });
    }

    if (action === 're-run') {
      const originalJob = await prisma.importJob.findUnique({ where: { id: jobId } });
      if (!originalJob) {
        return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
      }

      // Find persistent file from log entries or uploads directory
      const fs = require('fs');
      const uploadDir = path.join(process.cwd(), 'uploads', 'gdoc-imports');
      let persistentFile: string | null = null;

      if (originalJob.log) {
        try {
          const logEntries: Array<{ msg: string }> = JSON.parse(originalJob.log);
          const pathEntry = logEntries.find((e: { msg: string }) => e.msg.startsWith('Persistent path:'));
          if (pathEntry) {
            const fileName = pathEntry.msg.replace('Persistent path: ', '');
            const candidatePath = path.join(uploadDir, fileName);
            if (fs.existsSync(candidatePath)) {
              persistentFile = candidatePath;
            }
          }
        } catch {}
      }

      // Fallback: search uploads dir for matching original filename
      if (!persistentFile && originalJob.sourceFileName) {
        try {
          const files = fs.readdirSync(uploadDir);
          const match = files.find((f: string) => f.endsWith(originalJob.sourceFileName!));
          if (match) persistentFile = path.join(uploadDir, match);
        } catch {}
      }

      if (!persistentFile) {
        return NextResponse.json(
          { error: 'Original file not found — re-run requires the uploaded file. Please upload again.' },
          { status: 404 }
        );
      }

      // Create new job referencing the original
      const newJob = await prisma.importJob.create({
        data: {
          sourceFileName: originalJob.sourceFileName,
          fileType: originalJob.fileType,
          fileSizeBytes: originalJob.fileSizeBytes,
          triggeredBy: session.user.id,
          status: 'pending',
          log: JSON.stringify([
            { ts: new Date().toISOString(), msg: `Re-run of job #${jobId}` },
          ]),
        },
      });

      // Start import asynchronously (same logic as POST handler)
      const tmpDir = '/tmp/gdoc-imports';
      try { require('child_process').execSync(`mkdir -p ${tmpDir}`); } catch {}
      const safeName = `${Date.now()}-rerun-${path.basename(persistentFile)}`;
      const copyPath = path.join(tmpDir, safeName);
      fs.copyFileSync(persistentFile, copyPath);

      spawnImportJob(newJob.id, copyPath);

      return NextResponse.json({
        message: `Re-run started as job #${newJob.id}`,
        newJobId: newJob.id,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=archive or ?action=re-run' }, { status: 400 });
  } catch (error) {
    console.error('Error updating import job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

// ─── Helper: spawn child process for import (extracted from POST handler) ──
function spawnImportJob(jobId: number, filePath: string): void {
  const wrapperScript = path.join(
    process.cwd(), 'scripts', 'import', 'google-docs', 'run-import-job.ts'
  );

  console.log(`[ImportJob] Spawning job ${jobId} for file: ${filePath}`);

  const proc = require('child_process').spawn('bun', [
    'run', wrapperScript, String(jobId), filePath
  ], {
    env: { ...process.env },
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
  proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

  proc.on('close', async (code: number) => {
    console.log(`[ImportJob ${jobId}] Exited with code ${code}`);
    if (stdout) console.log('[ImportJob stdout]', stdout.trim());
    if (stderr) console.error('[ImportJob stderr]', stderr.trim());

    // Cleanup temp copy on exit
    try {
      const fs = require('fs');
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  });
}

export const GET = withMetrics('/api/admin/import/google-docs/:id', getHandler);
export const DELETE = withMetrics('/api/admin/import/google-docs/:id (DELETE)', deleteHandler);
export const PATCH = withMetrics('/api/admin/import/google-docs/:id (PATCH)', patchHandler);
