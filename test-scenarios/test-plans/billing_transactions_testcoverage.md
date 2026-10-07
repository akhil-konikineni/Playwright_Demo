# Billing Transactions (Filtering) — Complete Test Coverage

| Field            | Value                                                              |
|------------------|--------------------------------------------------------------------|
| Feature          | Billing Transactions — Filtering                                   |
| Document Version | 2.0 (corrected to the real Finance → Billing Transactions page; filter panel, dates, numeric, dependency & pagination live-verified) |
| Coverage Date    | 2026-09-29                                                         |
| Prepared By      | Playwright MCP QA Automation Agent (Planner)                       |
| Environment      | QAN — https://portal-host.qan.aws.eseye.io                         |
| Test User        | statususer / Password#1                                            |
| DB Schema        | oncilla (MariaDB, QAN RDS)                                         |
| Source           | Live UI exploration via Playwright MCP + read-only `oncilla` DB (`billingTransactionDefinition`) + live network capture |

> **⚠ v2.0 correction:** v1.x wrongly profiled the **Single Purchase** tab of `/integra/transactions`.
> The actual **Billing Transactions** feature is the dedicated page under **Finance → Billing Transactions**
> (`/finance/billing-transactions`). It is a richer catalog-style list with **pagination**, a **Search by
> Name** toolbar box, and a filter panel that **does** include Date, Numeric and dependent Package/Package-Item
> filters. This document is rewritten from live exploration of that page.
>
> **Scope:** the **filtering** capability governed by **`capabilityBillingTransactionGet`**. Entity
> `billingTransaction` (PK `billingTransactionId`), confirmed against `oncilla.billingTransaction` /
> `oncilla.billingTransactionDefinition`. CREATE / UPDATE / STATUS-TRANSITION are out of scope for this
> filter-focused pass (`statususer` holds only `capabilityBillingTransactionGet`).
>
> **Every scenario traces to a live observation (UI action + network capture) or a read-only DB oracle.**
> Items still to confirm at execution are listed in §9.
>
> **QA Review Gate:** this doc + `test-scenarios/test-cases/billing_transactions_testcoverage.csv` are
> Phase-1 output — review the CSV before the Generator runs.

---

## 1. Feature Overview

Billing Transactions are billing line items owned by a Portfolio and classified by Package Category /
Package Item Category, with monetary Value, Quantity and Start/Stop dates.

- **List URL:** `/finance/billing-transactions`
- **Detail URL:** `/finance/billing-transactions/{billingTransactionId}`
- **Menu path:** left nav → **Finance → Billing Transactions**
- **Breadcrumb:** `Home › Finance › Billing Transactions`  ·  **h1:** `Billing Transactions`  ·  **tab title:** `Finance | Portal`
- **Statuses (`billingTransactionDefinition` enum):** `Setup · Requested · Active · Exported · Deleted`.
- **Default list excludes Deleted (live-verified):** the list call requests `status=setup&status=requested&status=active&status=exported` — Deleted is hidden by default and must be filtered in via Status.
- **Pagination (live-verified):** default **"Showing per page: 50"**, with **First / Previous / numbered pages / Next / Last** controls and a selectable page size. Grid loads one page at a time (`getPageCount=true`).
- **Record visibility:** portfolio-subtree scoped to the user's sphere. `statususer` = **reseller** sphere; the list and every dropdown/result are bounded to its visible portfolios (whole-table `billingTransaction` has 415 non-deleted rows; the user sees only its subtree).

> **Note — a second, simpler view of the same entity exists:** the **Single Purchase** tab of
> `/integra/transactions` also lists `billingTransaction` but with **no pagination** (`pageSize=300`), a
> **"Search by title"** box, and only 6 filters (Title, Status, Portfolio, Category, Item Category,
> Subscription ID). The Finance page (this document) is the full-featured Billing Transactions filter UI.
> Two different UIs over one entity — flagged in §10 (O1).

