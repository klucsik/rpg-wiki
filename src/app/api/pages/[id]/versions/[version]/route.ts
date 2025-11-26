import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db/db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../../../lib/auth-utils';
import { filterRestrictedContent, hasRestrictedContent } from '../../../../../../lib/server-content-filter';

// GET /api/pages/[id]/versions/[version] - Get specific version content
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; version: string }> }
) {
  const auth = await getAuthFromRequest(req);
  
  if (!auth.isAuthenticated) {
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

  const authError = requireEditPermissions(auth, page.edit_groups);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const pageVersion = await prisma.pageVersion.findUnique({
    where: { 
      page_id_version: { 
        page_id: Number(id), 
        version: Number(version) 
      } 
    }
  });

  if (!pageVersion || pageVersion.is_draft) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Apply server-side content filtering for version history (use view mode)
  let processedContent = pageVersion.content;
  
  if (hasRestrictedContent(pageVersion.content)) {
    const filterResult = filterRestrictedContent(pageVersion.content, {
      groups: auth.userGroups || ['public'],
      isAuthenticated: auth.isAuthenticated || false,
      username: auth.username
    }, { filterMode: 'view' }); // Use view mode for version history
    processedContent = filterResult.filteredContent;
  }

  return NextResponse.json({
    ...pageVersion,
    content: processedContent, // Filtered content
    edited_at: pageVersion.edited_at.toISOString(),
  });
}
