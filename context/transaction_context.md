# Transactions — Complete UI Discovery Context

> Observed live: 2026-07-10 · User: `statususer` (full permissions including Admin)
> Planner agent must verify each item on the day it runs — values here are starting-point truths, not substitutes for live observation.

---

## Navigation & Page Structure

| Property | Value |
|---|---|
| Menu path | Direct sidebar link — not nested under any parent group |
| URL | `/integra/transactions` |
| Breadcrumb | Home › Integra › Transactions |
| Page title (H1) | Transactions |
| Browser title | Eseye Portal |

The Transactions page is divided into **three independent sub-modules**, each on its own tab. Each tab has its own entity, columns, form fields, status model, and API. They share the same toolbar layout (search bar, Add filter, Clear all, Actions dropdown, column preset button).

---

## Tabs Overview

| Tab | Active Label | Entity (DB / API) | Primary Key Field | API Base URL |
|---|---|---|---|---|
| **Single Purchase** | Single Purchase | `billingTransaction` | `billingTransactionId` | `invoice.api.qan.eseye.io/v2/billingTransaction` |
| **Subscriptions** | Subscriptions | `billingSubscription` | `billingSubscriptionId` | `invoice.api.qan.eseye.io/v2/billingSubscription` |
| **Minimum Commitment** | Minimum Commitment | `billingCommit` | `billingCommitId` | `invoice.api.qan.eseye.io/v2/billingCommit` |

---

## Toolbar (all tabs — same layout)

| Control | Type | Notes |
|---|---|---|
| Search bar | Text input | Placeholder: "Search by title" — searches by title field across all rows |
| Add filter | Button | Opens Filters drawer (slides in from right) |
| Clear all | Button | Clears all active filters and search |
| Actions | Dropdown button | Tab-specific options — see per-tab sections below |
| Configure visible columns | Icon button (`aria-label="Configure visible columns"`) | Opens "Search Results View" modal |

---

## Search Results View (Column Preset Panel)

Opens as a modal when the grid icon button (`aria-label="Configure visible columns"`) is clicked.

| Element | Description |
|---|---|
| Modal title | "Search Results View" |
| "Load a saved set of columns" | Dropdown showing saved presets (default: "Default View") |
| Load & Apply | Applies the selected saved preset to the grid |
| Delete | Deletes the selected saved preset (greyed out when no custom presets exist) |
| Output Columns | Checkboxes for every column — all checked by default |
| Select All | Checks all column checkboxes |
| Deselect All | Unchecks all column checkboxes |
| Cancel | Closes modal with no changes |
| Apply | Applies current checkbox selection to grid — grid refreshes immediately |
| Enter preset name... | Text input — type a name then click Save to store as a named preset |
| Save | Saves current checkbox selection as a named preset for future reuse |

> The column preset panel is NOT a simple show/hide toggle. The user must check/uncheck checkboxes then click **Apply** to change the grid. Saved presets persist and can be reloaded via the dropdown.

---

## Pagination Behaviour

There is **no traditional pagination** on the Transactions page. All records are loaded in a single API call (`pageSize=300` for Single Purchase and Subscriptions, `pageSize=50` for Minimum Commitment). The list renders as a vertically scrollable table. There are no next/previous page buttons, no page size selector, and no "X of Y" page indicator.

---

## Filter Panel (all tabs — same fields)

The filter panel is a **drawer** that slides in from the right side. It is the same across all three tabs.

| Section | Filter Field | Type | Notes |
|---|---|---|---|
| Primary Filters | TITLE | Text input | Placeholder: "Filter by Title..." — free-text search on title field |
| Primary Filters | STATUS | Dropdown | See per-tab status values below |
| Secondary Filters | PORTFOLIO ID | Dropdown | Select item — lists all portfolios |
| Secondary Filters | CATEGORY | Dropdown | Select item — lists package categories |
| Secondary Filters | ITEM CATEGORY | Dropdown | Select item — lists package item categories |

Buttons at the bottom: **Reset** (clears all filter fields) · **Apply** (executes filter)
A **Close** (×) icon in the top-right corner of the drawer closes it without applying.

