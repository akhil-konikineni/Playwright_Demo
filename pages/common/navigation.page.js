const { expect } = require('@playwright/test');
const { BasePage } = require('../base/base.page');
const { Routes } = require('../../constants/routes');

// Cross-feature navigation (left sidebar + direct routing). Feature POMs use this
// to land on their page; they don't re-implement navigation.
class NavigationPage extends BasePage {
  // Direct navigation to the Data Centres list, waiting for the grid to render.
  // The Data Centres micro-frontend hydrates slowly; a single patient wait for
  // the grid is preferred over fixed delays.
  async goToDataCentres() {
    await this.goto(Routes.dataCentres);
    await expect(this.page.getByRole('table', { name: 'Data table' })).toBeVisible({
      timeout: 60000,
    });
  }

  // Left-sidebar entry (used by visibility/permission tests).
  get networkManagementMenu() {
    return this.page.getByRole('button', { name: 'Network Management' });
  }
  get dataCentresLink() {
    return this.page.getByRole('link', { name: 'Data Centres' });
  }

  // Direct navigation to the Finance -> Billing Transactions list, waiting for the
  // grid to render (slow-hydrating micro-frontend).
  async goToBillingTransactions() {
    await this.goto(Routes.billingTransactions);
    // Stable readiness signals (column headers truncate at narrow widths, so don't
    // wait on them): the page h1, then a hydrated data row (numeric Id hyperlink).
    await expect(
      this.page.getByRole('heading', { name: 'Billing Transactions', level: 1 })
    ).toBeVisible({ timeout: 60000 });
    await expect(
      this.page.getByRole('link', { name: /^\d{6,}$/ }).first()
    ).toBeVisible({ timeout: 60000 });
  }

  // Left-sidebar entries for Billing Transactions (Finance group) — used by
  // permission/visibility tests.
  get financeMenu() {
    return this.page.getByRole('button', { name: 'Finance' });
  }
  get billingTransactionsNav() {
    return this.page.getByRole('button', { name: 'Billing Transactions' });
  }
}

module.exports = { NavigationPage };
