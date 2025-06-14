import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';
import { WikiPage } from '../../../../types';

// GET, PUT, DELETE for a single page by id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(page as WikiPage);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { title, content, edit_groups } = await req.json();
  const updated = await prisma.page.update({
    where: { id: Number(id) },
    data: {
      title,
      content,
      edit_groups: edit_groups || ['admin', 'editor'],
      updated_at: new Date(),
    },
  });
  return NextResponse.json(updated as WikiPage);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.page.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
