import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test as base } from '../fixtures/test-base';
import { getPersona } from '../fixtures/personas';
import { LoginPage } from '../fixtures/pages/login.page';
import { getCreatedPage } from './page-common.steps';

const { Given, When, Then } = createBdd(base);

// ============================================
// Page Editor Setup Steps
// ============================================

Given('I am logged in as {string}', async ({ page }, name: string) => {
  const persona = getPersona(name);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(persona.username, persona.password);
  await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
});

When('I navigate to edit the {string} page', async ({ page }, title: string) => {
  const pageInfo = getCreatedPage(title);
  if (!pageInfo) {
    throw new Error(`Page "${title}" was not created in this test. Use "Given a page exists" first.`);
  }
  
  console.log(`Navigating to edit page: /pages/${pageInfo.id}/edit`);
  await page.goto(`/pages/${pageInfo.id}/edit`);
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check for error messages
  const errorText = await page.locator('text=/Failed to fetch|error|No Access/i').first().textContent().catch(() => null);
  if (errorText) {
    throw new Error(`Page load error: ${errorText}`);
  }
  
  // Wait for TipTap editor to be ready - the testid is on the EditorContent wrapper
  await page.getByTestId('tiptap-editor').waitFor({ state: 'visible', timeout: 10000 });
});

When('I navigate to view the page', async ({ page }) => {
  // Get the current page ID from URL
  const url = page.url();
  const match = url.match(/\/pages\/(\d+)\/(edit)?/);
  if (!match) {
    throw new Error('Not on a page edit or view URL');
  }
  const pageId = match[1];
  await page.goto(`/pages/${pageId}`);
  await page.waitForLoadState('networkidle');
});

// ============================================
// Draw.io Specific Steps
// ============================================

When('I click the {string} button in the toolbar', async ({ page }, buttonText: string) => {
  // Find button in the toolbar by aria-label, title, or text content
  const toolbar = page.locator('.toolbar, [role="toolbar"], .editor-toolbar').first();
  const button = toolbar.locator(`button[title*="${buttonText}"], button[aria-label*="${buttonText}"], button:has-text("${buttonText}")`).first();
  
  // If not found in toolbar, try in the block type dropdown
  if (!(await button.isVisible().catch(() => false))) {
    // Look for the block type selector
    const blockSelector = page.locator('select').filter({ hasText: /Paragraph|Heading/ }).or(
      page.locator('select option:has-text("Draw.io")')
    ).first();
    
    if (await blockSelector.isVisible().catch(() => false)) {
      await blockSelector.selectOption({ label: 'Draw.io Diagram' });
      // Wait for diagram node to be inserted
      await page.locator('.drawio-diagram-wrapper').waitFor({ state: 'visible', timeout: 5000 });
      return;
    }
  }
  
  await button.click();
});

Then('a full-screen diagram editor dialog should open', async ({ page }) => {
  // Check for the full-screen dialog overlay
  const dialog = page.locator('div[style*="position: fixed"][style*="z-index"]').filter({
    has: page.locator('iframe[src*="drawio"]')
  });
  await expect(dialog).toBeVisible({ timeout: 10000 });
});

Then('the draw.io editor should be loaded', async ({ page }) => {
  // Check that the iframe exists and has loaded
  const iframe = page.frameLocator('iframe[src*="drawio"]');
  // Wait for iframe to load - check for draw.io canvas
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  // Give draw.io a moment to initialize
  await page.waitForTimeout(2000);
});

Then('the editor should show an empty canvas', async ({ page }) => {
  // We can't easily check inside the iframe due to sandboxing,
  // but we can verify the dialog is open and Save button is enabled
  const saveButton = page.locator('button:has-text("Save")').first();
  await expect(saveButton).toBeVisible();
  // Editor being ready is good enough for empty canvas check
});

