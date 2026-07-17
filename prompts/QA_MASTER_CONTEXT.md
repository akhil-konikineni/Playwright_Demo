# QA Master Context — Eseye QAN Portal

> **Purpose:** Single reusable reference for all QA activities across every feature of the QAN Portal.
> Feature context files (e.g. `APN_Context.md`, `Transaction_Context.md`) reference this document for all common rules and define only their own unique business logic.
>
> **Portal:** `https://portal.qan.aws.eseye.io` | **Test account:** `statususer / Password#1`
> **DB Schema:** `oncilla` | **Environment:** QAN | **Project:** PV3

---

## TABLE OF CONTENTS

1. [Application Context & Login](#1-application-context--login)
2. [Common CRUD Validation](#2-common-crud-validation)
3. [Grid Validation](#3-grid-validation)
4. [RBAC Validation](#4-rbac-validation)
5. [Status Lifecycle Validation](#5-status-lifecycle-validation)
6. [Form Validation](#6-form-validation)
7. [UI Validation](#7-ui-validation)
8. [DB Validation Reference](#8-db-validation-reference)
9. [Test Case Format & Output Rules](#9-test-case-format--output-rules)
10. [Playwright Automation Framework](#10-playwright-automation-framework)
11. [Common Test Data Guidelines](#11-common-test-data-guidelines)
12. [Common Naming Conventions](#12-common-naming-conventions)
13. [Feature-Specific Context Template](#13-feature-specific-context-template)

---

## 1. Application Context & Login

### 1.1 Environment

| Key | Value |
|---|---|
| APP_URL | `https://portal.qan.aws.eseye.io/login` |
| FULL_USER | `statususer` |
| FULL_PASSWORD | `Password#1` |
| ENVIRONMENT | QAN |
| PROJECT | PV3 |
| DB_SCHEMA | `oncilla` |
| DB Connection | `.env` keys: `QA_DB_HOST`, `QA_DB_USER`, `QA_DB_PASSWORD`, `QA_DB_NAME=oncilla` |

### 1.2 Login Flow Rules

- Navigate to `APP_URL`.
- Use `browser_snapshot` to detect whether login is one-step or multi-step before acting.
- Never enter the password before the username step is confirmed visible.
- Never submit a field before it is visible and enabled.
- Never assume login is complete until both UI snapshot and API state confirm it.
- After login, use `browser_network_requests` to capture: access token, refresh token, session ID, user permissions, portfolio mappings.

### 1.3 Post-Login Validations

- Successful login response status.
- Authentication token / session token generated.
- Store: Access Token · Refresh Token · Session ID · User Details · User Permissions/Roles · Portfolio Information.
- Token expiration details.
- Authenticated APIs return valid responses; unauthorized APIs are blocked.
- User lands on correct dashboard/home page.
- User-specific menu access based on permissions.
- Left navigation visible; logout visible.

### 1.4 Two-User Strategy

| User | Purpose |
|---|---|
| `FULL_USER` | Phase 1 scenario generation + positive TCs — must have ALL capabilities active for `TARGET_MODULE` |
| `RESTRICTED_USER` | Negative permission TCs — must have NO capabilities for `TARGET_MODULE` (or use DB deactivation) |

> Before Phase 1: confirm all five `capability{Module}*` rows show `status = 'active'` in `oncilla.userPermission` for `FULL_USER`. See `DB_VALIDATION.md → Query E`.

### 1.5 Known Modules

APN · MNO · Supernet · ProviderRate · ProviderTariff · IPPool · Orders · DataCenters · Portfolio · Transactions · Network Management · Feature Management · any newly discovered module.

### 1.6 Attribute-Eligible Modules

MNO · APN · ProviderRate · ProviderTariff · Supernet · IPPool · DataCenter · Portfolio

---

## 2. Common CRUD Validation

### 2.1 Create

Validate:

- Create entry point is visible per RBAC (button / Actions dropdown option / toolbar icon).
- Create form opens correctly (modal / drawer / page).
- All mandatory fields are marked with `*`.
- Submit button **DISABLED** when any mandatory field is empty.
- Submit button **ENABLED** only when all mandatory fields contain valid values.
- Field-level validations fire correctly: max length, regex, required (see §6).
- Duplicate / unique field validation shows correct inline error.
- Successful creation: success toast appears → new record appears in list.
- Failed creation: error toast appears with descriptive message.
- Cross-verify: UI creation → API `POST` response (201/200) → DB record inserted.

### 2.2 Edit / Update

Validate:

- Edit button (pencil icon) visible per RBAC rules (see §4).
- Edit form opens pre-populated with all existing record values.
- Mandatory fields remain marked with `*`.
- Read-only fields are not editable.
- Submit disabled until all mandatory fields are valid.
- Successful update: success toast → updated values visible in list and detail view.
- Failed update: error toast.
- Cross-verify: UI update → API `PUT/PATCH` response (200) → DB record updated.

### 2.3 Delete / Status → Deleted

Validate:

- Delete action accessible per RBAC rules.
- Confirmation dialog appears (see §5.3).
- Cancel: record unchanged.
- Confirm Delete: record soft-deleted; status changes to `deleted` in grid and DB.
- Precondition blocking: if active dependencies exist, transition is blocked with error (feature-specific preconditions in each feature context file).
- Cross-verify: UI → API response → DB `status = 'deleted'`.

### 2.4 View Details

Validate:

- PK hyperlink in grid is clickable → navigates to detail page (or opens detail modal).
- Detail page / modal shows all field values correctly.
- Linked / related entities shown with correct labels and values.
- All data matches API response and DB record.
- Read-only mode enforced per permission level.

---

## 3. Grid Validation

### 3.1 Pagination

Two patterns exist — confirm which applies per feature:

**Server-side pagination (e.g. APN):**
- Controls: First · Previous · Page N · Next · Last.
- First/Previous disabled on page 1; Next/Last enabled when more pages exist.
- `pageToken` and `pageSize` API params are correct per page.
- Default page size: feature-specific (confirm from feature context).
- Record count consistency: DB count matches page totals.
- No duplicate records across pages; no missing records.

**Single-load (no pagination, e.g. Transactions):**
- All records loaded in one API call (large `pageSize`).
- No next/previous page controls; vertically scrollable table.

Validate both: record count consistency · data continuity · API pagination params.

### 3.2 Filtering

Triggered by "Add filter" button. Panel slides in from the right (`data-slot="sheet-content"`).

Validate:

- Panel opens and closes correctly.
- All filter fields present and match feature specification.
- Primary and Secondary filter sections visible (collapsible accordion).
- Search within filter panel works ("Search filters..." input).
- **Footer buttons:** Reset · Apply · Close (×).
- **Filter types supported:** Single select · Multi-select (with Select all / Clear all) · Text input · Date picker · Date range.
- **Scenarios:** Single filter · Multiple filters · Combined filters · Dependent / cascading filters.
- Reset restores default view. Apply executes filter. Close (×) closes without applying.
- Filter count shown beside section titles.
- Filtered results cross-verified: UI vs API (`?filter=` params) vs DB.
- Filter persistence during pagination, sorting, and column preset.
- Status filter options match `GET /v2/meta/option?option=status` API values.

### 3.3 Search

Search bar in toolbar (feature-specific field — confirm from feature context).

Validate:

- Exact match · Partial match · Prefix/suffix match.
- Case sensitivity / insensitivity (observe actual behavior).
- Special characters, unicode, numeric, mixed input.
- Empty search, long text search.
- Debounce behavior.
- Search clearing restores full list.
- Cross-verified: UI vs API vs DB.

### 3.4 Column Visibility (Column Preset)

Opened via the Configure visible columns icon button (`aria-label="Configure visible columns"`). Renders as `[role="dialog"]` modal titled **"Search Results View"**.

**Mandatory step sequence (every preset-related TC):**

1. Navigate to the `{Module}` list page.
2. Click the column settings / preset button on the grid toolbar.
3. Verify the column selection panel opens — all available columns listed with checkboxes.
4. Select desired columns (check/uncheck).
5. Click **OK** / **Apply**.
6. Verify the grid refreshes and shows **only** the selected columns.
7. Verify unselected columns are **no longer visible** in the grid.

Validate also: Save named preset · Load saved preset · Delete preset · Select All / Deselect All · Default View.

> **Never write** "toggle visibility of columns" — user explicitly selects via checkboxes then confirms with OK/Apply.

### 3.5 Sorting

Validate for all sortable columns:

- Ascending sort · Descending sort.
- Numeric, alphabetic, date, status sorting.
- Sorted UI data cross-verified vs API vs DB.
- Sort persistence during pagination and filter.
- Multi-column sorting if applicable.

### 3.6 Empty State

Validate:

- Grid shows appropriate empty state message when no records exist.
- Filter applied with no matching records shows empty state.
- Empty state is distinct from a load error.

### 3.7 Grid Data Validation

| Check | Detail |
|---|---|
| Column headers | Match feature specification and DB definition table |
| Data types | String · Integer · Decimal · Boolean · Date (dd/mm/yyyy) · Currency (£x,xxx.xx) · Status badge |
| Null / empty values | Handled gracefully — no broken cells |
| Truncated values | Long text truncated with tooltip or ellipsis |
| Special characters / unicode | Rendered correctly |
| Record count | UI count matches `SELECT COUNT(*) FROM oncilla.{module} WHERE status != 'deleted'` |

---

## 4. RBAC Validation

### 4.1 Permission Naming Convention

```
Capability{Module}{Action}

Examples:
  CapabilityApnGet
  CapabilityApnCreate
  CapabilityApnUpdate
  CapabilityApnApprover
  CapabilityApnAdmin
```

The `{Module}` segment uses PascalCase matching the API (e.g. `Apn`, `DataCentre`, `IpPool`). Always discover exact casing from the API or DB — never guess.

> `Capability{Module}Create` carries `Capability{Module}Update` as its underlying permission. A user with Create can do everything Update can do.

### 4.2 Standard Permission Matrix

| Permission | UI elements visible / enabled | What is hidden/blocked when absent |
|---|---|---|
| `Capability{Module}Get` | Module in left nav · List page loads · All records · Filter · Search · Sort · Pagination · Column presets | Module NOT in nav · Direct URL → 401/403 |
| `Capability{Module}Create` | **Create {Module}** button/action visible | Create entry NOT visible |
| `Capability{Module}Update` | Edit icon (pencil) visible in Actions column for all rows | Edit icon NOT visible |
| `Capability{Module}Approver` | Status transition options for permitted states visible | Status change options hidden/disabled |
| `Capability{Module}Admin` | Admin-level transitions unlocked (including `active → *`) | Admin actions hidden · direct API → 401/403 |

### 4.3 Edit Icon Visibility by Record State

| Record State | Required Permission | Edit Icon |
|---|---|---|
| Setup | `Update` OR `Create` | Visible and enabled |
| Requested | `Update` OR `Create` | Visible and enabled |
| Deleted | `Update` OR `Create` | Visible and enabled |
| Active | `Admin` only | Visible and enabled |
| Active | No Admin | **Visible but DISABLED** (opacity: 0.5, pointer-events: none) |

### 4.4 Actions Column Button — Get-Only State

With `Get` only (no `Update`): the per-row `button[aria-label="Actions"]` is rendered with `disabled=true`, `opacity: 0.5`, `pointer-events: none`. No dropdown opens.

### 4.5 Session & Negative Permission Validations

Validate:

- Direct URL access without permission → 401 / 403 / redirect to access-denied.
- API endpoint called directly without permission → 401 / 403.
- Session timeout handling · token expiry · invalid token · multiple session handling · logout / session invalidation.

### 4.6 Per-Capability TC Generation Rules (minimum per capability)

- 1 positive TC — UI element IS visible and functional.
- 1 negative TC — UI element is NOT visible when permission is absent.
- 1 negative TC — direct API call returns 401/403 without permission.

### 4.7 Negative TC Execution Strategy

**Option A — Dedicated restricted user:** Use `RESTRICTED_USER` with no capabilities for `TARGET_MODULE`.

**Option B — Temporary DB deactivation:** Deactivate capability before TC; restore after. Use `status = 'deleted'` (not `'inactive'`). See `DB_VALIDATION.md → Permission Deactivation Queries`.

> Option A is safer for parallel/CI execution. Option B can cause race conditions if tests run concurrently.

---

## 5. Status Lifecycle Validation

### 5.1 Common Status Model

Every new record is created in **Setup** state.

| State | Description | Badge colour |
|---|---|---|
| `setup` | Default state on creation | Observe from live UI |
| `requested` | Record submitted / requested | Observe from live UI |
| `active` | Record live and active | Observe from live UI |
| `deleted` | Record soft-deleted | Observe from live UI |

> Some features have additional states (e.g. Transactions has `exported`, `suspended`). If live UI shows deviations, document as **STATUS TRANSITION OVERRIDE** in the feature context file.

### 5.2 Full Common Transition Map

| From | To | Required Permission | How triggered |
|---|---|---|---|
| Setup | Requested | Update OR Create | Actions menu |
| Setup | Deleted | Update OR Create | Actions menu |
| Setup | Active | Approver OR Admin | Actions menu |
| Requested | Setup | Update OR Create | Actions menu |
| Requested | Deleted | Update OR Create | Actions menu |
| Requested | Active | Approver OR Admin | Actions menu |
| Deleted | Setup | Update OR Create | Actions menu |
| Deleted | Requested | Update OR Create | Actions menu |
| Deleted | Active | Approver OR Admin | Actions menu |
| Active | Setup | Admin only | Actions menu / Change Status |
| Active | Requested | Admin only | Actions menu / Change Status |
| Active | Deleted | Admin only | Actions menu / Change Status |

### 5.3 Status Change Confirmation Dialog

Every status transition — from **list Actions dropdown** or **detail page Change Status dropdown** — opens a modal confirmation dialog before the change is applied. No "immediate" transition path exists.

| Element | Value |
|---|---|
| Title | `Confirm Status Change` |
| Body | `Are you sure you want to change the status from "{fromStatus}" to "{toStatus}"?` |
| Left button | Cancel (outlined) |
| Right button | {confirmLabel} (dark/primary) |
| Top-right icon | ✕ Close |

**Confirm button label by target state:**

| Target state | Confirm button label |
|---|---|
| `requested` | **Request** |
| `deleted` | **Delete** |
| `active` | **Approve** |
| `setup` | **Set Up** |

**Full transition body text + confirm button reference:**

| From | To | Body text (exact) | Confirm Button |
|---|---|---|---|
| Setup | Requested | Are you sure you want to change the status from "Setup" to "Requested"? | Request |
| Setup | Deleted | Are you sure you want to change the status from "Setup" to "Deleted"? | Delete |
| Setup | Active | Are you sure you want to change the status from "Setup" to "Active"? | Approve |
| Requested | Setup | Are you sure you want to change the status from "Requested" to "Setup"? | Set Up |
| Requested | Deleted | Are you sure you want to change the status from "Requested" to "Deleted"? | Delete |
| Requested | Active | Are you sure you want to change the status from "Requested" to "Active"? | Approve |
| Deleted | Setup | Are you sure you want to change the status from "Deleted" to "Setup"? | Set Up |
| Deleted | Requested | Are you sure you want to change the status from "Deleted" to "Requested"? | Request |
| Deleted | Active | Are you sure you want to change the status from "Deleted" to "Active"? | Approve |
| Active | Setup | Are you sure you want to change the status from "Active" to "Setup"? | Set Up |
| Active | Requested | Are you sure you want to change the status from "Active" to "Requested"? | Request |
| Active | Deleted | Are you sure you want to change the status from "Active" to "Deleted"? | Delete |

**Dialog dismiss rules:**

| Action | Result |
|---|---|
| Backdrop click | Dialog stays open — does NOT dismiss |
| Cancel | Dialog closes, no transition applied |
| ✕ Close | Dialog closes, no transition applied |
| Confirm button | Transition applied · dialog closes · success toast appears |

### 5.4 Status Transition Toast Messages

**Format:** `Status changed to "{targetStatus}"`

Examples: `Status changed to "setup"` · `Status changed to "requested"` · `Status changed to "active"` · `Status changed to "deleted"`

Toast auto-dismisses after a few seconds. No persistent banner.

### 5.5 Actions Menu Options Per State + Permission

**User has `Update` or `Create` only (no Approver, no Admin):**

| Record State | Options in Actions menu |
|---|---|
| Setup | Requested · Deleted |
| Requested | Setup · Deleted |
| Deleted | Setup · Requested |
| Active | *(button disabled)* |

**User has `Approver` or `Admin` (additive to Update/Create):**

| Record State | Options in Actions menu |
|---|---|
| Setup | Requested · Deleted · **Active** |
| Requested | Setup · Deleted · **Active** |
| Deleted | Setup · Requested · **Active** |
| Active | *(button disabled unless Admin)* |

**User has `Admin` (additive to all above):**

| Record State | Options in Actions menu |
|---|---|
| Active | **Setup · Requested · Deleted** *(Edit icon enabled)* |

### 5.6 List Page vs Detail Page Label Differences

| Action | List page Actions dropdown | Detail page Change Status dropdown |
|---|---|---|
| → Deleted | Delete | Set to Deleted |
| → Requested | Request | Set to Requested |
| → Setup | Set Up | Set to Setup |
| → Active | Approve | Set to Active |

### 5.7 Destructive Styling

Transitions labelled as delete/destructive are styled in **red** on both surfaces ("Delete" on list, "Set to Deleted" on detail). All other transition options use default black text.

### 5.8 Transition Precondition Validations

Some transitions are blocked by data state, not by permission. System validates preconditions and returns an error (toast/banner) if not met.

**Common precondition that applies to ALL modules:**

| Transition | Precondition | Blocked if |
|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL in DB | Any mandatory field is NULL |

Feature-specific preconditions are documented in each feature context file. See §13 for the required table format.

**TC generation rules for preconditions:**
1. **Negative TC:** attempt transition with blocking condition → blocked · correct error message · status unchanged in grid and DB.
2. **Positive TC:** resolve blocking condition → transition succeeds · success toast · status updated in grid and DB.
3. Label in section **S6 — STATUS TRANSITIONS** with `module-StatusTransition`.
4. Each precondition: at least one negative TC + one positive TC.

### 5.9 Status Transition TC Structure (S6 in CSV)

**Positive TCs (one per allowed transition):**
- Title: `Given user has {Permission} Then user can change status from {FromState} to {ToState} for {Module}`
- Steps: navigate → find record in {FromState} → open Actions → select {ToState} → confirm → verify toast → verify UI state badge → verify API → verify DB

**Negative TCs (one per blocked transition — permission):**
- Title: `Given user does not have {Permission} Then user cannot change status from {FromState} to {ToState} for {Module}`
- Steps: navigate → find record in {FromState} → verify option NOT in Actions OR Edit icon disabled → verify API returns 401/403

**Edit icon state TCs:**
- `Given user has Update permission Then Edit icon is visible for Setup/Requested/Deleted records`
- `Given user does not have Admin permission Then Edit icon is disabled for Active records`
- `Given user has Admin permission Then Edit icon is enabled for Active records`

---

## 6. Form Validation

### 6.1 Form Entry Points

| Action | Form type | Pre-filled |
|---|---|---|
| Click **Create {Module}** button / Actions option | Create form | Empty |
| Click **Edit icon** (pencil) in Actions column | Edit form | All existing values pre-populated |

> Creation entry points are not always a "Create" button. Inspect toolbar actions, dropdown actions, page-level buttons, and role-based controls. Never assume creation is only via a button labelled "Create".

### 6.2 Form Controls — Always Present

| Control | Location | Enabled State |
|---|---|---|
| **Submit** button | Bottom of form | Disabled when any mandatory field empty · Enabled when all mandatory fields valid |
| **Cancel** button | Bottom of form | Always enabled |
| **Clear (X) icon** | Top-right corner | Always enabled |

### 6.3 Mandatory Fields

- Marked with `*`.
- Submit disabled when any mandatory field is empty.
- Submit enabled only when all mandatory fields have valid values.
- Source: `GET /v2/{module}/definition` API + `oncilla.{module}Definition WHERE flag LIKE '%mandatory%'`.

### 6.4 Field Length Validation

| Field | Max Length | Regex |
|---|---|---|
| `title` | 32 | `^\S{1,32}$` (no spaces) |
| `name` | 128 | `^[^\n]{1,128}$` (no newlines) |
| `description` | 255 | `^.{0,255}$` |

Feature-specific fields: see feature context file.

Boundary tests: at `maxLength` chars → passes; at `maxLength + 1` chars → fails with inline error.

Max length sourced from `oncilla.validation.length`.

### 6.5 Invalid Input / Regex Validation

- Regex violation shows inline error.
- Error text sourced from `oncilla.validation.description`.
- Examples:
  - `title` violation: `Please enter a title with 1-32 characters. Spaces are not allowed.`
  - `name` violation: `Please enter 1-128 characters. Newlines are not allowed.`
- Regex sourced from `oncilla.validation.regex` — use to generate failing inputs in negative TCs.

### 6.6 Duplicate / Unique Value Validation

- Uniqueness scope is field-specific (global or scoped to parent entity).
- Common defaults: `title` is globally unique; `name` may be unique within a parent entity's scope.
- Feature-specific uniqueness rules documented in feature context file.
- Duplicate entry → inline error; also validate: duplicate API response (4xx) · DB unique constraint.

### 6.7 Dropdown Constraints (Standard Rule)

- All dropdowns showing related entities must show **only `status = active`** records.
- Cross-verify: UI options match `SELECT {labelField} FROM oncilla.{sourceTable} WHERE status='active'`.
- Inactive/deleted records must NOT appear as selectable options.
- Feature-specific dropdown APIs documented in feature context file.

### 6.8 Submit / Save

- Fires API mutation (`POST` for create, `PUT/PATCH` for update).
- On success: success toast → form closes → record appears/updates in list.
- On failure: error toast → form stays open.
- Cross-verify: UI → API response → DB state.

### 6.9 Cancel / Unsaved Changes Popup

**Scenario A — Form has unsaved changes (user has modified any field):**

1. User clicks **Cancel** or **✕ Close icon**.
2. Unsaved Changes popup appears:

| Element | Value |
|---|---|
| Title | `Unsaved Changes` |
| Body | `You have unsaved changes. Are you sure you want to leave?` |
| Left button | Stay (outlined) |
| Right button | Discard (red/destructive) |

3. **Stay** → popup closes; form remains open; all entered data preserved.
4. **Discard** → entire form closes; all entered data lost.

**Scenario B — Form has no unsaved changes:**

1. User clicks **Cancel** or **✕ Close icon**.
2. Form closes immediately — no popup shown.

**Popup validation checklist:**

- Title is exactly `Unsaved Changes`.
- Body is exactly `You have unsaved changes. Are you sure you want to leave?`.
- Both `Stay` and `Discard` visible and enabled.
- No other buttons or close icons in popup.
- Backdrop click does NOT close popup.
- After Discard: list page visible; no partial/orphan record created.
- After Stay: form fully functional; user can continue editing and submit.

**Create form TCs in S3 (unsaved changes):**

| # | Scenario | Expected |
|---|---|---|
| 1 | Open Create → click Cancel (no data entered) | Form closes, no popup |
| 2 | Enter data → click Cancel | Unsaved Changes popup appears |
| 3 | Popup → click Stay | Popup closes · form open · data preserved |
| 4 | Popup → click Discard | Form closes · data lost |
| 5 | Enter data → click X icon | Unsaved Changes popup appears |
| 6 | Popup (X) → click Stay | Popup closes · form open · data preserved |
| 7 | Popup (X) → click Discard | Form closes · data lost |
| 8 | Open Create → click X icon (no data) | Form closes, no popup |

**Edit form TCs in S4 (unsaved changes):**

| # | Scenario | Expected |
|---|---|---|
| 1 | Open Edit → verify all fields pre-populated | All fields show current values |
| 2 | Open Edit → click Cancel (no changes) | Form closes, no popup |
| 3 | Modify field → click Cancel | Unsaved Changes popup appears |
| 4 | Popup → click Stay | Popup closes · form open · modified data preserved |
| 5 | Popup → click Discard | Form closes · original values retained |
| 6 | Modify field → click X icon | Unsaved Changes popup appears |
| 7 | Popup (X) → click Stay | Popup closes · form open · data preserved |
| 8 | Popup (X) → click Discard | Form closes · original values retained |
| 9 | Open Edit → click X icon (no changes) | Form closes, no popup |

---

## 7. UI Validation

### 7.1 Buttons

Validate per page / per permission:

- Visibility (present / absent) matches permission level.
- Enabled vs disabled state (opacity 0.5 + `pointer-events: none` when disabled).
- Label text matches specification.
- Destructive actions styled in red.
- Primary/confirmation actions styled dark/navy.
- Each button triggers the correct API call and UI state change.

### 7.2 Icons

Validate:

- Correct icon per action (pencil = edit · trash = delete · eye = view · + = add/link).
- Icon visibility matches RBAC rules.
- Disabled state visible for `active` records without Admin permission.
- No icons present for permissions the user does not hold.

### 7.3 Tooltips

Validate:

- Field tooltips appear on hover with correct help text.
- Tooltip text matches `oncilla.{module}Definition.Description`.
- Column header tooltips appear on hover.
- Consistent placement and styling across all fields.

### 7.4 Toast Messages

Validate after every create / update / delete / status-change action:

| Scenario | What to validate |
|---|---|
| Successful operation | Success toast · correct message text · dynamic values correct · auto-closes · no duplicate toast |
| Failed operation (permission) | Error toast · 401/403 · no state change in DB |
| Failed operation (validation) | Error toast / inline error · no DB change |

Also validate:

- Toast alignment, styling (success = positive color, error = red).
- Position on screen (typically bottom-right).
- Auto-close behaviour and timeout duration.
- Multiple toast handling; no stacking or duplicate prevention.
- No stale toast messages after refresh or navigation.
- Toast vs API response · Toast vs DB state (cross-verify).

**Status change toast format:** `Status changed to "{targetStatus}"`

### 7.5 Confirmation Dialogs

Standard anatomy and dismiss rules documented in §5.3.

Additional validation:

- Backdrop click does NOT close dialog.
- Cancel / ✕ always closes without applying change.
- Confirm applies change.
- All dialog content dynamically filled with correct entity names / status names.

### 7.6 Navigation & Breadcrumbs

Validate:

- Page title (H1) matches specification.
- Browser tab title.
- Breadcrumb trail correct at list page and at detail page.
- Breadcrumb links navigable (click → correct page loads).
- Left navigation module link shows / hides per `Get` permission.
- FK column cells navigate to related entity detail page.
- PK column cells navigate to / open the record detail.
- Browser back/forward navigation works correctly.
- Refresh preserves page state (filters, sort, pagination).

### 7.7 Modal / Drawer / Dialog Layout

Validate:

- Opens correctly on trigger action.
- Title text matches specification.
- All fields/sections present per specification.
- Scroll behaviour for long content.
- Closes correctly on Cancel / ✕ / confirm actions.
- Does not leave orphan state on close.

### 7.8 Accessibility & Consistency

Validate:

- Alignment and spacing consistent across pages.
- Responsive behavior (no broken layout on standard window sizes).
- Dynamic rendering (elements appear/disappear based on permission and state).
- Hidden fields based on permissions (absent, not just hidden via CSS).
- `aria-label` attributes present on interactive controls (e.g. `aria-label="Actions"`, `aria-label="Configure visible columns"`).

---

## 8. DB Validation Reference

> Full query reference: `prompts/DB_VALIDATION.md`. Key patterns below.

### 8.1 DB Connection

```js
const { createDbConnection } = require('./utils/dbUtils');
const db = await createDbConnection();
// run queries
await db.end(); // always close
```

`.env`: `QA_DB_HOST`, `QA_DB_USER`, `QA_DB_PASSWORD`, `QA_DB_NAME=oncilla`

### 8.2 Key Query Patterns

| Operation | Query pattern |
|---|---|
| Resolve test user | `SELECT userId, status, systemSuspend, adminSuspend, customerSuspend FROM oncilla.user WHERE username = '{USERNAME}'` |
| Active permissions for module | `SELECT title, status FROM oncilla.userPermission WHERE userId='{userId}' AND title LIKE '%capability{Module}%' AND status='active'` |
| Full field definitions | `SELECT d.attribute, d.title, d.flag, v.regex, v.length, v.description FROM oncilla.{module}Definition d LEFT JOIN oncilla.validation v ON d.validationId=v.validationId WHERE d.status='active' ORDER BY d.displaySequence` |
| Record exists after create | `SELECT * FROM oncilla.{module} WHERE {pk}='{newId}'` |
| Field values after update | `SELECT {fields} FROM oncilla.{module} WHERE {pk}='{id}'` |
| Status after transition | `SELECT status FROM oncilla.{module} WHERE {pk}='{id}'` |
| Record count vs UI | `SELECT COUNT(*) FROM oncilla.{module} WHERE status != 'deleted'` |
| Dropdown source (active only) | `SELECT {labelField} FROM oncilla.{sourceTable} WHERE status='active'` |

### 8.3 Precondition Check — Generic Pattern

```sql
SELECT COUNT(*) AS activeDependencies
FROM oncilla.resourceRelationship
WHERE sourceResourceName      = '{module}'
  AND sourceResourceId        = '{id}'
  AND destinationResourceName IN ('{dep1}', '{dep2}')
  AND status                  = 'active';
-- Must return 0 for →Deleted transition to succeed
```

> Feature-specific precondition SQL is documented in `DB_VALIDATION.md → Query F`.

### 8.4 Permission Deactivation (Negative TCs)

```sql
-- Deactivate before negative TC (use 'deleted', not 'inactive')
UPDATE oncilla.userPermission SET status = 'deleted'
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title  = 'capability{Module}{Action}';

-- Restore after negative TC
UPDATE oncilla.userPermission SET status = 'active'
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title  = 'capability{Module}{Action}';
```

### 8.5 `oncilla.{module}Definition` Flag Parsing

| Flag value | Meaning |
|---|---|
| `'mandatory'` | Required field — show `*`, submit blocked if empty |
| `'unique'` | Must be unique across records |
| `'unique,mandatory'` | Both required and unique |
| empty / NULL | Optional, no uniqueness constraint |

---

## 9. Test Case Format & Output Rules

### 9.1 CSV Column Structure (12 columns, in order)

```
IssueId | Project | Issue_Type | Summary | Description | Test Steps | Test Data | Expected Result | Test Repository | Test Status | labels | Test Type
```

**Column rules:**

| Column | Value / Rule |
|---|---|
| `IssueId` | Sequential integer across ALL sections — never resets, never gaps |
| `Project` | `PV3` |
| `Issue_Type` | `Test` |
| `Summary` | BDD sentence ≤255 chars — same as `Description` |
| `Description` | Same as `Summary` |
| `Test Data` | Login row only: `credentials: ${statususer}/${Password#1}` — all other rows BLANK |
| `Test Repository` | `PV3-{Module}` (e.g. `PV3-DataCenter`) |
| `Test Status` | `TODO` |
| `labels` | `"feature-{MODULE},module-{Section},sanity-{yes|no},regression-yes"` |
| `Test Type` | `Manual` |

`Test Repository`, `Test Status`, `labels`, `Test Type` → **first row of each TC only**; all subsequent step rows leave these BLANK.

### 9.2 BDD Summary Pattern

```
Positive: Given Integra exists when user login having {Capability} Permission Then the user can {action}
Negative: Given Integra exists when user login without having {Capability} Permission Then the user can not {action}
```

Capability mapping:

| Section | Capability |
|---|---|
| View / Filter | `Capability{Module}Get` |
| Create | `Capability{Module}Create` |
| Update / Attribute | `Capability{Module}Update` |
| Status Transition | Permission that owns the transition (see §5.2) |

### 9.3 Label Format

```
"feature-{MODULE},module-{Section},sanity-{yes|no},regression-yes"
```

- `regression-yes` — always lowercase, always `yes`.
- `sanity-yes` — smoke/critical TCs only; `sanity-no` for all others.
- Section values: `View` · `Filter` · `Create` · `Update` · `Attribute` · `StatusTransition`.
- No spaces inside label string.

### 9.4 Standard 4 Opening Steps (every TC)

1. `login to URL: https://portal.qan.aws.eseye.io/` → login page displayed successfully
2. `Enter credentials and click on login` | Data: `credentials: ${statususer}/${Password#1}` → User logged in successfully
3. `Click on {Module Management menu}` → {Module} menu displayed
4. `Click on {Module}` → {Module} list page displayed

### 9.5 Six Sections (IssueId continuous across all)

| Section | Permission | Coverage scope |
|---|---|---|
| **S1 — VIEW** | `Capability{Module}Get` | List load · PK/FK links · sort · pagination · column preset · action column state · status colors · tooltips |
| **S2 — FILTER** | `Capability{Module}Get` | Filter panel · all field types · single/multi/combined · reset · count · cross-verify options vs DB |
| **S3 — CREATE** | `Capability{Module}Create` | Create entry point · form · mandatory fields · validation · submit/cancel · unsaved changes · success/error · DB cross-verify |
| **S4 — UPDATE** | `Capability{Module}Update` | Edit entry · pre-populated form · validation · submit/cancel · unsaved changes · success/error · DB cross-verify |
| **S5 — ATTRIBUTE** | `Capability{Module}Update` | Only if `ATTRIBUTE SECTION = yes`; create/edit/delete default + custom attributes; regex + DB cross-verify |
| **S6 — STATUS TRANSITIONS** | Multiple (see §5.2) | Full transition map · confirmation dialog · toast · edit icon state · permission negative TCs · precondition TCs |

> **S1 scope boundary:** Do NOT include Create button, Edit icon visibility, or status transition controls in S1 TCs — those belong in S3, S4, and S6 respectively.

### 9.6 Out of Scope — Never Generate

SQL injection · XSS · CSRF · Security/penetration · API load/stress/performance · Network failure · Browser compatibility.

### 9.7 Consolidation Rules (CSV — UI steps only)

- **No API or DB steps in the CSV.** CSV is for UI/functional steps only.
- Create/Update success: fill form → submit → verify success toast → verify record in list.
- Filter/Search: apply → verify list shows expected results.
- Dropdown options: open dropdown → verify expected options present in UI.
- Status transition: open Actions → select state → confirm → verify toast → verify badge updated.
- UI-structural checks (button visibility, labels, colors, asterisks, tooltips) = UI-only steps.

### 9.8 Two Output Files Per Module (Phase 1)

| File | Path | Purpose |
|---|---|---|
| Test Coverage Plan (`.md`) | `Test Case Folder/test-plans/{Module}_TESTCOVERAGE.md` | Human-readable plan + Module Discovery Report |
| Formal Test Cases (`.csv`) | `Test Case Folder/test-cases/{Module}_TESTCOVERAGE.csv` | Jira/Xray import-ready; Phase 2 source of truth |

---

## 10. Playwright Automation Framework

### 10.1 Framework Architecture

```
project-root/
  playwright.config.ts
  package.json
  tests/
    <module>/
      <scenario-name>.spec.ts       ← one file per scenario
      test-plan.md
  pages/
    common/
      LoginPage.ts
      NavigationPage.ts
      BasePage.ts
    <module>/
      <Module>ListPage.ts
      <Module>CreatePage.ts
      <Module>DetailsPage.ts
      <Module>FilterPanel.ts
  testdata/
    <module>/
      <module>.json
      <module>-negative.json
  utils/
    api/
    db/
    data/
    assertions/
    logging/
  fixtures/
    testFixtures.ts
  constants/
  enums/
  reports/
```

### 10.2 Playwright Best Practices

- Prefer `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, stable test-ids.
- Avoid brittle XPath unless no reliable alternative.
- Use Playwright auto-waiting — **never** `waitForTimeout()` or `waitForNetworkIdle`.
- Keep tests independent and order-agnostic.
- Use unique test data for create scenarios: `` `Auto_Test_${Date.now()}` ``.
- One business objective per test.
- Use fixtures for shared setup.
- Design tests to be CI-friendly and parallel-safe.
- Capture trace, screenshot, video per config — not inline in tests.

### 10.3 Session & Logout Rules

- Every test must end in a clean state.
- Explicit logout in tests that validate the logout flow.
- Next test must NOT depend on previous test remaining logged in.

### 10.4 POM Rules

- Each page object represents one page, modal, drawer, or reusable UI component.
- Store locators and reusable actions in page objects.
- Use `BasePage` only for genuinely shared behaviour.
- Test files focused on scenario flow, not UI plumbing.

### 10.5 API & DB Assertions in Generated Tests

> The CSV has UI steps only. The Generator enriches every generated test with API and DB assertions.

| TC type | Assertion to add in generated code |
|---|---|
| Create success | Assert `POST /…/{module}` returns 201/200 · assert DB record exists |
| Update success | Assert `PUT/PATCH /…/{module}/{id}` returns 200 · assert DB values match |
| Status transition | Assert API status endpoint returns 200 · assert DB `status` updated |
| View/List | Assert `GET /…/{module}` returns 200 · assert DB count matches UI |
| Filter/Search | Assert `GET /…/{module}?filter=…` returns 200 with filtered data |
| Negative (no permission) | Assert API endpoint returns 401/403 directly |

### 10.6 Three-Phase Pipeline Summary

| Phase | Agent file | Role |
|---|---|---|
| Phase 1 — Planner | `.github/agents/playwright-test-planner.agent.md` | Explore live app; produce `.md` and `.csv` outputs |
| Phase 2 — Generator | `.github/agents/playwright-test-generator.agent.md` | Execute each CSV step live in browser; write `.spec.ts` files |
| Phase 3 — Healer | `.github/agents/playwright-test-healer.agent.md` | Debug and fix failing tests; preserve all assertions |

> Full phase instructions including mandatory tool invocation order: see `prompts/QA_PIPELINE.md`.

---

## 11. Common Test Data Guidelines

### 11.1 Unique Value Generation

Always generate unique identifiers for create scenarios:

```
Auto_Test_<timestamp>         e.g.  Auto_Test_1752062400
MCP_AI_<random>               e.g.  MCP_AI_x7k2p
QA_<feature>_<datetime>       e.g.  QA_APN_20260715_093000
```

### 11.2 Test Data Files

- Store in `testdata/<module>/<module>.json` (positive) and `<module>-negative.json` (negative).
- No bulky test data embedded directly in spec files.
- Support env-aware overrides via `process.env`.

### 11.3 Seed Data Requirements

Before running tests, confirm the following exist in the environment:

- At least one record in each status state (`setup`, `requested`, `active`, `deleted`) for the target module.
- Active records in all referenced FK tables (MNO, IPPool, DataCentre, etc.) for dropdown tests.
- `statususer` with all module capabilities `active` in `oncilla.userPermission`.

### 11.4 Negative Test Data

- Records with null mandatory fields (for `→Active` precondition TCs).
- Records with active dependencies (for `→Deleted` precondition TCs).
- Restricted user or temporarily deactivated permissions for permission negative TCs.

---

## 12. Common Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Permission | `Capability{Module}{Action}` PascalCase | `CapabilityApnGet` |
| DB table | `oncilla.{camelCase}` | `oncilla.apn`, `oncilla.dataCentre` |
| Status values in API/DB | lowercase | `setup` · `requested` · `active` · `deleted` |
| Status values in dialog body | quoted lowercase | `"setup"` · `"active"` |
| Test file | kebab-case `.spec.ts` | `apn-create-view.spec.ts` |
| Test suite | `S{N} — {Action} {Module}` | `S3 — Create APN` |
| Label section values | PascalCase | `View` · `Filter` · `Create` · `Update` · `Attribute` · `StatusTransition` |
| Dynamic test data | `` `Auto_Test_${Date.now()}` `` | — |
| Test repository | `{PROJECT}-{Module}` | `PV3-DataCenter` |

---

## 13. Feature-Specific Context Template

> Each feature has its own context file in `prompts/`. That file uses this template and references sections above instead of duplicating common rules.

```markdown
# {Feature} Feature — UI Context

> Living document. Additive per permission level.
> References QA_MASTER_CONTEXT.md for all common rules — only deviations and unique logic are here.
> Portal: https://portal.qan.aws.eseye.io | Test account: statususer

---

## Feature Overview

| Item | Value |
|---|---|
| Sidebar path | {menu path} |
| List URL | /{url} |
| Detail URL | /{url}/{id} |
| Breadcrumb (list) | Home > {path} |
| Breadcrumb (detail) | Home > {path} > {id} |
| Page H1 | {title} |

---

## Permission Levels

> Common RBAC model: QA_MASTER_CONTEXT.md §4. Document below only what differs from that model.

### `Capability{Module}Get` — Feature-specific UI
[Toolbar controls · Grid columns (sortable? · cell behaviour?) · Pagination type (server-side or single-load) · Status values]

### `Capability{Module}Update` — Feature-specific UI
[Detail page additions · Change Status dropdown options per status · Edit modal fields]

### `Capability{Module}Create` — Feature-specific UI
[Create form layout · Form field details · MNO/dropdown sources]

### `Capability{Module}Approver` — Feature-specific UI
[Approval option label · Positions in Actions dropdown per status]

### `Capability{Module}Admin` — Feature-specific UI
[What Admin unlocks that no other permission does]

---

## API Endpoints

| Method | Endpoint | Triggered by | Notes |
|---|---|---|---|

---

## Field Definitions

| Field | Type | Regex | Max length | Flags |
|---|---|---|---|---|

---

## Status Transition Override (only if this feature deviates from QA_MASTER_CONTEXT.md §5.1)

## STATUS TRANSITION OVERRIDE — {MODULE}
STATES        : <observed states>
TRANSITIONS   : <observed transition map>
REASON        : <what differs from the common model>

---

## Status Transition Preconditions

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields NOT NULL | Any mandatory field is NULL | Error toast — mandatory fields incomplete |
| `Any → Deleted` | {feature-specific dependency} | Active dependency exists | Error toast — {dependency} dependency exists |

---

## Create / Edit Form — Feature-Specific Rules

[Document ONLY rules not covered by QA_MASTER_CONTEXT.md §6.
Common rules already covered: mandatory fields, title uniqueness, unsaved changes popup, submit state, cancel/discard.]

**Field uniqueness rules:**

| Field | Uniqueness scope |
|---|---|
| `title` | Globally unique |
| `{fieldName}` | Unique within {parentEntityId} |

**Dropdown constraints:**

| Dropdown field | API endpoint | Filter applied |
|---|---|---|
| {field} | GET {url} | `status=active` only |

**DB cross-verification rule:** Options in all dropdowns must match only `active` records in DB. Tests must query DB directly to confirm no inactive/deleted records appear as selectable options.

---

## Feature-Specific Behavioural Rules

[List ONLY rules that are not covered by QA_MASTER_CONTEXT.md §§1–12.]

1. {Rule}
2. {Rule}

---

## Attribute Section (if applicable — see QA_MASTER_CONTEXT.md §1.6 for eligible modules)

| Attribute | Type | Max length |
|---|---|---|

Custom attribute keys (free-text): yes / no

---

## Known Status Transition Preconditions — {Module}

[Authoritative list: QA_PIPELINE.md → Transition Precondition Validations.
SQL for verification: DB_VALIDATION.md → Query F.]
```

---

## 14. Known Module-Specific Override Reference

> This section lists which features have documented deviations or additional context files. Reference those files alongside this master context.

| Module | Additional Context File | Key Deviations |
|---|---|---|
| APN | `prompts/APN_Context.md` | Status values: `setup · requested · active · deleted`; name/apnRef unique within `mnoId`; Configuration must be mapped before linking IP Pools |
| Transactions | `prompts/Transaction_Context.md` | STATUS OVERRIDE: has `Exported` (Single Purchase) and `Suspended` (Subscriptions) states; no server-side pagination; three sub-tabs (Single Purchase · Subscriptions · Minimum Commitment); Billing Transaction date lock rules (V1–V11) |
| DataCentre | (see `QA_PIPELINE.md §Module-Specific Rules`) | `subdomain`, `title`, `countryCode` globally unique |
| Supernet | (see `QA_PIPELINE.md §Module-Specific Rules`) | IP range overlap validation; `extensionId` must reference active Supernet; no circular extension |
| MNO | (see `QA_PIPELINE.md §Module-Specific Rules`) | Active `mncId` and `portfolioId` in dropdowns |
| ProviderTariff | (see `QA_PIPELINE.md §Module-Specific Rules`) | Configuration mapped to APN + RatType + ProviderRate; `providerTariffCode` unique |
| Portfolio | (see `QA_PIPELINE.md §Module-Specific Rules`) | Finance field editability gated by `capabilityPortfolioUpdateFinance`; complex address default rules |
| SIM Assignment | (see `QA_PIPELINE.md §Module-Specific Rules`) | Sequential ICCID validation; active child portfolios in dropdown |

---

*End of QA Master Context — Eseye QAN Portal*
