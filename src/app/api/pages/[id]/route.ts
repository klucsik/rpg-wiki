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
  // Simple authentication check
  const authHeader = req.headers.get('x-user-group');
  const userGroups = req.headers.get('x-user-groups')?.split(',') || [];
  const userUsername = req.headers.get('x-user-name') || 'Unknown User';
  
  if (!authHeader || authHeader === 'public') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const existingPage = await prisma.page.findUnique({ 
    where: { id: Number(id) },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });
  
  if (!existingPage) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const canEdit = userGroups.some(g => existingPage.edit_groups.includes(g));
  if (!canEdit) {
    return NextResponse.json({ error: 'Insufficient permissions to edit this page' }, { status: 403 });
  }

  const { title, content, edit_groups, view_groups, path, change_summary } = await req.json();
  
  // Get the next version number
  const currentVersion = existingPage.versions.length > 0 ? existingPage.versions[0].version : 0;
  const nextVersion = currentVersion + 1;

  // Create new version entry
  await prisma.pageVersion.create({
    data: {
      page_id: Number(id),
      version: nextVersion,
      title,
      content,
      path,
      edit_groups: edit_groups || ['admin', 'editor'],
      view_groups: view_groups || ['admin', 'editor', 'viewer', 'public'],
      edited_by: userUsername,
      change_summary: change_summary || null,
    },
  });

  // Update the main page record
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
  // Simple authentication check
  const authHeader = req.headers.get('x-user-group');
  const userGroups = req.headers.get('x-user-groups')?.split(',') || [];
  
  if (!authHeader || authHeader === 'public') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const existingPage = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!existingPage) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const canEdit = userGroups.some(g => existingPage.edit_groups.includes(g));
  if (!canEdit) {
    return NextResponse.json({ error: 'Insufficient permissions to delete this page' }, { status: 403 });
  }

  await prisma.page.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
