const { expect } = require('@playwright/test');
const { BasePage } = require('../common/base_page');

class DataCentreListPage extends BasePage {
  constructor(page) {
    super(page);
    this.table = page.getByRole('table', { name: 'Data table' });
    this.tbody = this.table.getByRole('rowgroup').nth(1);
    this.createButton = page.locator('button:has-text("Create Data Centre")');
    this.addFilterButton = page.locator('button:has-text("Add filter")');
  }

  async getRow(index) {
    return this.tbody.getByRole('row').nth(index);
  }

  async getFirstRow() {
    return this.tbody.getByRole('row').first();
  }

  async getRowCount() {
    return this.tbody.getByRole('row').count();
  }

  getStatusCell(row) {
    return row.getByRole('cell').nth(6);
  }

  async openActionsMenu(row) {
    await row.getByRole('button', { name: 'Actions' }).click();
  }

  async clickActionsMenuItem(itemName) {
    await this.page
      .getByRole('menu', { name: 'Actions' })
      .getByRole('menuitem', { name: itemName })
      .click();
  }

  async confirmStatusChange(confirmButtonLabel) {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await dialog.getByRole('button', { name: confirmButtonLabel }).click();
  }

  async filterByStatus(status) {
    await this.addFilterButton.click();
    const filterDialog = this.page.getByRole('dialog', { name: 'Filters' });
    await expect(filterDialog).toBeVisible();
    await filterDialog.getByRole('button', { name: 'Select Status' }).click();
    await this.page.getByRole('menuitem', { name: status }).click();
    await filterDialog.getByRole('button', { name: 'Apply' }).click();
  }

  async transitionStatus(row, menuItem, confirmLabel) {
    await this.openActionsMenu(row);
    await this.clickActionsMenuItem(menuItem);
    await this.confirmStatusChange(confirmLabel);
  }
}

module.exports = { DataCentreListPage };
