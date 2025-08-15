import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth-utils';
import { SearchService } from '../../../lib/search/SearchService';
import { SearchQuery } from '../../../lib/search/types';

// GET /api/search?q=query&type=content&limit=20&offset=0&sortBy=relevance
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    const { searchParams } = new URL(req.url);
    
    const query = searchParams.get('q');
    const searchType = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'relevance';

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

    // Prepare search parameters
    const searchQuery: SearchQuery = {
      query: sanitizedQuery,
      searchType: searchType as any,
      limit,
      offset
    };

    const searchOptions = {
      limit,
      offset,
      sortBy: sortBy as any
    };

    // Perform search
    const results = await searchService.search(searchQuery, userPermissions, searchOptions);

    // Return results with metadata
    return NextResponse.json({
      results,
      metadata: {
        query: sanitizedQuery,
        searchType,
        total: results.length,
        limit,
        offset,
        sortBy
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during search' 
    }, { status: 500 });
  }
}