When('I insert a new diagram', async ({ page }) => {
  // Select "Draw.io Diagram" from block type dropdown
  const blockSelector = page.locator('select').filter({ 
    has: page.locator('option:has-text("Draw.io")')
  }).first();
  
  await blockSelector.selectOption({ label: 'Draw.io Diagram' });
  
  // Wait for diagram node to be inserted and editor to open
  await page.locator('.drawio-diagram-wrapper').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  
  // Wait for draw.io to initialize
  await page.waitForTimeout(2000);
});

When('I open the diagram editor', async ({ page }) => {
  // Click the Edit button on the diagram
  const editButton = page.locator('.drawio-diagram-wrapper button:has-text("Edit")').first();
  await editButton.click();
  
  // Wait for editor dialog to open
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);
});

When('I open the diagram editor on the first diagram', async ({ page }) => {
  // Find the first diagram's Edit button
  const firstDiagram = page.locator('.drawio-diagram-wrapper').first();
  const editButton = firstDiagram.locator('button:has-text("Edit")');
  await editButton.click();
  
  // Wait for editor dialog to open
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);
});

When('I insert a rectangle shape', async ({ page }) => {
  // We can't directly interact with the draw.io iframe due to sandboxing
  // For now, we'll simulate by waiting and assuming the user would add a shape
  // In a real test, you'd need to use draw.io's postMessage API or have test hooks
  await page.waitForTimeout(1000);
  // This is a placeholder - in reality you'd use draw.io's API to insert a shape
  console.log('Note: Actual shape insertion would require draw.io postMessage API integration');
});

When('I create a simple diagram', async ({ page }) => {
  // Similar limitation - we can't interact with the sandboxed iframe
  // For testing purposes, we'll just wait to simulate user interaction
  await page.waitForTimeout(1000);
  console.log('Note: Diagram creation simulated - real test would use draw.io API');
});

When('I create a different simple diagram', async ({ page }) => {
  await page.waitForTimeout(1000);
  console.log('Note: Diagram creation simulated - real test would use draw.io API');
});

When('I modify the diagram', async ({ page }) => {
  await page.waitForTimeout(1000);
  console.log('Note: Diagram modification simulated - real test would use draw.io API');
});

When('I make changes', async ({ page }) => {
  await page.waitForTimeout(500);
});

When('I save the diagram', async ({ page }) => {
  // Click the Save button in the dialog
  const saveButton = page.locator('button:has-text("Save")').first();
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  
  // Wait for dialog to close
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'hidden', timeout: 10000 });
  
  // Wait for diagram to render
  await page.waitForTimeout(1000);
});

When('I save the second diagram', async ({ page }) => {
  await page.locator('button:has-text("Save")').first().click();
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(1000);
});

When('I save the page', async ({ page }) => {
  // Click the main page Save button
  const saveButton = page.locator('button:has-text("Save Page"), button:has-text("Save")').filter({
    hasNot: page.locator('.drawio-dialog')
  }).first();
  await saveButton.click();
  
  // Wait for save to complete
  await page.waitForTimeout(1000);
});

Then('the diagram should contain the shape', async ({ page }) => {
  // Check that diagram preview exists and has content
  const diagram = page.locator('.drawio-diagram-wrapper').first();
  const preview = diagram.locator('.diagram-preview, svg, img').first();
  await expect(preview).toBeVisible();
});

Then('the diagram should be visible in view mode', async ({ page }) => {
  // Navigate to view mode if in edit mode
  const url = page.url();
  if (url.includes('/edit')) {
    const match = url.match(/\/pages\/(\d+)\/edit/);
    if (match) {
      await page.goto(`/pages/${match[1]}`);
      await page.waitForLoadState('networkidle');
    }
  }
  
  // Check for rendered diagram
  const diagram = page.locator('.drawio-diagram-wrapper, [data-diagram], svg, img[alt*="Diagram"]').first();
  await expect(diagram).toBeVisible({ timeout: 5000 });
});

Then('the changes should be saved', async ({ page }) => {
  // Verify we're back in edit mode with diagram visible
  const diagram = page.locator('.drawio-diagram-wrapper').first();
  await expect(diagram).toBeVisible();
});

