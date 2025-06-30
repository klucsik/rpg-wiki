import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../db';

// GET /api/pages/[id]/versions - Get all versions for a page
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('x-user-group');
  const userGroups = req.headers.get('x-user-groups')?.split(',') || [];
  
  if (!authHeader || authHeader === 'public') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const page = await prisma.page.findUnique({ 
    where: { id: Number(id) },
    select: { edit_groups: true }
  });
  
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const canEdit = userGroups.some(g => page.edit_groups.includes(g));
  if (!canEdit) {
    return NextResponse.json({ error: 'Only editors can view page history' }, { status: 403 });
  }

  const versions = await prisma.pageVersion.findMany({
    where: { page_id: Number(id) },
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
