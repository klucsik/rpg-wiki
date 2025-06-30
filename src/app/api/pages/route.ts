import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';

// GET all pages
export async function GET() {
  const pages = await prisma.page.findMany({ orderBy: { id: 'asc' } });
  // Convert date fields to string for API response
  const pagesWithDates = pages.map((p) => ({
    ...p,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }));
  return NextResponse.json(pagesWithDates);
}

// POST create new page - requires authentication
export async function POST(req: NextRequest) {
  // Simple authentication check - look for user credentials in request
  const authHeader = req.headers.get('x-user-group');
  const userUsername = req.headers.get('x-user-name') || 'Unknown User';
  
  if (!authHeader || authHeader === 'public') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
        edited_by: userUsername,
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
