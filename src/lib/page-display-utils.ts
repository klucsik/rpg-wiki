/**
 * Utility functions for displaying page information consistently across the app
 */

import { WikiPage } from '../types';

/**
 * Formats page display text as path/title
 */
export function formatPageDisplay(page: { path: string; title: string }): string {
  return `${page.path}/${page.title}`;
}

/**
 * Gets display text for a page, with fallback to just title if no path
 */
export function getPageDisplayText(page: { path: string; title: string }): string {
  if (!page.path || page.path === '/') {
    return page.title;
  }
  return formatPageDisplay(page);
}

/**
 * Truncates page display text for UI components with limited space
 */
export function truncatePageDisplay(page: { path: string; title: string }, maxLength: number = 50): string {
  const displayText = getPageDisplayText(page);
  if (displayText.length <= maxLength) {
    return displayText;
  }
  return displayText.substring(0, maxLength - 3) + '...';
}
