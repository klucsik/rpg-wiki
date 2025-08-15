import { prisma } from '../../db';
import { canUserViewPage } from '../../accessControl';
import { UserPermissions } from '../server-content-filter';
import { ContentExtractor } from './ContentExtractor';
import { SearchResult, SearchQuery, SearchOptions } from './types';

export class ContentSearchEngine {
  private contentExtractor: ContentExtractor;

  constructor() {
    this.contentExtractor = new ContentExtractor();
  }

  /**
   * Performs full-text search across wiki content with permission filtering
   */
  async searchContent(
    searchQuery: SearchQuery,
    userPermissions: UserPermissions,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { query, searchType = 'all' } = searchQuery;
    const { limit = 20, offset = 0, sortBy = 'relevance' } = options;

    if (!query.trim()) {
      return [];
    }

    // Build search conditions based on search type
    const searchConditions = this.buildSearchConditions(query, searchType);
    
    // Get pages with permission pre-filtering
    const pages = await prisma.page.findMany({
      where: searchConditions,
      take: limit * 2, // Get more results to account for permission filtering
      skip: offset,
      orderBy: this.buildOrderBy(sortBy, query)
    });

    // Filter by page-level permissions first
    const accessiblePages = pages.filter(page => {
      const user = {
        groups: userPermissions.groups,
        group: userPermissions.groups[0] || 'public'
      };
      
      const pageForPermission = {
        ...page,
        created_at: page.created_at.toISOString(),
        updated_at: page.updated_at.toISOString(),
      };
      
      return canUserViewPage(user, pageForPermission);
    });

    // Process each page for content-level permissions and create search results
    const searchResults = await Promise.all(
      accessiblePages.map(page => this.createSearchResult(page, query, userPermissions))
    );

    // Filter out results with no accessible content and apply final limit
    const validResults = searchResults
      .filter(result => result.snippet.length > 0)
      .slice(0, limit);

    return this.rankResults(validResults, query, sortBy);
  }

  /**
   * Builds Prisma search conditions based on search type
   */
  private buildSearchConditions(query: string, searchType: string) {
    const baseConditions: any[] = [];

    if (searchType === 'title' || searchType === 'all') {
      baseConditions.push({
        title: { contains: query, mode: 'insensitive' as const }
      });
    }

    if (searchType === 'path' || searchType === 'all') {
      baseConditions.push({
        path: { contains: query, mode: 'insensitive' as const }
      });
    }

    if (searchType === 'content' || searchType === 'all') {
      // Use simple contains search for now - we can optimize with full-text search later
      // Note: This searches raw content including restricted blocks
      // We'll filter permissions in post-processing
      baseConditions.push({
        content: { contains: query, mode: 'insensitive' as const }
      });
    }

    return baseConditions.length > 0 ? { OR: baseConditions } : {};
  }

  /**
   * Builds Prisma orderBy clause based on sort preference
   */
  private buildOrderBy(sortBy: string, query: string) {
    switch (sortBy) {
      case 'title':
        return [{ title: 'asc' as const }];
      case 'updated_at':
        return [{ updated_at: 'desc' as const }];
      case 'relevance':
      default:
        // For relevance, we'll do a basic order and then re-rank in memory
        return [
          { updated_at: 'desc' as const },
          { title: 'asc' as const }
        ];
    }
  }

  /**
   * Creates a search result for a page with permission-aware content processing
   */
  private async createSearchResult(
    page: any,
    query: string,
    userPermissions: UserPermissions
  ): Promise<SearchResult> {
    // Extract permission-aware content
    const extractedContent = this.contentExtractor.extractSearchableContent(
      page.content,
      userPermissions
    );

    // Check if query matches in title or path (always accessible)
    const queryLower = query.toLowerCase();
    const titleMatch = page.title.toLowerCase().includes(queryLower);
    const pathMatch = page.path.toLowerCase().includes(queryLower);
    
    // Check if query matches in accessible content
    const accessibleContentMatch = extractedContent.allTextContent.toLowerCase().includes(queryLower);
    
    // If no match in title, path, or accessible content, this shouldn't be a result
    if (!titleMatch && !pathMatch && !accessibleContentMatch) {
      return {
        pageId: page.id,
        title: page.title,
        path: page.path,
        snippet: '', // Empty snippet means this result will be filtered out
        matchType: 'content',
        score: 0,
        hasRestrictedMatches: extractedContent.restrictedBlocks.length > 0
      };
    }

    // Determine match type
    const matchType = this.determineMatchType(page, query, extractedContent.allTextContent);

    // Create snippet from accessible content
    const snippet = this.contentExtractor.createSnippet(
      extractedContent.accessibleContent,
      query,
      200
    );

    // Calculate basic relevance score
    const score = this.calculateRelevanceScore(page, query, extractedContent.allTextContent, matchType);

    return {
      pageId: page.id,
      title: page.title,
      path: page.path,
      snippet,
      matchType,
      score,
      hasRestrictedMatches: extractedContent.restrictedBlocks.length > 0
    };
  }

  /**
   * Determines the primary match type for a search result
   */
  private determineMatchType(page: any, query: string, accessibleContentText: string): 'title' | 'path' | 'content' {
    const queryLower = query.toLowerCase();
    
    if (page.title.toLowerCase().includes(queryLower)) {
      return 'title';
    }
    
    if (page.path.toLowerCase().includes(queryLower)) {
      return 'path';
    }
    
    return 'content';
  }

  /**
   * Calculates a relevance score for ranking results
   */
  private calculateRelevanceScore(
    page: any,
    query: string,
    accessibleContentText: string,
    matchType: 'title' | 'path' | 'content'
  ): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Base score by match type (title matches are most valuable)
    switch (matchType) {
      case 'title':
        score = 100;
        break;
      case 'path':
        score = 50;
        break;
      case 'content':
        score = 25;
        break;
    }

    // Boost for exact matches
    if (page.title.toLowerCase() === queryLower) {
      score += 50;
    }

    // Boost for matches at the beginning
    if (page.title.toLowerCase().startsWith(queryLower)) {
      score += 25;
    }

    // Count occurrences in accessible content only (diminishing returns)
    const contentLower = accessibleContentText.toLowerCase();
    const occurrences = (contentLower.match(new RegExp(this.escapeRegex(queryLower), 'g')) || []).length;
    score += Math.min(occurrences * 5, 25); // Max 25 points from content occurrences

    // Boost for shorter titles (more specific matches)
    if (page.title.length < 50) {
      score += 10;
    }

    // Recent content boost (slight preference for recently updated)
    const daysSinceUpdate = (Date.now() - new Date(page.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 5;
    }

    return score;
  }

  /**
   * Ranks and sorts search results
   */
  private rankResults(results: SearchResult[], query: string, sortBy: string): SearchResult[] {
    if (sortBy === 'relevance') {
      return results.sort((a, b) => b.score - a.score);
    }
    
    if (sortBy === 'title') {
      return results.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    // For updated_at, we rely on the database ordering
    return results;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
