const { test: base, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/common/login_page');
const { NavigationPage } = require('../pages/common/navigation_page');
const { DataCentreListPage } = require('../pages/datacentre/datacentre_list_page');
const { DataCentreFilterPanel } = require('../pages/datacentre/datacentre_filter_panel');
const { DataCentreCreatePage } = require('../pages/datacentre/datacentre_create_page');
const { DataCentreDetailsPage } = require('../pages/datacentre/datacentre_details_page');

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
