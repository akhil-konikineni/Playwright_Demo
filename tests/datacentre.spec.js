// DataCentre — feature test suite (all Tier-1 "Get" scenarios).
// Source: test-scenarios/test-cases/datacentre_integration_testcoverage.csv
// Env: QAN — user `statususer` holds capabilityDataCentreGet (View-only tier).
// Auth: fresh login per test (beforeEach) + logout (afterEach); no cached session
//       (applyAuthHooks, registered once for the whole feature below).
// All UI behaviour, locators, and API params were discovered live via the MCP browser.
const { test, expect, applyAuthHooks } = require('../fixtures/test-fixtures');
const { DataCentreApi } = require('../utils/api/datacentre.api');
const { DataCentreListPage } = require('../pages/datacentre/datacentre-list.page');
const { DataCentreFilterPanel } = require('../pages/datacentre/datacentre-filter.component');
const { ENV } = require('../config/env');
const { DataCentreStatus, ALL_STATUSES } = require('../constants/statuses');
const { DataCentreCapability } = require('../constants/permissions');
const { Endpoints } = require('../constants/endpoints');
const {
  getActiveDataCentreCount,
  getDataCentreCountByStatus,
  getDataCentreCountByTextLike,
  getSampleDataCentreId,
  getTopActiveCountry,
  getDataCentreById,
} = require('../utils/db/datacentre.db');
const { getCapabilityStatus } = require('../utils/db/db-client');

// Text-filter search terms (chosen to match live data).
const NAME_TERM = 'demo';
const TITLE_TERM = 'test';
const REF_TERM = 'test';
const SUBDOMAIN_TERM = '123';

