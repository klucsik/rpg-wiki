import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '../../../db';
import { getAuthFromRequest, requireAuthentication } from '../../../lib/auth-utils';
import { canUserViewPage } from '../../../accessControl';

// GET all pages - filtered by user permissions
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  
  const pages = await prisma.page.findMany({ orderBy: { id: 'asc' } });
  
  // Filter pages based on user permissions
  const visiblePages = pages.filter(page => {
    // Create user object for permission checking
    const user = {
      group: auth.userGroups[0] || 'public',
      groups: auth.userGroups
    };
    
    // Convert page to match WikiPage type for permission checking
    const pageForPermission = {
      ...page,
      created_at: page.created_at.toISOString(),
      updated_at: page.updated_at.toISOString(),
    };
    
    return canUserViewPage(user, pageForPermission);
  });
  
  // Convert date fields to string for API response
  const pagesWithDates = visiblePages.map((p) => ({
    ...p,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }));
  
  return NextResponse.json(pagesWithDates);
}

// POST create new page or update existing - requires authentication
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  const authError = requireAuthentication(auth);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const { title, content, edit_groups, view_groups, path, change_summary } = await req.json();
  
  try {
    // First try to create a new page
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: {
          title,
          content,
          edit_groups: edit_groups || ['admin'],
          view_groups: view_groups || ['admin',  'public'],
          path,
        },
      });

      // Create the first version
      await tx.pageVersion.create({
        data: {
          page_id: created.id,
          version: 1,
          title,
          content,
          path,
          edit_groups: edit_groups || ['admin'],
          view_groups: view_groups || ['admin',  'public'],
          edited_by: auth.username,
          change_summary: change_summary || 'Initial version',
          content_hash: createHash('sha256').update(JSON.stringify({
            title,
            content,
            path,
            edit_groups: (edit_groups || ['admin']).sort(),
            view_groups: (view_groups || ['admin', 'public']).sort()
          })).digest('hex'),
          is_draft: false,
        },
      });

      return created;
    });

    // Convert date fields to string for API response
    const pageWithDates = {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };

    return NextResponse.json(pageWithDates, { status: 201 });
    
  } catch (error: unknown) {
    // If unique constraint violation on path, try to update existing page instead
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002' && 
        'meta' in error && error.meta && typeof error.meta === 'object' && 
        'target' in error.meta && Array.isArray(error.meta.target) && 
        error.meta.target.includes('path')) {
      try {
        // Find the existing page
        const existingPage = await prisma.page.findUnique({
          where: { path },
        });

        if (!existingPage) {
          return NextResponse.json({ error: 'Page conflict but cannot find existing page' }, { status: 409 });
        }

        // Update the existing page
        const result = await prisma.$transaction(async (tx) => {
          // Update the page
          const updated = await tx.page.update({
            where: { id: existingPage.id },
            data: {
              title,
              content,
              edit_groups: edit_groups || ['admin'],
              view_groups: view_groups || ['admin',  'public'],
              updated_at: new Date(),
            },
          });

          // Get the latest version number
          const latestVersion = await tx.pageVersion.findFirst({
            where: { page_id: existingPage.id },
            orderBy: { version: 'desc' },
          });

          const nextVersion = (latestVersion?.version || 0) + 1;

          // Create a new version
          await tx.pageVersion.create({
            data: {
              page_id: existingPage.id,
              version: nextVersion,
              title,
              content,
              path,
              edit_groups: edit_groups || ['admin'],
              view_groups: view_groups || ['admin',  'public'],
              edited_by: auth.username,
              change_summary: change_summary || `Update via import (version ${nextVersion})`,
              content_hash: createHash('sha256').update(JSON.stringify({
                title,
                content,
                path,
                edit_groups: (edit_groups || ['admin']).sort(),
                view_groups: (view_groups || ['admin', 'public']).sort()
              })).digest('hex'),
              is_draft: false,
            },
          });

          return updated;
        });

        // Convert date fields to string for API response
        const pageWithDates = {
          ...result,
          created_at: result.created_at.toISOString(),
          updated_at: result.updated_at.toISOString(),
        };

        return NextResponse.json(pageWithDates, { status: 200 });
        
      } catch (updateError) {
        console.error('Error updating existing page:', updateError);
        return NextResponse.json({ error: 'Failed to update existing page' }, { status: 500 });
      }
    }
    
    // Re-throw other errors
    console.error('Error creating page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
