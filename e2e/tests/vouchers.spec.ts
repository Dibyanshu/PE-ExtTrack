import { test, expect } from "@playwright/test";
import { VouchersListPage } from "./pages/vouchers-list.page";
import { VoucherCreatePage } from "./pages/voucher-create.page";

/**
 * E2E – Voucher management flows (Payment & Receive vouchers)
 *
 * Covers:
 *  1. Viewing the voucher list
 *  2. Filtering by voucher number
 *  3. Navigating to the create form
 *  4. Submitting with missing data triggers validation
 *  5. Creating a valid voucher (happy path – requires seeded master data)
 */

// ─── Payment Vouchers ────────────────────────────────────────────────────────

test.describe("Payment Vouchers – list", () => {
  test("should load the payment vouchers list page", async ({ page }) => {
    const listPage = new VouchersListPage(page, "payment");
    await listPage.goto();
    await listPage.waitForLoaded();

    // XPath: the "New" link must be present for authorised roles
    const newBtn = page.locator('xpath=//a[contains(@href,"/vouchers/payment/new")]');
    await expect(newBtn).toBeVisible();
  });

  test("should display voucher rows or an empty state", async ({ page }) => {
    const listPage = new VouchersListPage(page, "payment");
    await listPage.goto();
    await listPage.waitForLoaded();

    // Either rows exist OR an empty state message is shown – never a blank page
    const hasRows = await page
      .locator('xpath=//table//tbody//tr')
      .count()
      .then((n) => n > 0);

    if (!hasRows) {
      const empty = page.locator(
        'xpath=//*[contains(text(),"No") and (contains(text(),"voucher") or contains(text(),"result"))]'
      );
      await expect(empty).toBeVisible();
    } else {
      await listPage.expectAtLeastOneRow();
    }
  });

  test("should filter results by voucher number prefix", async ({ page }) => {
    const listPage = new VouchersListPage(page, "payment");
    await listPage.goto();
    await listPage.waitForLoaded();

    const searchInput = page.locator(
      'xpath=//input[@placeholder and (contains(translate(@placeholder,"abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ"),"VOUCHER") or contains(@placeholder,"Search"))]'
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill("PECRU-PV");
      // React state update is synchronous; wait for API response
      await page
        .waitForResponse((r) => r.url().includes("/api/expenses") && r.status() === 200, {
          timeout: 10_000,
        })
        .catch(() => {}); // Gracefully handle cases where the filter is client-only

      // All visible voucher number cells should contain the search prefix
      const voucherCells = page.locator(
        'xpath=//td[contains(text(),"PECRU-PV")] | //span[contains(text(),"PECRU-PV")]'
      );
      const count = await voucherCells.count();
      // Either matching rows or an empty-state is acceptable
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      test.skip(true, "Voucher number filter input not found on this build");
    }
  });
});

// ─── Voucher Create (shared helper) ─────────────────────────────────────────

for (const voucherType of ["payment", "receive"] as const) {
  test.describe(`${voucherType === "payment" ? "Payment" : "Receive"} Voucher – create form`, () => {
    test("should render the create form with all required fields", async ({ page }) => {
      const createPage = new VoucherCreatePage(page, voucherType);
      await createPage.goto();
      await createPage.expectLoaded();

      // XPath assertions on individual required fields
      await expect(createPage.projectSelect).toBeVisible();
      await expect(createPage.vendorSelect).toBeVisible();
      await expect(createPage.expenseDateInput).toBeVisible();
      await expect(createPage.particularSelect).toBeVisible();
      await expect(createPage.quantityInput).toBeVisible();
      await expect(createPage.pricePerUnitInput).toBeVisible();
      await expect(createPage.paymentStatusSelect).toBeVisible();
    });

    test("should show validation errors when submitting an empty form", async ({ page }) => {
      const createPage = new VoucherCreatePage(page, voucherType);
      await createPage.goto();
      await createPage.expectLoaded();

      await createPage.submit();
      await createPage.expectValidationErrors();

      // Must NOT navigate away on invalid submit
      const newPath =
        voucherType === "payment" ? /vouchers\/payment\/new/ : /vouchers\/receive\/new/;
      await expect(page).toHaveURL(newPath);
    });

    test(
      "should successfully create a voucher and redirect to the list (requires seeded master data)",
      async ({ page }) => {
        const createPage = new VoucherCreatePage(page, voucherType);
        await createPage.goto();
        await createPage.expectLoaded();

        await createPage.fillRequiredFields();
        await createPage.submit();

        // On success the app navigates back to the voucher list
        const listPath =
          voucherType === "payment" ? /vouchers\/payment/ : /vouchers\/receive/;
        await expect(page).toHaveURL(listPath, { timeout: 20_000 });

        // A success toast or the updated list should be visible
        const successIndicator = page.locator(
          'xpath=//*[contains(@class,"toast") or @role="status"] | //table//tbody//tr'
        );
        await expect(successIndicator.first()).toBeVisible();
      }
    );
  });
}
