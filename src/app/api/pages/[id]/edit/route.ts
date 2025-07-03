import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../../lib/auth-utils';

// GET raw content for editing (no content filtering)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthFromRequest(req);
  
  // Check if we should load a draft version (if user is editing)
  const url = new URL(req.url);
  const loadDraft = url.searchParams.get('draft') === 'true';
  
  if (loadDraft && auth) {
    // Try to get the user's latest draft first
    const latestDraft = await prisma.pageVersion.findFirst({
      where: {
        page_id: parseInt(id),
        edited_by: auth.username,
        is_draft: true
      },
      orderBy: { version: 'desc' }
    });

    if (latestDraft) {
      // Check edit permissions
      const authError = requireEditPermissions(auth, latestDraft.edit_groups);
      if (authError) {
        return NextResponse.json({ error: authError.error }, { status: authError.status });
      }
      
      return NextResponse.json({
        id: latestDraft.page_id,
        title: latestDraft.title,
        content: latestDraft.content, // UNFILTERED content for editor
        edit_groups: latestDraft.edit_groups,
        view_groups: latestDraft.view_groups,
        path: latestDraft.path,
        version: latestDraft.version,
        created_at: latestDraft.edited_at.toISOString(),
        updated_at: latestDraft.edited_at.toISOString(),
        is_draft: true
      });
    }
  }
  
  // Get the latest published version of this page
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
  
  // Check edit permissions
  const authError = requireEditPermissions(auth, latestVersion.edit_groups);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  // Return UNFILTERED content for editor
  return NextResponse.json({
    id: latestVersion.page_id,
    title: latestVersion.title,
    content: latestVersion.content, // UNFILTERED content for editor
    edit_groups: latestVersion.edit_groups,
    view_groups: latestVersion.view_groups,
    path: latestVersion.path,
    version: latestVersion.version,
    created_at: latestVersion.edited_at.toISOString(),
    updated_at: latestVersion.edited_at.toISOString(),
    is_draft: false
  });
}
