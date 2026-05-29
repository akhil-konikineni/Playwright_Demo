import { test } from '@playwright/test';

test('Portfolio test setup', async ({ page }) => {
  // Navigate to login page
  await page.goto('https://portal.qan.aws.eseye.io/login', { waitUntil: 'networkidle' });
  
  // Wait for username input to be visible
  const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="user" i]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  
  // Enter username
  await usernameInput.fill('resellerqa');
  
  // Click Continue button
  const continueButton = page.locator('button:has-text("Continue")').first();
  await continueButton.click();
  
  // Wait for password field and enter password
  const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill('Password#1');
  
  // Click Continue to login
  await continueButton.click();
  
  // Wait for navigation after login (up to 15 seconds)
  await page.waitForLoadState('networkidle');
  
  // Try to navigate to portfolio manage page
  try {
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    // If direct navigation fails, try to find portfolio link
    const portfolioLink = page.locator('text=Portfolio, text=Manage Portfolios').first();
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForLoadState('networkidle');
    }
  }
  
  // Ensure page has loaded
  await page.waitForLoadState('domcontentloaded');
});
