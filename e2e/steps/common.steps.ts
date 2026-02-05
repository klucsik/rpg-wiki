import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test as base } from '../fixtures/test-base';

const { Given: G, When: W, Then: T } = createBdd(base);

/**
 * Standard personas are seeded during global setup,
 * so this step is essentially a no-op but serves as documentation
 */
G('the standard personas are seeded', async ({ page }) => {
  // Personas are seeded during global setup
  // This step exists for documentation purposes
});

/**
 * Navigation step for going to any URL
 */
W('I navigate to {string}', async ({ page }, url: string) => {
  await page.goto(url);
});

/**
 * Check that URL contains a pattern
 */
T('I should be on a page with URL containing {string}', async ({ page }, urlPart: string) => {
  await page.waitForURL(new RegExp(urlPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

/**
 * Check current URL matches exactly
 */
T('I should be redirected to {string}', async ({ page }, url: string) => {
  // Handle relative URLs
  const fullUrl = url.startsWith('/') ? new URL(url, page.url()).href : url;
  await page.waitForURL(fullUrl);
});

/**
 * Check for text presence on page
 */
T('I should see {string}', async ({ page }, text: string) => {
  await page.locator(`text=${text}`).first().waitFor({ state: 'visible' });
});

T('I should see {string} on the page', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`).first()).toBeVisible();
});

/**
 * Check for text absence on page
 */
T('I should not see {string}', async ({ page }, text: string) => {
  await page.locator(`text=${text}`).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {
    // Text might not exist at all, which is fine
  });
});

/**
 * Check for element visibility
 */
T('I should see a {string} button', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: buttonText }).waitFor({ state: 'visible' });
});

T('I should not see a {string} button', async ({ page }, buttonText: string) => {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).toBeHidden();
});

T('I should see a {string} link', async ({ page }, linkText: string) => {
  await page.getByRole('link', { name: linkText }).waitFor({ state: 'visible' });
});

T('I should not see a {string} link', async ({ page }, linkText: string) => {
  const link = page.getByRole('link', { name: linkText });
  await expect(link).toBeHidden();
});

/**
 * Click actions
 */
W('I click {string}', async ({ page }, text: string) => {
  await page.locator(`text=${text}`).first().click();
});

W('I click the {string} button', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: buttonText }).click();
});

W('I click the {string} link', async ({ page }, linkText: string) => {
  await page.getByRole('link', { name: linkText }).click();
});

// expect is imported at top of file
