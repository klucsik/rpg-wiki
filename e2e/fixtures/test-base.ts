import { test as base } from 'playwright-bdd';
import { Page, BrowserContext } from '@playwright/test';
import { PERSONAS, Persona } from './personas';
import { LoginPage } from './pages/login.page';

/**
 * Extended test fixtures with persona support
 */
type PersonaFixtures = {
  asGM: Page;       // Diana - full access (admin group)
  asPlayer: Page;   // Alex - player access
  asObserver: Page; // Sam - view only
  asGuest: Page;    // Not authenticated
  loginPage: LoginPage;
};

export const test = base.extend<PersonaFixtures>({
  /**
   * Page authenticated as Diana (Game Master with admin access)
   */
  asGM: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.diana.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  
  /**
   * Page authenticated as Alex (Regular player)
   */
  asPlayer: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.alex.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  
  /**
   * Page authenticated as Sam (Observer)
   */
  asObserver: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.sam.storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  
  /**
   * Page without authentication (guest)
   */
  asGuest: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Login page object
   */
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';
