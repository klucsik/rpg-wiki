import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db/db';
import { getAuthFromRequest, requireAuthentication } from '../../../../../../lib/auth-utils';
import { withMetrics } from '@/lib/metrics/withMetrics';

// DELETE /api/pages/[id]/edit-locks/[lockId] – admin force-clear a specific lock
async function DELETEHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string; lockId: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const isAdmin = auth.userGroups.includes('admin');
  const { lockId } = await context.params;
  const lockIdNum = parseInt(lockId);

  // Fetch the lock so we can check ownership
  const lock = await prisma.editLock.findUnique({ where: { id: lockIdNum } });
  if (!lock) return NextResponse.json({ error: 'Lock not found' }, { status: 404 });

  // Allow deletion if the requester owns the lock or is an admin
  if (lock.username !== auth.username && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized to clear this lock' }, { status: 403 });
  }

  await prisma.editLock.delete({ where: { id: lockIdNum } });

  return NextResponse.json({ ok: true });
}

export const DELETE = withMetrics('/api/pages/[id]/edit-locks/[lockId]', DELETEHandler);
