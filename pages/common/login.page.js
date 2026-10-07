const { BasePage } = require('../base/base.page');
const { ENV } = require('../../config/env');
const { Routes } = require('../../constants/routes');

// Two-step login (username → Continue → password → Continue). Env-aware: the base
// URL and credentials come from the active environment (config/env.js). Locators
// were confirmed live on the /auth page.
class LoginPage extends BasePage {
  get usernameField() {
    return this.page.getByRole('textbox', { name: 'Username' });
  }
  get passwordField() {
    return this.page.getByRole('textbox', { name: 'Password' });
  }
  get continueButton() {
    return this.page.getByRole('button', { name: 'Continue' });
  }
  get logoutButton() {
    return this.page.getByRole('button', { name: 'Logout' });
  }

  async login(username = ENV.credentials.username, password = ENV.credentials.password) {
    await this.page.goto(`${ENV.baseURL}${Routes.auth}`, { waitUntil: 'domcontentloaded' });

    // Step 1 — username (Continue enables once it's filled; click auto-waits for that).
    await this.usernameField.fill(username ?? '');
    await this.continueButton.click();

    // Step 2 — password.
    await this.passwordField.waitFor({ state: 'visible' });
    await this.passwordField.fill(password ?? '');
    await this.continueButton.click();

    // Post-login redirect away from /auth completes the sign-in.
    await this.page.waitForURL((u) => !u.pathname.startsWith('/auth'));
  }

  // Logout via the header Logout button (non-fatal — used from the afterEach hook).
  async logout() {
    if (await this.logoutButton.isVisible().catch(() => false)) {
      await this.logoutButton.click();
      await this.page.waitForURL(/\/auth/).catch(() => {});
    }
  }
}

module.exports = { LoginPage };
