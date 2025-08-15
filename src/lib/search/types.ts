export interface SearchQuery {
  query: string;
  searchType: 'content' | 'title' | 'path' | 'all';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  pageId: number;
  title: string;
  path: string;
  snippet: string;
  matchType: 'title' | 'path' | 'content';
  score: number;
  hasRestrictedMatches?: boolean;
}

export interface LinkSearchResult {
  id: number;
  title: string;
  path: string;
}

export interface RestrictedMatch {
  blockTitle: string;
  snippet: string;
  requiredGroups: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'title' | 'updated_at';
}

export interface ExtractedContent {
  accessibleContent: string;
  restrictedBlocks: RestrictedMatch[];
  allTextContent: string; // Plain text for searching
}

export type SearchType = 'content' | 'title' | 'path' | 'all';
