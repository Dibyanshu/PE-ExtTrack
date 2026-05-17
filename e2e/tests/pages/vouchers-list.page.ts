import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Vouchers List page
 * (shared between Payment and Receive voucher lists).
 */
export class VouchersListPage {
  readonly page: Page;
  readonly voucherType: "payment" | "receive";

  // ── Locators (XPath) ──────────────────────────────────────────────────────
  readonly pageTitle: Locator;
  readonly createButton: Locator;
  readonly searchVoucherNumberInput: Locator;
  readonly tableRows: Locator;
  readonly pagination: Locator;
  readonly prevPageBtn: Locator;
  readonly nextPageBtn: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeletons: Locator;
  readonly firstViewButton: Locator;

  constructor(page: Page, voucherType: "payment" | "receive") {
    this.page = page;
    this.voucherType = voucherType;

    const titleText = voucherType === "payment" ? "Payment Vouchers" : "Receive Vouchers";

    this.pageTitle = page.locator(
      `xpath=//h2[contains(text(),"${titleText}")] | //h1[contains(text(),"${titleText}")]`
    );

    // The "+ New" / create button links to the creation route
    const newPath = voucherType === "payment" ? "/vouchers/payment/new" : "/vouchers/receive/new";
    this.createButton = page.locator(`xpath=//a[@href="${newPath}"]`);

    // Voucher number filter input – identified by placeholder text
    this.searchVoucherNumberInput = page.locator(
      `xpath=//input[@placeholder and contains(@placeholder,"voucher") or @placeholder and contains(@placeholder,"Voucher")]`
    );

    // Table rows (each voucher renders as a card row or <tr>)
    this.tableRows = page.locator(
      'xpath=//table//tbody//tr | //div[contains(@class,"voucher-row")]'
    );

    // Pagination controls
    this.prevPageBtn = page.locator('xpath=//*[@data-testid="btn-prev-page"] | //*[.//*[name()="svg" and contains(@class,"ChevronLeft")]]');
    this.nextPageBtn = page.locator('xpath=//*[@data-testid="btn-next-page"] | //*[.//*[name()="svg" and contains(@class,"ChevronRight")]]');
    this.pagination  = page.locator('xpath=//*[contains(@class,"pagination") or contains(@aria-label,"pagination")]');

    // Empty state placeholder
    this.emptyState = page.locator('xpath=//*[contains(@class,"EmptyState") or contains(text(),"No vouchers")]');

    // Loading skeletons from Radix Skeleton component
    this.loadingSkeletons = page.locator('xpath=//*[contains(@class,"skeleton") or contains(@class,"Skeleton")]');

    // First eye/view button in the list
    this.firstViewButton = page.locator('xpath=//button[.//*[name()="svg"]]').first();
  }

  async goto() {
    const path = this.voucherType === "payment" ? "/vouchers/payment" : "/vouchers/receive";
    await this.page.goto(path);
  }

  async waitForLoaded() {
    // Wait for skeletons to disappear (data has loaded)
    await this.loadingSkeletons.waitFor({ state: "hidden" }).catch(() => {});
    await expect(this.pageTitle).toBeVisible();
  }

  async filterByVoucherNumber(number: string) {
    await this.searchVoucherNumberInput.fill(number);
    // Results update reactively – wait for the network to settle
    await this.page.waitForResponse((r) => r.url().includes("/api/expenses") && r.status() === 200);
  }

  async clickCreate() {
    await this.createButton.click();
    const newPath = this.voucherType === "payment"
      ? /vouchers\/payment\/new/
      : /vouchers\/receive\/new/;
    await expect(this.page).toHaveURL(newPath);
  }

  async expectAtLeastOneRow() {
    await expect(this.tableRows.first()).toBeVisible();
  }
}
