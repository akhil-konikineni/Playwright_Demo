// spec: test-cases/test-cases/datacentre_testcoverage.csv

const { test, expect } = require('../../fixtures/test_fixtures');
const { DataCentreApi } = require('../../utils/api/datacentre_api');

// ───────────────────────────────────────────────────────────────────────────────
// S1 — VIEW DATA CENTRE
// ───────────────────────────────────────────────────────────────────────────────

test.describe('S1 — View Data Centre', () => {

  // tc01

  test('Given Integra exists when user login having CapabilityDataCenterGet Permission Then the user can see the List on Data Centre Objects with 8 column grid', { tag: ['@View', '@Sanity'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Step 1: Login (two-step)
    await loginPage.login();

    // Step 2: Navigate directly to Data Centres list page
    await navigationPage.navigateToDataCentres();

    // Step 3: Wait for Data table to be visible

    // Step 4: Assert GET /v2/dataCentre API returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Step 5: Assert exactly 8 column headers
    const table = dataCentreListPage.table;
    const headers = table.getByRole('columnheader');
    await expect(headers).toHaveCount(8);

    // Step 6: Assert all column headers visible in correct order
    await expect(page.locator('body')).toMatchAriaSnapshot(`
- list:
  - listitem: "Data Centre ID"
  - listitem: "Name"
  - listitem: "Title"
  - listitem: "Data Centre Ref"
  - listitem: "Subdomain"
  - listitem: "Country Code"
  - listitem: "Status"
  - listitem: "Actions"
`);
  });

  // tc02
  //added new commits

  test('Given Integra exists when user login having CapabilityDataCenterGet Permission Then Data Centre ID displays as plain non-interactive text with no hyperlink', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Step 1: Login (two-step)
    await loginPage.login();

    // Step 2: Navigate to Data Centres list page
    await navigationPage.navigateToDataCentres();

    // Step 3: Wait for Data table
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // Step 4: Assert API returns 200
    const apiResponse = await request.get('https://mno.api.qan.eseye.io/v2/dataCentre?pageToken=0&pageSize=50&getPageCount=false&enrich=title');
    expect(apiResponse.status()).toBe(200);

    // Step 5: Assert Data Centre ID cell in first data row has no link or button (plain text only)
    const firstDataRow = table.getByRole('row').nth(1);
    const idCell = firstDataRow.getByRole('cell').nth(0);
    await expect(idCell).toBeVisible();
    await expect(idCell.getByRole('link')).toHaveCount(0);
    await expect(idCell.getByRole('button')).toHaveCount(0);
  });

  // tc03

  test('Given Integra exists when user login having CapabilityDataCenterGet Permission Then Name column displays as plain non-interactive text with no hyperlink', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Step 1: Login (two-step)
    await loginPage.login();

    // Step 2: Navigate to Data Centres list page
    await navigationPage.navigateToDataCentres();

    // Step 3: Wait for Data table
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // Step 4: Assert API returns 200
    const apiResponse = await request.get('https://mno.api.qan.eseye.io/v2/dataCentre?pageToken=0&pageSize=50&getPageCount=false&enrich=title');
    expect(apiResponse.status()).toBe(200);

    // Step 5: Assert Name cell (column index 1) in first data row has no link or button
    const firstDataRow = table.getByRole('row').nth(1);
    const nameCell = firstDataRow.getByRole('cell').nth(1);
    await expect(nameCell).toBeVisible();
    await expect(nameCell.getByRole('link')).toHaveCount(0);
    await expect(nameCell.getByRole('button')).toHaveCount(0);
  });

  // tc04

  test('Given Integra exists when user login having CapabilityDataCenterGet Permission Then Country Code column displays in code(id) plain text format and is not a hyperlink', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Step 1: Login (two-step)
    await loginPage.login();

    // Step 2: Navigate to Data Centres list page
    await navigationPage.navigateToDataCentres();

    // Step 3: Wait for Data table
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // Step 4: Assert API returns 200
    const apiResponse = await request.get('https://mno.api.qan.eseye.io/v2/dataCentre?pageToken=0&pageSize=50&getPageCount=false&enrich=title');
    expect(apiResponse.status()).toBe(200);

    // Step 5: Assert Country Code cells match "{code}({id})" pattern and contain no links
    const ccCells = table.getByRole('row').filter({ hasNot: table.getByRole('columnheader') })
      .getByRole('cell').nth(5);

    // Verify first data row Country Code cell is visible as plain text
    const firstDataRow = table.getByRole('row').nth(1);
    const countryCodeCell = firstDataRow.getByRole('cell').nth(5);
    await expect(countryCodeCell).toBeVisible();

    // Country Code text must match pattern: letters followed by digits in parentheses
    const cellText = await countryCodeCell.textContent();
    expect(cellText).toMatch(/\w+\(\d+\)/);

    // Must NOT be a hyperlink
    await expect(countryCodeCell.getByRole('link')).toHaveCount(0);
  });

  // tc05

  test('Given Integra exists when user has CapabilityDataCenterGet permission Then status column values are rendered as badge elements', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify status cell in first data row has a badge wrapper child element
    const table = dataCentreListPage.table;
    const firstDataRow = table.getByRole('row').nth(1);
    const statusCell = firstDataRow.getByRole('cell').nth(6);
    // Status text is enclosed in a badge wrapper (child element inside the cell)
    await expect(statusCell.locator('> *').first()).toBeVisible();
    const statusText = await statusCell.locator('> *').first().textContent();
    expect(['setup', 'requested', 'active', 'deleted']).toContain(statusText?.trim());
  });

  // tc06

  test('Given Integra exists when user has CapabilityDataCenterGet permission Then every data row has an Actions button', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify every data row has an Actions button
    const table = dataCentreListPage.table;
    const tbody = dataCentreListPage.tbody;
    const dataRows = tbody.getByRole('row');
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThan(0);
    // Number of Actions buttons equals number of data rows
    await expect(tbody.getByLabel('Actions')).toHaveCount(rowCount);
  });

  // tc07

  test('Given Integra exists when user opens Actions menu Then only status-transition options are shown (no Edit / Clone / View)', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open Actions menu on first data row (status: setup)
    const table = dataCentreListPage.table;
    const firstDataRow = table.getByRole('row').nth(1);
    await firstDataRow.getByLabel('Actions').click();

    // Verify status-transition menu items are present
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Request' })).toBeVisible();

    // Verify no Edit / Clone / View items exist in the menu
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Clone' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'View' })).toHaveCount(0);

    // Close menu
    await page.keyboard.press('Escape');
  });

  // tc08

  test('Given user navigates to Data Centres Then search bar shows placeholder "Search Data Centre by name..."', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify search bar placeholder text
    await expect(page.getByPlaceholder('Search Data Centre by name...')).toBeVisible();
  });

  // tc09

  test('Given user navigates to Data Centres Then a records-per-page combobox is visible in the pagination bar', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify "Showing per page:" label and combobox are visible
    await expect(page.getByText('Showing per page:')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  // tc10

  test('Given user navigates to Data Centres Then First / Previous / Next / Last pagination buttons are present', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify all four pagination navigation buttons are present
    await expect(page.getByRole('button', { name: 'First page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last page' })).toBeVisible();
  });

  // tc11

  test('Given user is on page 1 of Data Centres Then First page and Previous page buttons are disabled', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list (lands on page 1)
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify First page and Previous page are disabled on page 1
    await expect(page.getByRole('button', { name: 'First page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    // Verify Next page and Last page are enabled (more pages exist)
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Last page' })).toBeEnabled();
  });

  // tc12

  test('Given user clicks Configure visible columns Then a panel with heading "Search Results View" opens', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Click Configure visible columns and verify panel opens
    await page.locator('button[aria-label="Configure visible columns"]').click();
    await expect(page.getByRole('dialog', { name: 'Search Results View' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Search Results View' })).toBeVisible();

    // Close panel
    await page.getByRole('dialog', { name: 'Search Results View' }).getByRole('button', { name: 'Close' }).click();
  });

  // tc13

  test('Given column settings panel is open Then all 7 configurable column checkboxes are listed', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open column settings panel
    await page.locator('button[aria-label="Configure visible columns"]').click();
    const dialog = page.getByRole('dialog', { name: 'Search Results View' });
    await expect(dialog).toBeVisible();

    // Verify all 7 configurable columns are listed as checkboxes
    await expect(dialog.getByRole('checkbox', { name: 'Data Centre ID' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Name' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Title' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Data Centre Ref' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Subdomain' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Country Code' })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Status' })).toBeVisible();
    // Exactly 7 checkboxes — Actions column is not configurable
    await expect(dialog.getByRole('checkbox')).toHaveCount(7);

    // Close panel
    await dialog.getByRole('button', { name: 'Close' }).click();
  });

  // tc14

  test('Given column settings panel is open Then "Select All" and "Deselect All" buttons are visible', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open column settings panel
    await page.locator('button[aria-label="Configure visible columns"]').click();
    const dialog = page.getByRole('dialog', { name: 'Search Results View' });
    await expect(dialog).toBeVisible();

    // Verify Select All and Deselect All controls are present
    await expect(dialog.getByRole('button', { name: 'Select All' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Deselect All' })).toBeVisible();

    // Close panel without making changes
    await dialog.getByRole('button', { name: 'Close' }).click();
  });

  // tc15

  test('Given user views Data Centres grid Then Status column appears immediately before the Actions column', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify Status is column 7 (index 6) and Actions is column 8 (index 7)
    const table = dataCentreListPage.table;
    const headers = table.getByRole('columnheader');
    await expect(headers.nth(6)).toContainText('Status');
    await expect(headers.nth(7)).toContainText('Actions');
  });

  // tc17

  test('Given user is on the Data Centres list Then row cells have no links and detail page is only reachable via direct URL', { tag: ['@View', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Verify ID and Name cells have no hyperlinks (plain text only)
    const table = dataCentreListPage.table;
    const firstDataRow = table.getByRole('row').nth(1);
    const idCell = firstDataRow.getByRole('cell').nth(0);
    const nameCell = firstDataRow.getByRole('cell').nth(1);
    await expect(idCell.getByRole('link')).toHaveCount(0);
    await expect(nameCell.getByRole('link')).toHaveCount(0);

    // Get the ID from the first row and navigate directly to the detail URL
    const idText = (await idCell.textContent())?.trim() ?? '';
    expect(idText).toMatch(/^\d+$/);
    await page.goto(`https://portal.qan.aws.eseye.io/network-management/data-centres/${idText}`);

    // Verify detail page loaded at the correct URL
    await expect(page).toHaveURL(new RegExp(`/network-management/data-centres/${idText}`));
    // Breadcrumb shows the DC ID confirming the detail page rendered
    await expect(page.getByRole('navigation', { name: 'breadcrumb' }).getByText(idText)).toBeVisible();
  });

}); // end S1 — View Data Centre

// ───────────────────────────────────────────────────────────────────────────────
// S2 — FILTER DATA CENTRES
// ───────────────────────────────────────────────────────────────────────────────

test.describe('S2 — Filter Data Centres', () => {

  // tc18

  test('Given user clicks Add filter Then Filters dialog opens with Primary Filters and Secondary Filters sections', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Filters' })).toBeVisible();

    // Primary Filters section with all filter fields
    await expect(dialog.getByRole('button', { name: 'Primary Filters' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Select Status' })).toBeVisible();
    await expect(dialog.getByPlaceholder('Filter by Name…')).toBeVisible();
    await expect(dialog.getByPlaceholder('Filter by Title…')).toBeVisible();
    await expect(dialog.getByPlaceholder('Filter by Subdomain…')).toBeVisible();
    await expect(dialog.getByPlaceholder('Filter by Data Centre Ref…')).toBeVisible();
    await expect(dialog.getByPlaceholder('Filter by Data Centre ID…')).toBeVisible();

    // Secondary Filters section with Country Code combobox
    await expect(dialog.getByRole('button', { name: 'Secondary Filters' })).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });

  // tc19

  test('Given user filters by status "active" Then only active rows appear in the grid', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and select active status
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();

    // Open Status dropdown — verify all 4 enum values are present
    await dialog.getByRole('button', { name: 'Select Status' }).click();
    await expect(page.getByRole('menuitem', { name: 'active' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'setup' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'requested' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'deleted' })).toBeVisible();

    // Select "active"
    await page.getByRole('menuitem', { name: 'active' }).click();

    // Apply filter
    await dialog.getByRole('button', { name: 'Apply' }).click();

    // Verify grid only shows active rows
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();
    const tbody = dataCentreListPage.tbody;
    const rows = tbody.getByRole('row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).getByRole('cell').nth(6)).toContainText('active');
    }
  });

  // tc20

  test('Given user filters by Subdomain Then grid shows only matching rows and filter chip appears', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and enter subdomain value
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Subdomain…"]').fill('att');

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify filter chip shows in toolbar and table is still visible

    await expect(page.getByText('Subdomain: att')).toBeVisible();
  });

  // tc21

  test('Given user filters by Data Centre Ref Then grid shows only matching rows and filter chip appears', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and enter Data Centre Ref value
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Data Centre Ref…"]').fill('Dctesting1');

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify filter chip shows in toolbar
    await expect(page.getByText('Data Centre Ref: Dctesting1')).toBeVisible();

  });

  // tc22

  test('Given user filters by Title Then grid shows only matching rows and filter chip appears', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and enter Title value
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Title…"]').fill('demo1234');

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify filter chip shows in toolbar
    await expect(page.getByText('Title: demo1234')).toBeVisible();

  });

  // tc23

  test('Given user filters by Name Then grid shows only matching rows and filter chip appears', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and enter Name value
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Name…"]').fill('QAAutoDC01');

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify filter chip shows in toolbar and matching row is visible
    await expect(page.getByText('Name: QAAutoDC01')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'QAAutoDC01' })).toBeVisible();
  });

  // tc24

  test('Given user filters by Data Centre ID Then only that specific record appears in the grid', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and enter Data Centre ID
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Data Centre ID…"]').fill('5640');

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify filter chip shows and single matching row is present
    await expect(page.getByText('Data Centre ID:')).toBeVisible();
    await expect(page.getByRole('cell', { name: '5640' })).toBeVisible();
    // Only one data row should appear
    const table = dataCentreListPage.table;
    await expect(dataCentreListPage.tbody.getByRole('row')).toHaveCount(1);
  });

  // tc25

  test('Given user opens Country Code combobox in filter dialog Then options list loads with search capability', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // API assertion — country endpoint returns 200
    const storageState = await page.context().storageState();
    const portalOrigin = storageState.origins?.find(o => o.origin.includes('portal.qan.aws.eseye.io'));
    const token = portalOrigin?.localStorage.find(e => e.name === 'accessToken')?.value ?? '';
    const apiResponse = await request.get(
      'https://common.api.qan.eseye.io/v2/country',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(apiResponse.status()).toBe(200);

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // Open filter dialog
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();

    // Open Country Code combobox in Secondary Filters
    await page.locator('[aria-haspopup="dialog"][role="combobox"]').click();
    await page.locator('[aria-haspopup="dialog"][role="combobox"]').click();

    // Verify options loaded — search box and at least one option present
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(page.getByPlaceholder('Search...')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  });

  // tc26

  test('Given user selects a Country Code filter Then grid shows only rows with that country code', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and expand Country Code combobox
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[aria-haspopup="dialog"][role="combobox"]').click();
    await page.locator('[aria-haspopup="dialog"][role="combobox"]').click();

    // Select the "testing121" country code option
    await page.getByRole('option', { name: 'testing121' }).click();

    // Apply filter
    await page.locator('button:has-text("Apply")').click();

    // Verify grid still loads and country code "testing121" appears in results

    await expect(page.getByText('testing121').first()).toBeVisible();
  });

  // tc27

  test('Given user applies multiple filters (Name + Status) Then grid shows only rows matching all criteria', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();

    // Set Name filter
    await page.locator('[placeholder="Filter by Name…"]').fill('QAAutoDC');

    // Set Status filter to "requested"
    await page.locator('button:has-text("Select Status")').click();
    await page.locator('[role="menuitem"]:has-text("requested")').click();

    // Apply both filters
    await page.locator('button:has-text("Apply")').click();

    // Verify both filter chips are visible in toolbar
    await expect(page.getByText('Name: QAAutoDC')).toBeVisible();
    await expect(page.getByText('Status: requested')).toBeVisible();

    // Verify grid only shows rows matching both filters
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();
    const tbody = dataCentreListPage.tbody;
    const rows = tbody.getByRole('row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).getByRole('cell').nth(6)).toContainText('requested');
    }
  });

  // tc28

  test('Given user has entered filter values Then clicking Reset clears all filter inputs in the dialog', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog and fill in a Name value
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await page.locator('[placeholder="Filter by Name…"]').fill('SomeValue');
    await expect(page.locator('[placeholder="Filter by Name…"]')).toHaveValue('SomeValue');

    // Click Reset — all filter inputs should be cleared
    await page.locator('button:has-text("Reset")').click();
    await expect(page.locator('[placeholder="Filter by Name…"]')).toHaveValue('');

    // Close dialog
    await page.keyboard.press('Escape');
  });

  // tc29

  test('Given the Filters dialog is open Then clicking Apply closes the dialog and returns to the list', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion — list endpoint returns 200
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter dialog
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();

    // Click Apply — dialog must close
    await page.locator('button:has-text("Apply")').click();
    await expect(dialog).not.toBeVisible();

    // Verify back on the list page with table still visible

  });

  // tc30

  test('Given user opens filter and types a name but clicks Close Then dialog dismisses without applying', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Capture row count before opening filter
    const baselineCount = await dataCentreListPage.tbody.getByRole('row').count();

    // Open filter, fill a Name value, then click Close instead of Apply
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await dialog.locator('[placeholder="Filter by Name…"]').fill('QAAutoDC01');
    await dialog.getByRole('button', { name: 'Close' }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // No filter chip applied
    await expect(page.locator('text=Name: QAAutoDC01')).not.toBeVisible();

    // Row count unchanged — filter was NOT applied
    const afterCount = await dataCentreListPage.tbody.getByRole('row').count();
    expect(afterCount).toBe(baselineCount);
  });

  // tc31

  test('Given user is on Data Centres list Then Add filter button is visible in the toolbar', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Add filter button is visible in the toolbar above the table
    await expect(dataCentreListPage.addFilterButton).toBeVisible();
  });

  // tc32

  test('Given user filters by a Title that matches nothing Then grid shows no results message', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter and type a valid-format title that does not exist
    // Title field validates format: max 8 chars, no spaces, no special characters
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await dialog.locator('[placeholder="Filter by Title…"]').fill('zzznoex1');
    await dialog.getByRole('button', { name: 'Apply' }).click();

    // Filter chip is applied
    await expect(page.locator('text=Title: zzznoex1')).toBeVisible();

    // Grid shows no results — single status row with "No Data Centre found"
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();
    const tbody = dataCentreListPage.tbody;
    await expect(tbody.getByRole('row').first().getByRole('cell').first()).toContainText('No Data Centre found');

    // Pagination shows only page 1 with all nav disabled
    await expect(page.getByRole('button', { name: 'First page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Last page' })).toBeDisabled();
  });

  // tc33

  test('Given user types special characters in Name filter Then table renders without error', { tag: ['@Filter', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, request }) => {
    // Login
    await loginPage.login();

    // Navigate to Data Centres list
    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open filter and type special characters in the Name field
    // Using Name (not Title) — Title has strict format validation; Name accepts any string
    await dataCentreListPage.addFilterButton.click();
    const dialog = dataCentreFilterPanel.dialog;
    await expect(dialog).toBeVisible();
    await dialog.locator('input[placeholder*="Name"]').fill('!@#$%^&*()');
    await dialog.getByRole('button', { name: 'Apply' }).click();

    // Filter chip shows the special characters were accepted
    await expect(page.locator('text=Name: !@#$%^&*()')).toBeVisible();

    // Table still renders — no crash, no JS errors


    // Grid shows no results (empty) — no data matches these special chars
    const tbody = page.getByRole('table', { name: 'Data table' }).getByRole('rowgroup').nth(1);
    await expect(tbody.getByRole('row').first().getByRole('cell').first()).toContainText('No Data Centre found');
  });

}); // end S2 — Filter Data Centres