---

## 2. Environment Details

- **App base URL:** `https://portal-host.qan.aws.eseye.io`  ·  **Login:** `/auth` (two-step username → password)
- **Auth:** Cognito tokens in `localStorage` + httpOnly BFF session cookie; same-origin BFF API at `/api/catalog/{resource}/execute`.
- **DB:** MariaDB `oncilla`. Billing tables present: `billingTransaction`, `billingTransactionDefinition`, `billingTransactionAttribute(+Definition)`, plus `billingSubscription*`, `billingCommit*`, `billingModel*`.

### APIs captured (live network)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/permissions` | Capability list (RBAC ground truth) |
| GET | `/api/catalog/objectDefinitions/execute?objectName=billingTransaction&status=active` | Field/validation definitions |
| GET | `/api/catalog/genericOption/execute?resourceName=billingTransaction&option=status` | Status option source |
| GET | `/api/catalog/statusTransition/execute?resourceName=billingTransaction&status=active&pageSize=200` | Status-transition metadata |
| GET | `/api/catalog/billingTransaction/execute?pageSize=50&enrich=title&getPageCount=true&status=exported&status=requested&status=setup&status=active` | **List** — default page (size 50, deleted excluded, page count) |

> Filter **apply** re-fires the list `execute` call with the added filter params. On the sibling views the
> observed param shapes were `status=<lowercase>` and `title=<v>&matchField=title&matchType=c` (contains);
> the exact param keys for each Finance-page filter are to be captured on Apply at execution (§9).

### `billingTransactionDefinition` — field oracle (read-only) vs. what is filterable on this page

| Field | Label | Flag | Type / regex | Filterable here? |
|---|---|---|---|:--:|
| billingTransactionId | Billing Transaction Id | unique, mandatory | int `^\d{1,21}$` | ❌ (grid hyperlink only) |
| name | Name | mandatory | str128 `^[^\n]{1,128}$` | ✅ **NAME** (text) |
| title | Title | unique, mandatory | str32 `^\S{1,32}$` | ✅ **TITLE** (text) |
| status | Status | resource, mandatory | `setup\|requested\|active\|exported\|deleted` | ✅ **STATUS** (dropdown) |
| billingTransactionStartDate | Billing Transaction Start Date | mandatory | date | ✅ **START DATE** (date picker) |
| billingTransactionStopDate | Billing Transaction Stop Date | — | date | ✅ **STOP DATE** (date picker) |
| price | Price | mandatory | numeric `^-?\d{1,12}(\.\d{1,12})?$` | ✅ **VALUE** (numeric) |
| quantity | Quantity | mandatory | int `^\d{1,11}$` | ✅ **QUANTITY** (numeric) |
| portfolioId | Portfolio Id | resource, mandatory | 32-hex | ✅ **PORTFOLIO** (dropdown) |
| packageCategoryId | Package Category Id | resource, mandatory | int | ✅ **PACKAGE CATEGORY** (dropdown) |
| packageItemCategoryId | Package Item Category Id | resource, mandatory | int | ✅ **PACKAGE ITEM CATEGORY** (dropdown) |
| billingSubscriptionId | Billing Subscription Id | resource | int | ✅ **BILLING SUBSCRIPTION** (dropdown) |
| iccTypeId | ICC Type Id | resource | int | ✅ **ICC TYPE** (dropdown) |
| packageId | Package Id | resource | int | ✅ **PACKAGE** (dropdown) |
| packageItemId | Package Item Id | resource | int | ✅ **PACKAGE ITEM** (dropdown, **dependent on PACKAGE**) |
| productId | Product Id | resource | int | ✅ **PRODUCT** (dropdown) |
| currencyId | Currency Id | resource | int | ❌ (not exposed as a filter) |
| description | Description | mandatory | str255 | ❌ |
| billingTransactionConfigurationData | Config Data | — | — | ❌ |

