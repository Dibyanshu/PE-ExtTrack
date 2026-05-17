import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Dashboard page.
 */
export class DashboardPage {
  readonly page: Page;

  // ── Locators (XPath) ──────────────────────────────────────────────────────
  readonly heading: Locator;
  readonly statsCards: Locator;
  readonly navPaymentVouchers: Locator;
  readonly navReceiveVouchers: Locator;
  readonly navDashboard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator(
      'xpath=//h1[contains(translate(text(),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"DASHBOARD")]'
    );

    // Summary stat cards – the grid of 4 KPI cards rendered on the dashboard
    this.statsCards = page.locator('xpath=//div[contains(@class,"grid")]//div[@class and .//div[contains(@class,"CardHeader")]]');

    // Sidebar / nav links
    this.navDashboard = page.locator('xpath=//a[@href="/dashboard" or @href="./dashboard"]');
    this.navPaymentVouchers = page.locator(
      'xpath=//a[contains(@href,"payment") and not(contains(@href,"new"))]'
    );
    this.navReceiveVouchers = page.locator(
      'xpath=//a[contains(@href,"receive") and not(contains(@href,"new"))]'
    );
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async goToPaymentVouchers() {
    await this.navPaymentVouchers.first().click();
    await expect(this.page).toHaveURL(/vouchers\/payment/);
  }

  async goToReceiveVouchers() {
    await this.navReceiveVouchers.first().click();
    await expect(this.page).toHaveURL(/vouchers\/receive/);
  }
}
