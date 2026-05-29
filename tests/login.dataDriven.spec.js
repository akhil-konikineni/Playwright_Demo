import { test, expect } from '@playwright/test';

const loginData = [
  {
    username: 'resellerqa',
    password: 'Password#1',
    expectedMessage: 'Dashboard',
    success: true,
  },
  {
    username: 'fakeuser',
    password: 'fakepass',
    expectedMessage: 'Unable to login. Incorrect username or password.',
    success: false,
  },
];

test.describe('Eseye Portal login tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://portal.qan.aws.eseye.io/login');
  });

  for (const dataset of loginData) {
    test(`${dataset.username} should ${dataset.success ? 'see dashboard' : 'see login error'}`, async ({ page }) => {
      await page.fill('#username', dataset.username);
      await page.click('button:has-text("Continue")');
      await page.waitForSelector('#password', { timeout: 15000 });
      await page.fill('#password', dataset.password);
      await page.click('button:has-text("Continue")');

      if (dataset.success) {
        await expect(page.getByRole('heading', { name: /Dashboard Overview/ })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 15000 });
        await page.click('button:has-text("Logout")');
        await expect(page.locator('text=Login')).toBeVisible({ timeout: 15000 });
      } else {
        await expect(page.locator('text=Unable to login.')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Incorrect username or password.')).toBeVisible({ timeout: 15000 });
      }
    });
  }
});