---

## Tab: Single Purchase

### Grid Columns (in display order)

| # | Column Header | Maps to API field | Notes |
|---|---|---|---|
| — | Checkbox | — | Row selection for bulk actions |
| 1 | Transaction ID | `billingTransactionId` | Clickable button — opens detail view modal |
| 2 | Title | `title` | |
| 3 | Portfolio | `portfolioTitle` (enriched) | |
| 4 | Category | `packageCategoryTitle` (enriched) | Format: "name - id" e.g. "o - 510" |
| 5 | Item Category | `packageItemCategoryTitle` (enriched) | Format: "name - id" e.g. "QA - 1069" |
| 6 | Start Date | `billingTransactionStartDate` | Date format: dd/mm/yyyy |
| 7 | Stop Date | `billingTransactionStopDate` | Date format: dd/mm/yyyy |
| 8 | Value | `price` | Currency format: £x,xxx.xx |
| 9 | Status | `status` | Plain text (no coloured badge observed) |
| 10 | Actions | — | See Actions Column section below |

### Status Values (Single Purchase)

`Setup` · `Requested` · `Active` · `Exported` · `Deleted`

Status filter dropdown options: All · Setup · Requested · Active · Exported · Deleted

### Actions Column Behaviour per Status (Single Purchase)

| Record Status | View (eye) | Edit (pencil) | Delete (trash) |
|---|---|---|---|
| Setup | Visible, enabled | Visible, enabled | Visible, enabled |
| Requested | Visible, enabled | Visible, enabled | Visible, enabled |
| Active | Visible, enabled | Visible, enabled (Admin permission required) | Visible, enabled |
| Exported | Visible, enabled | Visible, enabled (Admin permission required) | **NOT visible** |
| Deleted | Visible, enabled | Visible, enabled | **NOT visible** |

> With `statususer` (full permissions including Admin), Edit is enabled for all statuses. With no Admin permission, Edit icon for Active and Exported rows is visible but **disabled** (greyed out). Delete is never shown for Exported or Deleted records.

### Actions Dropdown (Single Purchase toolbar)

| Option | Behaviour |
|---|---|
| Add Transaction | Opens "Add Transaction" modal form |
| Request Approval | Greyed out until one or more rows are selected via checkbox — triggers bulk status change to Requested |
| Approve Selected | Greyed out until one or more rows are selected via checkbox — triggers bulk status change to Active |

### Detail View Modal (View button)

Opens as a modal overlay. Title format: `{portfolioId} - {name}`. Sub-heading: `{title}`.

| Field Label | Maps to | Notes |
|---|---|---|
| Name | `name` | Read-only |
| Title | `title` | Read-only |
| Description | `description` | Read-only |
| Portfolio ID | `portfolioId` | Shows: "id - portfolioTitle" |
| Transaction ID | `billingTransactionId` | Read-only |
| Category | `packageCategoryId` | Shows: "id - categoryTitle" |
| Item Category | `packageItemCategoryId` | Shows: "id - itemCategoryTitle" |
| Package | `packageId` | Read-only, may be empty |
| Package Item | `packageItemId` | Read-only, may be empty |
| Product | `productId` | Read-only, may be empty |
| ICC Type Code | `iccTypeId` | Read-only, may be empty |
| Price | `price` | Currency formatted |
| Quantity | `quantity` | |
| Start Date | `billingTransactionStartDate` | Date formatted |
| Stop Date | `billingTransactionStopDate` | Date formatted |
| Bundle Quantity | attribute: `bundleQuantity` | May be empty |
| Order Item ID | attribute: `orderItemId` | May be empty |
| Transaction Reference | attribute: `transactionReference` | May be empty |
| Region | attribute: `region` | May be empty |
| Customer Reference | attribute: `customerReference` | May be empty |

Close button at the bottom closes the modal.

### Create Form (Add Transaction)

Modal title: "Add Transaction". Sub-title: "Create a new transaction".

