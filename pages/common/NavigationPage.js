const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class NavigationPage extends BasePage {
  constructor(page) {
    super(page);
  }

  async navigateToDataCentres() {
    await this.page.goto('https://portal.qan.aws.eseye.io/network-management/data-centres');
    await expect(this.page.getByRole('table', { name: 'Data table' })).toBeVisible();
  }
}

module.exports = { NavigationPage };
