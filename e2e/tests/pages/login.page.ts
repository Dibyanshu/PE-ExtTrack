import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login page.
 *
 * All element lookups use XPath as required by the project standard.
 * XPath expressions are co-located with the POM so they are maintained
 * in one place and never scattered across test files.
 */
export class LoginPage {
  readonly page: Page;

  // ── Locators (XPath) ──────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly cardTitle: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;

    // data-testid attributes are rendered as plain HTML attributes, so
    // XPath attribute predicates work perfectly.
    this.emailInput    = page.locator('xpath=//*[@data-testid="input-email"]');
    this.passwordInput = page.locator('xpath=//*[@data-testid="input-password"]');
    this.submitButton  = page.locator('xpath=//*[@data-testid="btn-login"]');

    // Text-based XPath for structural elements
    this.cardTitle  = page.locator('xpath=//h1[contains(@class,"text-primary")]');

    // Toasts rendered by Sonner/Radix use role=status or a predictable class
    this.errorToast = page.locator('xpath=//*[contains(@class,"destructive") and @role="status"]');
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  async goto() {
    await this.page.goto("/");
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────────
  async expectPageVisible() {
    await expect(this.cardTitle).toBeVisible();
    await expect(this.cardTitle).toContainText("Parbati Enterprises");
  }

  async expectRedirectedToDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectLoginError() {
    await expect(this.errorToast).toBeVisible();
  }
}
