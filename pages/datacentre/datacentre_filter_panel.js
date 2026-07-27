const { expect } = require('@playwright/test');
const { BasePage } = require('../common/base_page');

class DataCentreFilterPanel extends BasePage {
  constructor(page) {
    super(page);
    this.dialog = page.getByRole('dialog', { name: 'Filters' });
  }

  async open() {
    await this.page.locator('button:has-text("Add filter")').click();
    await expect(this.dialog).toBeVisible();
  }

  async close() {
    await this.dialog.getByRole('button', { name: 'Close' }).click();
  }

  async filterByName(name) {
    await this.dialog.locator('input[placeholder*="Name"]').fill(name);
  }

  async filterByTitle(title) {
    await this.dialog.locator('input[placeholder*="Title"]').fill(title);
  }

  async filterByStatus(status) {
    await this.dialog.getByRole('button', { name: 'Select Status' }).click();
    await this.page.getByRole('menuitem', { name: status }).click();
  }

  async apply() {
    await this.dialog.getByRole('button', { name: 'Apply' }).click();
  }

  async reset() {
    await this.dialog.getByRole('button', { name: 'Reset' }).click();
  }

  async isVisible() {
    return this.dialog.isVisible();
  }

  filterChip(label) {
    return this.page.locator(`text=${label}`);
  }
}

module.exports = { DataCentreFilterPanel };
