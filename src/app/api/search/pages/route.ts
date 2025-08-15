import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../../lib/auth-utils';
import { SearchService } from '../../../../lib/search/SearchService';

// GET /api/search/pages?q=query&limit=20
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const { searchParams } = new URL(req.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate query
    if (!query) {
      return NextResponse.json({ 
        error: 'Query parameter "q" is required' 
      }, { status: 400 });
    }

    // Initialize search service
    const searchService = new SearchService();
    
    // Validate search query
    const validation = searchService.validateSearchQuery(query);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 });
    }

    // Sanitize query
    const sanitizedQuery = searchService.sanitizeQuery(query);

    // Prepare user permissions
    const userPermissions = {
      groups: auth.userGroups || ['public'],
      isAuthenticated: auth.isAuthenticated || false,
      username: auth.username
    };

    // Perform search for linking
    const results = await searchService.searchForLinking(sanitizedQuery, userPermissions, limit);

    // Return results
    return NextResponse.json({
      results,
      metadata: {
        query: sanitizedQuery,
        total: results.length,
        limit
      }
    });

  } catch (error) {
    console.error('Page search API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during page search' 
    }, { status: 500 });
  }
}
