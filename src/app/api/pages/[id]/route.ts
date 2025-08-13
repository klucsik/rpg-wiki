import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../lib/auth-utils';
import { filterRestrictedContent, hasRestrictedContent } from '../../../../lib/server-content-filter';
import { restorePlaceholdersToRestrictedBlocks, hasRestrictedPlaceholders } from '../../../../lib/placeholder-restore';

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
  
  // Get the latest version (for permissions check) and latest published version (for change detection)
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

  // Get the latest published (non-draft) version for change comparison
  const latestPublishedVersion = await prisma.pageVersion.findFirst({
    where: { 
      page_id: parseInt(id),
      is_draft: false
    },
    orderBy: { version: 'desc' }
  });
  
  if (!latestPublishedVersion) {
    return NextResponse.json({ error: 'No published version found' }, { status: 404 });
  }

  const { title, content, edit_groups, view_groups, path, change_summary } = await req.json();
  
  // Restore any placeholders back to restricted blocks before saving
  let processedContent = content;
  if (hasRestrictedPlaceholders(content)) {
    processedContent = restorePlaceholdersToRestrictedBlocks(content);
    console.log('Restored placeholders to restricted blocks before publishing');
  }
  
  // Compute hash for change detection (includes content + metadata)
  const hashInput = JSON.stringify({
    title,
    content: processedContent,
    path,
    edit_groups: (edit_groups || []).sort(),
    view_groups: (view_groups || []).sort()
  });
  const newHash = createHash('sha256').update(hashInput).digest('hex');
 
  // Check if content actually changed compared to latest published version
  if (latestPublishedVersion.content_hash === newHash) {
    // No changes, return existing page info
    return NextResponse.json({
      id: parseInt(id),
      title: latestPublishedVersion.title,
      content: latestPublishedVersion.content,
      edit_groups: latestPublishedVersion.edit_groups,
      view_groups: latestPublishedVersion.view_groups,
      path: latestPublishedVersion.path,
      version: latestPublishedVersion.version,
      created_at: latestPublishedVersion.edited_at.toISOString(),
      updated_at: latestPublishedVersion.edited_at.toISOString(),
      no_change: true
    });
  }
  
  // Get the next version number (based on latest version overall, including drafts)
  const nextVersion = latestVersion.version + 1;

  // Get current page data to check if path is changing
  const currentPage = await prisma.page.findUnique({
    where: { id: parseInt(id) },
    select: { path: true }
  });

  // Prepare update data - only include path if it's actually changing
  const pageUpdateData: any = {
    title,
    content: processedContent,
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
        content: processedContent,
        path: path || currentPage?.path || '',
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin',  'public'],
        edited_by: auth.username,
        change_summary: change_summary || null,
        content_hash: newHash,
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

  // Delete from backup first (before database deletion)
  try {
    const { GitBackupService } = await import('../../../../gitBackupService');
    const backupService = GitBackupService.getInstance();
    await backupService.deletePageFromBackup(parseInt(id));
  } catch (error) {
    // Don't fail the deletion if backup deletion fails, just log the error
    console.error('Failed to delete page from backup:', error);
  }

  // Delete the main page record (this will cascade delete all versions due to onDelete: Cascade)
  await prisma.page.delete({ where: { id: parseInt(id) } });
  
  // Trigger backup after successful deletion to commit the file deletion
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
