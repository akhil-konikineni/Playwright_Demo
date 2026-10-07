const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');

// Column order confirmed live on QAN.
const COLUMN_HEADERS = Object.freeze([
  'Data Centre Id',
  'Name',
  'Title',
  'Data Centre Ref',
  'Subdomain',
  'Country Code',
  'Status',
  'Actions',
]);

// Page Object for the Data Centres list page. Business logic lives here; specs
// stay declarative. Reference pattern for other feature POMs.
class DataCentreListPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Data Centres' });
    this.table = page.getByRole('table', { name: 'Data table' });
    // The grid renders two rowgroups: [0] header, [1] body.
    this.tbody = this.table.getByRole('rowgroup').nth(1);
    this.createButton = page.getByRole('button', { name: 'Create Data Centre' });
    this.addFilterButton = page.getByRole('button', { name: 'Add filter' });
    this.configureColumnsButton = page.getByRole('button', {
      name: 'Configure visible columns',
    });
    this.columnConfigDialog = page.getByRole('dialog', { name: 'Search Results View' });
    this.pageSizeCombobox = page.getByRole('combobox');
  }

  static get COLUMN_HEADERS() {
    return COLUMN_HEADERS;
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.table).toBeVisible();
  }

  // ── rows ────────────────────────────────────────────────────────────────
  // All data rows in the grid body.
  get rows() {
    return this.tbody.getByRole('row');
  }
  getRow(index) {
    return this.tbody.getByRole('row').nth(index);
  }
  getFirstRow() {
    return this.tbody.getByRole('row').first();
  }
  getRowCount() {
    return this.tbody.getByRole('row').count();
  }
  // Data Centre Id cell renders as a hyperlink to the detail page.
  idLink(row) {
    return row.getByRole('cell').nth(0).getByRole('link');
  }
  getStatusCell(row) {
    return row.getByRole('cell').nth(6);
  }

  // Trimmed text of a 0-based column across all data rows.
  async columnValues(columnIndex) {
    return this.tbody.getByRole('row').evaluateAll(
      (rows, idx) =>
        rows.map((r) => r.querySelectorAll('td')[idx]?.textContent?.trim() ?? ''),
      columnIndex
    );
  }

  // ── headers / sort ──────────────────────────────────────────────────────
  columnHeaders() {
    return this.table.getByRole('columnheader');
  }
  sortButton(columnName) {
    return this.table.getByRole('button', { name: 'Sort' }).filter({ hasText: columnName });
  }
  async sortBy(columnName) {
    await this.sortButton(columnName).click();
  }

  // ── column configuration panel ────────────────────────────────────────────
  async openColumnConfig() {
    await this.configureColumnsButton.click();
    await expect(this.columnConfigDialog).toBeVisible();
  }
  async setColumnChecked(columnName, checked) {
    const cb = this.columnConfigDialog.getByRole('checkbox', { name: columnName });
    if (checked) await cb.check();
    else await cb.uncheck();
  }
  async applyColumnConfig() {
    await this.columnConfigDialog.getByRole('button', { name: 'Apply' }).click();
    await expect(this.columnConfigDialog).not.toBeVisible();
  }

  // ── pagination ──────────────────────────────────────────────────────────
  paginationButton(name) {
    return this.page.getByRole('button', { name });
  }
  async setPageSize(size) {
    await this.pageSizeCombobox.click();
    await this.page.getByRole('option', { name: String(size), exact: true }).click();
  }
}

module.exports = { DataCentreListPage };
