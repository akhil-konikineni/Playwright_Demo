const { expect } = require('@playwright/test');
const { BasePage } = require('../common/BasePage');

class DataCentreCreatePage extends BasePage {
  constructor(page) {
    super(page);
    this.dialog = page.getByRole('dialog', { name: 'Create Data Centre' });
    this.nameField = this.dialog.getByRole('textbox').nth(0);
    this.titleField = this.dialog.getByRole('textbox').nth(1);
    this.dataCentreRefField = this.dialog.getByRole('textbox').nth(2);
    this.subdomainField = this.dialog.getByRole('textbox').nth(3);
    this.countryCodeCombobox = this.dialog.getByRole('combobox');
    this.submitButton = this.dialog.getByRole('button', { name: 'Submit' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
  }

  async open() {
    await this.page.locator('button:has-text("Create Data Centre")').click();
    await expect(this.dialog).toBeVisible();
  }

  async fillName(name) {
    await this.nameField.fill(name);
  }

  async fillTitle(title) {
    await this.titleField.fill(title);
  }

  async fillDataCentreRef(ref) {
    await this.dataCentreRefField.fill(ref);
  }

  async fillSubdomain(subdomain) {
    await this.subdomainField.fill(subdomain);
  }

  async selectCountryCode(optionText) {
    await this.countryCodeCombobox.click();
    await this.page.locator('role=listbox').locator(`text=${optionText}`).click();
  }

  async fillMandatoryFields(name, title, countryCode) {
    await this.fillName(name);
    await this.fillTitle(title);
    await this.selectCountryCode(countryCode);
  }

  async submit() {
    await this.submitButton.click();
  }

  async submitAndWaitForPost() {
    const [response] = await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/v2/dataCentre') && resp.request().method() === 'POST'
      ),
      this.submitButton.click(),
    ]);
    return response.status();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async isVisible() {
    return this.dialog.isVisible();
  }

  unsavedChangesDialog() {
    return this.page.getByRole('alertdialog', { name: 'Unsaved Changes' });
  }

  titleAlert() {
    return this.dialog.getByRole('alert');
  }

  getMandatoryMarkers() {
    return this.dialog.getByText('*', { exact: true });
  }
}

module.exports = { DataCentreCreatePage };
