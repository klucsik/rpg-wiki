import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db/db';
import { getAuthFromRequest } from '../../../../../lib/auth-utils';

// GET unfiltered content for admin export/backup
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthFromRequest(req);
  
  // Only allow admin users to access unfiltered content
  if (!auth.isAuthenticated || !auth.userGroups.includes('admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  // Check if we should load a draft version
  const url = new URL(req.url);
  const loadDraft = url.searchParams.get('draft') === 'true';
  
  if (loadDraft) {
    // Get the latest draft (could be from any user for admin access)
    const latestDraft = await prisma.pageVersion.findFirst({
      where: {
        page_id: parseInt(id),
        is_draft: true
      },
      orderBy: { version: 'desc' }
    });

    if (latestDraft) {
      return NextResponse.json({
        id: latestDraft.page_id,
        title: latestDraft.title,
        content: latestDraft.content, // COMPLETELY UNFILTERED content
        edit_groups: latestDraft.edit_groups,
        view_groups: latestDraft.view_groups,
        path: latestDraft.path,
        version: latestDraft.version,
        created_at: latestDraft.edited_at.toISOString(),
        updated_at: latestDraft.edited_at.toISOString(),
        is_draft: true,
        edited_by: latestDraft.edited_by
      });
    }
  }
  
  // Get the latest published version
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { 
      page_id: parseInt(id),
      is_draft: false
    },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Return COMPLETELY UNFILTERED content for admin export
  return NextResponse.json({
    id: latestVersion.page_id,
    title: latestVersion.title,
    content: latestVersion.content, // COMPLETELY UNFILTERED content
    edit_groups: latestVersion.edit_groups,
    view_groups: latestVersion.view_groups,
    path: latestVersion.path,
    version: latestVersion.version,
    created_at: latestVersion.edited_at.toISOString(),
    updated_at: latestVersion.edited_at.toISOString(),
    is_draft: false,
    edited_by: latestVersion.edited_by
  });
}
