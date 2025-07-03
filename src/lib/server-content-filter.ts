import { JSDOM } from 'jsdom';

export interface UserPermissions {
  groups: string[];
  isAuthenticated: boolean;
}

export interface ContentFilterResult {
  filteredContent: string;
  removedBlocks: Array<{
    title: string;
    groups: string[];
  }>;
}

/**
 * Server-side content filter that removes restricted blocks based on user permissions
 * 
 * @param htmlContent - Raw HTML content from database
 * @param userPermissions - User's permission context
 * @returns Filtered content and metadata about removed blocks
 */
export function filterRestrictedContent(
  htmlContent: string, 
  userPermissions: UserPermissions
): ContentFilterResult {
  if (!htmlContent) {
    return { filteredContent: '', removedBlocks: [] };
  }

  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  const removedBlocks: Array<{ title: string; groups: string[] }> = [];
  
  // Find all restricted blocks
  const restrictedBlocks = document.querySelectorAll('[data-block-type="restricted"]');
  
  restrictedBlocks.forEach((block: Element) => {
    const userGroupsAttr = block.getAttribute('data-usergroups');
    const title = block.getAttribute('data-title') || 'Restricted Block';
    
    let allowedGroups: string[] = [];
    try {
      allowedGroups = JSON.parse(userGroupsAttr || '[]');
    } catch (e) {
      console.warn('Invalid usergroups JSON in restricted block:', userGroupsAttr);
      allowedGroups = [];
    }
    
    // Check if user has access to this block
    const hasAccess = userPermissions.isAuthenticated && 
      userPermissions.groups.some(userGroup => allowedGroups.includes(userGroup));
    
    if (!hasAccess) {
      // Track what we're removing for audit/debugging
      removedBlocks.push({ title, groups: allowedGroups });
      
      // Remove the entire block from DOM
      block.remove();
    }
    // If user has access, keep the block as-is for client-side reveal functionality
  });
  
  // Get the filtered HTML
  const filteredContent = document.body.innerHTML;
  
  return {
    filteredContent,
    removedBlocks
  };
}

/**
 * Check if content contains any restricted blocks (for optimization)
 */
export function hasRestrictedContent(htmlContent: string): boolean {
  return htmlContent.includes('data-block-type="restricted"');
}
