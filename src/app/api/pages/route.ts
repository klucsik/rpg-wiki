import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';
import { authenticateRequest, requireAuthentication } from '../../../auth';
import { canUserViewPage } from '../../../accessControl';

// GET all pages - filtered by user permissions
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  
  const pages = await prisma.page.findMany({ orderBy: { id: 'asc' } });
  
  // Filter pages based on user permissions
  const visiblePages = pages.filter(page => {
    // Create user object for permission checking
    const user = {
      group: auth.userGroups[0] || 'public',
      groups: auth.userGroups
    };
    
    // Convert page to match WikiPage type for permission checking
    const pageForPermission = {
      ...page,
      created_at: page.created_at.toISOString(),
      updated_at: page.updated_at.toISOString(),
    };
    
    return canUserViewPage(user, pageForPermission);
  });
  
  // Convert date fields to string for API response
  const pagesWithDates = visiblePages.map((p) => ({
    ...p,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }));
  
  return NextResponse.json(pagesWithDates);
}

// POST create new page - requires authentication
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { title, content, edit_groups, view_groups, path, change_summary } = await req.json();
  
  // Create page and first version in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.page.create({
      data: {
        title,
        content,
        edit_groups: edit_groups || ['admin', 'editor'],
        view_groups: view_groups || ['admin', 'editor', 'viewer', 'public'],
        path,
      },
    });

    // Create the first version
    await tx.pageVersion.create({
      data: {
        page_id: created.id,
        version: 1,
        title,
        content,
        path,
        edit_groups: edit_groups || ['admin', 'editor'],
        view_groups: view_groups || ['admin', 'editor', 'viewer', 'public'],
        edited_by: auth.username,
        change_summary: change_summary || 'Initial version',
      },
    });

    return created;
  });

  // Convert date fields to string for API response
  return NextResponse.json({
    ...result,
    created_at: result.created_at.toISOString(),
    updated_at: result.updated_at.toISOString(),
  });
}
