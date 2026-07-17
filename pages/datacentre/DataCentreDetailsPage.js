const { expect } = require('@playwright/test');
const { BasePage } = require('../common/BasePage');

class DataCentreDetailsPage extends BasePage {
  constructor(page) {
    super(page);
  }

  confirmDialog() {
    return this.page.getByRole('dialog');
  }

  async assertConfirmDialog(fromStatus, toStatus) {
    const dialog = this.confirmDialog();
    await expect(dialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(dialog).toContainText(`"${fromStatus}"`);
    await expect(dialog).toContainText(`"${toStatus}"`);
  }

  async confirm(buttonLabel) {
    await this.confirmDialog().getByRole('button', { name: buttonLabel }).click();
  }

  async cancelTransition() {
    await this.confirmDialog().getByRole('button', { name: 'Cancel' }).click();
  }

  async closeTransition() {
    await this.confirmDialog().getByRole('button', { name: 'Close' }).click();
  }
}

module.exports = { DataCentreDetailsPage };
