import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../db';

// GET /api/pages/[id]/versions/[version] - Get specific version content
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; version: string }> }
) {
  const authHeader = req.headers.get('x-user-group');
  const userGroups = req.headers.get('x-user-groups')?.split(',') || [];
  
  if (!authHeader || authHeader === 'public') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id, version } = await context.params;
  
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

  const pageVersion = await prisma.pageVersion.findUnique({
    where: { 
      page_id_version: { 
        page_id: Number(id), 
        version: Number(version) 
      } 
    }
  });

  if (!pageVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...pageVersion,
    edited_at: pageVersion.edited_at.toISOString(),
  });
}
