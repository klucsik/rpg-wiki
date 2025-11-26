import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db/db';
import { getAuthFromRequest } from '../../../../lib/auth-utils';

// POST cleanup old drafts
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  
  if (!auth.isAuthenticated || !auth.userGroups.includes('admin')) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    // Delete drafts older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const deletedDrafts = await prisma.pageVersion.deleteMany({
      where: {
        is_draft: true,
        edited_at: {
          lt: sevenDaysAgo
        }
      }
    });

    // For each page, keep only the 3 most recent drafts per user
    const pages = await prisma.page.findMany({ select: { id: true } });
    
    let totalCleanedDrafts = deletedDrafts.count;

    for (const page of pages) {
      // Get all users who have drafts for this page
      const usersWithDrafts = await prisma.pageVersion.findMany({
        where: {
          page_id: page.id,
          is_draft: true
        },
        select: { edited_by: true },
        distinct: ['edited_by']
      });

      for (const userDraft of usersWithDrafts) {
        // Get drafts for this user/page combination, ordered by version desc
        const userPageDrafts = await prisma.pageVersion.findMany({
          where: {
            page_id: page.id,
            edited_by: userDraft.edited_by,
            is_draft: true
          },
          orderBy: { version: 'desc' },
          skip: 3, // Keep the 3 most recent
        });

        if (userPageDrafts.length > 0) {
          const deletedUserDrafts = await prisma.pageVersion.deleteMany({
            where: {
              id: { in: userPageDrafts.map(d => d.id) }
            }
          });
          totalCleanedDrafts += deletedUserDrafts.count;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: totalCleanedDrafts,
      message: `Cleaned up ${totalCleanedDrafts} old draft versions`
    });
    
  } catch (error) {
    console.error('Error cleaning up drafts:', error);
    return NextResponse.json({ error: 'Failed to cleanup drafts' }, { status: 500 });
  }
}
