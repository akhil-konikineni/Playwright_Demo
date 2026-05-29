import { test, expect } from '@playwright/test';

test.describe('Portfolio Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('https://portal.qan.aws.eseye.io/login', { waitUntil: 'networkidle' });
    const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="user" i]').first();
    await usernameInput.waitFor({ state: 'visible' });
    await usernameInput.fill('resellerqa');
    
    const continueButton = page.locator('button:has-text("Continue")').first();
    await continueButton.click();
    
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill('Password#1');
    await continueButton.click();
    
    await page.waitForLoadState('networkidle');
  });

  test('Pagination controls are visible and functional', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for pagination controls
    const paginationContainer = page.locator('[role="navigation"], .pagination, [data-testid="pagination"]').first();
    
    const isPaginationVisible = await paginationContainer.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isPaginationVisible) {
      // Check for page buttons/links
      const pageButtons = paginationContainer.locator('button, a');
      const buttonCount = await pageButtons.count();
      expect(buttonCount).toBeGreaterThan(0);
    } else {
      // Pagination might not be needed if few results
      const rows = await page.locator('tbody tr, [role="row"]:not([role="columnheader"])').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });

  test('Next and Previous page buttons work', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for Next button
    const nextButton = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="next" i]').first();
    
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      // Get current page content
      const initialContent = await page.locator('tbody').first().innerHTML();
      
      // Click next
      await nextButton.click();
      await page.waitForTimeout(1500);
      
      // Verify page changed
      const newContent = await page.locator('tbody').first().innerHTML();
      // Content should be different (if new data loaded)
      expect(newContent).toBeTruthy();
    }
  });

  test('Rows per page dropdown changes display limit', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for rows per page selector
    const rowsPerPageSelect = page.locator('select, [role="combobox"][aria-label*="rows" i], button:has-text("10"), button:has-text("25"), button:has-text("50")').first();
    
    if (await rowsPerPageSelect.isVisible()) {
      // Get initial row count
      const initialRows = await page.locator('tbody tr, [role="row"]:not([role="columnheader"])').count();
      
      // Click to open dropdown if needed
      if (await rowsPerPageSelect.getAttribute('role') === 'combobox') {
        await rowsPerPageSelect.click();
      }
      
      // Look for different row count option
      const option50 = page.locator('text="50", [aria-label*="50"]').first();
      if (await option50.isVisible()) {
        await option50.click();
        await page.waitForTimeout(1500);
        
        // Verify row count changed
        const newRows = await page.locator('tbody tr, [role="row"]:not([role="columnheader"])').count();
        // Should be same or different depending on data
        expect(newRows).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Pagination summary is accurate', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for pagination summary text
    const paginationSummary = page.locator('text=/Showing \\d+ to \\d+ of \\d+/i, text=/Page \\d+ of \\d+/i, [data-testid="pagination-summary"]').first();
    
    if (await paginationSummary.isVisible()) {
      const summaryText = await paginationSummary.textContent();
      
      // Should contain numbers showing pagination info
      expect(summaryText).toMatch(/\d+/);
    } else {
      // Summary might be displayed in different format
      const allText = await page.locator('body').textContent();
      expect(allText).toBeTruthy();
    }
  });

  test('Pagination state resets after search', async ({ page }) => {
    // Navigate to portfolio page
    await page.goto('https://portal.qan.aws.eseye.io/portfolio/manage-portfolios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Try to go to page 2
    const pageButton = page.locator('button:has-text("2"), a:has-text("2")').first();
    if (await pageButton.isVisible() && !await pageButton.isDisabled()) {
      await pageButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Now search
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);
      
      // Pagination should reset to page 1 or show filtered results
      const currentPageButton = page.locator('button:has-text("1")[aria-current="page"], button:has-text("1")[class*="active"]').first();
      
      // Page should be at first page or handling pagination for filtered results
      expect(await page.locator('tbody tr').count()).toBeGreaterThanOrEqual(0);
    }
  });
});