> **Nearly every definition field is filterable here** — 15 of the 19 fields map to a filter. Only
> `currencyId`, `description`, `billingTransactionConfigurationData` and the PK are not filter dimensions.

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | PERMISSION TCs | Total |
|---------|----------|------------|----------------|-------|
| Billing Transactions — Filtering | 7 | 33 | 5 | 45 |

> Create / Update / Attribute / Status-Transition are out of scope for this filter demo.

---

## 4. Module Discovery Report

```
MODULE NAME        : Billing Transactions
CAPABILITY PREFIX  : BillingTransaction → capabilityBillingTransactionGet / Update / Create / Approver / Admin
                     Live: capabilityBillingTransactionGet ACTIVE for statususer (oncilla.permission id 6537).
MODULE PLURAL      : Billing Transactions
MENU PATH          : Finance → Billing Transactions
LIST URL           : /finance/billing-transactions
DETAIL URL         : /finance/billing-transactions/{billingTransactionId}
PRIMARY KEY FIELD  : billingTransactionId (grid cell is a HYPERLINK to the detail page)
FK / HYPERLINK     : Portfolio (hyperlink to portfolio detail)
TABLE HEADERS      : Billing Transaction Id | Portfolio | Name | Title | Category | Item Category |
                     Start Date | Value | Status | Actions   (Stop Date is NOT a grid column although it is a filter)
TOOLBAR            : Search by Name… (quick search, works WITHOUT opening Add filter) | Add filter | Clear all |
                     Configure visible columns
FILTER FIELDS (15) : Primary  — Status (dropdown) · Name (text) · Title (text) · Start Date (date) ·
                                 Stop Date (date) · Value (numeric) · Quantity (numeric)
                     Secondary — Portfolio (dropdown) · Package Category (dropdown) · Package Item Category
                                 (dropdown) · Billing Subscription (dropdown) · ICC Type (dropdown) ·
                                 Package (dropdown) · Package Item (dropdown — DEPENDENT: "Select Package first") ·
                                 Product (dropdown)
STATUS VALUES      : Setup · Requested · Active · Exported · Deleted (Deleted excluded from default list)
PAGINATION         : Showing per page: 50 (default) · First / Previous / numbered / Next / Last · page size selectable
CRUD AVAILABLE     : (this pass) Read / Filter only — capabilityBillingTransactionGet
NO-RESULT STATE    : empty grid (exact empty-state text to capture at execution)
TEST REPOSITORY    : test-scenarios/test-plans/billing_transactions_testcoverage.md
APIs CAPTURED      : see §2
```

### RBAC — live capability state for `statususer`

| Capability | Status | Note |
|---|---|---|
| `capabilityBillingTransactionGet` | **active** | Governs list + filtering — this pass |
| `billingTransactionGet` / `billingTransactionUpdate` (legacy ids 3541/3547) | active | Legacy rows; app gates on the `capability*` variants |
| `capabilityBillingTransaction{Update,Create,Approver,Admin}` | not active | No create/edit/status controls for this user |

---

## 5. Discovered Grid Structure

| # | Header | Maps to | Notes |
|---|--------|---------|-------|
| 1 | Billing Transaction Id | `billingTransactionId` | **Hyperlink** → detail page; sortable |
| 2 | Portfolio | `portfolioTitle` (enriched) | **Hyperlink** → portfolio; shows `Title (portfolioId)` |
| 3 | Name | `name` | sortable |
| 4 | Title | `title` | sortable |
| 5 | Category | `packageCategoryTitle` (enriched) | e.g. `o (510)` |
| 6 | Item Category | `packageItemCategoryTitle` (enriched) | |
| 7 | Start Date | `billingTransactionStartDate` | dd/mm/yyyy |
| 8 | Value | `price` | currency |
| 9 | Status | `status` | |
| 10 | Actions | — | per status + permission (not exercised in filter pass) |

