import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test as base } from '../fixtures/test-base';
import { getPersona } from '../fixtures/personas';

const { Given } = createBdd(base);

// Store created pages for reference within scenarios
let createdPages: Map<string, { id: number; title: string }> = new Map();

/**
 * Create a page via API (faster than UI)
 * This step assumes the user is already logged in via the UI
 */
Given('a page {string} exists with edit_groups [{string}]', async ({ page }, title: string, editGroupsString: string) => {
  // Parse edit groups - remove quotes and split by comma
  const editGroups = editGroupsString.replace(/"/g, '').split(',').map(g => g.trim());
  
  // Create page via API using the current authenticated session
  const createResponse = await page.request.post('/api/pages', {
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      title,
      content: `<p>Content of ${title}</p>`,
      path: '/',
      view_groups: ['public'],
      edit_groups: editGroups,
      change_summary: 'Test page creation',
    },
  });
  
  if (!createResponse.ok()) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create page "${title}" via API: ${createResponse.status()} ${errorText}`);
  }
  
  const pageData = await createResponse.json();
  createdPages.set(title, { id: pageData.id, title: pageData.title });
  
  console.log(`Created page "${title}" with ID ${pageData.id} via API`);
});

/**
 * Create a page with view groups restriction
 * This step assumes the user is already logged in via the UI
 */
Given('a page {string} exists with view_groups [{string}]', async ({ page }, title: string, viewGroupsString: string) => {
  const viewGroups = viewGroupsString.replace(/"/g, '').split(',').map(g => g.trim());
  
  // Create page via API using the current authenticated session
  const createResponse = await page.request.post('/api/pages', {
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      title,
      content: `<p>Content of ${title}</p>`,
      path: '/',
      view_groups: viewGroups,
      edit_groups: ['admin', 'diana'],
      change_summary: 'Test page creation',
    },
  });
  
  if (!createResponse.ok()) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create page "${title}" via API: ${createResponse.status()} ${errorText}`);
  }
  
  const pageData = await createResponse.json();
  createdPages.set(title, { id: pageData.id, title: pageData.title });
  
  console.log(`Created page "${title}" with ID ${pageData.id} and view_groups ${viewGroups.join(', ')}`);
});

/**
 * Get a created page by title (for use in other steps)
 */
export function getCreatedPage(title: string): { id: number; title: string } | undefined {
  return createdPages.get(title);
}

/**
 * Clear created pages map (for cleanup between tests)
 */
export function clearCreatedPages(): void {
  createdPages.clear();
}
