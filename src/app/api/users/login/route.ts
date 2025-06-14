import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { name: username },
    include: { groups: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  // If you use hashed passwords, compare here. For now, plain text for demo:
  // const valid = await bcrypt.compare(password, user.password);
  const valid = user.password === password;
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  // Return only safe user info
  return NextResponse.json({
    id: user.id,
    name: user.name,
    group: user.groups?.[0]?.name || 'public',
    groups: user.groups?.map(g => g.name) || [],
  });
}
