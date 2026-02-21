import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/db';
import { getAuthFromRequest, requireAuthentication } from '../../../../../lib/auth-utils';

const LOCK_TIMEOUT_DAYS = 2;

/** Generate a random 4-character uppercase alphanumeric ID. */
function generateShortId(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Delete any locks older than LOCK_TIMEOUT_DAYS for the given page. */
async function cleanExpiredLocks(pageId: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOCK_TIMEOUT_DAYS);
  await prisma.editLock.deleteMany({
    where: { page_id: pageId, created_at: { lt: cutoff } },
  });
}

// GET /api/pages/[id]/edit-locks – list active locks (cleans expired ones first)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const { id } = await context.params;
  const pageId = parseInt(id);

  await cleanExpiredLocks(pageId);

  const locks = await prisma.editLock.findMany({
    where: { page_id: pageId },
    orderBy: { created_at: 'asc' },
    select: { id: true, short_id: true, username: true, created_at: true },
  });

  return NextResponse.json({ locks });
}

// POST /api/pages/[id]/edit-locks – create a lock for the current user
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const { id } = await context.params;
  const pageId = parseInt(id);

  await cleanExpiredLocks(pageId);

  const lock = await prisma.editLock.create({
    data: { page_id: pageId, username: auth.username, short_id: generateShortId() },
    select: { id: true, short_id: true, username: true, created_at: true },
  });

  return NextResponse.json({ lock }, { status: 201 });
}

// DELETE /api/pages/[id]/edit-locks – remove all locks belonging to the current user on this page
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const { id } = await context.params;
  const pageId = parseInt(id);

  await prisma.editLock.deleteMany({
    where: { page_id: pageId, username: auth.username },
  });

  return NextResponse.json({ ok: true });
}
