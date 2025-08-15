import { JSDOM } from 'jsdom';
import { UserPermissions } from '../server-content-filter';
import { ExtractedContent, RestrictedMatch } from './types';

export class ContentExtractor {
  /**
   * Extracts searchable content from HTML while respecting user permissions
   */
  extractSearchableContent(
    htmlContent: string,
    userPermissions: UserPermissions
  ): ExtractedContent {
    if (!htmlContent) {
      return {
        accessibleContent: '',
        restrictedBlocks: [],
        allTextContent: ''
      };
    }

    // If no restricted content, return as-is
    if (!htmlContent.includes('data-block-type="restricted"')) {
      const textContent = this.htmlToPlainText(htmlContent);
      return {
        accessibleContent: htmlContent,
        restrictedBlocks: [],
        allTextContent: textContent
      };
    }

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const restrictedBlocks: RestrictedMatch[] = [];

    // Find all restricted blocks
    const blocks = document.querySelectorAll('[data-block-type="restricted"]');
    
    blocks.forEach((block: Element) => {
      const userGroupsAttr = block.getAttribute('data-usergroups');
      const blockTitle = block.getAttribute('data-title') || 'Restricted Block';
      
      let allowedUserGroups: string[] = [];
      try {
        allowedUserGroups = JSON.parse(userGroupsAttr || '[]');
      } catch (e) {
        console.warn('Invalid usergroups JSON in restricted block:', userGroupsAttr);
        allowedUserGroups = [];
      }

      // Check if user has access to view this block
      const hasAccess = userPermissions.isAuthenticated && 
        userPermissions.groups.some(userGroup => allowedUserGroups.includes(userGroup));

      if (!hasAccess) {
        // Store info about restricted block for search metadata
        const blockText = this.htmlToPlainText(block.innerHTML);
        restrictedBlocks.push({
          blockTitle,
          snippet: blockText.slice(0, 150) + (blockText.length > 150 ? '...' : ''),
          requiredGroups: allowedUserGroups
        });

        // Remove block from accessible content
        block.remove();
      }
    });

    const accessibleContent = document.body.innerHTML;
    const allTextContent = this.htmlToPlainText(accessibleContent);

    return {
      accessibleContent,
      restrictedBlocks,
      allTextContent
    };
  }

  /**
   * Converts HTML to plain text for searching
   */
  private htmlToPlainText(html: string): string {
    if (!html) return '';
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach(element => element.remove());
    
    // Get text content and clean it up
    const textContent = document.body.textContent || '';
    
    // Clean up whitespace and normalize
    return textContent
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n')  // Remove extra line breaks
      .trim();
  }

  /**
   * Creates a search snippet around matching text
   */
  createSnippet(content: string, query: string, maxLength: number = 200): string {
    const plainText = this.htmlToPlainText(content);
    if (!plainText) return '';

    const queryLower = query.toLowerCase();
    const textLower = plainText.toLowerCase();
    
    // Find the first occurrence of the query
    const matchIndex = textLower.indexOf(queryLower);
    
    if (matchIndex === -1) {
      // No match found, return beginning of content
      return plainText.slice(0, maxLength) + (plainText.length > maxLength ? '...' : '');
    }

    // Calculate snippet boundaries
    const halfLength = Math.floor(maxLength / 2);
    const start = Math.max(0, matchIndex - halfLength);
    const end = Math.min(plainText.length, start + maxLength);
    
    let snippet = plainText.slice(start, end);
    
    // Add ellipsis if needed
    if (start > 0) snippet = '...' + snippet;
    if (end < plainText.length) snippet = snippet + '...';
    
    return snippet;
  }

  /**
   * Highlights query terms in a snippet (for display purposes)
   */
  highlightQuery(snippet: string, query: string): string {
    if (!query.trim()) return snippet;
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    let highlighted = snippet;
    
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
