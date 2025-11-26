import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/db';
import bcrypt from 'bcryptjs';

// GET, PUT, DELETE for a single user by id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      userGroups: {
        include: {
          group: true
        }
      }
    },
  });
  
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
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
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { name, username, password, groupIds } = await req.json();
  
  try {
    // Prepare the update data
    const updateData: {
      name: string;
      username: string;
      password?: string;
    } = {
      name: name || username,
      username,
    };
    
    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Update user and handle group memberships
    const user = await prisma.$transaction(async (tx) => {
      // Update user basic info
      await tx.user.update({
        where: { id },
        data: updateData,
      });
      
      // Update group memberships if groupIds provided
      if (groupIds && Array.isArray(groupIds)) {
        // Remove existing group memberships
        await tx.userGroup.deleteMany({
          where: { userId: id }
        });
        
        // Add new group memberships
        if (groupIds.length > 0) {
          await tx.userGroup.createMany({
            data: groupIds.map((groupId: number) => ({
              userId: id,
              groupId: groupId
            }))
          });
        }
      }
      
      // Return user with groups
      return await tx.user.findUnique({
        where: { id },
        include: { 
          userGroups: {
            include: {
              group: true
            }
          }
        },
      });
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
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
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    // Check if this is the admin user - prevent deletion
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (user && user.username === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 403 });
    }
    
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
