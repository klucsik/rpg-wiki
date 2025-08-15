import { prisma } from '../../db';
import { canUserViewPage } from '../../accessControl';
import { UserPermissions } from '../server-content-filter';
import { LinkSearchResult } from './types';

export class TitlePathSearchEngine {
  /**
   * Searches page titles and paths for link creation in the editor
   * Optimized for fast autocomplete-style searching
   */
  async searchForLinking(
    query: string,
    userPermissions: UserPermissions,
    limit: number = 20
  ): Promise<LinkSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const queryTrimmed = query.trim();
    
    // Search with multiple strategies for better results
    const pages = await prisma.page.findMany({
      where: {
        OR: [
          // Exact title match (highest priority)
          { title: { equals: queryTrimmed, mode: 'insensitive' } },
          // Title starts with query (high priority)
          { title: { startsWith: queryTrimmed, mode: 'insensitive' } },
          // Title contains query (medium priority)
          { title: { contains: queryTrimmed, mode: 'insensitive' } },
          // Path starts with query (medium priority)
          { path: { startsWith: queryTrimmed, mode: 'insensitive' } },
          // Path contains query (lower priority)
          { path: { contains: queryTrimmed, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        path: true,
        view_groups: true,
        edit_groups: true,
        created_at: true,
        updated_at: true
      },
      take: limit * 2, // Get extra results to account for permission filtering
      orderBy: [
        { title: 'asc' }
      ]
    });

    // Filter by page-level permissions
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

    // Convert to LinkSearchResult and apply custom ranking
    const linkResults: LinkSearchResult[] = accessiblePages.map(page => ({
      id: page.id,
      title: page.title,
      path: page.path
    }));

    // Sort by relevance for link creation
    return this.rankForLinking(linkResults, queryTrimmed).slice(0, limit);
  }

  /**
   * Ranks search results specifically for link creation context
   * Prioritizes exact matches and commonly linked pages
   */
  private rankForLinking(results: LinkSearchResult[], query: string): LinkSearchResult[] {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      const aScore = this.calculateLinkingScore(a, queryLower);
      const bScore = this.calculateLinkingScore(b, queryLower);
      
      // Higher scores first
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      
      // If scores are equal, sort alphabetically by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Calculates a relevance score for link creation
   */
  private calculateLinkingScore(result: LinkSearchResult, query: string): number {
    const titleLower = result.title.toLowerCase();
    const pathLower = result.path.toLowerCase();
    let score = 0;

    // Exact title match gets highest score
    if (titleLower === query) {
      score += 1000;
    }
    // Title starts with query gets high score
    else if (titleLower.startsWith(query)) {
      score += 500;
    }
    // Title contains query gets medium score
    else if (titleLower.includes(query)) {
      score += 250;
    }

    // Path-based scoring (lower priority than title)
    if (pathLower.startsWith(query)) {
      score += 100;
    } else if (pathLower.includes(query)) {
      score += 50;
    }

    // Boost shorter titles (more specific)
    if (result.title.length < 50) {
      score += 25;
    }

    // Boost pages with simple paths (likely more important)
    const pathDepth = result.path.split('/').length - 1;
    if (pathDepth <= 2) {
      score += 15;
    }

    return score;
  }

  /**
   * Gets recently created/updated pages for quick access in link creation
   */
  async getRecentPages(
    userPermissions: UserPermissions,
    limit: number = 10
  ): Promise<LinkSearchResult[]> {
    const pages = await prisma.page.findMany({
      select: {
        id: true,
        title: true,
        path: true,
        view_groups: true,
        edit_groups: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { updated_at: 'desc' },
      take: limit * 2 // Get extra to account for permission filtering
    });

    // Filter by permissions
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

    return accessiblePages.slice(0, limit).map(page => ({
      id: page.id,
      title: page.title,
      path: page.path
    }));
  }
}
