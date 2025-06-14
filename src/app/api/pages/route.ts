import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';
import { WikiPage } from '../../../types';

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

// POST create new page
export async function POST(req: NextRequest) {
  const { title, content, edit_groups, view_groups, path } = await req.json();
  const created = await prisma.page.create({
    data: {
      title,
      content,
      edit_groups: edit_groups || ['admin', 'editor'],
      view_groups: view_groups || ['admin', 'editor', 'viewer', 'public'],
      path,
    },
  });
  // Convert date fields to string for API response
  return NextResponse.json({
    ...created,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
  });
}
