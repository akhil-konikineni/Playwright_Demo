const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');

// The 10 grid columns for Finance -> Billing Transactions, in display order
// (confirmed live on QAN). NOTE: Stop Date is a filter but NOT a grid column.
const COLUMN_HEADERS = Object.freeze([
  'Billing Transaction Id',
  'Portfolio',
  'Name',
  'Title',
  'Category',
  'Item Category',
  'Start Date',
  'Value',
  'Status',
  'Actions',
]);

// Column index (0-based, data columns) for value assertions.
const COL = Object.freeze({
  id: 0, portfolio: 1, name: 2, title: 3, category: 4, itemCategory: 5,
  startDate: 6, value: 7, status: 8,
});

// List page POM for Finance -> Billing Transactions. Paginated grid (default 50),
// toolbar "Search by Name" quick filter, and First/Previous/Next/Last controls.
class BillingTransactionsListPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Billing Transactions', level: 1 });
    this.grid = page.getByRole('table');
    this.tbody = this.grid.locator('tbody');
    this.searchByName = page.getByPlaceholder('Search by Name');
    // Pagination footer controls.
    this.firstPage = page.getByRole('button', { name: 'First page' });
    this.previousPage = page.getByRole('button', { name: 'Previous page' });
    this.nextPage = page.getByRole('button', { name: 'Next page' });
    this.lastPage = page.getByRole('button', { name: 'Last page' });
    // "Showing per page:" is a label span; the size value (e.g. 50) sits in the
    // adjacent control (combobox/button) — target that sibling, not the label.
    this.pageSizeLabel = page.getByText('Showing per page:');
    this.pageSizeControl = this.pageSizeLabel.locator('xpath=following-sibling::*[1]');
  }

  static get COLUMN_HEADERS() {
    return COLUMN_HEADERS;
  }
  static get COL() {
    return COL;
  }

  columnHeaders() {
    return this.grid.getByRole('columnheader');
  }
  rows() {
    return this.tbody.getByRole('row');
  }
  getFirstRow() {
    return this.rows().first();
  }
  idLink(row) {
    return row.getByRole('cell').nth(COL.id).getByRole('link');
  }
  portfolioLink(row) {
    return row.getByRole('cell').nth(COL.portfolio).getByRole('link');
  }

  // Trimmed text values of a data column across all visible rows.
  async columnValues(colIndex) {
    const cells = this.tbody.getByRole('row').getByRole('cell').nth(colIndex);
    const n = await cells.count();
    const out = [];
    for (let i = 0; i < n; i++) out.push(((await cells.nth(i).textContent()) || '').trim());
    return out;
  }

  async rowCount() {
    return this.rows().count();
  }

  // Status badge cell (column index 8) of a row, and its trimmed text.
  statusCell(row) {
    return row.getByRole('cell').nth(COL.status);
  }
  async rowStatus(row) {
    return ((await this.statusCell(row).textContent()) || '').trim();
  }
  async rowId(row) {
    return ((await this.idLink(row).textContent()) || '').trim();
  }

  // First visible row whose Status cell equals `status` (e.g. 'Setup'). Returns a row
  // locator; use `await row.count()` to check existence before acting.
  rowByStatus(status) {
    return this.rows()
      .filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${status}$`) }) })
      .first();
  }

  // Toolbar quick-search by Name (does NOT open the Add filter drawer). Uses real
  // keystrokes so the debounced client search triggers.
  async quickSearchByName(term) {
    await this.searchByName.click();
    await this.searchByName.pressSequentially(term);
  }

  // Change the "Showing per page" size via the size-control popover.
  async setPageSize(size) {
    await this.pageSizeControl.click();
    await this.page.getByRole('option', { name: String(size), exact: true }).click();
  }
}

module.exports = { BillingTransactionsListPage };
