import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../lib/auth-utils';

// GET latest version of a page by page_id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  // Get the latest version of this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { page_id: parseInt(id) },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  
  // Convert date fields to string for API response
  return NextResponse.json({
    id: latestVersion.page_id,
    title: latestVersion.title,
    content: latestVersion.content,
    edit_groups: latestVersion.edit_groups,
    view_groups: latestVersion.view_groups,
    path: latestVersion.path,
    version: latestVersion.version,
    created_at: latestVersion.edited_at.toISOString(),
    updated_at: latestVersion.edited_at.toISOString(),
  });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { page_id: parseInt(id) },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const authError = requireEditPermissions(auth, latestVersion.edit_groups);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { title, content, edit_groups, view_groups, path, change_summary } = await req.json();
  
  // Get the next version number
  const nextVersion = latestVersion.version + 1;

  // Create new version entry and update main page table in a transaction
  const [newVersion] = await prisma.$transaction([
    // Create new version entry
    prisma.pageVersion.create({
      data: {
        page_id: parseInt(id),
        version: nextVersion,
        title,
        content,
        path,
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin',  'public'],
        edited_by: auth.username,
        change_summary: change_summary || null,
      },
    }),
    // Update main page table with latest data
    prisma.page.update({
      where: { id: parseInt(id) },
      data: {
        title,
        content,
        path,
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin',  'public'],
        updated_at: new Date(),
      },
    }),
  ]);
  
  // Convert date fields to string for API response
  return NextResponse.json({
    id: newVersion.page_id,
    title: newVersion.title,
    content: newVersion.content,
    edit_groups: newVersion.edit_groups,
    view_groups: newVersion.view_groups,
    path: newVersion.path,
    version: newVersion.version,
    created_at: newVersion.edited_at.toISOString(),
    updated_at: newVersion.edited_at.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const { id } = await context.params;
  
  // Check if user has edit permissions for this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { page_id: parseInt(id) },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const authError = requireEditPermissions(auth, latestVersion.edit_groups);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  // Delete all versions of this page
  await prisma.pageVersion.deleteMany({ where: { page_id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