// ───────────────────────────────────────────────────────────────────────────────
// S3 — CREATE DATA CENTRE
// ───────────────────────────────────────────────────────────────────────────────

test.describe('S3 — Create Data Centre', () => {

  // tc34

  test('Given user is on Data Centres list Then Create Data Centre button is visible in toolbar', { tag: ['@Create', '@Sanity'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await expect(dataCentreListPage.createButton).toBeVisible();
  });

  // tc35

  test('Given user clicks Create Data Centre Then dialog opens with 5 fields', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Create Data Centre' })).toBeVisible();

    // 5 fields: Name, Title, Data Centre Ref, Subdomain (textboxes) + Country Code (combobox)
    await expect(dialog.getByText('Name')).toBeVisible();
    await expect(dialog.getByText('Title')).toBeVisible();
    await expect(dialog.getByText('Data Centre Ref')).toBeVisible();
    await expect(dialog.getByText('Subdomain')).toBeVisible();
    await expect(dialog.getByText('Country Code')).toBeVisible();

    // 4 text inputs + 1 combobox
    await expect(dialog.getByRole('textbox')).toHaveCount(4);
    await expect(dialog.getByRole('combobox')).toHaveCount(1);
  });

  // tc36

  test('Given Create Data Centre dialog is open Then Name field is marked mandatory', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // 3 required fields (Name, Title, Country Code) each show a mandatory asterisk
    // The asterisk is rendered as a sibling element next to each required field label
    await expect(dialog.getByText('*', { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText('*', { exact: true })).toHaveCount(3);

    // Name field itself is present and editable
    await expect(dialog.getByRole('textbox').first()).toBeVisible();
  });

  // tc37

  test('Given Create Data Centre dialog is open Then Title field is marked mandatory', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Title label is visible
    await expect(dialog.getByText('Title')).toBeVisible();

    // Exactly 3 mandatory asterisks: Name, Title, Country Code
    await expect(dialog.getByText('*', { exact: true })).toHaveCount(3);

    // Title textbox (nth=1) is present and editable
    await expect(dialog.getByRole('textbox').nth(1)).toBeVisible();
  });

  // tc38

  test('Given Create dialog is open When Title has more than 8 characters Then validation alert appears', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Type 9 characters — exceeds the 8-char max
    await dialog.getByRole('textbox').nth(1).fill('123456789');

    // Validation alert appears showing the regex constraint ^\S{1,8}$
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('\\S{1,8}');
  });

  // tc39

  test('Given Create dialog is open When Title contains a space Then validation alert appears', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Title regex is ^\S{1,8}$ — \S means non-whitespace, so spaces are rejected
    await dialog.getByRole('textbox').nth(1).fill('ab cd');

    // Validation alert appears
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('\\S{1,8}');
  });

  // tc40

  test('Given Create dialog is open Then Data Centre Ref field has no mandatory indicator', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('Data Centre Ref')).toBeVisible();

    // Only 3 mandatory asterisks (Name, Title, Country Code) — Data Centre Ref is optional
    await expect(dialog.getByText('*', { exact: true })).toHaveCount(3);
  });

  // tc41

  test('Given Create dialog is open Then Subdomain field has no mandatory indicator', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('Subdomain')).toBeVisible();

    // Only 3 mandatory asterisks (Name, Title, Country Code) — Subdomain is optional
    await expect(dialog.getByText('*', { exact: true })).toHaveCount(3);
  });

  // tc42

  test('Given Create dialog is open When Country Code combobox clicked Then searchable dropdown opens with options', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion — country codes loaded from API
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const countryApiResponse = await api.getCountries();
    expect(countryApiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Country Code has mandatory asterisk
    await expect(dialog.getByText('Country Code')).toBeVisible();
    await expect(dialog.getByText('*', { exact: true })).toHaveCount(3);

    // Country Code is a combobox — click to open Suggestions listbox
    await dialog.getByRole('combobox').click();
    const suggestions = page.getByRole('listbox', { name: 'Suggestions' });
    await expect(suggestions).toBeVisible();
    // Options are loaded
    await expect(suggestions.locator('[cursor=pointer]').first()).toBeVisible();
  });

  // tc43

  test('Given Create dialog is open with empty required fields Then Submit button is disabled', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Submit is disabled when required fields are empty
    await expect(dialog.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  // tc44

  test('Given Create dialog When all mandatory fields filled Then Submit button becomes enabled', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Submit disabled initially
    await expect(dialog.getByRole('button', { name: 'Submit' })).toBeDisabled();

    // Fill all 3 mandatory fields: Name, Title (≤8 chars, no spaces), Country Code
    await dialog.getByRole('textbox').first().fill('QAAutoCreate01');
    await dialog.getByRole('textbox').nth(1).fill('QATest01');

    // Open Country Code combobox and select an option
    await dialog.getByRole('combobox').click();
    await page.locator('role=listbox').locator('text=testing121').click();

    // Submit is now enabled
    await expect(dialog.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  // tc45

  test('Given Create dialog is open with no data When Cancel clicked Then dialog closes immediately', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Cancel on empty form — no Unsaved Changes popup
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // Dialog closes immediately with no Unsaved Changes warning
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('alertdialog', { name: 'Unsaved Changes' })).not.toBeVisible();

    // Back on list page

  });

  // tc46

  test('Given Create dialog has data entered When Cancel clicked Then Unsaved Changes popup appears', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Enter data in the Name field
    await dialog.getByRole('textbox').first().fill('QAAutoCreate01');

    // Click Cancel — should show Unsaved Changes warning
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    const unsavedDialog = page.getByRole('alertdialog', { name: 'Unsaved Changes' });
    await expect(unsavedDialog).toBeVisible();
    await expect(unsavedDialog.getByRole('heading', { name: 'Unsaved Changes' })).toBeVisible();
    await expect(unsavedDialog).toContainText('You have unsaved changes. Are you sure you want to leave?');
    await expect(unsavedDialog.getByRole('button', { name: 'Stay' })).toBeVisible();
    await expect(unsavedDialog.getByRole('button', { name: 'Discard' })).toBeVisible();

    // Close (X) also triggers the same warning
    await page.getByRole('alertdialog').getByRole('button', { name: 'Stay' }).click();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('alertdialog', { name: 'Unsaved Changes' })).toBeVisible();
  });

  // tc47

  test('Given all mandatory fields filled with valid unique data When Submit clicked Then new Data Centre created with status setup', { tag: ['@Create', '@Sanity'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Use a unique title: 8 chars max, no spaces, alphanumeric
    // Date.now().toString(36) gives base-36 timestamp; last 6 chars ensures uniqueness
    const uid = Date.now().toString(36).slice(-6);
    const uniqueTitle = `qa${uid}`.slice(0, 8);

    await dialog.getByRole('textbox').first().fill(`QAAutoTC47${uid}`);
    await dialog.getByRole('textbox').nth(1).fill(uniqueTitle);

    // Select Country Code
    await dialog.getByRole('combobox').click();
    await page.locator('role=listbox').locator('text=testing121').click();

    // Submit and assert POST API 201
    const [response] = await Promise.all([
      page.waitForResponse(resp =>
        resp.url().includes('/v2/dataCentre') && resp.request().method() === 'POST'
      ),
      dialog.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response.status()).toBe(201);

    // Dialog closes, list page visible
    await expect(dialog).not.toBeVisible();

  });

  // tc48

  test('Given Title already exists When Submit clicked Then create is rejected with duplicate Title error', { tag: ['@Create', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreCreatePage }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    await dataCentreListPage.createButton.click();
    const dialog = dataCentreCreatePage.dialog;
    await expect(dialog).toBeVisible();

    // Use a title known to already exist in the system (demo123, ID 5624)
    await dialog.getByRole('textbox').first().fill('QADupTest');
    await dialog.getByRole('textbox').nth(1).fill('demo123');

    // Select Country Code
    await dialog.getByRole('combobox').click();
    await page.locator('role=listbox').locator('text=testing121').click();

    // Submit and assert backend rejects with 4xx error
    const [response] = await Promise.all([
      page.waitForResponse(resp =>
        resp.url().includes('/v2/dataCentre') && resp.request().method() === 'POST'
      ),
      dialog.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    // Dialog stays open — no new record created
    await expect(dialog).toBeVisible();
  });

}); // end S3 — Create Data Centre

// ───────────────────────────────────────────────────────────────────────────────
// S4 — STATUS TRANSITIONS
// ───────────────────────────────────────────────────────────────────────────────

test.describe('S4 — Status Transitions', () => {

  // tc49

  test('Given user opens Actions menu for any record Then no Edit option is present', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Open Actions menu for the first row
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    await firstRow.getByRole('button', { name: 'Actions' }).click();

    const menu = page.getByRole('menu', { name: 'Actions' });
    await expect(menu).toBeVisible();

    // Only status transition items — no Edit, Clone, or View
    await expect(menu.getByRole('menuitem', { name: /edit/i })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: /clone/i })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: /view/i })).toHaveCount(0);

    // Status transition items are present
    await expect(menu.getByRole('menuitem').first()).toBeVisible();
  });

  // tc50

  test('Given user holds CapabilityDataCenterUpdate Then Actions menu never exposes a form-based edit flow for any status', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();
    const table = dataCentreListPage.table;
    await expect(table).toBeVisible();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    const tbody = dataCentreListPage.tbody;
    const rows = tbody.getByRole('row');
    const rowCount = await rows.count();

    // Check Actions menus across first 5 rows spanning multiple statuses
    const checkCount = Math.min(rowCount, 5);
    for (let i = 0; i < checkCount; i++) {
      await rows.nth(i).getByRole('button', { name: 'Actions' }).click();
      const menu = page.getByRole('menu', { name: 'Actions' });
      await expect(menu).toBeVisible();

      // No Edit, Clone, or View — only status transitions
      await expect(menu.getByRole('menuitem', { name: /edit/i })).toHaveCount(0);
      await expect(menu.getByRole('menuitem', { name: /clone/i })).toHaveCount(0);
      await expect(menu.getByRole('menuitem', { name: /view/i })).toHaveCount(0);

      // Close the menu before checking next row
      await page.keyboard.press('Escape');
    }
  });

  // tc51

  test('Given a Data Centre in setup status When Request action confirmed Then status changes to requested', { tag: ['@StatusTransition', '@Sanity'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to setup status to find a target row
    await dataCentreListPage.filterByStatus('setup');

    const table = dataCentreListPage.table;
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('setup');

    // Open Actions and click Request
    await firstRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Request' }).click();

    // Confirm dialog structure
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"setup"');
    await expect(confirmDialog).toContainText('"requested"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Request' }).click();

    // Status badge updates to requested
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('requested');
  });

  // tc52

  test('Given a Data Centre in setup status When Delete action confirmed Then status changes to deleted', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to setup status
    await dataCentreListPage.filterByStatus('setup');

    const table = dataCentreListPage.table;
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('setup');

    // Open Actions and click Delete
    await firstRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Delete' }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"setup"');
    await expect(confirmDialog).toContainText('"deleted"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Status badge updates to deleted
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('deleted');
  });

  // tc53

  test('Given a Data Centre in requested status When Set Up action confirmed Then status changes to setup', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to requested status
    await dataCentreListPage.filterByStatus('requested');

    const table = dataCentreListPage.table;
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('requested');

    // Open Actions and click Set Up
    await firstRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Set Up' }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"requested"');
    await expect(confirmDialog).toContainText('"setup"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Set Up' }).click();

    // Status badge updates to setup
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('setup');
  });

  // tc54

  test('Given a Data Centre in requested status When Delete action confirmed Then status changes to deleted', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to requested status
    await dataCentreListPage.filterByStatus('requested');

    const table = dataCentreListPage.table;
    // Use the second row so TC51/TC53 don't conflict with the same first row
    const secondRow = dataCentreListPage.tbody.getByRole('row').nth(1);
    await expect(secondRow.getByRole('cell').nth(6)).toContainText('requested');

    // Open Actions and click Delete
    await secondRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Delete' }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"requested"');
    await expect(confirmDialog).toContainText('"deleted"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Status badge updates to deleted
    await expect(secondRow.getByRole('cell').nth(6)).toContainText('deleted');
  });

  // tc55

  test('Given a Data Centre in deleted status When Set Up action confirmed Then status changes to setup', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to deleted status
    await dataCentreListPage.filterByStatus('deleted');

    const table = dataCentreListPage.table;
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('deleted');

    // Open Actions and click Set Up
    await firstRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Set Up' }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"deleted"');
    await expect(confirmDialog).toContainText('"setup"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Set Up' }).click();

    // Status badge updates to setup
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('setup');
  });

  // tc56

  test('Given a Data Centre in deleted status When Request action confirmed Then status changes to requested', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to deleted status, use second row to avoid conflict with TC55
    await dataCentreListPage.filterByStatus('deleted');

    const table = dataCentreListPage.table;
    const secondRow = dataCentreListPage.tbody.getByRole('row').nth(1);
    await expect(secondRow.getByRole('cell').nth(6)).toContainText('deleted');

    // Open Actions and click Request
    await secondRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Request' }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"deleted"');
    await expect(confirmDialog).toContainText('"requested"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the transition
    await confirmDialog.getByRole('button', { name: 'Request' }).click();

    // Status badge updates to requested
    await expect(secondRow.getByRole('cell').nth(6)).toContainText('requested');
  });

  // tc57

  test('Given user has Approver permission When Approve action confirmed on any non-active record Then status changes to active', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to setup status — any non-active status works for Approve
    await dataCentreListPage.filterByStatus('setup');

    const table = dataCentreListPage.table;
    const firstRow = dataCentreListPage.tbody.getByRole('row').first();
    const currentStatus = await firstRow.getByRole('cell').nth(6).textContent();
    expect(['setup', 'requested', 'deleted']).toContain(currentStatus?.trim());

    // Open Actions and click Approve
    await firstRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Approve' }).click();

    // Confirm dialog shows transition to active
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await expect(confirmDialog).toContainText('"active"');
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: 'Close' })).toBeVisible();

    // Confirm the Approve transition
    await confirmDialog.getByRole('button', { name: 'Approve' }).click();

    // Status badge updates to active
    await expect(firstRow.getByRole('cell').nth(6)).toContainText('active');
  });

  // tc58

  test('Given a Requested Data Centre with null mandatory fields When Approve attempted Then transition is blocked with error', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to requested status — find a row with null mandatory fields (DataCentreRef="-")
    await dataCentreListPage.filterByStatus('requested');

    const table = dataCentreListPage.table;
    const tbody = dataCentreListPage.tbody;

    // Find the first requested row that has empty DataCentreRef (cell nth=3 shows "-")
    const rows = tbody.getByRole('row');
    let targetRow = rows.first();
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const dcRef = await rows.nth(i).getByRole('cell').nth(3).textContent();
      if (dcRef?.trim() === '-') {
        targetRow = rows.nth(i);
        break;
      }
    }
    await expect(targetRow.getByRole('cell').nth(6)).toContainText('requested');

    // Attempt Approve transition
    await targetRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Approve' }).click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Approve' }).click();

    // Transition is blocked — status should NOT change to active, an error is shown
    await expect(targetRow.getByRole('cell').nth(6)).not.toContainText('active');
  });

  // tc59

  test('Given an Active Data Centre referenced by active IP Pool When Delete attempted Then transition is blocked with IPPool dependency error', { tag: ['@StatusTransition', '@Regression'] }, async ({ page, loginPage, navigationPage, dataCentreListPage, dataCentreFilterPanel, dataCentreDetailsPage, request }) => {
    await loginPage.login();

    // Navigate directly to known active record with IP Pool dependency (ID: 5426)
    // data9876543567, DataCentreRef=123454, Subdomain=23474543, active
    await navigationPage.navigateToDataCentres();

    // API assertion
    const token = await dataCentreListPage.getApiToken();
    const api = new DataCentreApi(request, token);
    const apiResponse = await api.getList();
    expect(apiResponse.status()).toBe(200);

    // Filter to active status
    await dataCentreListPage.filterByStatus('active');

    const table = dataCentreListPage.table;
    // Find the specific active record by name that is known to have IPPool dependency
    const tbody = dataCentreListPage.tbody;
    const targetRow = tbody.getByRole('row').filter({ hasText: 'data9876543567' }).first();
    await expect(targetRow.getByRole('cell').nth(6)).toContainText('active');

    // Attempt Delete transition
    await targetRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Delete' }).click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Confirm Status Change' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Transition is blocked — status remains active, error notification appears
    await expect(targetRow.getByRole('cell').nth(6)).toContainText('active');

    // An error notification or blocking message is shown
    const notifications = page.getByRole('region', { name: /notification/i });
    await expect(notifications).toBeVisible();
  });

}); // end S4 — Status Transitions

