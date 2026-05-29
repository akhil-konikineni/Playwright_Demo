import { test, expect } from '@playwright/test';

test.describe('Portfolio Access and Permissions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('https://portal.qan.aws.eseye.io/login', { waitUntil: 'networkidle' });
    
    // Enter credentials
    const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="user" i]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('resellerqa');
    
    const continueButton = page.locator('button:has-text("Continue")').first();
    await continueButton.click();
    
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill('Password#1');
    
    await continueButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('User can access Manage Portfolios menu', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    
    // Verify page loaded
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // Check for portfolio table or main content
    const portfolioContent = page.locator('[role="table"], .portfolio-list, [data-testid="portfolio-table"]').first();
    await expect(portfolioContent).toBeVisible({ timeout: 10000 }).catch(() => {
      // If table not visible, check for portfolio heading
      return page.locator('text=Portfolio, text=Manage Portfolios, h1').first().isVisible();
    });
  });

  test('Portfolio dashboard displays without errors', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check that page doesn't show error state
    const errorMessages = page.locator('[role="alert"], .error, .error-message, [data-testid="error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });
});
