import { JSDOM } from 'jsdom';

/**
 * Restores restricted block placeholders back to their original restricted blocks
 * This is used before saving content to ensure placeholders don't overwrite the original blocks
 * 
 * @param htmlContent - HTML content that may contain placeholders
 * @returns HTML content with placeholders restored to original restricted blocks
 */
export function restorePlaceholdersToRestrictedBlocks(htmlContent: string): string {
  if (!htmlContent || !htmlContent.includes('data-block-type="restricted-placeholder"')) {
    return htmlContent;
  }

  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  // Find all restricted block placeholders
  const placeholders = document.querySelectorAll('[data-block-type="restricted-placeholder"]');
  
  placeholders.forEach((placeholder: Element) => {
    const originalUsergroups = placeholder.getAttribute('data-original-usergroups') || '[]';
    const originalEditgroups = placeholder.getAttribute('data-original-editgroups') || '[]';
    const originalTitle = placeholder.getAttribute('data-original-title') || 'Restricted Block';
    const originalContent = placeholder.getAttribute('data-original-content') || '';
    
    // Create the original restricted block element
    const originalBlock = document.createElement('div');
    originalBlock.setAttribute('data-block-type', 'restricted');
    originalBlock.setAttribute('data-usergroups', originalUsergroups);
    originalBlock.setAttribute('data-editgroups', originalEditgroups);
    originalBlock.setAttribute('data-title', originalTitle);
    originalBlock.className = 'restricted-block-html';
    
    // Restore the original content
    originalBlock.innerHTML = originalContent;
    
    // Replace placeholder with original block structure
    placeholder.parentNode?.replaceChild(originalBlock, placeholder);
  });
  
  return document.body.innerHTML;
}

/**
 * Check if content contains any restricted block placeholders
 */
export function hasRestrictedPlaceholders(htmlContent: string): boolean {
  return htmlContent.includes('data-block-type="restricted-placeholder"');
}
