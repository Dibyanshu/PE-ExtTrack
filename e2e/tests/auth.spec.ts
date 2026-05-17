import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

/**
 * E2E – Authentication flows
 *
 * These tests cover the login page directly (without pre-seeded storage
 * state) so that we can verify the login UI itself.  They intentionally
 * do NOT depend on the "setup" project; they start with a fresh context.
 */

test.describe("Login page", () => {
  test("should display the Parbati Enterprises branding", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageVisible();

    // XPath assertion: the card description text is visible
    const description = page.locator(
      'xpath=//*[contains(translate(text(),"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"EXPENSE TRACKER")]'
    );
    await expect(description).toBeVisible();
  });

  test("should show validation error on empty form submit", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click submit without filling in credentials
    await loginPage.submitButton.click();

    // At least one inline validation message should appear
    const validationMsg = page.locator(
      'xpath=//*[contains(@class,"FormMessage") or contains(@class,"text-destructive")]'
    );
    await expect(validationMsg.first()).toBeVisible();
  });

  test("should show an error toast on wrong credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("wrong@example.com", "wrongpassword");

    // A destructive toast or error message should appear
    const errorIndicator = page.locator(
      'xpath=//*[contains(@class,"destructive")] | //*[@role="alert"]'
    );
    await expect(errorIndicator.first()).toBeVisible({ timeout: 15_000 });
    // Must stay on the login page
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("should navigate to dashboard after successful login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const email    = process.env.E2E_USER_EMAIL    ?? "admin@parbati.com";
    const password = process.env.E2E_USER_PASSWORD ?? "changeme";

    await loginPage.login(email, password);
    await loginPage.expectRedirectedToDashboard();
  });
});
