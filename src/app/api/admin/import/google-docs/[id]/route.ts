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

// ─── PATCH /api/admin/import/google-docs/[id] — archive import ──────────
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

    return NextResponse.json({ error: 'Unknown action. Use ?action=archive' }, { status: 400 });
  } catch (error) {
    console.error('Error updating import job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export const GET = withMetrics('/api/admin/import/google-docs/:id', getHandler);
export const DELETE = withMetrics('/api/admin/import/google-docs/:id (DELETE)', deleteHandler);
export const PATCH = withMetrics('/api/admin/import/google-docs/:id (PATCH)', patchHandler);
