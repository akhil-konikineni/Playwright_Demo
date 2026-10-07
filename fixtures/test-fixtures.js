// Custom test fixtures — the dependency-injection seam of the framework.
//
// Specs import { test, expect, applyAuthHooks } from here (NOT from @playwright/test)
// and receive ready-constructed Page Objects.
const base = require('@playwright/test');

const { LoginPage } = require('../pages/common/login.page');
const { NavigationPage } = require('../pages/common/navigation.page');
const { DataCentreListPage } = require('../pages/datacentre/datacentre-list.page');
const { DataCentreDetailPage } = require('../pages/datacentre/datacentre-detail.page');
const { DataCentreFilterPanel } = require('../pages/datacentre/datacentre-filter.component');
const { BillingTransactionsListPage } = require('../pages/billing-transactions/billing-transactions-list.page');
const { BillingTransactionsFilterPanel } = require('../pages/billing-transactions/billing-transactions-filter.component');
const { BillingTransactionsDetailPage } = require('../pages/billing-transactions/billing-transactions-detail.page');
const { BillingTransactionStatusControl } = require('../pages/billing-transactions/billing-transactions-status.component');

const test = base.test.extend({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  navigationPage: async ({ page }, use) => use(new NavigationPage(page)),
  dataCentreListPage: async ({ page }, use) => use(new DataCentreListPage(page)),
  dataCentreDetailsPage: async ({ page }, use) => use(new DataCentreDetailPage(page)),
  dataCentreFilterPanel: async ({ page }, use) => use(new DataCentreFilterPanel(page)),
  billingTransactionsListPage: async ({ page }, use) => use(new BillingTransactionsListPage(page)),
  billingTransactionsFilterPanel: async ({ page }, use) => use(new BillingTransactionsFilterPanel(page)),
  billingTransactionsDetailPage: async ({ page }, use) => use(new BillingTransactionsDetailPage(page)),
  billingTransactionStatusControl: async ({ page }, use) => use(new BillingTransactionStatusControl(page)),
});

// Per-test authentication lifecycle, wired via explicit beforeEach/afterEach hooks.
//
// Call `applyAuthHooks(test)` once at the top of a spec's describe block. It is a
// helper (not import-time hook registration) on purpose: Node caches this module, so
// a top-level `test.beforeEach` here would attach to only the FIRST spec file that
// imported it. Calling the helper inside each spec registers the hooks in that spec's
// own file scope, so every test gets a fresh login and a logout.
//
// "No cache before login" is guaranteed two ways: Playwright gives every test a brand
// new browser context (no storageState is configured), and we additionally clear
// cookies before logging in.
function applyAuthHooks(t) {
  t.beforeEach(async ({ context, loginPage }) => {
    await context.clearCookies();
    await loginPage.login();
  });
  t.afterEach(async ({ loginPage }) => {
    await loginPage.logout();
  });
}

module.exports = { test, expect: base.expect, applyAuthHooks };
