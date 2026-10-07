const { expect } = require('@playwright/test');

// Base for all Page Objects. Holds the Playwright `page` and a small set of
// shared helpers so feature POMs stay focused on their own locators/actions.
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /** Navigate to an app path (relative to the configured baseURL). */
  async goto(path) {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /** Assert the browser tab title matches a string or RegExp. */
  async expectTitle(expected) {
    await expect(this.page).toHaveTitle(expected);
  }

  /** The breadcrumb navigation landmark, shared across list/detail pages. */
  get breadcrumb() {
    return this.page.getByRole('navigation', { name: 'breadcrumb' });
  }
}

module.exports = { BasePage };
