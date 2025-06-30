import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../db';
import { authenticateRequest, requireEditPermissions } from '../../../../../auth';

// GET /api/pages/[id]/versions - Get all versions for a page
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { page_id: parseInt(id) },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const authError = requireEditPermissions(auth, latestVersion.edit_groups);
  if (authError) {
    return NextResponse.json({ error: 'Only editors can view page history' }, { status: 403 });
  }

  const versions = await prisma.pageVersion.findMany({
    where: { page_id: parseInt(id) },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      title: true,
      edited_by: true,
      edited_at: true,
      change_summary: true,
    }
  });

  return NextResponse.json(versions.map(v => ({
    ...v,
    edited_at: v.edited_at.toISOString(),
  })));
}
