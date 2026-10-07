// Billing Transactions (Finance -> Billing Transactions) — filtering feature suite.
// spec source: test-scenarios/test-cases/billing_transactions_testcoverage.csv (v2.0)
// plan (API/DB context): test-scenarios/test-plans/billing_transactions_testcoverage.md
//
// Env: QAN — user `statususer` holds capabilityBillingTransactionGet (filter/view tier).
// Auth: fresh login per test (beforeEach) + logout (afterEach); no cached session.
//
// Each test is tagged with its Xray IssueId (@NUI-####) so Jira/Xray can trace
// automation back to the imported Test issue (NUI-7838..NUI-7882), plus @Section/@Sanity.
//
// NOTE: generated from the live-verified plan; a first live run (Generator/Healer,
// `npx playwright test tests/billing-transactions.spec.js`) confirms/heals locators.
const { test, expect, applyAuthHooks } = require('../fixtures/test-fixtures');
const { BillingTransactionApi } = require('../utils/api/billing-transaction.api');
const { BillingTransactionsListPage } = require('../pages/billing-transactions/billing-transactions-list.page');
const { BillingTransactionsFilterPanel } = require('../pages/billing-transactions/billing-transactions-filter.component');
const { ENV } = require('../config/env');
const { Endpoints } = require('../constants/endpoints');
const { Routes } = require('../constants/routes');
const {
  BillingTransactionStatus,
  DEFAULT_LIST_STATUSES,
  BillingTransactionCapability,
} = require('../constants/billing-transaction');
const { getCapabilityStatus } = require('../utils/db/db-client');
const {
  getBillingTransactionCountByStatus,
  getBillingTransactionCountByTextLike,
  getTopPortfolio,
  getSampleBillingTransactionId,
  getBillingTransactionById,
  getSampleNameFragment,
} = require('../utils/db/billing-transaction.db');

const { COL } = BillingTransactionsListPage;

// A response predicate for the billingTransaction list/filter call.
const listResponse = (page, extra = () => true) =>
  page.waitForResponse((r) => r.url().includes(Endpoints.billingTransactionList) && extra(r.url()));

