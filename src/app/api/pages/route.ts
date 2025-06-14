import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';
import { WikiPage } from '../../../types';

// GET all pages
export async function GET() {
  const pages = await prisma.page.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(pages as WikiPage[]);
}

// POST create new page
export async function POST(req: NextRequest) {
  const { title, content, edit_groups } = await req.json();
  const created = await prisma.page.create({
    data: {
      title,
      content,
      edit_groups: edit_groups || ['admin', 'editor'],
    },
  });
  return NextResponse.json(created as WikiPage);
}