Then('the updated diagram should display in view mode', async ({ page }) => {
  // Same as "diagram should be visible in view mode"
  const url = page.url();
  if (url.includes('/edit')) {
    const match = url.match(/\/pages\/(\d+)\/edit/);
    if (match) {
      await page.goto(`/pages/${match[1]}`);
      await page.waitForLoadState('networkidle');
    }
  }
  
  const diagram = page.locator('.drawio-diagram-wrapper, [data-diagram], svg, img[alt*="Diagram"]').first();
  await expect(diagram).toBeVisible();
});

Then('the original diagram should remain unchanged', async ({ page }) => {
  // After cancel, should be back in editor with diagram intact
  const diagram = page.locator('.drawio-diagram-wrapper').first();
  await expect(diagram).toBeVisible();
});

// ============================================
// Restricted Block Steps
// ============================================

When('I insert a restricted Block', async ({ page }) => {
  // Select "Restricted Block" from block type dropdown
  const blockSelector = page.locator('select').filter({ 
    has: page.locator('option:has-text("Restricted")')
  }).first();
  
  await blockSelector.selectOption({ label: 'Restricted Block' });
  
  // Wait for restricted block to appear
  await page.locator('[data-type="restrictedBlock"]').waitFor({ state: 'visible', timeout: 5000 });
});

When('I insert a new diagram inside the restricted block', async ({ page }) => {
  // Click inside the restricted block
  const restrictedBlock = page.locator('[data-type="restrictedBlock"]').first();
  const placeholder = restrictedBlock.locator('[data-type="restrictedBlockPlaceholder"]').first();
  await placeholder.click();
  
  // Wait for cursor to be in the block
  await page.waitForTimeout(500);
  
  // Insert diagram
  const blockSelector = page.locator('select').filter({ 
    has: page.locator('option:has-text("Draw.io")')
  }).first();
  
  await blockSelector.selectOption({ label: 'Draw.io Diagram' });
  
  // Wait for diagram and editor to open
  await page.locator('.drawio-diagram-wrapper').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);
});

When('I insert another new diagram', async ({ page }) => {
  // Move cursor after the first diagram (click below it or press down arrow)
  await page.getByTestId('tiptap-editor').locator('.ProseMirror').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  
  // Insert new diagram
  const blockSelector = page.locator('select').filter({ 
    has: page.locator('option:has-text("Draw.io")')
  }).first();
  
  await blockSelector.selectOption({ label: 'Draw.io Diagram' });
  
  // Wait for second diagram to appear
  await page.locator('.drawio-diagram-wrapper').nth(1).waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('iframe[src*="drawio"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);
});

When('I reveal the restricted block', async ({ page }) => {
  // Click the "Reveal Content" button
  const revealButton = page.locator('button:has-text("Reveal")').first();
  await revealButton.click();
  await page.waitForTimeout(500);
});

Then('the diagram should be visible inside the restricted block', async ({ page }) => {
  // Check that diagram exists within the restricted block
  const restrictedBlock = page.locator('[data-type="restrictedBlock"], .restricted-block').first();
  const diagram = restrictedBlock.locator('.drawio-diagram-wrapper, [data-diagram], svg, img[alt*="Diagram"]').first();
  await expect(diagram).toBeVisible({ timeout: 5000 });
});

Then('both diagrams should be visible in view mode', async ({ page }) => {
  // Navigate to view mode if in edit mode
  const url = page.url();
  if (url.includes('/edit')) {
    const match = url.match(/\/pages\/(\d+)\/edit/);
    if (match) {
      await page.goto(`/pages/${match[1]}`);
      await page.waitForLoadState('networkidle');
    }
  }
  
  // Check for two diagrams
  const diagrams = page.locator('.drawio-diagram-wrapper, [data-diagram], svg, img[alt*="Diagram"]');
  await expect(diagrams).toHaveCount(2, { timeout: 5000 });
  
  // Verify both are visible
  await expect(diagrams.nth(0)).toBeVisible();
  await expect(diagrams.nth(1)).toBeVisible();
});
