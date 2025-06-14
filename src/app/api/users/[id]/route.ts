import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';

// GET, PUT, DELETE for a single user by id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { groups: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { name, password, groupIds } = await req.json();
  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        name,
        password,
        groups: groupIds && Array.isArray(groupIds)
          ? { set: groupIds.map((id: number) => ({ id })) }
          : undefined,
      },
      include: { groups: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