| Field Label | Type | Mandatory | Validation / Notes |
|---|---|---|---|
| Title | Text | Yes * | Max 32 chars · No spaces · Hint: "The title can be up to 32 characters long and should not contain spaces" · Must be unique |
| Name | Text | Yes * | Max 128 chars · No newlines |
| Description | Text | Yes * | Max 255 chars |
| Portfolio ID | Dropdown | Yes * | Active portfolios only |
| Category | Dropdown | Yes * | Active package categories only (source: `/v2/packageCategory?status=active`) |
| Item Category | Dropdown | Yes * | Active package item categories only (source: `/v2/packageItemCategory?status=active`) |
| Package | Dropdown | No | Optional — active packages only |
| Package Item | Dropdown | No | **Disabled until Package is selected** — dependent field |
| Product | Dropdown | No | Optional |
| ICC Type Code | Dropdown | No | Optional — maps to `iccTypeId` |
| Price | Number | Yes * | Decimal up to 12 digits · Negatives allowed · Format: `-?d{1,12}(.d{1,12})?` |
| Quantity | Number | Yes * | Integer · Default: 1 · Max 11 digits |
| Effective date | Date picker | Yes * | Maps to `billingTransactionStartDate` · Pre-filled with today's date |
| Billing Cycle End | Date picker | No | Maps to `billingTransactionStopDate` · Default shows "All dates" |
| Bundle Quantity | Text | No | Attribute · Max 11 chars · Integer |
| Order Item Id | Text | No | Attribute · Max 21 chars · Integer |
| Transaction Reference | Text | No | Attribute · Max 32 chars |
| Region | Text | No | Attribute · Max 32 chars |
| Customer Reference | Text | No | Attribute · Max 32 chars |

Buttons: **Cancel** (left) · **Save** (right) · **Close X** (top-right corner)

### Edit Form (Edit Transaction)

Modal title: "Edit Transaction". Sub-title: "Edit transaction details".
Same fields as Create form, all pre-populated with existing record values.

| Field | Edit state |
|---|---|
| Title | Editable |
| Name | Editable |
| Description | Editable |
| Portfolio ID | Dropdown — editable (selectable) |
| Category | Dropdown — editable |
| Item Category | Dropdown — editable |
| Package | Dropdown — editable |
| Package Item | **Disabled** until Package is selected |
| Product | Dropdown — editable |
| ICC Type Code | Dropdown — editable |
| Price | Editable (number input) |
| Quantity | Editable (number input) |
| Bundle Quantity | Editable |
| Order Item Id | Editable |
| Transaction Reference | Editable |
| Region | Editable |
| Customer Reference | Editable |

> **Note:** The form does NOT show `Effective date` and `Billing Cycle End` date picker fields when editing a record that is in Invoiced/Exported state — those fields become read-only per the Billing Transaction Validation Rules in [`permissions_and_status_model.md`](permissions_and_status_model.md) (Rules V6, V7).

### API Endpoints (Single Purchase)

| Method | URL | Purpose |
|---|---|---|
| GET | `https://common.api.qan.eseye.io/v2/billingTransaction/definition` | Field definitions and validation rules |
| GET | `https://invoice.api.qan.eseye.io/v2/billingTransaction?pageSize=300&enrich=title` | List all transactions |
| GET | `https://package.api.qan.eseye.io/v2/packageCategory?status=active&pageSize=300` | Category dropdown source |
| GET | `https://package.api.qan.eseye.io/v2/packageItemCategory?status=active&pageSize=300` | Item Category dropdown source |
| GET | `https://portfolio.api.qan.eseye.io/v2/portfolio?enrich=title&pageToken=0&pageSize=2000` | Portfolio dropdown source |

---

## Tab: Subscriptions

### Grid Columns (Subscriptions)

Same column structure as Single Purchase except the first data column:

| # | Column Header | Notes |
|---|---|---|
| 1 | Subscription ID | `billingSubscriptionId` — clickable button (opens detail view) |
| 2–9 | Title, Portfolio, Category, Item Category, Start Date, Stop Date, Value, Status | Same layout as Single Purchase |
| 10 | Actions | View (eye) · Edit (pencil) · Delete (trash) — same visibility rules as Single Purchase |

