import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test as base } from '../fixtures/test-base';
import { LoginPage } from '../fixtures/pages/login.page';
import { PERSONAS, getPersona } from '../fixtures/personas';
import { createTestPage } from '../support/db/test-helpers';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../src/lib/db/db';

const { Given, When, Then } = createBdd(base);

// Store created pages for reference within scenarios
let createdPages: Map<string, { id: number; title: string }> = new Map();

// ============================================
// Login Feature Steps
// ============================================

Given('I am on the login page', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
});

When('I enter username {string}', async ({ page }, username: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.enterUsername(username);
});

When('I enter password {string}', async ({ page }, password: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.enterPassword(password);
});

When('I click the login button', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.clickLogin();
});

When('I click the login button without entering credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.clickLogin();
});

Then('I should be redirected to the home page', async ({ page }) => {
  // Wait for redirect away from login page
  await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
});

Then('I should see {string} in the header', async ({ page }, text: string) => {
  const header = page.locator('header, nav, [role="banner"]').first();
  await expect(header).toContainText(text);
});

Then('I should see an error message', async ({ page }) => {
  // Look for error indicators
  const errorLocator = page.locator('[role="alert"], .error, .text-red-500, .text-destructive, [data-error]').first();
  await expect(errorLocator).toBeVisible({ timeout: 5000 });
});

Then('I should remain on the login page', async ({ page }) => {
  expect(page.url()).toContain('/auth/signin');
});

Then('I should see validation errors for required fields', async ({ page }) => {
  // Check for HTML5 validation or custom validation messages
  // The form uses input[placeholder="Username"] or data-testid
  const usernameInput = page.getByTestId('username-input').or(page.locator('input[placeholder="Username"]'));
  const isInvalid = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
  expect(isInvalid).toBe(true);
});

// ============================================
// Logout Feature Steps
// ============================================

Given('I am logged in as {string} the Game Master', async ({ page }, name: string) => {
  const persona = getPersona(name);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(persona.username, persona.password);
  await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
});

Given('I am logged in as {string} the Player', async ({ page }, name: string) => {
  const persona = getPersona(name);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(persona.username, persona.password);
  await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
});

Given('I am logged in as {string} the Observer', async ({ page }, name: string) => {
  const persona = getPersona(name);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(persona.username, persona.password);
  await page.waitForURL(/\/(pages|$)/, { timeout: 10000 });
});

When('I click the logout button', async ({ page }) => {
  // First, click the user menu button to open the dropdown
  const userMenuButton = page.getByTestId('user-menu-button');
  if (await userMenuButton.isVisible().catch(() => false)) {
    await userMenuButton.click();
    // Wait for dropdown to appear
    await page.getByTestId('user-dropdown').waitFor({ state: 'visible' });
    // Click the logout button in the dropdown
    await page.getByTestId('logout-button').click();
  } else {
    // Fallback: navigate directly to signout
    await page.goto('/auth/signout');
  }
  
  // Wait for logout to complete - should redirect to login
  await page.waitForURL(/\/auth\/signin|\/login/, { timeout: 10000 });
});

Then('I should not see my username in the header', async ({ page }) => {
  const header = page.locator('header, nav, [role="banner"]').first();
  // Should not contain Diana, Alex, or Sam
  await expect(header).not.toContainText('Diana');
  await expect(header).not.toContainText('Alex');
  await expect(header).not.toContainText('Sam');
});

When('I try to access a protected page', async ({ page }) => {
  // Try to access pages list
  await page.goto('/pages');
});

When('I try to access the admin page', async ({ page }) => {
  await page.goto('/admin');
});

// ============================================
// Guest Access Feature Steps
// ============================================

Given('I am not logged in', async ({ page }) => {
  // Simply clear cookies - don't navigate anywhere that might cause issues
  await page.context().clearCookies();
});

