import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/dashboard.page";

/**
 * E2E – Dashboard flow
 *
 * Pre-condition: the "setup" project has stored an authenticated session,
 * so these tests start already logged-in (via storageState in the config).
 */

test.describe("Dashboard", () => {
  test("should load the dashboard with KPI cards", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();

    // XPath: expect at least 1 stat card rendered inside a CSS grid
    const statCard = page.locator(
      'xpath=//div[contains(@class,"grid")]//div[contains(@class,"Card") or @data-slot="card"]'
    );
    await expect(statCard.first()).toBeVisible();
  });

  test("should navigate to Payment Vouchers from the dashboard nav", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();
    await dashboard.goToPaymentVouchers();

    // Confirm URL and page title
    await expect(page).toHaveURL(/vouchers\/payment/);
    const title = page.locator(
      'xpath=//h1[contains(text(),"Payment")] | //h2[contains(text(),"Payment")]'
    );
    await expect(title).toBeVisible();
  });

  test("should navigate to Receive Vouchers from the dashboard nav", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();
    await dashboard.goToReceiveVouchers();

    await expect(page).toHaveURL(/vouchers\/receive/);
    const title = page.locator(
      'xpath=//h1[contains(text(),"Receive")] | //h2[contains(text(),"Receive")]'
    );
    await expect(title).toBeVisible();
  });

  test("should show an error alert when the API is unavailable", async ({ page }) => {
    // Intercept and fail the dashboard summary API call
    await page.route("**/api/dashboard**", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "Internal server error" }) })
    );

    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // XPath: error alert rendered via Radix Alert component
    const errorAlert = page.locator(
      'xpath=//*[@data-testid="dash-error"] | //*[@role="alert" and contains(@class,"destructive")]'
    );
    await expect(errorAlert).toBeVisible({ timeout: 15_000 });
  });
});
