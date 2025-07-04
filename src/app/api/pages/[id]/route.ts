import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../lib/auth-utils';
import { filterRestrictedContent, hasRestrictedContent } from '../../../../lib/server-content-filter';

// GET latest version of a page by page_id
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthFromRequest(req);
  
  // Check if we should load a draft version (if user is editing)
  const url = new URL(req.url);
  const loadDraft = url.searchParams.get('draft') === 'true';
  
  if (loadDraft && auth) {
    // Try to get the user's latest draft first
    const latestDraft = await prisma.pageVersion.findFirst({
      where: {
        page_id: parseInt(id),
        edited_by: auth.username,
        is_draft: true
      },
      orderBy: { version: 'desc' }
    });

    if (latestDraft) {
      // Apply content filtering to draft as well
      let processedDraftContent = latestDraft.content;
      
      if (hasRestrictedContent(latestDraft.content)) {
        const filterResult = filterRestrictedContent(latestDraft.content, {
          groups: auth.userGroups || ['public'],
          isAuthenticated: auth.isAuthenticated || false,
          username: auth.username
        }, { filterMode: 'view' }); // Use view mode for regular page viewing
        processedDraftContent = filterResult.filteredContent;
      }
      
      return NextResponse.json({
        id: latestDraft.page_id,
        title: latestDraft.title,
        content: processedDraftContent,
        edit_groups: latestDraft.edit_groups,
        view_groups: latestDraft.view_groups,
        path: latestDraft.path,
        version: latestDraft.version,
        created_at: latestDraft.edited_at.toISOString(),
        updated_at: latestDraft.edited_at.toISOString(),
        is_draft: true
      });
    }
  }
  
  // First check if the main page record exists
  const pageExists = await prisma.page.findUnique({
    where: { id: parseInt(id) },
    select: { id: true }
  });
  
  if (!pageExists) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  
  // Get the latest published version of this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { 
      page_id: parseInt(id),
      is_draft: false
    },
    orderBy: { version: 'desc' }
  });
  
  if (!latestVersion) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  
  // Apply server-side content filtering based on user permissions
  let processedContent = latestVersion.content;
  let removedBlocks: Array<{ title: string; groups: string[] }> = [];
  
  if (hasRestrictedContent(latestVersion.content)) {
    const filterResult = filterRestrictedContent(latestVersion.content, {
      groups: auth?.userGroups || ['public'],
      isAuthenticated: auth?.isAuthenticated || false,
      username: auth?.username
    }, { filterMode: 'view' }); // Use view mode for regular page viewing
    processedContent = filterResult.filteredContent;
    removedBlocks = filterResult.removedBlocks;
    
    // Log removed blocks for audit (optional)
    if (removedBlocks.length > 0) {
      console.log(`Filtered ${removedBlocks.length} restricted blocks for user ${auth?.username || 'anonymous'}`);
    }
  }

  // Convert date fields to string for API response
  return NextResponse.json({
    id: latestVersion.page_id,
    title: latestVersion.title,
    content: processedContent,
    edit_groups: latestVersion.edit_groups,
    view_groups: latestVersion.view_groups,
    path: latestVersion.path,
    version: latestVersion.version,
    created_at: latestVersion.edited_at.toISOString(),
    updated_at: latestVersion.edited_at.toISOString(),
    is_draft: false,
    // Include metadata about filtering for debugging (optional)
    _filtering: {
      removedBlocksCount: removedBlocks.length,
      hasRestrictedContent: hasRestrictedContent(latestVersion.content)
    }
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

  // Get current page data to check if path is changing
  const currentPage = await prisma.page.findUnique({
    where: { id: parseInt(id) },
    select: { path: true }
  });

  // Prepare update data - only include path if it's actually changing
  const pageUpdateData: any = {
    title,
    content,
    edit_groups: edit_groups || ['admin'],
    view_groups: view_groups || ['admin',  'public'],
    updated_at: new Date(),
  };

  // Only update path if it's different from current path
  if (currentPage && path && path !== currentPage.path) {
    pageUpdateData.path = path;
  }

  // Create new version entry and update main page table in a transaction
  const [newVersion] = await prisma.$transaction([
    // Create new version entry (not a draft)
    prisma.pageVersion.create({
      data: {
        page_id: parseInt(id),
        version: nextVersion,
        title,
        content,
        path: path || currentPage?.path || '',
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin',  'public'],
        edited_by: auth.username,
        change_summary: change_summary || null,
        is_draft: false,
      },
    }),
    // Update main page table with latest data
    prisma.page.update({
      where: { id: parseInt(id) },
      data: pageUpdateData,
    }),
  ]);

  // Clean up any drafts by this user for this page since we've now published
  await prisma.pageVersion.deleteMany({
    where: {
      page_id: parseInt(id),
      edited_by: auth.username,
      is_draft: true
    }
  });
  
  // Trigger backup after successful save
  try {
    const { GitBackupService } = await import('../../../../gitBackupService');
    const backupService = GitBackupService.getInstance();
    const settings = await backupService.getSettings();
    
    if (settings.enabled) {
      await backupService.createBackupJob(auth.username, 'auto');
    }
  } catch (error) {
    // Don't fail the save if backup fails, just log the error
    console.error('Failed to trigger backup after page save:', error);
  }
  
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

  // Delete the main page record (this will cascade delete all versions due to onDelete: Cascade)
  await prisma.page.delete({ where: { id: parseInt(id) } });
  
  // Trigger backup after successful deletion
  try {
    const { GitBackupService } = await import('../../../../gitBackupService');
    const backupService = GitBackupService.getInstance();
    const settings = await backupService.getSettings();
    
    if (settings.enabled) {
      await backupService.createBackupJob(auth.username, 'auto');
    }
  } catch (error) {
    // Don't fail the deletion if backup fails, just log the error
    console.error('Failed to trigger backup after page deletion:', error);
  }
  
  return NextResponse.json({ success: true });
}
