const { defineConfig, devices } = require('@playwright/test');
const { ENV, assertEnv } = require('./config/env'); // resolves TEST_ENV → stable ENV

// Fail fast (with env name + file + missing keys) if the active environment is
// misconfigured, before any browser launches.
assertEnv();

module.exports = defineConfig({
  testDir: './tests',

  /* Where Playwright writes test artifacts (screenshots, videos, traces) */
  outputDir: './test-results',

  /* The portal is a slow-hydrating micro-frontend, and every test performs a full
     login in beforeEach — allow generous per-test time. */
  timeout: 180_000,
  expect: { timeout: 15_000 },

  /* PER-TEST LOGIN MODEL: each test authenticates fresh (no cached session) and logs
     out afterwards. To avoid a WAF auth-request storm from concurrent /auth hits we
     run SERIALLY — do NOT raise `workers` without confirming QAN's WAF tolerates
     parallel logins. Retries also re-login, so keep them minimal. */
  fullyParallel: false,
  // process.env.CI below is CI/CD infrastructure detection (not app/test config) — allowed.
  forbidOnly: !!process.env.CI,
  // QAN login + micro-frontend hydration are latency-prone; retry flaky nav/hydration
  // timeouts so a run's report reflects real logic results (genuine failures still fail
  // after all retries). Override with RETRIES=0 for a strict no-retry run.
  retries: process.env.RETRIES != null ? Number(process.env.RETRIES) : (process.env.CI ? 2 : 2),
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // Machine-readable run summary (parseable) — always written alongside the human
    // reports so a run never has to override --reporter (which would suppress html/ortoni).
    ['json', { outputFile: 'test-results/results.json' }],
    ['ortoni-report', {
      open: process.env.CI ? 'never' : 'always',
      folderPath: 'ortoni-report',
      filename: 'index.html',
      title: 'Eseye Portal — Test Report', // sets the browser-tab/document title
      projectName: 'Playwright_MCP',
      authorName: 'QA Automation',
      testType: 'Regression',
      // The report header ("Ortoni Report") is not configurable in v4.x; the
      // `meta` block is what renders in the report's "Meta Information" panel, so
      // we surface the project / report name / environment there for the team.
      meta: {
        Project: 'Playwright_MCP',
        Report: 'Eseye Portal — Test Report',
        Environment: ENV.name,
        'Base URL': ENV.baseURL,
      },
    }],
    ['list'],
    // Xray Cloud results reporter — OPT-IN: no-ops unless XRAY_REPORT=true.
    // Creates/updates one Test Execution (STE) per feature and writes the FINAL
    // (post-retry) result of each @<KEY>-tagged test back to Jira/Xray.
    ['./utils/jira/xray-reporter.js'],
  ],

  use: {
    /* App origin — lets specs & POMs use relative paths (page.goto('/...')) */
    baseURL: ENV.baseURL,

    /* Run tests in a visible browser window, not headless */
    headless: false,

    /* Capture a screenshot for EVERY test (pass or fail) — attached to Xray */
    screenshot: 'on',

    /* Record a video for EVERY test (pass or fail) — attached to Xray */
    video: 'on',

    /* Retain a full trace whenever a test fails (so QA always gets evidence) */
    trace: 'retain-on-failure',
  },

  projects: [
    // Single browser project. No storageState / no auth-once dependency — each test
    // logs in fresh via the beforeEach hook (see fixtures/test-fixtures.js).
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
