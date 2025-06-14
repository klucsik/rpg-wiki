import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';

// GET, PUT, DELETE for a single page by id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Convert date fields to string for API response
  return NextResponse.json({
    ...page,
    created_at: page.created_at.toISOString(),
    updated_at: page.updated_at.toISOString(),
  });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { title, content, edit_groups, view_groups, path } = await req.json();
  const updated = await prisma.page.update({
    where: { id: Number(id) },
    data: {
      title,
      content,
      edit_groups: edit_groups || ['admin', 'editor'],
      view_groups: view_groups || ['admin', 'editor', 'viewer', 'public'],
      path,
      updated_at: new Date(),
    },
  });
  // Convert date fields to string for API response
  return NextResponse.json({
    ...updated,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.page.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