### Status Values (Subscriptions)

`Setup` · `Requested` · `Active` · `Suspended` · `Deleted`

> **Key difference from Single Purchase:** Subscriptions has `Suspended` instead of `Exported`. There is no `Exported` status.

### Actions Dropdown (Subscriptions toolbar)

| Option | Behaviour |
|---|---|
| Add Subscription | Opens "Add Subscription" modal form |
| Request Approval | Greyed out until rows are selected |
| Approve Selected | Greyed out until rows are selected |

### Create Form (Add Subscription)

Modal title: "Add Subscription". Sub-title: "Create a new subscription".

| Field Label | Type | Mandatory | Notes |
|---|---|---|---|
| Title | Text | Yes * | Max 32 chars · No spaces · Must be unique |
| Name | Text | Yes * | Max 128 chars · No newlines |
| Description | Text | Yes * | Max 255 chars |
| Portfolio ID | Dropdown | Yes * | Active portfolios only |
| Category | Dropdown | Yes * | Active package categories |
| Item Category | Dropdown | Yes * | Active package item categories |
| Package | Dropdown | No | Optional |
| Package Item | Dropdown | No | Disabled until Package is selected |
| Period | Dropdown | Yes * | Billing period in months — maps to `periodId` (source: period lookup) |
| Price | Number | Yes * | Positive decimals only (no negatives) · Max 12 digits |
| Quantity | Number | Yes * | Integer · Max 11 digits |
| Bill Date | Date picker | Yes * | Maps to `billDate` — the annual subscription billing date · Pre-filled with today |
| Billing Cycle Start | Date picker | Yes * | Maps to `billingSubscriptionStartDate` · Pre-filled with today |
| Billing Cycle End | Date picker | No | Maps to `billingSubscriptionStopDate` · Default: "All dates" |
| Order Id | Text | No | Attribute · Max 21 chars · Integer · Maps to `orderId` (ref: order) |
| Region | Text | No | Attribute · Max 32 chars |
| Customer Reference | Text | No | Attribute · Max 32 chars |

> **Key differences from Single Purchase Create form:** Has `Period *` and `Bill Date *` fields · Has `Billing Cycle Start *` as a separate mandatory field · No `ICC Type Code`, no `Product` fields · No `Bundle Quantity`, `Order Item Id`, or `Transaction Reference` attributes · Price does NOT allow negatives

### API Endpoints (Subscriptions)

| Method | URL | Purpose |
|---|---|---|
| GET | `https://common.api.qan.eseye.io/v2/billingSubscription/definition` | Field definitions |
| GET | `https://invoice.api.qan.eseye.io/v2/billingSubscription?pageSize=300&enrich=title` | List all subscriptions |

---

## Tab: Minimum Commitment

### Grid Columns (Minimum Commitment)

| # | Column Header | Notes |
|---|---|---|
| 1 | Commitment ID | `billingCommitId` — clickable (behaviour to verify live) |
| 2 | Commitment Title | `title` |
| 3 | Portfolio ID | Shows portfolio name + ID |
| 4 | Commitment Name | `name` |
| 5 | Category | `packageCategoryTitle` |
| 6 | Item Category | `packageItemCategoryTitle` |
| 7 | Billing Cycle Start | `billingCycleStart` — displayed as "Month YYYY" (e.g. "June 2026") |
| 8 | Billing Cycle End | `billingCycleStop` — displayed as "Month YYYY" |
| 9 | Amount | `price` |
| 10 | Status | `status` |
| 11 | Actions | **Edit only** — no View button, no Delete button on any row |

### Status Values (Minimum Commitment)

`Setup` · `Requested` · `Active` · `Deleted`

> **Key difference:** No `Exported` and no `Suspended`. Only 4 states.

### Actions Column Behaviour (Minimum Commitment)

All rows across all statuses show **only the Edit (pencil) button**. There is no View button and no Delete button on any Minimum Commitment row.