**Toolbar:** `Search by Name…` · **Add filter** · **Clear all** · **Configure visible columns**.
**Pagination footer:** `Showing per page: 50` selector · First · Previous · numbered pages · Next · Last.

---

## 6. Discovered Filter Panel (live-verified — 15 fields)

Opened via **Add filter** → right-hand **Filters** drawer with a **Search filters…** box, **Primary Filters**
and **Secondary Filters** sections, and **Reset** / **Apply** / **Close (×)**.

| Section | Filter Field | Type | Placeholder / Values | Notes |
|---|---|---|---|---|
| Primary | **Status** | Dropdown | `Select item…` (Setup/Requested/Active/Exported/Deleted) | default list excludes Deleted |
| Primary | **Name** | Text | `Filter By Name...` | |
| Primary | **Title** | Text | `Filter By Title...` | |
| Primary | **Start Date** | **Date picker** | `Filter By Billing Transaction Start Date...` (calendar) | AC "Date filters" |
| Primary | **Stop Date** | **Date picker** | `Filter By Billing Transaction Stop Date...` (calendar) | AC "Date filters" |
| Primary | **Value** | **Numeric** | `Filter By Value...` | AC "Numeric filters" (price; negatives exist in data) |
| Primary | **Quantity** | **Numeric** | `Filter By Quantity...` | AC "Numeric filters" |
| Secondary | **Portfolio** | Dropdown | `Filter By Portfolio Id...` | scoped to visible portfolios |
| Secondary | **Package Category** | Dropdown | `Filter By Package Category...` | active categories |
| Secondary | **Package Item Category** | Dropdown | `Filter By Package Item Category..` | active item categories |
| Secondary | **Billing Subscription** | Dropdown | `Filter By Billing Subscription...` | |
| Secondary | **ICC Type** | Dropdown | `Filter By Icc Type ...` | |
| Secondary | **Package** | Dropdown | `Filter By Package...` | |
| Secondary | **Package Item** | Dropdown | `Filter By Package Item...` | **DEPENDENT — helper "Select Package first"** |
| Secondary | **Product** | Dropdown | `Filter By Product...` | |

> **Dependent filter (live-verified):** the **Package Item** field displays the helper **"Select Package
> first"** — it is gated on the **Package** selection, satisfying the AC "Package Item cannot be selected
> without Package". (Exact enable-after-Package-select behaviour to confirm at execution — see §9.)

---

## 7. UI → API → DB Correlation (oracle for filter TCs)

```
UI filter (drawer / toolbar) ─▶ GET /api/catalog/billingTransaction/execute?pageSize=50&enrich=title&getPageCount=true&<statusDefaults>&<filterParams>
                                  │  (BFF applies capabilityBillingTransactionGet + portfolio scope)
                                  ▼
                                oncilla.billingTransaction  (scoped to the user's visible portfolio subtree)
```

| UI filter | Expected API param (confirm exact key on Apply) | DB oracle (read-only, scoped) |
|---|---|---|
| Status | `status=<lowercase>` (repeatable) | `... WHERE status='<v>'` |
| Name | `name=<v>` (contains — `matchType=c` pattern) | `... WHERE name LIKE '%<v>%'` |
| Title | `title=<v>&matchField=title&matchType=c` (contains) | `... WHERE title LIKE '%<v>%'` |
| Start Date | date param (`billingTransactionStartDate...`) | `... WHERE billingTransactionStartDate <op> '<d>'` |
| Stop Date | date param (`billingTransactionStopDate...`) | `... WHERE billingTransactionStopDate <op> '<d>'` |
| Value | numeric param (price) | `... WHERE price <op> <n>` |
| Quantity | numeric param | `... WHERE quantity <op> <n>` |
| Portfolio | `portfolioId=<guid>` | `... WHERE portfolioId='<guid>'` |
| Package Category | `packageCategoryId=<id>` | `... WHERE packageCategoryId='<id>'` |
| Package Item Category | `packageItemCategoryId=<id>` | `... WHERE packageItemCategoryId='<id>'` |
| Billing Subscription | `billingSubscriptionId=<id>` | `... WHERE billingSubscriptionId='<id>'` |
| ICC Type | `iccTypeId=<id>` | `... WHERE iccTypeId='<id>'` |
| Package | `packageId=<id>` | `... WHERE packageId='<id>'` |
| Package Item | `packageItemId=<id>` (only after Package chosen) | `... WHERE packageItemId='<id>'` |
| Product | `productId=<id>` | `... WHERE productId='<id>'` |

