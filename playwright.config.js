const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  /* Where Playwright writes test artifacts (screenshots, videos, traces) */
  outputDir: './test-results',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['ortoni-report', {
      open: process.env.CI ? 'never' : 'always',
      folderPath: 'ortoni-report',
      filename: 'index.html',
      title: 'Eseye QAN Portal — Test Report',
      projectName: 'Playwright_MCP',
      preferredTheme: 'light',
    }],
    ['list'],
  ],

  use: {
    /* Run tests in a visible browser window, not headless */
    headless: false,

    /* Capture screenshot only when a test fails */
    screenshot: 'only-on-failure',

    /* Retain video only when a test fails */
    video: 'retain-on-failure',

    /* Collect trace on first retry of a failed test */
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
