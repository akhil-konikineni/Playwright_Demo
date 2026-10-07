const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');

// The 15 filter fields of the Finance -> Billing Transactions "Filters" drawer,
// confirmed live on QAN. Primary = Status/Name/Title/Start Date/Stop Date/Value/
// Quantity; Secondary = Portfolio/Package Category/Package Item Category/Billing
// Subscription/ICC Type/Package/Package Item/Product. Package Item is DEPENDENT on
// Package ("Select Package first").
const FILTER_FIELDS = Object.freeze([
  'Status', 'Name', 'Title', 'Start Date', 'Stop Date', 'Value', 'Quantity',
  'Portfolio', 'Package Category', 'Package Item Category', 'Billing Subscription',
  'ICC Type', 'Package', 'Package Item', 'Product',
]);

// Placeholder text per filter input (as rendered in the drawer).
const PLACEHOLDER = Object.freeze({
  Name: 'Filter By Name...',
  Title: 'Filter By Title...',
  'Start Date': 'Filter By Billing Transaction Start Date...',
  'Stop Date': 'Filter By Billing Transaction Stop Date...',
  Value: 'Filter By Value...',
  Quantity: 'Filter By Quantity...',
  Portfolio: 'Filter By Portfolio Id...',
  'Package Category': 'Filter By Package Category...',
  'Package Item Category': 'Filter By Package Item Category..',
  'Billing Subscription': 'Filter By Billing Subscription...',
  'ICC Type': 'Filter By Icc Type ...',
  Package: 'Filter By Package...',
  'Package Item': 'Filter By Package Item...',
  Product: 'Filter By Product...',
});

// Component POM for the Billing Transactions "Filters" drawer (opened via "Add filter").
class BillingTransactionsFilterPanel extends BasePage {
  constructor(page) {
    super(page);
    this.addFilterButton = page.getByRole('button', { name: 'Add filter' });
    this.clearAllButton = page.getByRole('button', { name: 'Clear all' });
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Filters' });
    this.searchFilters = this.dialog.getByPlaceholder(/Search filters/);
    // Status is the first combobox (placeholder "Select item...") under Primary Filters.
    this.statusDropdown = this.dialog.getByRole('combobox').first();
    this.applyButton = this.dialog.getByRole('button', { name: 'Apply' });
    this.resetButton = this.dialog.getByRole('button', { name: 'Reset' });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.selectPackageFirstHint = this.dialog.getByText('Select Package first');
  }

  static get FILTER_FIELDS() {
    return FILTER_FIELDS;
  }

  async open() {
    await this.addFilterButton.click();
    await expect(this.dialog).toBeVisible();
  }

  // Text / numeric / date input addressed by its placeholder.
  input(field) {
    return this.dialog.getByPlaceholder(PLACEHOLDER[field]);
  }
  async fillField(field, value) {
    await this.input(field).fill(String(value));
  }

  // A secondary searchable dropdown (Portfolio, Package Category, ...). Types into the
  // field to filter, then picks the option (partial match) from the portaled listbox.
  async selectDropdown(field, optionText, searchTerm) {
    await this.input(field).click();
    if (searchTerm != null) await this.input(field).fill(String(searchTerm));
    await this.page.getByRole('option', { name: optionText }).first().click();
  }

  // Status single-select dropdown ("Select item..."): open + pick a value.
  async selectStatus(value) {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
  }

  // Whether the Package Item field is disabled (it is gated on Package -> "Select Package first").
  async isPackageItemDisabled() {
    const el = this.input('Package Item');
    return (await el.isEditable().catch(() => false)) === false;
  }

  async apply() {
    await this.applyButton.click();
  }
  async reset() {
    await this.resetButton.click();
  }
  async close() {
    await this.closeButton.click();
  }
  // Toolbar "Clear all" — removes applied filters + quick search and restores the full list.
  async clearAll() {
    await this.clearAllButton.click();
  }
}

module.exports = { BillingTransactionsFilterPanel };