### Actions Dropdown (Minimum Commitment toolbar)

| Option | Behaviour |
|---|---|
| Add min commit | Opens "Manage Minimum Commitment" modal form |

> No "Request Approval" or "Approve Selected" bulk options — Minimum Commitment does not support bulk approval from this toolbar.

### Create Form (Manage Minimum Commitment)

Modal title: "Manage Minimum Commitment". Sub-title: "Add and configure a minimum revenue commitment for a specific portfolio".

| Field Label | Type | Mandatory | Notes |
|---|---|---|---|
| Commit Level | Radio group | Yes * | Options: **Portfolio Level** · **Category Level** · **Package Level** — controls which additional filter fields are shown |
| Portfolio ID | Dropdown | Yes * | Active portfolios only |
| Commitment Title | Text | Yes * | Max 32 chars · No spaces · Must be unique · Maps to `title` |
| Commitment Name | Text | Yes * | Max 128 chars · No newlines · Maps to `name` |
| Commit Description | Text | No | Max 255 chars · Maps to `description` |
| Minimum Commitment Amount | Number | Yes * | Decimal · Negatives allowed · Maps to `price` |
| Billing Commit Package Category | Dropdown | Yes * | Maps to `billingCommitPackageCategoryId` — classification of resulting commit charge |
| Billing Commit Package Item Category | Dropdown | Yes * | Maps to `billingCommitPackageItemCategoryId` |
| Billing Cycle Start | Month/year picker | Yes * | Format: YYYYMM (stored) / "Mon YYYY" (displayed) · e.g. "Jul 2026" |
| Billing Cycle End | Month/year picker | No | Maps to `billingCycleStop` · Optional |

> **Commit Level radio** determines which scope filter fields appear (packageCategoryId, packageItemCategoryId, packageId, packageItemId) — these define inclusion/exclusion filters stored in `billingCommitConfigurationData`. Planner agent must observe exactly which fields appear for each Commit Level selection.

### API Endpoints (Minimum Commitment)

| Method | URL | Purpose |
|---|---|---|
| GET | `https://common.api.qan.eseye.io/v2/billingCommit/definition` | Field definitions |
| GET | `https://invoice.api.qan.eseye.io/v2/billingCommit?pageSize=50&enrich=title` | List all commits (pageSize=50, not 300) |

---

## Cross-Tab Shared APIs (called on every tab load)

| Method | URL | Purpose |
|---|---|---|
| GET | `https://portfolio.api.qan.eseye.io/v2/portfolio/me?enrich=title` | Current user's portfolio |
| GET | `https://portfolio.api.qan.eseye.io/v2/portfolio?status=active&pageSize=2000` | Active portfolios for dropdowns |
| GET | `https://package.api.qan.eseye.io/v2/packageCategory?status=active&pageSize=2000` | Active categories for dropdowns |
| GET | `https://package.api.qan.eseye.io/v2/packageItemCategory?status=active&pageSize=2000` | Active item categories for dropdowns |
| GET | `https://engine.api.qan.eseye.io/release-management/v4/releasemanager` | Feature flags |

---

## Key Behavioural Rules (Transactions — all tabs)

1. **No pagination** — all records load in one API call; no next/previous controls exist on any tab.
2. **Transaction ID / Subscription ID cells are buttons**, not hyperlinks — clicking them opens the detail view modal (Single Purchase and Subscriptions only).
3. **Delete button hidden on Deleted and Exported records** (Single Purchase) — a record already in Deleted or Exported state does not show a Delete action button.
4. **Minimum Commitment has no View and no Delete buttons** on any row — only Edit.
5. **Package Item dropdown is dependent** — disabled until a Package is selected in the Create/Edit form (all tabs that have this field).
6. **Bulk approval actions** (Request Approval, Approve Selected) require at least one row to be checkbox-selected before they become enabled; they are greyed out otherwise.
7. **Minimum Commitment does not have bulk approval** in its Actions dropdown.
8. **Column preset ("Search Results View")** supports saving named presets — users can save column configurations and reload them via the "Load a saved set of columns" dropdown.
