import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../../lib/auth-utils';

// GET /api/pages/[id]/versions - Get all versions for a page
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const { id } = await context.params;
  
  if (!auth.isAuthenticated) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
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
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  // Check if we should include drafts (only for authenticated users)
  const url = new URL(req.url);
  const includeDrafts = url.searchParams.get('drafts') === 'true' && auth.isAuthenticated;
  
  let whereClause: {
    page_id: number;
    OR?: Array<{ is_draft: boolean; edited_by?: string }>;
    is_draft?: boolean;
  } = { page_id: parseInt(id) };
  
  if (includeDrafts) {
    // Include both published versions and user's own drafts
    whereClause = {
      page_id: parseInt(id),
      OR: [
        { is_draft: false }, // All published versions
        { is_draft: true, edited_by: auth.username } // User's own drafts
      ]
    };
  } else {
    // Only published versions
    whereClause.is_draft = false;
  }

  const versions = await prisma.pageVersion.findMany({
    where: whereClause,
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      title: true,
      edited_by: true,
      edited_at: true,
      change_summary: true,
      is_draft: true,
    }
  });

  return NextResponse.json(versions.map(v => ({
    ...v,
    edited_at: v.edited_at.toISOString(),
  })));
}
