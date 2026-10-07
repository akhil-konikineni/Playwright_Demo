const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');

// The 7 filter fields, confirmed live on QAN. Two dropdowns (Status, Country Code)
// and five text inputs. Status..Data Centre Id sit under "Primary Filters"; Country
// Code under "Secondary Filters".
const FILTER_FIELDS = Object.freeze([
  'Status',
  'Subdomain',
  'Data Centre Ref',
  'Title',
  'Name',
  'Data Centre Id',
  'Country Code',
]);

// Component POM for the Data Centres "Filters" dialog (opened via "Add filter").
class DataCentreFilterPanel extends BasePage {
  constructor(page) {
    super(page);
    this.addFilterButton = page.getByRole('button', { name: 'Add filter' });
    // Toolbar-level control that clears all applied filters and restores the full list.
    this.clearAllButton = page.getByRole('button', { name: 'Clear all' });
    this.dialog = page.getByRole('dialog', { name: 'Filters' });
    this.heading = this.dialog.getByRole('heading', { name: 'Filters' });
    this.searchFilters = this.dialog.getByRole('textbox', { name: /Search filters/ });
    // Exactly two comboboxes live in the dialog, in DOM order:
    // [0] Status (Primary), [1] Country Code (Secondary).
    this.statusDropdown = this.dialog.getByRole('combobox').first();
    this.countryCodeDropdown = this.dialog.getByRole('combobox').last();
    this.applyButton = this.dialog.getByRole('button', { name: 'Apply' });
    this.resetButton = this.dialog.getByRole('button', { name: 'Reset' });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
  }

  static get FILTER_FIELDS() {
    return FILTER_FIELDS;
  }

  async open() {
    await this.addFilterButton.click();
    await expect(this.dialog).toBeVisible();
  }

  // Text filter inputs are addressed by their stable placeholder "Filter by {Label}".
  textFilter(label) {
    return this.dialog.getByPlaceholder(`Filter by ${label}`);
  }

  // Fill one of the text filters (e.g. "Name", "Title", "Subdomain"). The API encodes
  // it as ?{field}={value}&matchField={field}&matchType=c (case-insensitive contains).
  async filterByText(label, value) {
    await this.textFilter(label).fill(value);
  }

  // Status is a multi-select combobox whose checkbox options render in a searchable
  // popover (portaled outside the dialog). Selecting toggles each value; the panel's
  // Apply button then runs the filter.
  async selectStatus(...values) {
    await this.statusDropdown.click();
    for (const value of values) {
      await this.page.getByRole('option', { name: value, exact: true }).click();
    }
  }

  // Country Code (Secondary Filters) is a searchable single-select. Options are
  // labelled "{id} - {code}" (e.g. "104 - IN"); the list is long, so we search by the
  // code (its title, matched server-side) before clicking the exact option.
  async selectCountryCode(optionLabel, searchTerm) {
    await this.countryCodeDropdown.click();
    if (searchTerm) await this.page.getByPlaceholder('Search...').fill(String(searchTerm));
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
  }

  // The field's visible label text inside the dialog.
  fieldLabel(label) {
    return this.dialog.getByText(label, { exact: true });
  }

  async apply() {
    await this.applyButton.click();
  }
  async reset() {
    await this.resetButton.click();
  }

  // Toolbar "Clear all" — removes applied filters and restores the full list.
  async clearAll() {
    await this.clearAllButton.click();
  }
  async close() {
    await this.closeButton.click();
  }
}

module.exports = { DataCentreFilterPanel };
