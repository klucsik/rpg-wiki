import { JSDOM } from 'jsdom';
import { renderDrawioToSvg } from './drawio-renderer';

export interface UserPermissions {
  groups: string[];
  isAuthenticated: boolean;
  username?: string; // For default editgroups
}

export interface ContentFilterResult {
  filteredContent: string;
  removedBlocks: Array<{
    title: string;
    groups: string[];
  }>;
}

export interface ContentFilterOptions {
  filterMode: 'view' | 'edit'; // New option to control filtering behavior
}

/**
 * Server-side content filter that removes or replaces restricted blocks based on user permissions
 * 
 * @param htmlContent - Raw HTML content from database
 * @param userPermissions - User's permission context
 * @param options - Filtering options (view mode vs edit mode)
 * @returns Filtered content and metadata about removed blocks
 */
export async function filterRestrictedContent(
  htmlContent: string, 
  userPermissions: UserPermissions,
  options: ContentFilterOptions = { filterMode: 'view' }
): Promise<ContentFilterResult> {
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
    const editGroupsAttr = block.getAttribute('data-editgroups');
    const title = block.getAttribute('data-title') || 'Restricted Block';
    
    let allowedUserGroups: string[] = [];
    let allowedEditGroups: string[] = [];
    
    try {
      allowedUserGroups = JSON.parse(userGroupsAttr || '[]');
    } catch (e) {
      console.warn('Invalid usergroups JSON in restricted block:', userGroupsAttr);
      allowedUserGroups = [];
    }
    
    try {
      allowedEditGroups = JSON.parse(editGroupsAttr || '[]');
      
      // If editgroups is empty, default to creator (username as group for now)
      // In practice, you might want to implement a more sophisticated default system
      if (allowedEditGroups.length === 0 && userPermissions.username) {
        allowedEditGroups = [userPermissions.username];
      }
    } catch (e) {
      console.warn('Invalid editgroups JSON in restricted block:', editGroupsAttr);
      allowedEditGroups = [];
    }
    
    let hasAccess = false;
    
    if (options.filterMode === 'view') {
      // View mode: Check if user can view content (usergroups)
      hasAccess = userPermissions.isAuthenticated && 
        userPermissions.groups.some(userGroup => allowedUserGroups.includes(userGroup));
    } else if (options.filterMode === 'edit') {
      // Edit mode: Check if user can edit content (editgroups)
      const hasGroupAccess = userPermissions.groups.some(userGroup => allowedEditGroups.includes(userGroup));
      const hasUsernameAccess = userPermissions.username && allowedEditGroups.includes(userPermissions.username);
      
      hasAccess = userPermissions.isAuthenticated && (hasGroupAccess || Boolean(hasUsernameAccess));
        
      // Debug logging to help identify the issue
      console.log('Edit access check:', {
        userGroups: userPermissions.groups,
        allowedEditGroups,
        username: userPermissions.username,
        hasGroupAccess,
        hasUsernameAccess,
        hasAccess
      });
    }
    
    if (!hasAccess) {
      if (options.filterMode === 'view') {
        // In view mode, remove the block entirely
        removedBlocks.push({ title, groups: allowedUserGroups });
        block.remove();
      } else if (options.filterMode === 'edit') {
        // In edit mode, replace with placeholder
        removedBlocks.push({ title: 'Hidden Block', groups: allowedEditGroups });
        
        // Store the original block's HTML content (without the outer div)
        const originalContent = block.innerHTML;
        
        // Create placeholder element
        const placeholder = document.createElement('div');
        placeholder.setAttribute('data-block-type', 'restricted-placeholder');
        placeholder.setAttribute('data-block-id', `placeholder-${Date.now()}-${Math.random()}`);
        placeholder.setAttribute('data-original-usergroups', userGroupsAttr || '[]');
        placeholder.setAttribute('data-original-editgroups', editGroupsAttr || '[]');
        placeholder.setAttribute('data-original-title', title);
        placeholder.setAttribute('data-original-content', originalContent);
        placeholder.setAttribute('data-allowed-groups', JSON.stringify(allowedEditGroups));
        placeholder.className = 'restricted-block-placeholder-html';
        
        // Replace original block with placeholder
        block.parentNode?.replaceChild(placeholder, block);
      }
    }
    // If user has access, keep the block as-is for client-side reveal functionality
  });
  
  // Process draw.io diagrams - use stored SVG or render if needed (only in view mode)
  if (options.filterMode === 'view') {
    const drawioDiagrams = document.querySelectorAll('.drawio-diagram');
    
    for (const diagram of Array.from(drawioDiagrams)) {
      const svgData = diagram.getAttribute('data-diagram-svg');
      const xmlData = diagram.getAttribute('data-diagram-xml');
      
      if (svgData && svgData.trim() !== '') {
        // Use stored SVG - check if it's a data URL or raw SVG
        if (svgData.startsWith('data:image/svg+xml;base64,')) {
          // It's a data URL - render as an img tag
          diagram.innerHTML = `<img src="${svgData}" alt="Diagram" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;
        } else if (svgData.startsWith('<svg')) {
          // It's raw SVG markup
          diagram.innerHTML = svgData;
        } else {
          // Try to decode as base64
          try {
            const decoded = Buffer.from(svgData, 'base64').toString('utf-8');
            diagram.innerHTML = decoded;
          } catch (e) {
            console.error('Failed to decode SVG data:', e);
            diagram.innerHTML = '<p style="color: red;">Failed to display diagram</p>';
          }
        }
      } else if (xmlData && xmlData.trim() !== '') {
        // Fallback: render via API for old diagrams without stored SVG
        try {
          const svg = await renderDrawioToSvg(xmlData);
          diagram.innerHTML = svg;
        } catch (error) {
          console.error('Failed to render draw.io diagram:', error);
          diagram.innerHTML = '<p style="color: red;">Failed to render diagram</p>';
        }
      }
    }
  }
  
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

/**
 * Check if content contains any draw.io diagrams
 */
export function hasDrawioContent(htmlContent: string): boolean {
  return htmlContent.includes('drawio-diagram');
}

/**
 * Check if content needs any server-side processing (restricted blocks, drawio diagrams, etc.)
 */
export function needsServerProcessing(htmlContent: string): boolean {
  return hasRestrictedContent(htmlContent) || hasDrawioContent(htmlContent);
}
