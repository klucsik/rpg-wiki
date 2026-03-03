import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/db';
import { withMetrics } from '@/lib/metrics/withMetrics';

// GET all groups
async function GETHandler() {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(groups);
}

// POST create new group
async function POSTHandler(req: NextRequest) {
  const groupData: unknown = await req.json();
  const { name } = groupData as { name: string };
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid group name' }, { status: 400 });
  }
  try {
    const created = await prisma.group.create({ data: { name } });
    return NextResponse.json(created);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

// DELETE group by name
async function DELETEHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const name = searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Missing group name' }, { status: 400 });
  }
  try {
    await prisma.group.delete({ where: { name } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

export const GET = withMetrics('/api/groups', GETHandler);
export const POST = withMetrics('/api/groups', POSTHandler);
export const DELETE = withMetrics('/api/groups', DELETEHandler);
