import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../../../lib/auth-utils';
import { SearchService } from '../../../../../lib/search/SearchService';

// GET /api/search/pages/recent?limit=10
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '10');

    // Initialize search service
    const searchService = new SearchService();

    // Prepare user permissions
    const userPermissions = {
      groups: auth.userGroups || ['public'],
      isAuthenticated: auth.isAuthenticated || false,
      username: auth.username
    };

    // Get recent pages
    const results = await searchService.getRecentPages(userPermissions, limit);

    // Return results
    return NextResponse.json({
      results,
      metadata: {
        total: results.length,
        limit
      }
    });

  } catch (error) {
    console.error('Recent pages API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error getting recent pages' 
    }, { status: 500 });
  }
}
