import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';

// GET, PUT, DELETE for a single user by id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findUnique({
    where: { id: Number(params.id) },
    include: { groups: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name, password, groupIds } = await req.json();
  try {
    const user = await prisma.user.update({
      where: { id: Number(params.id) },
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
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
