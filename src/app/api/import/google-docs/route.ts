import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/better-auth';
import { prisma } from '@/lib/db/db';
import { withMetrics } from '@/lib/metrics/withMetrics';
import path from 'path';

// ─── GET /api/import/google-docs — list import jobs ──────────────
async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(_req.url);
    const statusFilter = url.searchParams.get('status') || null;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Non-admins see only their own jobs; admins see all
    const isAdmin = session.user.groups?.includes('admin');
    const where: any = statusFilter ? { status: statusFilter } : {};
    if (!isAdmin) {
      where.triggeredBy = session.user.id;
    }

    const [jobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.importJob.count({ where }),
    ]);

    return NextResponse.json({ jobs, total });
  } catch (error) {
    console.error('Error listing import jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

// ─── POST /api/import/google-docs — trigger a new import ──────────
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerAuth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ['.md', '.html', '.zip'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: ${allowedExts.join(', ')}` 
      }, { status: 400 });
    }

    // Save file to temp AND persistent location for the orchestrator + re-run
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tmpDir = '/tmp/gdoc-imports';
    const uploadDir = path.join(process.cwd(), 'uploads', 'gdoc-imports');
    
    try { require('child_process').execSync(`mkdir -p ${tmpDir}`); } catch {}
    try { require('child_process').execSync(`mkdir -p ${uploadDir}`); } catch {}

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(tmpDir, safeName);
    
    require('fs').writeFileSync(filePath, buffer);

    // Also store persistently for re-run capability
    const persistentPath = path.join(uploadDir, safeName);
    require('fs').writeFileSync(persistentPath, buffer);

    // Create ImportJob record
    const fileType = ext === '.zip' ? 'zip' : ext === '.md' ? 'markdown' : 'html';
    
    const job = await prisma.importJob.create({
      data: {
        sourceFileName: file.name,
        fileType,
        fileSizeBytes: buffer.length,
        triggeredBy: session.user.id,
        status: 'pending',
        log: JSON.stringify([
          { ts: new Date().toISOString(), msg: `File uploaded: ${file.name} (${(buffer.length / 1024).toFixed(1)} KB)` },
          { ts: new Date().toISOString(), msg: `Persistent path: ${safeName}` }
        ]),
      },
    });

    // Start import asynchronously (fire-and-forget via child process)
    processImportJob(job.id, filePath);

    return NextResponse.json({ 
      jobId: job.id, 
      message: 'Import started successfully',
      status: 'running'
    });
  } catch (error) {
    console.error('Error starting import:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

// ─── Async job processor — runs orchestrator as a child process ────────
// This avoids Next.js bundling issues with the orchestrator's imports.
function processImportJob(jobId: number, filePath: string): void {
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

    // Cleanup temp file on exit
    try {
      const fs = require('fs');
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  });
}

export const GET = withMetrics('/api/import/google-docs', getHandler);
export const POST = withMetrics('/api/import/google-docs (POST)', postHandler);
