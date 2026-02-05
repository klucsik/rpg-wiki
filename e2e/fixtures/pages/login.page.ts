import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use data-testid selectors for reliability, with fallbacks
    this.usernameInput = page.getByTestId('username-input').or(page.locator('input[placeholder="Username"]'));
    this.passwordInput = page.getByTestId('password-input').or(page.locator('input[placeholder="Password"]'));
    this.loginButton = page.getByTestId('login-button').or(page.locator('button[type="submit"]'));
    this.errorMessage = page.getByTestId('login-error').or(page.locator('.text-red-400'));
    this.registerLink = page.locator('a[href="/register"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/auth/signin');
  }

  /**
   * Fill in the username field
   */
  async enterUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  /**
   * Fill in the password field
   */
  async enterPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the login button
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Perform full login flow
   */
  async login(username: string, password: string) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  /**
   * Check if we're on the login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/auth/signin');
  }

  /**
   * Wait for redirect to home/pages after login
   */
  async waitForLoginSuccess() {
    await this.page.waitForURL(/\/(pages|$)/);
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Assert that an error message is displayed
   */
  async expectError(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  /**
   * Assert that we're still on the login page
   */
  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/\/auth\/signin/);
  }

  /**
   * Check if username field has validation error
   */
  async hasUsernameValidationError(): Promise<boolean> {
    const validity = await this.usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    return validity;
  }

  /**
   * Check if password field has validation error
   */
  async hasPasswordValidationError(): Promise<boolean> {
    const validity = await this.passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    return validity;
  }
}
