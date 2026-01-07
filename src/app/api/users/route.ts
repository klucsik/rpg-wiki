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
    // Create user email from username
    const email = `${username}@localhost.local`;
    
    // Use better-auth to create the user and account
    const signUpResult = await fetch(`${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        email,
        password,
        name: name || username,
      }),
    });

    if (!signUpResult.ok) {
      const error = await signUpResult.json();
      console.error('Better-auth signup error:', error);
      if (error.code === 'USER_ALREADY_EXISTS' || signUpResult.status === 409) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 400 });
    }

    const userData = await signUpResult.json();
    const userId = userData.user.id;
    
    // Update the user with username and ensure emailVerified is true
    await prisma.user.update({
      where: { id: userId },
      data: { 
        username, 
        emailVerified: true,
        name: name || username, // Ensure name is set
      },
    });
    
    // Create or get personal group for this user
    const personalGroup = await prisma.group.upsert({
      where: { name: username },
      update: {},
      create: { name: username },
    });
    
    // Combine personal group with any additional specified groups
    const allGroupIds = [personalGroup.id];
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      allGroupIds.push(...groupIds);
    }
    
    // Add user to groups
    await prisma.userGroup.createMany({
      data: allGroupIds.map(groupId => ({
        userId,
        groupId,
      })),
      skipDuplicates: true,
    });
    
    // Fetch user with groups
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