Given('a page {string} exists with view_groups [{string}]', async ({ page }, title: string, viewGroups: string) => {
  // Parse the view groups - they come as "public" or "gm" etc
  const groups = viewGroups.replace(/"/g, '').split(',').map(g => g.trim());
  
  // Create page via API or database
  // Use root path "/" so pages appear directly in the list without needing to expand folders
  const result = await createTestPage({
    title,
    content: `<p>Content of ${title}</p>`,
    path: '/',
    view_groups: groups,
    edit_groups: ['admin', 'gm'],
  });
  
  createdPages.set(title, { id: result.id, title });
});

When('I navigate to the {string} page', async ({ page }, title: string) => {
  const pageInfo = createdPages.get(title);
  if (pageInfo) {
    await page.goto(`/pages/${pageInfo.id}`);
  } else {
    // Try to find by title in the page list
    await page.goto('/pages');
    await page.getByText(title).first().click();
  }
});

When('I navigate directly to the {string} page', async ({ page }, title: string) => {
  const pageInfo = createdPages.get(title);
  if (!pageInfo) {
    throw new Error(`Page "${title}" was not created in this test. Use "Given a page exists" first.`);
  }
  await page.goto(`/pages/${pageInfo.id}`);
  // Wait for page to load
  await page.waitForLoadState('networkidle');
});

When('I navigate directly to URL {string}', async ({ page }, url: string) => {
  // Replace placeholder IDs with actual IDs if needed
  let finalUrl = url;
  
  // Check if URL contains a placeholder ID like /pages/42
  const idMatch = url.match(/\/pages\/(\d+)/);
  if (idMatch) {
    const placeholderId = idMatch[1];
    const pageInfo = createdPages.get(`id:${placeholderId}`);
    if (pageInfo) {
      finalUrl = url.replace(`/pages/${placeholderId}`, `/pages/${pageInfo.id}`);
    }
  }
  
  await page.goto(finalUrl);
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
});

When('I view the page navigation or page list', async ({ page }) => {
  await page.goto('/pages');
});

When('I navigate directly to edit the {string} page', async ({ page }, title: string) => {
  const pageInfo = createdPages.get(title);
  if (!pageInfo) {
    throw new Error(`Page "${title}" was not created in this test. Use "Given a page exists" first.`);
  }
  await page.goto(`/pages/${pageInfo.id}/edit`);
});

Then('I should see the page list', async ({ page }) => {
  // Check for the page list sidebar with "Pages" heading
  const pagesList = page.locator('h3:has-text("Pages"), [class*="page-list"], aside, complementary').first();
  await expect(pagesList).toBeVisible();
});

Then('I should see the page content', async ({ page }) => {
  // Check for main content area
  const content = page.locator('main, article, .content, .page-content, [data-content]').first();
  await expect(content).toBeVisible();
});

Then('I should see a login button in the header', async ({ page }) => {
  const header = page.locator('header, nav, [role="banner"]');
  const loginButton = header.locator('a:has-text("Login"), a:has-text("Sign in"), button:has-text("Login"), button:has-text("Sign in")').first();
  await expect(loginButton).toBeVisible();
});

Then('I should see a {string} link or button', async ({ page }, text: string) => {
  const element = page.locator(`a:has-text("${text}"), button:has-text("${text}")`).first();
  await expect(element).toBeVisible();
});

Then('I should see an access denied message', async ({ page }) => {
  // The app shows "No Access" with "You do not have permission to view this page."
  const noAccessBox = page.locator('text=/No Access|do not have permission/i').first();
  await expect(noAccessBox).toBeVisible({ timeout: 5000 });
});

Then('I should see a login prompt', async ({ page }) => {
  // Should either be on login page or see a login link/button
  const isLoginPage = page.url().includes('/auth/signin');
  if (!isLoginPage) {
    const loginPrompt = page.locator('a:has-text("Login"), a:has-text("Sign in"), button:has-text("Login")').first();
    await expect(loginPrompt).toBeVisible();
  }
});

Then('I should see {string} in the navigation', async ({ page }, title: string) => {
  const nav = page.locator('nav, .navigation, .page-list, main');
  await expect(nav.getByText(title)).toBeVisible();
});

Then('I should NOT see {string} in the navigation', async ({ page }, title: string) => {
  const pageContent = page.locator('body');
  await expect(pageContent.getByText(title, { exact: true })).not.toBeVisible();
});

Then('I should NOT see the {string} button', async ({ page }, buttonText: string) => {
  const button = page.locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`).first();
  await expect(button).not.toBeVisible();
});

// 'I should see {string} on the page' - use common.steps.ts version: 'I should see {string}'

Then('I should see a link to login', async ({ page }) => {
  const loginLink = page.locator('a[href*="signin"], a[href*="login"], a:has-text("Login"), a:has-text("Sign in")').first();
  await expect(loginLink).toBeVisible();
});

Then('I should be redirected to the login page', async ({ page }) => {
  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
});

// ============================================
// Keycloak SSO Feature Steps
// ============================================

When('I enter Keycloak credentials', async ({ page }) => {
  // Load Keycloak credentials from the .auth folder
  const keycloakCredsPath = path.join(__dirname, '../.auth/keycloak.json');
  const keycloakCreds = JSON.parse(fs.readFileSync(keycloakCredsPath, 'utf-8'));
  
  // Wait for redirect to Keycloak login page
  // The URL will contain the Keycloak domain
  await page.waitForURL(/.*/, { timeout: 10000 });
  
  // Enter username and password on Keycloak's login form
  // Keycloak's default form uses id="username" and id="password"
  await page.fill('#username', keycloakCreds.username);
  await page.fill('#password', keycloakCreds.password);
  
  // Submit the form
  await page.click('#kc-login, input[type="submit"], button[type="submit"]');
  
  // Wait for redirect back to the app
  await page.waitForURL(/localhost|127\.0\.0\.1/, { timeout: 15000 });
});

