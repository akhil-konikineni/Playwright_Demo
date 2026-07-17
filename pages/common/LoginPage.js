const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
  }

  async login(username, password) {
    const url = process.env.APP_URL ?? 'https://portal.qan.aws.eseye.io/login';
    await this.page.goto(url);
    await this.page.locator('[placeholder="Enter your username"]').fill(
      username ?? process.env.USERNAME ?? ''
    );
    await this.page.locator('button:has-text("Continue")').click();
    await this.page.locator('[placeholder="Enter your password"]').fill(
      password ?? process.env.PASSWORD ?? ''
    );
    await this.page.locator('button:has-text("Continue")').click();
  }
}

module.exports = { LoginPage };
