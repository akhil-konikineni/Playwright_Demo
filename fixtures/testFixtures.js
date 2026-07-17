const { test: base, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/common/LoginPage');
const { NavigationPage } = require('../pages/common/NavigationPage');
const { DataCentreListPage } = require('../pages/datacentre/DataCentreListPage');
const { DataCentreFilterPanel } = require('../pages/datacentre/DataCentreFilterPanel');
const { DataCentreCreatePage } = require('../pages/datacentre/DataCentreCreatePage');
const { DataCentreDetailsPage } = require('../pages/datacentre/DataCentreDetailsPage');

const test = base.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  navigationPage: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },

  dataCentreListPage: async ({ page }, use) => {
    await use(new DataCentreListPage(page));
  },

  dataCentreFilterPanel: async ({ page }, use) => {
    await use(new DataCentreFilterPanel(page));
  },

  dataCentreCreatePage: async ({ page }, use) => {
    await use(new DataCentreCreatePage(page));
  },

  dataCentreDetailsPage: async ({ page }, use) => {
    await use(new DataCentreDetailsPage(page));
  },
});

module.exports = { test, expect };
