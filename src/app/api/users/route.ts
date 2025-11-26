import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db/db';
import bcrypt from 'bcryptjs';

// GET all users (with groups)
export async function GET() {
  const users = await prisma.user.findMany({
    include: { 
      userGroups: {
        include: {
          group: true
        }
      }
    },
    orderBy: { createdAt: 'asc' },
  });
  
  // Transform to match the expected format
  const transformedUsers = users.map(user => ({
    id: user.id,
    name: user.name || user.username,
    username: user.username,
    email: user.email,
    groups: user.userGroups.map(ug => ({
      id: ug.group.id,
      name: ug.group.name
    }))
  }));
  
  return NextResponse.json(transformedUsers);
}

// POST create new user
export async function POST(req: NextRequest) {
  const userData: unknown = await req.json();
  const { name, username, password, groupIds } = userData as {
    name?: string;
    username: string;
    password: string;
    groupIds?: number[];
  };
  
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
  }
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create or get personal group for this user
    const personalGroup = await prisma.group.upsert({
      where: { name: username },
      update: {}, // If group exists, don't change it
      create: { name: username }, // Create group with username as name
    });
    
    // Combine personal group with any additional specified groups
    const allGroupIds = [personalGroup.id];
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      allGroupIds.push(...groupIds);
    }
    
    const user = await prisma.user.create({
      data: {
        name: name || username,
        username,
        password: hashedPassword,
        userGroups: {
          create: allGroupIds.map(groupId => ({ groupId }))
        },
      },
      include: { 
        userGroups: {
          include: {
            group: true
          }
        }
      },
    });
    
    // Transform to match the expected format
    const transformedUser = {
      id: user.id,
      name: user.name || user.username,
      username: user.username,
      email: user.email,
      groups: user.userGroups.map(ug => ({
        id: ug.group.id,
        name: ug.group.name
      }))
    };
    
    return NextResponse.json(transformedUser);
  } catch (err) {
    console.error('Error creating user:', err);
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
