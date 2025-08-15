import { UserPermissions } from '../server-content-filter';
import { ContentSearchEngine } from './ContentSearchEngine';
import { TitlePathSearchEngine } from './TitlePathSearchEngine';
import { ContentExtractor } from './ContentExtractor';
import { SearchQuery, SearchResult, LinkSearchResult, SearchOptions } from './types';

export class SearchService {
  private contentSearchEngine: ContentSearchEngine;
  private titlePathSearchEngine: TitlePathSearchEngine;
  private contentExtractor: ContentExtractor;

  constructor() {
    this.contentSearchEngine = new ContentSearchEngine();
    this.titlePathSearchEngine = new TitlePathSearchEngine();
    this.contentExtractor = new ContentExtractor();
  }

  /**
   * Main search method for full-text content search
   */
  async search(
    searchQuery: SearchQuery,
    userPermissions: UserPermissions,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    return this.contentSearchEngine.searchContent(searchQuery, userPermissions, options);
  }

  /**
   * Search specifically for page titles and paths (optimized for link creation)
   */
  async searchForLinking(
    query: string,
    userPermissions: UserPermissions,
    limit: number = 20
  ): Promise<LinkSearchResult[]> {
    return this.titlePathSearchEngine.searchForLinking(query, userPermissions, limit);
  }

  /**
   * Get recent pages for quick access in link creation
   */
  async getRecentPages(
    userPermissions: UserPermissions,
    limit: number = 10
  ): Promise<LinkSearchResult[]> {
    return this.titlePathSearchEngine.getRecentPages(userPermissions, limit);
  }

  /**
   * Highlight search terms in content for display
   */
  highlightSearchTerms(content: string, query: string): string {
    return this.contentExtractor.highlightQuery(content, query);
  }

  /**
   * Utility method to validate search queries
   */
  validateSearchQuery(query: string): { valid: boolean; error?: string } {
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Query must be a non-empty string' };
    }

    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length === 0) {
      return { valid: false, error: 'Query cannot be empty' };
    }

    if (trimmedQuery.length < 2) {
      return { valid: false, error: 'Query must be at least 2 characters long' };
    }

    if (trimmedQuery.length > 200) {
      return { valid: false, error: 'Query cannot exceed 200 characters' };
    }

    // Check for potentially malicious patterns
    if (/[<>'"]/g.test(trimmedQuery)) {
      return { valid: false, error: 'Query contains invalid characters' };
    }

    return { valid: true };
  }

  /**
   * Sanitize search query for safe processing
   */
  sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .slice(0, 200) // Limit length
      .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}
