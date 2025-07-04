import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '../../../../../db';
import { getAuthFromRequest, requireEditPermissions } from '../../../../../lib/auth-utils';

// POST autosave draft version
export async function POST(
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

  const { title, content, edit_groups, view_groups, path } = await req.json();
  // Compute hash for change detection (includes content + metadata)
  const hashInput = JSON.stringify({
    title,
    content,
    path,
    edit_groups: (edit_groups || []).sort(),
    view_groups: (view_groups || []).sort()
  });
  const newHash = createHash('sha256').update(hashInput).digest('hex');
  
  // Check against latest published version: skip if no change
  const latestPublished = await prisma.pageVersion.findFirst({
    where: { page_id: parseInt(id), is_draft: false },
    orderBy: { version: 'desc' },
    select: { content_hash: true, edited_at: true }
  });
  if (latestPublished?.content_hash === newHash) {
    // No changes since last published, return existing published info
    return NextResponse.json({ 
      id: parseInt(id), 
      version: latestPublished ? latestPublished : undefined, 
      saved_at: latestPublished?.edited_at.toISOString(), 
      is_draft: false,
      no_change: true
    });
  }

  // Check if there's already a recent draft by this user (within last 5 minutes)
  const recentDraft = await prisma.pageVersion.findFirst({
    where: {
      page_id: parseInt(id),
      edited_by: auth.username,
      is_draft: true,
      edited_at: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      }
    },
    orderBy: { version: 'desc' }
  });

  let draftVersion;

  if (recentDraft) {
    // Check if content actually changed before updating
    if (recentDraft.content_hash === newHash) {
      // No changes, return existing draft info
      return NextResponse.json({
        id: recentDraft.page_id,
        version: recentDraft.version,
        saved_at: recentDraft.edited_at.toISOString(),
        is_draft: true,
        no_change: true
      });
    }
    
    // Update the existing recent draft with new content
    draftVersion = await prisma.pageVersion.update({
      where: { id: recentDraft.id },
      data: {
        title,
        content,
        path,
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin', 'public'],
        content_hash: newHash,
        edited_at: new Date(),
      },
    });
  } else {
    // Get the next version number
    const maxVersion = await prisma.pageVersion.findFirst({
      where: { page_id: parseInt(id) },
      orderBy: { version: 'desc' },
      select: { version: true }
    });
    
    const nextVersion = (maxVersion?.version || 0) + 1;

    // Create new draft version
    draftVersion = await prisma.pageVersion.create({
      data: {
        page_id: parseInt(id),
        version: nextVersion,
        title,
        content,
        path,
        edit_groups: edit_groups || ['admin'],
        view_groups: view_groups || ['admin', 'public'],
        edited_by: auth.username,
        is_draft: true,
        change_summary: 'Autosave draft',
        content_hash: newHash, // Store the content hash
      },
    });

    // Clean up old drafts for this page/user (keep only the 3 most recent)
    const oldDrafts = await prisma.pageVersion.findMany({
      where: {
        page_id: parseInt(id),
        edited_by: auth.username,
        is_draft: true,
        id: { not: draftVersion.id }
      },
      orderBy: { version: 'desc' },
      skip: 2, // Keep 2 most recent (plus the new one = 3 total)
    });

    if (oldDrafts.length > 0) {
      await prisma.pageVersion.deleteMany({
        where: {
          id: { in: oldDrafts.map(d => d.id) }
        }
      });
    }
  }
  
  return NextResponse.json({
    id: draftVersion.page_id,
    version: draftVersion.version,
    saved_at: draftVersion.edited_at.toISOString(),
    is_draft: true
  });
}

// GET latest draft or published version
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  const { id } = await context.params;
  
  // First try to get the user's latest draft
  const latestDraft = await prisma.pageVersion.findFirst({
    where: {
      page_id: parseInt(id),
      edited_by: auth.username,
      is_draft: true
    },
    orderBy: { version: 'desc' }
  });

  if (latestDraft) {
    return NextResponse.json({
      id: latestDraft.page_id,
      title: latestDraft.title,
      content: latestDraft.content,
      edit_groups: latestDraft.edit_groups,
      view_groups: latestDraft.view_groups,
      path: latestDraft.path,
      version: latestDraft.version,
      created_at: latestDraft.edited_at.toISOString(),
      updated_at: latestDraft.edited_at.toISOString(),
      is_draft: true
    });
  }

  // Fall back to latest published version
  const latestPublished = await prisma.pageVersion.findFirst({
    where: { 
      page_id: parseInt(id),
      is_draft: false
    },
    orderBy: { version: 'desc' }
  });
  
  if (!latestPublished) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    id: latestPublished.page_id,
    title: latestPublished.title,
    content: latestPublished.content,
    edit_groups: latestPublished.edit_groups,
    view_groups: latestPublished.view_groups,
    path: latestPublished.path,
    version: latestPublished.version,
    created_at: latestPublished.edited_at.toISOString(),
    updated_at: latestPublished.edited_at.toISOString(),
    is_draft: false
  });
}
