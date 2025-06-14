import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';

// GET all users (with groups)
export async function GET() {
  const users = await prisma.user.findMany({
    include: { groups: true },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(users);
}

// POST create new user
export async function POST(req: NextRequest) {
  // Replace 'any' with 'unknown' for userData parameter
  const userData: unknown = await req.json();
  const { name, password, groupIds } = userData as {
    name: string;
    password: string;
    groupIds?: number[];
  };
  if (!name || !password) {
    return NextResponse.json({ error: 'Missing name or password' }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({
      data: {
        name,
        password,
        groups: groupIds && Array.isArray(groupIds)
          ? { connect: groupIds.map((id: number) => ({ id })) }
          : undefined,
      },
      include: { groups: true },
    });
    return NextResponse.json(user);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