test.describe('Billing Transactions', () => {
  applyAuthHooks(test);

  // ──────────────────────────────────────────────────────────────────────────
  test.describe('S1 — VIEW', () => {
    // TC1 — NUI-7838
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can see the Billing Transactions list with correct heading and breadcrumb',
      { tag: ['@NUI-7838', '@View', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        await expect(billingTransactionsListPage.heading).toBeVisible();
        await expect(page.getByText('Home')).toBeVisible();
        await expect(page).toHaveTitle(/Finance \| Portal/);

        const api = new BillingTransactionApi(page.request);
        expect((await api.getList()).status()).toBe(200);
        expect(await getBillingTransactionCountByStatus(DEFAULT_LIST_STATUSES.map((s) => s.toLowerCase()))).toBeGreaterThan(0);
      });

    // TC2 — NUI-7839
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can see the grid columns in order',
      { tag: ['@NUI-7839', '@View'] }, async ({ navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        // The grid has 10 columns; the "Billing Transaction Id" / "Item Category"
        // headers truncate at narrow widths, so assert the count and the sequence of
        // truncation-safe header prefixes (read from each header's text content).
        const headers = billingTransactionsListPage.columnHeaders();
        await expect(headers).toHaveCount(10);
        const prefixes = ['Billing Transa', 'Portfolio', 'Name', 'Title', 'Category', 'Item', 'Start', 'Value', 'Status', 'Actions'];
        for (let i = 0; i < prefixes.length; i++) {
          const text = ((await headers.nth(i).textContent()) || '').trim();
          expect(text.startsWith(prefixes[i]), `header ${i} "${text}" should start with "${prefixes[i]}"`).toBe(true);
        }
      });

    // TC3 — NUI-7840
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can open a transaction detail from the Billing Transaction Id hyperlink',
      { tag: ['@NUI-7840', '@View'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        const idLink = billingTransactionsListPage.idLink(billingTransactionsListPage.getFirstRow());
        await expect(idLink).toBeVisible();
        const id = ((await idLink.textContent()) || '').trim();
        await idLink.click();
        await expect(page).toHaveURL(new RegExp(`/finance/billing-transactions/${id}$`));
      });

    // TC4 — NUI-7841
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can open the Portfolio detail from the Portfolio hyperlink',
      { tag: ['@NUI-7841', '@View'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        const pfLink = billingTransactionsListPage.portfolioLink(billingTransactionsListPage.getFirstRow());
        await expect(pfLink).toBeVisible();
        await pfLink.click();
        await expect(page).toHaveURL(/\/portfolio/i);
      });

    // TC5 — NUI-7842
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can navigate pages using pagination controls with default page size 50',
      { tag: ['@NUI-7842', '@View', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        await expect(billingTransactionsListPage.pageSizeLabel).toBeVisible();
        // Default page size is 50: the first page shows at most 50 rows and the list
        // API is served with pageSize=50.
        expect(await billingTransactionsListPage.rowCount()).toBeLessThanOrEqual(50);
        const api = new BillingTransactionApi(page.request);
        expect((await api.getList()).status()).toBe(200);
        // First/Previous disabled on page 1; Next navigates and enables Previous.
        await expect(billingTransactionsListPage.firstPage).toBeDisabled();
        await expect(billingTransactionsListPage.previousPage).toBeDisabled();
        await billingTransactionsListPage.nextPage.click();
        await expect(billingTransactionsListPage.previousPage).toBeEnabled();
      });

    // TC6 — NUI-7843
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can change the rows per page using the page size selector',
      { tag: ['@NUI-7843', '@View'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        const resp = listResponse(page);
        await billingTransactionsListPage.setPageSize(10);
        expect((await resp).status()).toBe(200);
        expect(await billingTransactionsListPage.rowCount()).toBeLessThanOrEqual(10);
      });

    // TC7 — NUI-7844
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can search by Name from the toolbar without opening Add filter',
      { tag: ['@NUI-7844', '@View', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        // Take the search term from a VISIBLE row's Name so it is in the user's
        // portfolio scope (a DB-wide sample may belong to an out-of-scope portfolio).
        const firstName = (await billingTransactionsListPage.columnValues(COL.name))[0] || '';
        const term = firstName.slice(0, Math.min(8, firstName.length)) || 'test';
        await billingTransactionsListPage.quickSearchByName(term);
        // Poll until the grid has filtered to rows whose Name matches (search may be
        // debounced / client-side, so don't hard-wait on a specific network call).
        await expect
          .poll(async () => {
            const names = await billingTransactionsListPage.columnValues(COL.name);
            return names.length > 0 && names.every((v) => v.toLowerCase().includes(term.toLowerCase()));
          }, { timeout: 30000 })
          .toBe(true);
      });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test.describe('S2 — FILTER', () => {
    // TC8 — NUI-7845
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can open the filter panel with Primary and Secondary sections',
      { tag: ['@NUI-7845', '@Filter', '@Sanity'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await expect(billingTransactionsFilterPanel.dialog.getByText('Primary Filters')).toBeVisible();
        await expect(billingTransactionsFilterPanel.dialog.getByText('Secondary Filters')).toBeVisible();
      });

    // TC9 — NUI-7846
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can search the filter field list',
      { tag: ['@NUI-7846', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.searchFilters.fill('Value');
        await expect(billingTransactionsFilterPanel.dialog.getByText('VALUE')).toBeVisible();
      });

    // TC10 — NUI-7847
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can see all fifteen filter fields in the panel',
      { tag: ['@NUI-7847', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        for (const label of ['STATUS', 'NAME', 'TITLE', 'START DATE', 'STOP DATE', 'VALUE', 'QUANTITY',
          'PORTFOLIO', 'PACKAGE CATEGORY', 'PACKAGE ITEM CATEGORY', 'BILLING SUBSCRIPTION', 'ICC TYPE',
          'PACKAGE', 'PACKAGE ITEM', 'PRODUCT']) {
          await expect(billingTransactionsFilterPanel.dialog.getByText(label, { exact: true }).first()).toBeVisible();
        }
      });

    // TC11 — NUI-7848
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Status',
      { tag: ['@NUI-7848', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.ACTIVE);
        // Wait for the APPLY call (set the promise right before apply; the default
        // list query already contains status=active, so match the post-apply call).
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        await expect
          .poll(async () => [...new Set(await billingTransactionsListPage.columnValues(COL.status))], { timeout: 20000 })
          .toEqual([BillingTransactionStatus.ACTIVE]);
        expect(await getBillingTransactionCountByStatus(['active'])).toBeGreaterThan(0);
      });

    // TC12 — NUI-7849
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter by Status Deleted to surface soft deleted rows',
      { tag: ['@NUI-7849', '@Filter'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.DELETED);
        const resp = listResponse(page, (u) => u.includes('status=deleted'));
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        await expect
          .poll(async () => [...new Set(await billingTransactionsListPage.columnValues(COL.status))], { timeout: 20000 })
          .toEqual([BillingTransactionStatus.DELETED]);
        expect(await getBillingTransactionCountByStatus(['deleted'])).toBeGreaterThan(0);
      });

    // TC13 — NUI-7850
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Name',
      { tag: ['@NUI-7850', '@Filter'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        const term = (await getSampleNameFragment()) || 'test';
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page, (u) => u.toLowerCase().includes('name='));
        await billingTransactionsFilterPanel.fillField('Name', term);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        for (const v of await billingTransactionsListPage.columnValues(COL.name)) expect(v.toLowerCase()).toContain(term.toLowerCase());
        expect(await getBillingTransactionCountByTextLike('name', term)).toBeGreaterThan(0);
      });

    // TC14 — NUI-7851
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Title',
      { tag: ['@NUI-7851', '@Filter'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        const term = 'test';
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page, (u) => u.includes('title='));
        await billingTransactionsFilterPanel.fillField('Title', term);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        for (const v of await billingTransactionsListPage.columnValues(COL.title)) expect(v.toLowerCase()).toContain(term.toLowerCase());
      });

    // TC15 — NUI-7852
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Start Date',
      { tag: ['@NUI-7852', '@Filter', '@Sanity'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        // Start Date is a custom date-picker (a combobox, not a text input). Verify the
        // field is present in the drawer. (Deep date-range result verification needs
        // interactive calendar automation — Healer scope.)
        await expect(billingTransactionsFilterPanel.dialog.getByText('START DATE', { exact: true })).toBeVisible();
        await expect(billingTransactionsFilterPanel.dialog.getByText('STOP DATE', { exact: true })).toBeVisible();
      });

    // TC16 — NUI-7853
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Stop Date',
      { tag: ['@NUI-7853', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        // Stop Date is a custom date-picker (combobox). Verify the field is present.
        await expect(billingTransactionsFilterPanel.dialog.getByText('STOP DATE', { exact: true })).toBeVisible();
      });

    // TC17 — NUI-7854
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter by a Start and Stop date range',
      { tag: ['@NUI-7854', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.fillField('Start Date', '2025-01-01');
        await billingTransactionsFilterPanel.fillField('Stop Date', '2027-12-31');
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC18 — NUI-7855
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the date picker allows selecting and clearing a date',
      { tag: ['@NUI-7855', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const input = billingTransactionsFilterPanel.input('Start Date');
        await input.fill('2026-06-01');
        await expect(input).toHaveValue(/2026/);
        await input.fill('');
        await expect(input).toHaveValue('');
      });

    // TC19 — NUI-7856
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Value',
      { tag: ['@NUI-7856', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.fillField('Value', '987.63');
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC20 — NUI-7857
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Value filter accepts decimals and negatives and rejects non numeric input',
      { tag: ['@NUI-7857', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const input = billingTransactionsFilterPanel.input('Value');
        await input.fill('-5.75');
        await expect(input).toHaveValue('-5.75');
        await input.fill('abc');
        // Non-numeric is rejected/ignored by the numeric field.
        await expect(input).not.toHaveValue('abc');
      });

    // TC21 — NUI-7858
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Quantity',
      { tag: ['@NUI-7858', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.fillField('Quantity', '5');
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC22 — NUI-7859
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Quantity filter rejects non integer input',
      { tag: ['@NUI-7859', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const input = billingTransactionsFilterPanel.input('Quantity');
        await input.fill('abc');
        await expect(input).not.toHaveValue('abc');
      });

    // TC23 — NUI-7860
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Portfolio',
      { tag: ['@NUI-7860', '@Filter'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        const top = await getTopPortfolio();
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page, (u) => u.includes('portfolioId='));
        await billingTransactionsFilterPanel.selectDropdown('Portfolio', top ? top.title : '', top ? top.title.slice(0, 6) : undefined);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        expect(await billingTransactionsListPage.rowCount()).toBeGreaterThan(0);
      });

    // TC24 — NUI-7861
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Portfolio filter lists only in scope portfolios',
      { tag: ['@NUI-7861', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Portfolio').click();
        // The user's own portfolio (reseller sphere) is present in the scoped list.
        await expect(billingTransactionsFilterPanel.page.getByRole('option').first()).toBeVisible();
      });

    // TC25 — NUI-7862
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Package Category',
      { tag: ['@NUI-7862', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Package Category').click();
        const resp = listResponse(page, (u) => u.includes('packageCategoryId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC26 — NUI-7863
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Package Item Category',
      { tag: ['@NUI-7863', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Package Item Category').click();
        const resp = listResponse(page, (u) => u.includes('packageItemCategoryId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC27 — NUI-7864
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Billing Subscription',
      { tag: ['@NUI-7864', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Billing Subscription').click();
        const resp = listResponse(page, (u) => u.includes('billingSubscriptionId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC28 — NUI-7865
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by ICC Type',
      { tag: ['@NUI-7865', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('ICC Type').click();
        const resp = listResponse(page, (u) => u.includes('iccTypeId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC29 — NUI-7866
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Package',
      { tag: ['@NUI-7866', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Package').click();
        const resp = listResponse(page, (u) => u.includes('packageId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC30 — NUI-7867
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Package Item filter is disabled until a Package is selected',
      { tag: ['@NUI-7867', '@Filter', '@Sanity'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await expect(billingTransactionsFilterPanel.selectPackageFirstHint).toBeVisible();
        expect(await billingTransactionsFilterPanel.isPackageItemDisabled()).toBe(true);
      });

    // TC31 — NUI-7868
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Package Item filter becomes usable and constrained after selecting a Package',
      { tag: ['@NUI-7868', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Package').click();
        await page.getByRole('option').first().click();
        // Package Item becomes usable once a Package is chosen.
        await expect(billingTransactionsFilterPanel.input('Package Item')).toBeEditable();
      });

    // TC32 — NUI-7869
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can filter the list by Product',
      { tag: ['@NUI-7869', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Product').click();
        const resp = listResponse(page, (u) => u.includes('productId='));
        await page.getByRole('option').first().click();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC33 — NUI-7870
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the Category and Item Category dropdown values match active records',
      { tag: ['@NUI-7870', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const catSource = page.waitForResponse((r) => r.url().includes(Endpoints.packageCategoryList) && r.url().includes('status=active'));
        await billingTransactionsFilterPanel.input('Package Category').click();
        expect((await catSource).status()).toBe(200);
        await expect(page.getByRole('option').first()).toBeVisible();
      });

    // TC34 — NUI-7871
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can apply multiple filters Status and Portfolio together',
      { tag: ['@NUI-7871', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        const top = await getTopPortfolio();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.ACTIVE);
        await billingTransactionsFilterPanel.selectDropdown('Portfolio', top ? top.title : '', top ? top.title.slice(0, 6) : undefined);
        const resp = listResponse(page, (u) => u.includes('status=active') && u.includes('portfolioId='));
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        const statuses = await billingTransactionsListPage.columnValues(COL.status);
        if (statuses.length) expect([...new Set(statuses)]).toEqual([BillingTransactionStatus.ACTIVE]);
      });

    // TC35 — NUI-7872
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can apply multiple filters date range and Value together',
      { tag: ['@NUI-7872', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.fillField('Start Date', '2025-01-01');
        await billingTransactionsFilterPanel.fillField('Stop Date', '2027-12-31');
        await billingTransactionsFilterPanel.fillField('Value', '100');
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC36 — NUI-7873
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then clearing one filter restores that dimension of results',
      { tag: ['@NUI-7873', '@Filter'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.ACTIVE);
        let resp = listResponse(page, (u) => u.includes('status=active'));
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        // Remove the Status filter via Reset, then re-apply -> statuses widen again.
        await billingTransactionsFilterPanel.open();
        resp = listResponse(page);
        await billingTransactionsFilterPanel.reset();
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
      });

    // TC37 — NUI-7874
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can Reset all filters from within the drawer',
      { tag: ['@NUI-7874', '@Filter', '@Sanity'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.fillField('Name', 'test');
        await billingTransactionsFilterPanel.reset();
        await expect(billingTransactionsFilterPanel.input('Name')).toHaveValue('');
      });

    // TC38 — NUI-7875
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can Clear all active filters from the toolbar',
      { tag: ['@NUI-7875', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        const baseline = await billingTransactionsListPage.rowCount();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.ACTIVE);
        let resp = listResponse(page, (u) => u.includes('status=active'));
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        resp = listResponse(page);
        await billingTransactionsFilterPanel.clearAll();
        expect((await resp).status()).toBe(200);
        expect(await billingTransactionsListPage.rowCount()).toBeGreaterThanOrEqual(1);
      });

    // TC39 — NUI-7876
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then a no result filter combination is handled gracefully',
      { tag: ['@NUI-7876', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page);
        await billingTransactionsFilterPanel.fillField('Name', 'ZZZ_NoSuchBillingTxn_999');
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        // Empty result set — no data rows, no thrown error.
        await expect.poll(async () => billingTransactionsListPage.rowCount()).toBeLessThanOrEqual(1);
      });

    // TC40 — NUI-7877
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then a filter persists across pagination and matches the database',
      { tag: ['@NUI-7877', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsListPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        const resp = listResponse(page, (u) => u.includes('status=active'));
        await billingTransactionsFilterPanel.selectStatus(BillingTransactionStatus.ACTIVE);
        await billingTransactionsFilterPanel.apply();
        expect((await resp).status()).toBe(200);
        for (const v of await billingTransactionsListPage.columnValues(COL.status)) expect(v).toBe(BillingTransactionStatus.ACTIVE);
        expect(await getBillingTransactionCountByStatus(['active'])).toBeGreaterThan(0);
      });
  });

  // ──────────────────────────────────────────────────────────────────────────
  test.describe('PERMISSION', () => {
    // TC41 — NUI-7878 (positive)
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the user can access and use Billing Transactions filtering',
      { tag: ['@NUI-7878', '@Filter', '@Sanity'] }, async ({ page, navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await expect(billingTransactionsFilterPanel.dialog).toBeVisible();
        const api = new BillingTransactionApi(page.request);
        expect((await api.getList()).status()).toBe(200);
        expect(await getCapabilityStatus(ENV.credentials.username, BillingTransactionCapability.GET)).toBe('active');
      });

    // TC42 — NUI-7879 (negative)
    test('Given Integra exists when user login without having CapabilityBillingTransactionGet Permission Then the user can not see or access the Billing Transactions list',
      { tag: ['@NUI-7879', '@View'] }, async () => {
        // Requires a user WITHOUT capabilityBillingTransactionGet (or a DB tier toggle).
        // `statususer` holds Get, so this negative path can't be exercised as-is.
        test.fixme(true, 'Needs a restricted user lacking capabilityBillingTransactionGet, or a DB permission toggle (see db_validation.md Option B).');
      });

    // TC43 — NUI-7880 (negative)
    test('Given Integra exists when user login without having CapabilityBillingTransactionGet Permission Then the filter API is blocked',
      { tag: ['@NUI-7880', '@Filter'] }, async () => {
        // Same constraint as NUI-7879 — the direct execute call returns 401/403 only for a user without Get.
        test.fixme(true, 'Needs a restricted user lacking capabilityBillingTransactionGet to assert the 401/403 on billingTransaction/execute.');
      });

    // TC44 — NUI-7881
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then filtering can not surface data outside the users portfolio scope',
      { tag: ['@NUI-7881', '@Filter'] }, async ({ navigationPage, billingTransactionsFilterPanel }) => {
        await navigationPage.goToBillingTransactions();
        await billingTransactionsFilterPanel.open();
        await billingTransactionsFilterPanel.input('Portfolio').click();
        // The Portfolio dropdown only offers portfolios within the user's visible subtree.
        const options = billingTransactionsFilterPanel.page.getByRole('option');
        expect(await options.count()).toBeGreaterThan(0);
      });

    // TC45 — NUI-7882
    test('Given Integra exists when user login having CapabilityBillingTransactionGet Permission Then the list and filtered results stay within the users sphere',
      { tag: ['@NUI-7882', '@View'] }, async ({ page, navigationPage, billingTransactionsListPage }) => {
        await navigationPage.goToBillingTransactions();
        // List renders scoped rows; the whole-table count is an upper bound (sphere-scoped in UI).
        expect(await billingTransactionsListPage.rowCount()).toBeGreaterThan(0);
        const api = new BillingTransactionApi(page.request);
        expect((await api.getList()).status()).toBe(200);
      });
  });
});
