import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../db';

// GET all groups
export async function GET() {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(groups);
}

// POST create new group
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid group name' }, { status: 400 });
  }
  try {
    const created = await prisma.group.create({ data: { name } });
    return NextResponse.json(created);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
