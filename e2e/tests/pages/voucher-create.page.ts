import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Voucher Create page.
 */
export class VoucherCreatePage {
  readonly page: Page;
  readonly voucherType: "payment" | "receive";

  // ── Locators (XPath) ──────────────────────────────────────────────────────
  readonly pageTitle: Locator;
  readonly backLink: Locator;
  readonly projectSelect: Locator;
  readonly vendorSelect: Locator;
  readonly expenseDateInput: Locator;
  readonly particularSelect: Locator;
  readonly uomSelect: Locator;
  readonly quantityInput: Locator;
  readonly pricePerUnitInput: Locator;
  readonly paymentStatusSelect: Locator;
  readonly invoiceNumberInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly submitButton: Locator;
  readonly formErrorMessages: Locator;

  constructor(page: Page, voucherType: "payment" | "receive") {
    this.page = page;
    this.voucherType = voucherType;

    const titleText = voucherType === "payment" ? "New Payment Voucher" : "New Receive Voucher";

    this.pageTitle = page.locator(`xpath=//h2[contains(text(),"${titleText}")] | //h1[contains(text(),"${titleText}")]`);
    this.backLink  = page.locator('xpath=//a[contains(@href,"vouchers") and not(contains(@href,"new"))]').first();

    // Radix Select components render a <button> as the trigger.
    // We target by the label text that precedes each select widget.
    this.projectSelect       = page.locator('xpath=//label[contains(text(),"Project")]/following-sibling::*//button[@role="combobox"] | //label[contains(text(),"Project")]/..//button[@role="combobox"]');
    this.vendorSelect        = page.locator('xpath=//label[contains(text(),"Vendor")]/following-sibling::*//button[@role="combobox"] | //label[contains(text(),"Vendor")]/..//button[@role="combobox"]');
    this.particularSelect    = page.locator('xpath=//label[contains(text(),"Particular")]/following-sibling::*//button[@role="combobox"] | //label[contains(text(),"Particular")]/..//button[@role="combobox"]');
    this.uomSelect           = page.locator('xpath=//label[contains(text(),"UOM")]/following-sibling::*//button[@role="combobox"] | //label[contains(text(),"UOM")]/..//button[@role="combobox"]');
    this.paymentStatusSelect = page.locator('xpath=//label[contains(text(),"Payment Status")]/following-sibling::*//button[@role="combobox"] | //label[contains(text(),"Payment Status")]/..//button[@role="combobox"]');

    this.expenseDateInput    = page.locator('xpath=//input[@type="date"] | //input[contains(@id,"expenseDate") or contains(@name,"expenseDate")]');
    this.quantityInput       = page.locator('xpath=//input[contains(@id,"quantity") or contains(@name,"quantity")]');
    this.pricePerUnitInput   = page.locator('xpath=//input[contains(@id,"pricePerUnit") or contains(@name,"pricePerUnit")]');
    this.invoiceNumberInput  = page.locator('xpath=//input[contains(@id,"invoiceNumber") or contains(@name,"invoiceNumber")]');
    this.descriptionTextarea = page.locator('xpath=//textarea[contains(@id,"description") or contains(@name,"description")]');

    this.submitButton     = page.locator('xpath=//button[@type="submit"]');
    this.formErrorMessages = page.locator('xpath=//*[contains(@class,"FormMessage") or contains(@class,"text-destructive")]');
  }

  async goto() {
    const path = this.voucherType === "payment" ? "/vouchers/payment/new" : "/vouchers/receive/new";
    await this.page.goto(path);
  }

  async expectLoaded() {
    await expect(this.pageTitle).toBeVisible();
  }

  /**
   * Choose the first available option from a Radix Select dropdown.
   * Returns the selected option text.
   */
  async selectFirstOption(trigger: Locator): Promise<string> {
    await trigger.click();
    // Radix portals the listbox to document body
    const firstOption = this.page.locator('xpath=//div[@role="listbox"]//div[@role="option"][1]');
    const text = (await firstOption.textContent()) ?? "";
    await firstOption.click();
    return text.trim();
  }

  async fillRequiredFields() {
    await this.selectFirstOption(this.projectSelect);
    await this.selectFirstOption(this.vendorSelect);

    // Set date to today in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    await this.expenseDateInput.fill(today);

    await this.selectFirstOption(this.particularSelect);
    await this.selectFirstOption(this.uomSelect);
    await this.quantityInput.fill("5");
    await this.pricePerUnitInput.fill("100");
    await this.selectFirstOption(this.paymentStatusSelect);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectValidationErrors() {
    await expect(this.formErrorMessages.first()).toBeVisible();
  }
}