test.describe('DataCentre', () => {
  // Fresh login (beforeEach) + logout (afterEach), no cache — for every test below.
  applyAuthHooks(test);

  // ────────────────────────────────────────────────────────────────────────
  test.describe('S1 — VIEW', () => {
    // TC01 — list page loads with correct title + breadcrumb
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can see the Data Centre list page with correct title and breadcrumb', {
      tag: ['@View', '@Sanity'],
    }, async ({ page, navigationPage }) => {
      await navigationPage.goToDataCentres();

      await expect(page.getByRole('heading', { level: 1, name: 'Data Centres' })).toBeVisible();

      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(breadcrumb.getByText('Network Management')).toBeVisible();
      await expect(breadcrumb.getByText('Data Centres')).toBeVisible();

      await expect(page).toHaveTitle(/Network Management \| Portal/);

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      expect(await getActiveDataCentreCount()).toBeGreaterThan(0);
    });

    // TC02 — grid shows all 8 column headers in correct order
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can see the grid with all 8 column headers in correct order', {
      tag: ['@View', '@Sanity'],
    }, async ({ page, navigationPage, dataCentreListPage }) => {
      await navigationPage.goToDataCentres();

      const headers = dataCentreListPage.columnHeaders();
      await expect(headers).toHaveCount(8);
      const expected = DataCentreListPage.COLUMN_HEADERS;
      for (let i = 0; i < expected.length; i++) {
        await expect(headers.nth(i)).toContainText(expected[i]);
      }

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      expect(await getActiveDataCentreCount()).toBeGreaterThan(0);
    });

    // TC03 — Data Centre Id hyperlink navigates to the detail page
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can click Data Centre Id hyperlink to navigate to detail page', {
      tag: ['@View', '@Sanity'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreDetailsPage }) => {
      await navigationPage.goToDataCentres();

      const firstRow = dataCentreListPage.getFirstRow();
      const idLink = dataCentreListPage.idLink(firstRow);
      await expect(idLink).toBeVisible();
      const idText = (await idLink.textContent())?.trim() ?? '';
      const titleText = (await firstRow.getByRole('cell').nth(2).textContent())?.trim() ?? '';
      expect(idText).toMatch(/^\d+$/);

      await idLink.click();

      await expect(page).toHaveURL(new RegExp(`/network-management/data-centres/${idText}$`));
      await expect(dataCentreDetailsPage.standardFieldsHeading).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(idText).first()).toBeVisible();
      if (titleText) await expect(page.getByText(titleText).first()).toBeVisible();

      const api = new DataCentreApi(page.request);
      expect((await api.getById(idText)).status()).toBe(200);

      const dbRec = await getDataCentreById(Number(idText));
      expect(dbRec).not.toBeNull();
      if (titleText) expect(dbRec.title).toBe(titleText);
    });

    // TC04 — detail page shows Standard Fields + related sections
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can see all Standard Fields and related sections on detail page', {
      tag: ['@View', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreDetailsPage }) => {
      await navigationPage.goToDataCentres();

      const firstRow = dataCentreListPage.getFirstRow();
      const idText = (await dataCentreListPage.idLink(firstRow).textContent())?.trim() ?? '';
      await dataCentreListPage.idLink(firstRow).click();
      await expect(dataCentreDetailsPage.standardFieldsHeading).toBeVisible({ timeout: 30000 });

      for (const label of ['Subdomain', 'Data Centre Ref', 'Title', 'Name', 'Country Code']) {
        await expect(dataCentreDetailsPage.standardFieldLabel(label).first()).toBeVisible();
      }

      await expect(dataCentreDetailsPage.attributesHeading).toBeVisible();
      await expect(dataCentreDetailsPage.relatedIpPoolHeading).toBeVisible();
      await expect(dataCentreDetailsPage.relatedPortalHeading).toBeVisible();

      const api = new DataCentreApi(page.request);
      expect((await api.getById(idText)).status()).toBe(200);

      expect(await getDataCentreById(Number(idText))).not.toBeNull();
    });

    // TC05 — sort list by column headers
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can sort Data Centre list by column headers', {
      tag: ['@View', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage }) => {
      await navigationPage.goToDataCentres();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      const nameCol = 1;
      const original = await dataCentreListPage.columnValues(nameCol);

      await dataCentreListPage.sortBy('Name');
      await expect
        .poll(async () => (await dataCentreListPage.columnValues(nameCol))[0])
        .not.toBe(original[0]);
      const ascending = await dataCentreListPage.columnValues(nameCol);

      await dataCentreListPage.sortBy('Name');
      await expect
        .poll(async () => (await dataCentreListPage.columnValues(nameCol))[0])
        .not.toBe(ascending[0]);
      const descending = await dataCentreListPage.columnValues(nameCol);

      expect(ascending[0]).not.toBe(descending[0]);
    });

    // TC06 — column preset: deselect columns (confirm control is "Apply")
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can use column preset to select and deselect columns', {
      tag: ['@View', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage }) => {
      await navigationPage.goToDataCentres();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      await expect(dataCentreListPage.columnHeaders()).toHaveCount(8);

      await dataCentreListPage.openColumnConfig();
      await dataCentreListPage.setColumnChecked('Subdomain', false);
      await dataCentreListPage.setColumnChecked('Data Centre Ref', false);
      await dataCentreListPage.applyColumnConfig();

      await expect(dataCentreListPage.sortButton('Subdomain')).toHaveCount(0);
      await expect(dataCentreListPage.sortButton('Data Centre Ref')).toHaveCount(0);
      await expect(dataCentreListPage.columnHeaders()).toHaveCount(6);
    });

    // TC07 — pagination controls
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can use pagination controls on the Data Centre list', {
      tag: ['@View', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage }) => {
      await navigationPage.goToDataCentres();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      for (const name of ['First page', 'Previous page', 'Next page', 'Last page']) {
        await expect(dataCentreListPage.paginationButton(name)).toBeVisible();
      }

      await dataCentreListPage.setPageSize(10);
      await expect(dataCentreListPage.tbody.getByRole('row')).toHaveCount(10);

      await expect(dataCentreListPage.paginationButton('First page')).toBeDisabled();
      await expect(dataCentreListPage.paginationButton('Previous page')).toBeDisabled();
      await expect(dataCentreListPage.paginationButton('Next page')).toBeEnabled();

      await dataCentreListPage.paginationButton('Next page').click();
      await expect(dataCentreListPage.paginationButton('Previous page')).toBeEnabled();
      await dataCentreListPage.paginationButton('Previous page').click();
      await expect(dataCentreListPage.paginationButton('Previous page')).toBeDisabled();
    });

    // TC08 — module visible in navigation (with Get)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the Data Centres module is visible in the navigation menu', {
      tag: ['@View', '@Sanity'],
    }, async ({ page, navigationPage }) => {
      await navigationPage.goToDataCentres();

      const dataCentresNav = page.getByRole('button', { name: 'Data Centres' });
      await expect(dataCentresNav).toBeVisible();
      await expect(dataCentresNav).toBeEnabled();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      expect(await getCapabilityStatus(ENV.credentials.username, DataCentreCapability.GET)).toBe(
        'active'
      );
    });

    // TC10 — Status column badges show the four known states
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the Status column badge displays correct state labels', {
      tag: ['@View', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage }) => {
      await navigationPage.goToDataCentres();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);

      const statuses = await dataCentreListPage.columnValues(6);
      expect(statuses.length).toBeGreaterThan(0);
      for (const s of statuses) expect(ALL_STATUSES).toContain(s);

      const distinct = [...new Set(statuses)];
      for (const label of distinct) {
        await expect(dataCentreListPage.tbody.getByText(label, { exact: true }).first()).toBeVisible();
      }

      const dbCount = await getDataCentreCountByStatus(distinct.map((s) => s.toLowerCase()));
      expect(dbCount).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  test.describe('S2 — FILTER', () => {
    // TC13 — filter panel opens with all 7 filter fields
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the filter panel opens with all 7 filter fields', {
      tag: ['@Filter', '@Sanity'],
    }, async ({ page, navigationPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();

      await dataCentreFilterPanel.open();
      await expect(dataCentreFilterPanel.heading).toBeVisible();

      for (const label of ['Subdomain', 'Data Centre Ref', 'Title', 'Name', 'Data Centre Id']) {
        await expect(dataCentreFilterPanel.textFilter(label)).toBeVisible();
      }

      await expect(dataCentreFilterPanel.statusDropdown).toBeVisible();
      await expect(dataCentreFilterPanel.countryCodeDropdown).toBeVisible();
      await expect(dataCentreFilterPanel.dialog.getByRole('combobox')).toHaveCount(2);

      for (const label of DataCentreFilterPanel.FILTER_FIELDS) {
        await expect(dataCentreFilterPanel.fieldLabel(label).first()).toBeVisible();
      }

      await expect(dataCentreFilterPanel.applyButton).toBeVisible();
      await expect(dataCentreFilterPanel.resetButton).toBeVisible();

      const api = new DataCentreApi(page.request);
      expect((await api.getList()).status()).toBe(200);
    });

    // TC14 — filter by Status (single value = Active)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Status (single value)', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse(
        (r) => r.url().includes(Endpoints.dataCentreList) && /[?&]status=active(?:&|$)/.test(r.url())
      );
      await dataCentreFilterPanel.selectStatus(DataCentreStatus.ACTIVE);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const statuses = await dataCentreListPage.columnValues(6);
      expect(statuses.length).toBeGreaterThan(0);
      expect([...new Set(statuses)]).toEqual([DataCentreStatus.ACTIVE]);

      expect(await getDataCentreCountByStatus(['active'])).toBeGreaterThan(0);
    });

    // TC15 — filter by Status (multiple values = Setup + Requested)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by multiple Status values (Setup + Requested)', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return (
          u.includes(Endpoints.dataCentreList) &&
          u.includes('status=setup') &&
          u.includes('status=requested')
        );
      });
      await dataCentreFilterPanel.selectStatus(DataCentreStatus.SETUP, DataCentreStatus.REQUESTED);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const statuses = await dataCentreListPage.columnValues(6);
      expect(statuses.length).toBeGreaterThan(0);
      const allowed = new Set([DataCentreStatus.SETUP, DataCentreStatus.REQUESTED]);
      for (const s of statuses) expect(allowed.has(s)).toBe(true);

      expect(await getDataCentreCountByStatus(['setup', 'requested'])).toBeGreaterThan(0);
    });

    // TC16 — filter by Name (partial text)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Name (partial text)', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return u.includes(Endpoints.dataCentreList) && u.includes(`name=${NAME_TERM}`) && u.includes('matchField=name');
      });
      await dataCentreFilterPanel.filterByText('Name', NAME_TERM);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const names = await dataCentreListPage.columnValues(1);
      expect(names.length).toBeGreaterThan(0);
      for (const n of names) expect(n.toLowerCase()).toContain(NAME_TERM);

      expect(await getDataCentreCountByTextLike('name', NAME_TERM)).toBeGreaterThan(0);
    });

    // TC17 — filter by Title (partial text)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Title (partial text)', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return u.includes(Endpoints.dataCentreList) && u.includes(`title=${TITLE_TERM}`) && u.includes('matchField=title');
      });
      await dataCentreFilterPanel.filterByText('Title', TITLE_TERM);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const titles = await dataCentreListPage.columnValues(2);
      expect(titles.length).toBeGreaterThan(0);
      for (const t of titles) expect(t.toLowerCase()).toContain(TITLE_TERM);

      expect(await getDataCentreCountByTextLike('title', TITLE_TERM)).toBeGreaterThan(0);
    });

    // TC18 — filter by Data Centre Ref (partial text)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Data Centre Ref', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return u.includes(Endpoints.dataCentreList) && u.includes(`dataCentreRef=${REF_TERM}`) && u.includes('matchField=dataCentreRef');
      });
      await dataCentreFilterPanel.filterByText('Data Centre Ref', REF_TERM);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const refs = await dataCentreListPage.columnValues(3);
      expect(refs.length).toBeGreaterThan(0);
      for (const v of refs) expect(v.toLowerCase()).toContain(REF_TERM);

      expect(await getDataCentreCountByTextLike('dataCentreRef', REF_TERM)).toBeGreaterThan(0);
    });

    // TC19 — filter by Subdomain (partial text)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Subdomain', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return u.includes(Endpoints.dataCentreList) && u.includes(`subdomain=${SUBDOMAIN_TERM}`) && u.includes('matchField=subdomain');
      });
      await dataCentreFilterPanel.filterByText('Subdomain', SUBDOMAIN_TERM);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const subs = await dataCentreListPage.columnValues(4);
      expect(subs.length).toBeGreaterThan(0);
      for (const v of subs) expect(v.toLowerCase()).toContain(SUBDOMAIN_TERM);

      expect(await getDataCentreCountByTextLike('subdomain', SUBDOMAIN_TERM)).toBeGreaterThan(0);
    });

    // TC20 — filter by Data Centre Id (single matching record; live id)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can filter Data Centres by Data Centre Id', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      const id = String(await getSampleDataCentreId());
      expect(id).toMatch(/^\d+$/);

      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const filtered = page.waitForResponse((r) => {
        const u = r.url();
        return u.includes(Endpoints.dataCentreList) && u.includes(`dataCentreId=${id}`) && u.includes('matchField=dataCentreId');
      });
      await dataCentreFilterPanel.filterByText('Data Centre Id', id);
      await dataCentreFilterPanel.apply();
      expect((await filtered).status()).toBe(200);

      const ids = await dataCentreListPage.columnValues(0);
      expect(ids).toContain(id);
      for (const v of ids) expect(v).toContain(id);

      expect(await getDataCentreById(Number(id))).not.toBeNull();
    });

    // TC21 — Clear all restores the full unfiltered list
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can Clear all filters to restore the full list', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      await navigationPage.goToDataCentres();

      const baseline = await dataCentreListPage.columnValues(6);
      expect(baseline.length).toBeGreaterThan(0);
      expect(new Set(baseline).size).toBeGreaterThan(1);

      await dataCentreFilterPanel.open();
      const filteredResp = page.waitForResponse(
        (r) => r.url().includes(Endpoints.dataCentreList) && /[?&]status=active(?:&|$)/.test(r.url())
      );
      await dataCentreFilterPanel.selectStatus(DataCentreStatus.ACTIVE);
      await dataCentreFilterPanel.apply();
      expect((await filteredResp).status()).toBe(200);

      const filtered = await dataCentreListPage.columnValues(6);
      expect(filtered.length).toBeLessThanOrEqual(baseline.length);
      expect([...new Set(filtered)]).toEqual([DataCentreStatus.ACTIVE]);

      const clearedResp = page.waitForResponse(
        (r) => r.url().includes(Endpoints.dataCentreList) && !r.url().includes('status=')
      );
      await dataCentreFilterPanel.clearAll();
      expect((await clearedResp).status()).toBe(200);

      const restored = await dataCentreListPage.columnValues(6);
      expect(restored.length).toBe(baseline.length);
      expect(new Set(restored).size).toBeGreaterThan(1);
    });

    // TC22 — combined multi-filter (Status + Country Code)
    test('Given Integra exists when user login having CapabilityDataCentreGet Permission Then the user can apply a combined Status + Country Code filter', {
      tag: ['@Filter', '@Regression'],
    }, async ({ page, navigationPage, dataCentreListPage, dataCentreFilterPanel }) => {
      const country = await getTopActiveCountry();
      expect(country, 'expected at least one country with active data centres').not.toBeNull();
      const optionLabel = `${country.id} - ${country.title}`;

      await navigationPage.goToDataCentres();
      await dataCentreFilterPanel.open();

      const combined = page.waitForResponse((r) => {
        const u = r.url();
        return (
          u.includes(Endpoints.dataCentreList) &&
          /[?&]status=active(?:&|$)/.test(u) &&
          u.includes(`countryCodeId=${country.id}`)
        );
      });
      await dataCentreFilterPanel.selectStatus(DataCentreStatus.ACTIVE);
      await dataCentreFilterPanel.selectCountryCode(optionLabel, country.title);
      await dataCentreFilterPanel.apply();
      expect((await combined).status()).toBe(200);

      const rowCount = await dataCentreListPage.rows.count();
      expect(rowCount).toBeGreaterThan(0);
      const statuses = await dataCentreListPage.columnValues(6);
      const countries = await dataCentreListPage.columnValues(5);
      for (const s of statuses) expect(s).toBe(DataCentreStatus.ACTIVE);
      for (const c of countries) expect(c).toContain(`(${country.id})`);

      expect(country.activeCount).toBeGreaterThan(0);
    });
  });
});