**Consistency assertion (per filter TC):** the grid's `billingTransactionId` set after Apply must equal the DB
result of the same predicate **restricted to the user's visible portfolio scope** — never the whole table.

### Live DB data distribution (for filter test values)

- **By status (whole table):** setup 146 · active 121 · requested 101 · exported 45 · deleted 27 · `unsigned` 1 · `test` 1.
- **Portfolios with data (top):** `Telus_-_14190777...` 65 · **`Prudhvi_Dwarapureddi_-_QA_2` 58** (statususer's own) · `Nand_Group_(GBP)` 48 · `QA31` 43.
- **Price (Value):** min **-5.75** (1 negative), max **≈ 951,421,604,251.62** (single outlier) — good numeric-filter boundaries.
- **Date span:** start `2024-05-07` → `2027-12-01`; stop → `2028-01-01` (future-dated rows exist) — good date-filter boundaries.
- **Package/Item presence:** neither 332 · package-only 49 · both 58 · **item-without-package 3** (anomaly — §10 D2).

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW (reach the filterable list)  *(capabilityBillingTransactionGet · module-View)*

#### S1.1. Verify the Billing Transactions list loads with correct heading and breadcrumb
**Steps:** 1. Log in → Finance → Billing Transactions → list renders. 2. Verify h1 "Billing Transactions"; breadcrumb "Home › Finance › Billing Transactions"; tab title "Finance | Portal".
**API:** `GET /api/catalog/billingTransaction/execute?pageSize=50&enrich=title&getPageCount=true&status=exported&status=requested&status=setup&status=active` → 200
**DB:** first-page rows == first 50 of `billingTransaction` in visible scope, deleted excluded.

#### S1.2. Verify the grid renders the 10 columns in order
**Steps:** Verify: Billing Transaction Id | Portfolio | Name | Title | Category | Item Category | Start Date | Value | Status | Actions.

#### S1.3. Verify the Billing Transaction Id hyperlink opens the detail page
**Steps:** Click a Billing Transaction Id → navigates to `/finance/billing-transactions/{id}`.

#### S1.4. Verify the Portfolio hyperlink opens the portfolio detail
**Steps:** Click a Portfolio cell → navigates to the portfolio detail page.

#### S1.5. Verify pagination: default page size 50 and First/Previous/Next/Last navigation
**Steps:** 1. Verify footer shows "Showing per page: 50". 2. Verify First and Previous are disabled on page 1. 3. Click Next / Last / a numbered page → the grid loads the target page. *(Live-verified controls: First page, Previous page, numbered pages, Next page, Last page.)*

#### S1.6. Verify the page-size selector changes rows per page
**Steps:** Open the "Showing per page" selector → choose a different size → the grid reloads with that many rows and the list `execute` call re-fires with the new `pageSize`. *(Default 50 verified; exact selectable sizes to confirm — see §9.)*

#### S1.7. Verify the toolbar "Search by Name" filters the list WITHOUT opening Add filter
**Steps:** On the list toolbar, type a Name fragment in the **Search by Name…** box (do not open Add filter) → the list filters to rows whose Name matches. *(Live-verified the toolbar quick-search exists separately from Add filter.)*

---

### S2 — FILTER  *(capabilityBillingTransactionGet · module-Filter)*

#### S2.1. Verify the filter panel opens with Primary and Secondary sections
**Steps:** Click Add filter → Filters drawer opens with a Search filters box, Primary Filters, Secondary Filters, Reset, Apply and Close.

#### S2.2. Verify the Search filters box filters the field list
**Steps:** Type in `Search filters…` → only matching filter fields remain listed.

#### S2.3. Verify all 15 filter fields are present
**Steps:** Verify Primary: Status, Name, Title, Start Date, Stop Date, Value, Quantity; Secondary: Portfolio, Package Category, Package Item Category, Billing Subscription, ICC Type, Package, Package Item, Product.

#### S2.4. Verify filter by Status
**Steps:** Status → select a value (e.g. Active) → Apply → all rows show that status. **DB:** `status=` predicate in scope.

#### S2.5. Verify filter by Status = Deleted surfaces soft-deleted rows
**Steps:** Status → Deleted → Apply → soft-deleted rows appear (they are hidden from the default list). **DB:** `status='deleted'` in scope.

#### S2.6. Verify filter by Name (text)
**Steps:** Enter a Name fragment → Apply → every row's Name matches. **DB:** `name LIKE`.

#### S2.7. Verify filter by Title (text)
**Steps:** Enter a Title fragment → Apply → every row's Title matches. **DB:** `title LIKE`.

#### S2.8. Verify filter by Start Date
**Steps:** Open Start Date → pick a date → Apply → results respect the Start Date condition. Use a date within the live range (2024-05 … 2027-12). **DB:** `billingTransactionStartDate` predicate.

#### S2.9. Verify filter by Stop Date
**Steps:** Open Stop Date → pick a date → Apply → results respect the Stop Date condition (data spans up to 2028-01). **DB:** `billingTransactionStopDate` predicate.

#### S2.10. Verify a Start + Stop date range together
**Steps:** Set Start Date AND Stop Date → Apply → results fall within the range; assert the intersection. **DB:** both date predicates.

#### S2.11. Verify the date picker behaviour (calendar select / clear)
**Steps:** Open a date filter → the calendar opens → select a date → the field shows it; clear it → the field resets. *(Pin observed calendar behaviour; capture any disabled/locked dates.)*

#### S2.12. Verify filter by Value (numeric)
**Steps:** Enter a numeric Value → Apply → rows match the Value condition. Test with a normal value and with the known negative (-5.75) and large-outlier boundaries. **DB:** `price` predicate.

#### S2.13. Verify Value accepts decimals and negatives; rejects non-numeric
**Steps:** Enter a decimal and a negative (data has one -5.75 row) → accepted; enter letters → rejected/validation. *(price regex `^-?\d{1,12}(\.\d{1,12})?$`.)*

#### S2.14. Verify filter by Quantity (numeric)
**Steps:** Enter a Quantity → Apply → rows match. **DB:** `quantity` predicate. *(quantity regex `^\d{1,11}$` — integer, non-negative.)*

#### S2.15. Verify Quantity rejects non-integer / non-numeric input
**Steps:** Enter a decimal or letters in Quantity → validation/no match per the integer rule.

#### S2.16. Verify filter by Portfolio (dropdown)
**Steps:** Portfolio → select one → Apply → every row belongs to that Portfolio. **DB:** `portfolioId=` in scope.

#### S2.17. Verify the Portfolio dropdown lists only in-scope portfolios (no unauthorized data)
**Steps:** Open Portfolio → only portfolios in the user's visible subtree are listed. **DB:** options ⊆ visible subtree.

#### S2.18. Verify filter by Package Category (dropdown)
**Steps:** Package Category → select → Apply → every row's Category matches. **DB:** `packageCategoryId=`.

#### S2.19. Verify filter by Package Item Category (dropdown)
**Steps:** Package Item Category → select → Apply → every row's Item Category matches. **DB:** `packageItemCategoryId=`.

#### S2.20. Verify filter by Billing Subscription (dropdown)
**Steps:** Billing Subscription → select → Apply → rows link to that subscription. **DB:** `billingSubscriptionId=`.

#### S2.21. Verify filter by ICC Type (dropdown)
**Steps:** ICC Type → select → Apply → rows match the ICC Type. **DB:** `iccTypeId=`.

#### S2.22. Verify filter by Package (dropdown)
**Steps:** Package → select → Apply → rows match the Package. **DB:** `packageId=`.

#### S2.23. Verify Package Item is disabled until a Package is selected (dependent filter)
**Steps:** Open the filter panel → the Package Item field shows the helper **"Select Package first"** and cannot be used until Package is chosen. *(AC: "Package Item cannot be selected without Package".)*

#### S2.24. Verify Package Item becomes usable and is constrained after selecting a Package
**Steps:** Select a Package → the Package Item field enables → its options are the items of the chosen Package → select one → Apply → rows match both Package and Package Item. **DB:** `packageId=` AND `packageItemId=`.

#### S2.25. Verify filter by Product (dropdown)
**Steps:** Product → select → Apply → rows match. **DB:** `productId=`.

#### S2.26. Verify dropdown option sources vs DB (Category / Item Category)
**Steps:** Open Package Category and Package Item Category → options correspond to active records. **DB:** `SELECT title FROM packageCategory/packageItemCategory WHERE status='active'`.

#### S2.27. Verify multiple filters simultaneously — Status + Portfolio (intersection)
**Steps:** Status + Portfolio → Apply → rows satisfy BOTH. **DB:** AND predicate in scope.

#### S2.28. Verify multiple filters — Date range + Value (intersection)
**Steps:** A Start/Stop date range AND a Value → Apply → rows satisfy all conditions.

#### S2.29. Verify clearing one filter restores that dimension
**Steps:** Apply Status + Portfolio; remove only Status → the list widens to all statuses for that Portfolio (Portfolio still applied).

#### S2.30. Verify Reset (in drawer) clears all filter inputs
**Steps:** Apply several filters → Reset → all drawer inputs cleared → Apply → default list restored.

#### S2.31. Verify Clear all (toolbar) removes active filters and the Search-by-Name value
**Steps:** With filters + a Search by Name value active → Clear all → all filters and the search box cleared; unfiltered default list shown.

#### S2.32. Verify a no-result filter combination is handled gracefully
**Steps:** Apply a combination that matches nothing → the grid shows an empty state (no rows, no error, no stale rows). **DB:** predicate returns 0 in scope. *(Capture exact empty-state text at execution.)*

#### S2.33. Verify a filter is honoured across pagination and that UI results match the DB
**Steps:** 1. Apply a broad filter (e.g. Status=Active) → the filter persists while paging Next/Last and the page count updates. 2. Capture the filtered `billingTransactionId` set (across pages) → assert it equals the DB result of the same predicate **restricted to the user's visible portfolio scope**.

---

### PERMISSION — `capabilityBillingTransactionGet`

#### P1. (Positive) Filtering is available with Get permission
**Steps:** With the capability active → Finance → Billing Transactions list + Add filter drawer + toolbar search usable; filters apply and return scoped results.

#### P2. (Negative) Module hidden / list blocked without Get permission
**Steps:** Without the capability → the Billing Transactions nav entry is not reachable and the list does not render. **API:** list `execute` → 401/403.

#### P3. (Negative) Filter API blocked without Get permission
**Steps:** Call `billingTransaction/execute` with filter params while lacking the capability → 401/403; no data.

#### P4. (Unauthorized data) Filtering cannot surface out-of-scope records
**Steps:** Attempt to filter toward a portfolio outside the user's subtree (absent from the Portfolio dropdown; a forged `portfolioId` param is still scoped by the BFF) → no unauthorized rows. **DB:** result ⊆ visible subtree.

#### P5. (Data-visibility) List + filter results stay within the user's sphere
**Steps:** Verify the list and every filtered result are bounded to the user's visible portfolio subtree, never the whole `billingTransaction` table.

---

## 9. Open Items to Confirm at Execution (Generator/Healer)

1. **Exact apply-param key** for each filter (Name/Date/Value/Quantity/Portfolio/Category/etc.) — capture on Apply. (Status `status=` and Title `title=&matchField=title&matchType=c` observed on the sibling view.)
2. **Status filter single- vs multi-select** on this page (default query carries 4 status params — likely multi-select; confirm).
3. **Date picker specifics** — format, range/relative operators, any disabled/locked dates.
4. **Numeric filter operator** — exact/`>=`/range for Value and Quantity.
5. **Package Item enable-after-Package** — confirm the field enables and is constrained to the chosen Package's items (helper "Select Package first" verified).
6. **Exact page-size options** (default 50 verified; user-observed 5/10/20/… — confirm the full list).
7. **No-result empty-state exact text.**

---

## 10. Gaps, Observations & Defects

> From live evidence + `billingTransactionDefinition` + DB. Product defects → `defects/billing_transactions/`.

| Ref | Type | Finding | Evidence |
|---|---|---|---|
| **O1** | Observation | The `billingTransaction` entity is surfaced by **two different UIs**: this full **Finance → Billing Transactions** page (pagination + 15 filters incl. date/numeric/dependent) and the simpler **Single Purchase** tab of `/integra/transactions` (no pagination, 6 filters, "Search by title"). Confirm both are intended and which is canonical for QA. | Live comparison of the two pages. |
| **D2** | Data integrity (candidate) | **3 `billingTransaction` rows have `packageItemId` with NULL `packageId`** — inconsistent with the Package→Package-Item dependency enforced in the UI. Confirm whether legacy/imported or a broken guard. | DB: `hasPkg=0,hasItem=1,n=3`. |
| **D3** | Data quality (test env) | `billingTransaction.status` holds junk `unsigned` (1) and `test` (1) outside the enum; not offered in the UI Status dropdown. | DB `GROUP BY status`. |
| **D4** | Permission data (candidate) | `statususer` holds legacy `billingTransactionUpdate` but not `capabilityBillingTransactionUpdate`; app gates on `capability*`. Confirm whether legacy rows are dead data. | DB `userPermission ⋈ permission`. |
| **N1** | Doc drift (not a bug) | `context/transaction_context.md` documents only the Single Purchase tab and a micro-service list API; the Finance page uses the BFF `/api/catalog/billingTransaction/execute`. Update the context file to cover this page. | Live capture. |

> **Acceptance-criteria coverage:** every AC (open panel · individual filters · multiple filters · results
> match · clearing restores · **date filters** · **numeric filters** · dropdown filters · **dependent
> filters** · **Package Item requires Package** · no-result · large datasets/pagination · permissions ·
> unauthorized data · UI/DB consistency) maps to a scenario above and is **supported by the live UI** of
> this page. (The earlier v1.x "missing date/numeric/dependent filter" defects were an artefact of profiling
> the wrong page and are withdrawn.)

---

## 11. Evidence (screenshots — git-ignored under `screenshots/billing_transactions/`)

| # | File | Shows |
|---|------|-------|
| 01 | `01-billing-transactions-list.png` | Finance → Billing Transactions list (Search by Name, Add filter, grid) |
| 02 | `02-filter-panel-primary.png` | Filter drawer — Primary Filters (Status, Name, Title, Start Date, Stop Date, Value) |
| 03 | `03-filter-panel-secondary.png` | Filter drawer — Secondary Filters (Billing Subscription, ICC Type, Package, **Package Item "Select Package first"**, Product) |

---

*End of Billing Transactions filtering coverage v2.0 — corrected to the Finance → Billing Transactions page,
filter panel/date/numeric/dependency/pagination live-verified. 45 TCs (7 VIEW + 33 FILTER + 5 PERMISSION).
Awaiting QA Review Gate before the Generator agent runs.*
