import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Global authentication setup.
 *
 * This setup project runs once before any browser project.
 * It performs a real login and saves the resulting localStorage/cookies
 * to `e2e/.auth/user.json`.  All subsequent test projects load that
 * storage state so they start already authenticated.
 *
 * Credentials are consumed from environment variables so that they are
 * never committed to version control.
 *
 *   E2E_USER_EMAIL=admin@parbati.com
 *   E2E_USER_PASSWORD=secret
 */

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email    = process.env.E2E_USER_EMAIL    ?? "admin@parbati.com";
  const password = process.env.E2E_USER_PASSWORD ?? "changeme";

  await page.goto("/");

  // Use XPath to locate the form inputs (consistent with project standard)
  const emailInput    = page.locator('xpath=//*[@data-testid="input-email"]');
  const passwordInput = page.locator('xpath=//*[@data-testid="input-password"]');
  const submitButton  = page.locator('xpath=//*[@data-testid="btn-login"]');

  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Wait until the app redirects away from the login page
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  // Persist the browser storage so other projects can reuse the session
  await page.context().storageState({ path: AUTH_FILE });
});
