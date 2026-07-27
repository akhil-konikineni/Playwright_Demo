# PERMISSION & BUSINESS LOGIC MODEL

> This section applies to **every feature** in the pipeline. The permission names are dynamic — replace `{Module}` with the actual module name (e.g. `Datacentre`, `Mno`, `Apn`). The Planner agent must discover which permissions the current test user holds before generating any scenario, then apply the rules below to decide what to validate.

---

## Permission Naming Convention

All capability names follow this exact pattern:

```
capability{Module}{Action}

Examples for DataCentre:
  capabilityDatacentreGet
  capabilityDatacentreCreate
  capabilityDatacentreUpdate
  capabilityDatacentreApprover
  capabilityDatacentreAdmin
```

The `{Module}` segment matches the feature name in PascalCase as used by the API (e.g. `Datacentre`, not `DataCenter` or `DataCentres`). Always discover the exact casing from the API response or DB — never guess.

---

## Step 1 — Discover User Permissions Before Anything Else

The Planner agent must determine permissions from **DB first**, then cross-verify with the API. Never rely on the API alone — DB is ground truth.

Use `browser_network_requests` after login to capture the permissions/roles API response. Store the full list of capabilities the logged-in user holds:

```
- Capture: /api/auth/me  OR  /api/users/current  OR equivalent
- Extract: capabilities[], roles[], portfolios[]
- Store as: USER_PERMISSIONS
```

All subsequent scenario generation must be filtered through `USER_PERMISSIONS`. Never generate a positive test case for a capability the user does not hold. Never skip a negative test case for a capability the user is missing.

> For DB-level permission verification queries during script execution, see [`db_validation.md`](db_validation.md).

---

## Permission Matrix

| Permission | What the user CAN see / do | What is HIDDEN / BLOCKED when missing |
|---|---|---|
| `capability{Module}Get` | Module visible in nav · List page loads · All records visible · Filter panel · Search bar · Sort columns · Pagination · Records-per-page · Reset filters · Clear all filters · Column presets | Module NOT visible in left navigation · Direct URL access → 401/403 · All module content hidden |
| `capability{Module}Create` | **Create {Module}** button visible on list page · Create form opens · Mandatory fields marked `*` · Submit disabled until mandatory fields filled · Submit enabled once all mandatory filled · Success toast after creation · Error toast on failure | Create button NOT visible on list page |
| `capability{Module}Update` | Edit icon (pencil) visible in Actions column for every row · Edit form opens with pre-populated values · Success toast after update · Error toast on failure | Edit icon NOT visible in any row of the Actions column |
| `capability{Module}Approver` | Status transition options visible for permitted states (see Business Logic below) · Status change triggers toast | Status change options NOT visible / disabled |
| `capability{Module}Admin` | Admin-level status transitions and admin actions visible (see Business Logic below) | Admin actions NOT visible / disabled |

---

## Per-Permission Validation Rules

### GET — `capability{Module}Get`

> **Scope boundary:** Get permission controls navigation, list rendering, search, filter, sort, and pagination ONLY. The Create button, Edit icon, and status transition controls are governed by their own permissions (Create, Update, Approver, Admin) and must NEVER appear in Get permission TCs — even when FULL_USER has all permissions active.

**Positive (user HAS the permission):**
- Module link is visible and clickable in the left navigation.
- Navigating to the module loads the list page with all records.
- Filter panel opens and all filter fields are present.
- Search bar is visible with correct placeholder text.
- All sortable columns respond to ascending/descending click.
- Pagination controls (next, previous, first, last, page size) work correctly.
- Reset filters restores default view.
- Clear all filters removes all active filters.
- Column preset works correctly — exact flow:
  1. Click the column settings / preset button on the grid toolbar.
  2. A column selection panel opens showing all available columns with checkboxes.
  3. Select the desired columns by checking their checkboxes (and uncheck the ones to hide).
  4. Click **OK**.
  5. Verify the grid refreshes and displays only the selected columns.
  6. Verify the unselected columns are no longer visible in the grid.

**Negative (user DOES NOT have the permission):**
- Module link is NOT visible in the left navigation.
- Navigating directly to the module URL returns 401 or 403 or redirects to access-denied.

---

### CREATE — `capability{Module}Create`

**Positive (user HAS the permission):**
- **Create {Module}** button is visible on the list page toolbar.
- Clicking the button opens the Create form (modal / drawer / page).
- All mandatory fields are marked with an asterisk `*`.
- Submit button is **DISABLED** when any mandatory field is empty.
- Submit button becomes **ENABLED** only after all mandatory fields are filled with valid values.
- Field-level validations fire correctly (max length, regex, required).
- Duplicate name / unique field validation shows correct error.
- Successful creation:
  - Success toast message appears with correct text.
  - New record appears in the list.
- Failed creation:
  - Error toast appears with descriptive message.

**Negative (user DOES NOT have the permission):**
- Create **{Module}** button is NOT visible on the list page.

---

### UPDATE — `capability{Module}Update`

**Positive (user HAS the permission):**
- Edit icon (pencil) is visible in the Actions column for **every row**.
- Clicking the Edit icon opens the Edit form pre-populated with the record's current values.
- Mandatory fields remain marked with `*`.
- Read-only fields are not editable.
- Submit / Update button behaves the same as Create (disabled until mandatory fields valid).
- Successful update:
  - Success toast message appears.
  - Updated values are reflected in the list and detail view.
- Failed update: error toast appears.

**Negative (user DOES NOT have the permission):**
- Edit icon is NOT visible in any row of the Actions column.

---

### APPROVER — `capability{Module}Approver`

**What this permission controls:**
The Approver permission allows a user to move a record's status through a defined set of approved transitions. The exact allowed transitions are feature-specific and must be discovered from the live application.

**Planner agent — discovery steps:**
1. Log in as a user WITH the Approver permission.
2. Navigate to a record in the relevant status state.
3. Look for a status-change control (dropdown, button, action menu) on the record's detail page or in the list row.
4. Capture all visible transition options and the states they lead to.
5. Use `browser_network_requests` to capture the API call made when a status change is triggered.
6. Cross-verify allowed transitions against DB (status field before and after).

**Positive (user HAS the permission):**
- Status change control is visible on the record (detail page / actions menu).
- Permitted transitions are available as selectable options.
- Selecting a transition triggers a confirmation dialog (if applicable).
- On confirm: status updates in UI, success toast appears, status badge reflects new state.
- Invalid transitions are not shown or are disabled.

**Negative (user DOES NOT have the permission):**
- Status change control is NOT visible.
- Status field is read-only / display-only.

---

### ADMIN — `capability{Module}Admin`

**What this permission controls:**
The Admin permission unlocks a broader or final set of status transitions and administrative actions not available to Approvers. The exact transitions and admin actions are feature-specific and must be discovered from the live application using the same discovery approach as Approver above.

**Positive (user HAS the permission):**
- Admin-only status options are visible in the status control.
- Admin-only actions (e.g. force-close, archive, reinstate) are visible in the actions menu.
- Each action triggers correct API, updates DB, shows toast.

**Negative (user DOES NOT have the permission):**
- Admin-only options are NOT visible.
- Admin-only API endpoints return 401 or 403 when called directly.

---

## Business Logic — Status Transitions

### Status Transition Entry Points (List Page vs. Details Page)

Every status transition can be initiated from **two independent UI entry points**, and both must be discovered and validated by the Planner:

1. **List Page → Actions column → Edit (pencil) icon → Actions dropdown.** Clicking the Edit icon on a record row does **not** open an edit form directly — it opens a dropdown menu. The options in that dropdown vary by the record's current status and the user's current permission (see **Section 1 — List Page Actions Dropdown** below).
2. **Details Page → Change Status button → Status dropdown.** Clicking the record's ID from the List Page opens its Details page. The Details page has a **Change Status** button; clicking it opens a dropdown menu offering the same kind of transition options (see **Section 2 — Details Page Change Status Dropdown** below).

Both entry points execute the **same backend business operation** — the same status-transition API call(s), against the same database fields, subject to the same permission and precondition rules. Because of this:

- For the **same record state + same user permission**, the set of options offered by the List Page Actions dropdown and the Details Page Change Status dropdown **must be identical**.
- If the Planner discovers a state/permission combination where the two entry points disagree (an option available in one but not the other), this is **not** a discrepancy to reconcile or average — it must be reported as a **functional inconsistency / defect** in the Module Discovery Report, and the Planner must still generate TCs that pin down the observed (even if inconsistent) behaviour of each entry point separately.
- The Planner must validate each entry point **independently** — observing one is not a substitute for observing the other, even though they are expected to match.

### Common Status Model (applies to most features unless the feature's live UI shows otherwise)

Every new record is created in **Setup** state by default. From there, status moves through four states: **Setup → Requested → Active → Deleted** (and back), controlled strictly by the user's permissions. The Planner must always verify this model against the live application — if a feature has additional or different states, the live observation overrides this model.

---

### States

| State | Description | Badge colour (observe from UI) |
|---|---|---|
| `Setup` | Default state when a record is first created | Observe live |
| `Requested` | Record has been submitted/requested | Observe live |
| `Active` | Record is live and active | Observe live |
| `Deleted` | Record has been soft-deleted | Observe live |

---

### Edit Icon Visibility Rules (Actions column in list grid)

The Edit icon in the Actions column is **not simply on or off** — its visibility depends on both the **current record state** AND the **user's permission**:

| Record State | Required Permission | Edit Icon |
|---|---|---|
| Setup | `capability{Module}Update` OR `capability{Module}Create` | Visible and enabled |
| Requested | `capability{Module}Update` OR `capability{Module}Create` | Visible and enabled |
| Deleted | `capability{Module}Update` OR `capability{Module}Create` | Visible and enabled |
| Active | `capability{Module}Admin` only | Visible and enabled |
| Active | No Admin permission | **Visible but DISABLED** (greyed out, not clickable) |

> `capability{Module}Create` carries `capability{Module}Update` as its underlying permission. A user with Create can do everything Update can do.

---

### Full Transition Map

| From State | To State | Required Permission | How triggered | Validation |
|---|---|---|---|---|
| Setup | Requested | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Setup | Deleted | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Setup | Active | `Approver` OR `Admin` | Actions menu — Active badge/option appears | UI → toast |
| Requested | Setup | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Requested | Deleted | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Requested | Active | `Approver` OR `Admin` | Actions menu — Active badge/option appears | UI → toast |
| Deleted | Setup | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Deleted | Requested | `Update` OR `Create` | Actions menu on the record | UI → toast |
| Deleted | Active | `Approver` OR `Admin` | Actions menu — Active badge/option appears | UI → toast |
| Active | Setup | `Admin` only | Edit form / Actions menu (Edit icon enabled for Admin) | UI → toast |
| Active | Requested | `Admin` only | Edit form / Actions menu (Edit icon enabled for Admin) | UI → toast |
| Active | Deleted | `Admin` only | Edit form / Actions menu (Edit icon enabled for Admin) | UI → toast |

---

### Section 1 — List Page Actions Dropdown

**Where it appears:** Actions column of the list grid, one per record row.
**How it opens:** Clicking the Edit (pencil) icon. This does not navigate anywhere — it opens a dropdown menu anchored to that row.
**What it controls:** Selecting an option from this dropdown triggers a status transition for that single record (subject to the confirmation dialog — see below).
**How permission affects it:** The dropdown's option set is gated by the user's permission tier, exactly as summarized in the Full Transition Map above.
**How record status affects it:** The dropdown's option set also depends on the record's current status — a record cannot offer a transition to its own current status, and the Edit icon itself is disabled entirely for `Active` records unless the user has `Admin` (per Edit Icon Visibility Rules above).
**How automation should validate it:** For every record state, open the Edit icon dropdown and capture exactly which options are visible — never hardcode the menu, since it must be discovered live per state + permission combination.

**User has `Update` or `Create` only (no Approver, no Admin):**

| Record State | Options visible in Actions |
|---|---|
| Setup | Requested · Deleted |
| Requested | Setup · Deleted |
| Deleted | Setup · Requested |
| Active | *(Edit icon disabled — no options available)* |

**User has `Approver` or `Admin` (in addition to Update/Create):**

| Record State | Options visible in Actions |
|---|---|
| Setup | Requested · Deleted · **Active** |
| Requested | Setup · Deleted · **Active** |
| Deleted | Setup · Requested · **Active** |
| Active | *(Edit icon disabled unless Admin)* |

**User has `Admin` only (or Admin + others):**

| Record State | Options visible in Actions |
|---|---|
| Setup | Requested · Deleted · Active |
| Requested | Setup · Deleted · Active |
| Deleted | Setup · Requested · Active |
| Active | **Setup · Requested · Deleted** *(Edit icon enabled)* |

**List Page validation checklist (per transition):**
- ✓ Option visible (for permissions/states where it should be offered)
- ✓ Option hidden (for permissions/states where it should NOT be offered)
- ✓ Toast message shown on confirm, exact text captured live
- ✓ Grid status/badge for the record updates to the new state
- ✓ API response for the status-transition call verified (status code + payload)
- ✓ DB row for the record reflects the new status

---

### Section 2 — Details Page Change Status Dropdown

**Where it appears:** Details page of a single record, reached by clicking that record's ID from the List Page.
**How it opens:** Clicking the **Change Status** button on the Details page. This opens a dropdown menu of transition options — a separate UI element from the List Page's Actions dropdown, but driving the same backend operation.
**What it controls:** Selecting an option transitions the currently-open record's status, calling the same status-transition API(s) as the List Page entry point.
**How permission affects it:** Gated by the same permission tiers as Section 1 — for a given record state, the user's permission must produce the **same option set** as the List Page Actions dropdown.
**How record status affects it:** The Change Status button/dropdown reflects the record's current status exactly as the List Page does — the current status is never offered as a transition target, and the button's availability should mirror the Edit icon's enabled/disabled rule for `Active` records (Admin-only).
**How automation should validate it:** For every record state, open the Details page, click Change Status, and capture exactly which options are visible — independently of what was observed on the List Page — then diff the two option sets for that state + permission combination.

The three permission-tier tables in Section 1 above (`Update`/`Create` only, `Approver`/`Admin`, `Admin` only) describe the **expected** option set for Section 2 as well, since both entry points perform the same business operation. The Planner must confirm this by direct observation on the Details page rather than assuming it — if the Details page ever offers a different set of options for the same state + permission, record it as a functional inconsistency (see Entry Points note above).

**Details Page validation checklist (per transition):**
- ✓ Change Status button visible (and enabled/disabled per the Active/Admin rule)
- ✓ Dropdown options match the expected set for the record's current state + user's permission
- ✓ Option hidden (for permissions/states where it should NOT be offered)
- ✓ Toast message shown on confirm, exact text captured live
- ✓ Header/status badge on the Details page updates to the new state
- ✓ API response for the status-transition call verified (status code + payload)
- ✓ DB row for the record reflects the new status

---

### Automation Discovery — List Page vs. Details Page

For every module, the Planner must run this discovery sequence for status transitions, not just observe one entry point and assume the other matches:

1. Open the List Page. For a record in each relevant state, click the Edit icon and capture every option offered in the Actions dropdown.
2. Open the Details Page for the same record. Click Change Status and capture every option offered in its dropdown.
3. Compare the two captured option sets for that state + permission combination.
4. If the two entry points differ for the same state + permission, record it as a functional inconsistency/defect in the Module Discovery Report — do not silently reconcile or pick one as "correct."
5. Generate positive and negative test cases for **both** entry points (List Page Status Transition and Details Page Status Transition), even where the underlying business rule is identical.

---

### Status Change Confirmation Dialog and Toast Validation

> **⚠ RECONSTRUCTED SECTION.** The canonical copy of this content previously lived in a file named `QA_MASTER_CONTEXT.md` (§5.3 Status Change Confirmation Dialog, §5.4 Status Transition Toast Messages) which no longer exists in this repository. The mechanics below are reconstructed from the surviving Full Transition Map, Actions Menu tables above, and the general Create/Update toast rules elsewhere in this document. **Re-verify against the live application before treating this as equally authoritative** — do not assume exact dialog copy or button labels without observing them first.

This dialog behaviour applies identically to **both entry points** (List Page Actions dropdown and Details Page Change Status dropdown) — they differ only in where the resulting status update is visually confirmed afterwards: the grid row's status/badge for the List Page, versus the header/status badge on the Details page itself.

**Generic dialog anatomy (verify live per module):**
1. Selecting a transition option from either the List Page Actions dropdown or the Details Page Change Status dropdown opens a confirmation dialog.
2. The dialog states the transition (e.g. "Change status from {FromState} to {ToState}?").
3. The dialog offers a confirm action (label varies by module — observe live, e.g. "Confirm" / "Yes" / the target state name) and a cancel/dismiss action.
4. Dismissing the dialog (Cancel, X, or backdrop click) leaves the record's status unchanged — no API call is made.
5. Confirming triggers the status-change API call.

**Toast validation on confirm:**
- Success: a success toast appears with module- and transition-specific text — capture the **exact text** live, never assume it.
- Failure (e.g. blocked by a precondition — see below): an error toast/banner appears with a descriptive message — capture the exact text live.

Any per-module deltas (e.g. lowercase status values in the dialog, backdrop-dismiss behaviour, whether the dialog is skipped entirely for certain transitions) must be documented in that module's `<Module>_Context.md` file after live verification, and take precedence over this generic reconstruction.

The Planner must still capture the **exact toast message text** observed from the live application for `TARGET_MODULE` and include it in the Module Discovery Report — never assume the message text.

---

### Test Cases to Generate for Status Transitions (S6 in CSV)

Add a **S6 — STATUS TRANSITIONS** section to the CSV continuing the IssueId sequence. Generate one TC per row in the transition map above, plus one negative TC per blocked transition — **for each of the two entry points separately** (List Page and Details Page), even though they exercise the same business operation:

**List Page Status Transition — Positive TCs (one per allowed transition):**
- TC title: `Given user has {Permission} Then user can change status from {FromState} to {ToState} for {Module} via List Page Actions dropdown`
- Steps: navigate → find record in {FromState} → open Edit icon Actions dropdown → select {ToState} → confirm → verify toast → verify grid status updated → verify API → verify DB

**List Page Status Transition — Negative TCs (one per blocked transition):**
- TC title: `Given user does not have {Permission} Then user cannot change status from {FromState} to {ToState} for {Module} via List Page Actions dropdown`
- Steps: navigate → find record in {FromState} → verify option NOT in Actions dropdown OR Edit icon disabled → verify API returns 401/403

**Details Page Status Transition — Positive TCs (one per allowed transition):**
- TC title: `Given user has {Permission} Then user can change status from {FromState} to {ToState} for {Module} via Details Page Change Status dropdown`
- Steps: navigate → open record's Details page → click Change Status → select {ToState} → confirm → verify toast → verify header status updated → verify API → verify DB

**Details Page Status Transition — Negative TCs (one per blocked transition):**
- TC title: `Given user does not have {Permission} Then user cannot change status from {FromState} to {ToState} for {Module} via Details Page Change Status dropdown`
- Steps: navigate → open record's Details page → verify option NOT in Change Status dropdown OR Change Status button disabled → verify API returns 401/403

**Entry-point consistency TC (one per module):**
- TC title: `Given a record in {FromState} with {Permission} Then the List Page Actions dropdown and Details Page Change Status dropdown offer identical transition options for {Module}`
- Steps: capture List Page option set → capture Details Page option set → assert the two sets are identical; if not, file the divergence as a defect rather than editing this TC to match either observed behaviour

**Edit icon state TCs:**
- TC: `Given user has Update permission Then Edit icon is visible for Setup/Requested/Deleted records`
- TC: `Given user does not have Admin permission Then Edit icon is disabled for Active records`
- TC: `Given user has Admin permission Then Edit icon is enabled for Active records`

---

### Feature-Specific Overrides

If the Planner discovers that a feature has **different or additional states** (e.g. `Pending`, `Expired`, `Suspended`), or that the transition rules differ from the common model above:
1. Document the exact states and transitions in the Module Discovery Report.
2. Generate TCs based on observed live behaviour — not this common model.
3. Mark the override clearly in the `.md` output:

```
## STATUS TRANSITION OVERRIDE — {MODULE}
This feature deviates from the common model.
STATES        : <observed states>
TRANSITIONS   : <observed transition map>
REASON        : <what was different — observed from live UI>
```

---

#### Known Override — Transactions

```
## STATUS TRANSITION OVERRIDE — Transactions
This feature deviates from the common model.
STATES        : Setup · Requested · Active · Exported · Deleted
TRANSITIONS   : see table below
REASON        : Additional Exported state; tighter Admin-only gate on most transitions
```

**Transactions — Full Transition Permission Map:**

| From State | To State | Required Permission | Notes |
|---|---|---|---|
| `Setup` | `Requested` | `Update` | Standard — same as common model |
| `Setup` | `Active` | `Approver` OR `Admin` | Same as common model |
| `Setup` | `Exported` | `Admin` only | Exported state not in common model |
| `Setup` | `Deleted` | `Admin` only | Overrides common model (normally Update) |
| `Requested` | `Exported` | `Admin` only | Exported state not in common model |
| `Requested` | `Deleted` | `Admin` only | Overrides common model (normally Update) |
| `Active` | any state | `Admin` only | Same as common model |
| `Exported` | any state | `Admin` only | Additional state — Admin-gated in all directions |
| `Deleted` | `Exported` | `Admin` only | Additional state — Admin-gated |

> Transitions not listed above (e.g. `Requested → Setup`, `Deleted → Setup/Requested/Active`) must be verified from the live application — apply the permission discovered and generate TCs accordingly.

**Edit icon visibility for Transactions:**

| Record State | Edit Icon |
|---|---|
| `Setup` | Visible and enabled (Update or Create permission) |
| `Requested` | Visible and enabled (Update or Create permission) |
| `Active` | Visible but DISABLED unless Admin |
| `Exported` | Visible but DISABLED unless Admin |
| `Deleted` | Visible and enabled (Update or Create permission) |

---

### Transition Precondition Validations

Some status transitions are blocked **not by permission but by data state**. The system validates preconditions before allowing the transition and returns an error (toast/banner) if the conditions are not met. These are distinct from permission-based negative TCs.

**How to discover:** During Planner exploration, attempt each transition with data in a boundary state (e.g. a record with a null mandatory field, a record referenced by another active object). Observe whether the transition is blocked and capture the exact error message shown.

**Known DataCentre preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| Any state `→ Deleted` | No active IPPools linked to this DataCentre via `oncilla.resourceRelationship` | At least one active `resourceRelationship` entry links this DataCentre to an active IPPool | System error toast/banner indicating active IPPool dependency exists |

**Known IPPool preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| Any state `→ Deleted` | No active APNs linked to this IPPool via `oncilla.resourceRelationship` | At least one active entry with `sourceResourceName='ipPool'` and `destinationResourceName='apn'` exists for this IPPool | System error toast/banner indicating active APN dependency exists |
| Any state `→ Deleted` | No active Subnets linked to this IPPool via `oncilla.resourceRelationship` | At least one active entry with `sourceResourceName='ipPool'` and `destinationResourceName='subnet'` exists for this IPPool | System error toast/banner indicating active Subnet dependency exists |

> See [`db_validation.md`](db_validation.md) → **Query F — Precondition Verification Queries** for IPPool verify SQL.

**TC generation rules for preconditions:**
1. **Negative TC — precondition fails:** Attempt the transition with the blocking condition in place → assert transition is blocked, correct error message displayed, status unchanged in grid and DB.
2. **Positive TC — precondition passes:** Ensure all mandatory fields are populated (for →Active) or all dependency counts return 0 (for →Deleted) → assert transition succeeds, correct success toast, status updated in grid and DB.
3. Label these in section **S6 — STATUS TRANSITIONS** with `module-StatusTransition`.
4. Each precondition gets at least one negative TC + one positive TC.

> See [`db_validation.md`](db_validation.md) → **Query F — Precondition Verification Queries** for DataCentre verify SQL.

**Known APN preconditions:** see [`apn_context.md`](apn_context.md) → `### Status Transition Preconditions` (the canonical copy).

**Known Supernet preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| `Any state → Deleted` | No active IPPools using this Supernet | At least one active IPPool references this Supernet | System error toast/banner indicating active IPPool dependency exists |
| `Any state → Deleted` | No active Subnets using this Supernet | At least one active Subnet references this Supernet | System error toast/banner indicating active Subnet dependency exists |

**Known MNO preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| `Any state → Deleted` | No active APNs or ProviderTariffs using this MNO | At least one active APN or ProviderTariff references this MNO | System error toast/banner indicating active APN/ProviderTariff dependency exists |
| `Any state → Deleted` | No active SIMs or IMSIs on this MNO | At least one active SIM or IMSI is linked to this MNO | System error toast/banner indicating active SIM/IMSI dependency exists |

**Known ProviderTariff preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| `Any state → Deleted` | No active CommsProfiles using this ProviderTariff | At least one active CommsProfileId references this ProviderTariff | System error toast/banner indicating active CommsProfile dependency exists |

**Known ProviderRate preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| `Any state → Deleted` | No active ProviderTariffs using this ProviderRate | At least one active ProviderTariff references this ProviderRate | System error toast/banner indicating active ProviderTariff dependency exists |

**Known Portfolio preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Any state → Deleted` | No active SIMs using this Portfolio | At least one active SIM references this Portfolio | System error toast/banner indicating active SIM dependency exists |
| Portfolio Address `→ Deleted` | Address must NOT be set as the Default for its type | Address is currently the Default for its address type | System error indicating a default address cannot be deleted |
| Portfolio Address `→ Active` | Portfolio must have at least one active BillingAddress | No active BillingAddress exists for the Portfolio | System error indicating a BillingAddress is required |

**How to add preconditions for other modules:**
When the Planner discovers a blocked transition error during live exploration, document it using the same table format above in the Module Discovery Report under `## STATUS TRANSITION PRECONDITIONS — {MODULE}`. The Generator will include precondition TCs in S6.

---

## Module-Specific Create/Edit Validation Rules

> These rules apply during Create and Update operations for each module. The Planner agent must verify each rule against the live UI and generate corresponding TCs in S3 (CREATE) and S4 (UPDATE).

---

### APN
See [`apn_context.md`](apn_context.md) → `### Create / Edit Form Field Validation` (the canonical copy) for field dependencies, uniqueness scope, regex, and live-verified dropdown API endpoints.

### IPPool
- IPPool Object must have a Configuration mapped to a DataCentre.
- Dropdowns must show only Active DataCentre and Supernet records — cross-verify options against DB.

### DataCentre
- `subdomain` must be unique when creating or editing a DataCentre.
- `title` must be unique when creating or editing a DataCentre.
- `countryCode` must be unique when creating or editing a DataCentre.

### Supernet
- `minIp` and `maxIp` must be in valid IPv4 or IPv6 format.
- The IP range defined by this Supernet must NOT overlap with any other Supernet it extends.
- If a change would move any active Subnet outside the updated Supernet's IP range, the change must be blocked with an error.
- `extensionId` must reference an Active Supernet — circular extension chains are not allowed.

### MNO
- Dropdowns must show only Active `mncId` and `portfolioId` records — cross-verify against DB.

### ProviderTariff
- ProviderTariff Object must have a Configuration mapped to APN, RatType, and ProviderRate.
- `providerTariffCode` must be unique when creating or editing a ProviderTariff.
- Dropdowns must show only Active MNO, APN, RatType, and ProviderRate records — cross-verify against DB.

### SIM Assignment
- When Sequential SIM assignment is selected: the ICCID must be validated starting from the given starting ICCID, following the ICCID sequence within the User's Portfolio.
- The `portfolioId` dropdown must show only Active portfolios (including child portfolios).
- The `packageId` dropdown must show only Active Packages assigned to the selected Portfolio.

### Portfolio
- **Portal ID**: visible and editable only for Global Users when creating or updating a Portfolio.
- **Invoicing Entity**: sourced from the Portfolio's RR. Selecting an Invoicing Entity must automatically populate: Currency Code, Payment Method, Tax Code, and Business Code.
- **Finance fields editability**: Invoicing Entity and Currency Code are editable only by users with `capabilityPortfolioUpdateFinance` permission.
- **Portfolio Attribute editability**:
  - `Dynamic ID` — editable by Integra Billing Senior only.
  - `Zendesk Id` — read-only; returned by API after Portfolio creation, must not be editable.
  - `Payment Terms` — editable by Integra Billing Senior and Integra Portal Admin only.
  - `Account Prefix (AT&T)` — read-only; returned by API after Portfolio creation, must not be editable.
- **Portfolio Address — Default and Active rules**:
  - If this is the only address of its `addressType`, automatically create the default attribute when set to Active.
  - Setting a billing address as default must remove the default attribute from the previous default billing address.
  - Setting a shipping address as default must remove the default attribute from the previous default shipping address.
  - Setting a deployment address as default must remove the default attribute from the previous default deployment address for the same country.
  - If an address is set as default, remove the default attribute from the existing default address that matches the same `addressType`.
  - Only one default address is allowed per `addressType` at any time.

### Transactions

#### Billing Transaction – Validation Context

> **Critical clarification:** Date validation must NOT be based on whether a date is simply in the past. It must be based on Billing Lock / Billing Cut-Off Date, Billing Cycle, Invoicing Status, and Export Status.

**Rule 1 – Invoiced Transactions (Status = Invoiced / Exported / Posted)**

Users must not be allowed to modify invoicing-impacting fields:

| Locked Field | Always locked when Status = Invoiced, Exported, or Posted |
|---|---|
| Effective Date | Read-only |
| Effective Start Date | Read-only |
| Effective End Date | Read-only |
| Amount | Read-only |

Any change to billing information after invoicing must be handled through an adjustment transaction or credit-note process — not by editing the original transaction.

**Rule 2 – Uninvoiced Transactions (Status ≠ Invoiced / Exported)**

Users may edit transaction details. Date validation is only triggered when the user attempts to change Effective Start Date or Effective End Date to a date within a locked billing period.

- Locked Billing Period: `Date <= Bill Date (Billing Cut-Off Date)`
- Expected: validation error displayed; Save blocked.

**Rule 3 – Non-Date Updates (Status ≠ Invoiced / Exported)**

If the user updates non-date fields only and the Effective Date remains unchanged:
- No date validation is triggered.
- Save is allowed.

---

#### Billing Transaction – Validation Coverage

| # | Scenario | Precondition | Expected Result |
|---|---|---|---|
| V1 | Date within current billing cycle | Status ≠ Invoiced/Exported | Date accepted · No validation error · Save enabled |
| V2 | Date in a future billing cycle | Status ≠ Invoiced/Exported | Confirmation message displayed · User can continue or cancel |
| V3 | Date within locked billing period (`Date <= Bill Date`) | Status ≠ Invoiced/Exported | Validation error displayed · Save blocked |
| V4 | Locked/exported period dates in date picker | Billing period locked or exported | Dates greyed out in date picker · User cannot select them |
| V5 | Save/Submit button state with invalid date | Validation error present | Save disabled · clears when valid date selected → Save enabled |
| V6 | Invoiced transaction — field lock | Status = Invoiced | Effective Date, Effective Start Date, Effective End Date, Amount all locked (read-only) |
| V7 | Exported/Posted transaction — field lock | Status = Exported or Posted | Same field locking behaviour as V6 |
| V8 | Non-date field update only | Status ≠ Invoiced/Exported | No date validation triggered · Save successful |
| V9 | Existing Effective Date retained while editing another field | Status ≠ Invoiced/Exported; Effective Date unchanged | No validation triggered · Save successful |
| V10 | Current cycle boundary dates | Status ≠ Invoiced/Exported | First day of current cycle accepted · Last day of current cycle accepted |
| V11 | Effective Date exactly equals Bill Date (cut-off boundary) | Status ≠ Invoiced/Exported | Treated as locked period · Validation error displayed · Save blocked |

> **TC generation:** Label all billing validation TCs in section **S4 (UPDATE)** with `Transactions-BillingValidation`. Each V-row maps to at least one positive or negative TC. V3, V5, V6, V7, V11 are negative TCs (block/lock). V1, V2, V8, V9, V10 are positive TCs (allow/pass).

---

> **Transactions UI context** (tabs, columns, forms, API endpoints, status rules) is documented in [`transaction_context.md`](transaction_context.md). Planner agent must load that file before generating Transactions test cases.

> **APN UI context** (list page, detail page, filter panel, column preset, API endpoints, status transition matrix, permission-gated behaviour) is documented in [`apn_context.md`](apn_context.md). Planner agent must load that file before generating APN test cases.

---

> This behaviour applies to **every Create form and every Edit form across all modules**. The Planner agent must validate all scenarios during exploration and the Generator must generate corresponding TCs in S3 (CREATE) and S4 (UPDATE).

### Cancel / Unsaved Changes Popup and Label Format

> **⚠ RECONSTRUCTED SECTION.** The canonical copy of this content previously lived in a file named `QA_MASTER_CONTEXT.md` (§6.9 Cancel / Unsaved Changes Popup, §9.3 Label Format) which no longer exists in this repository. The mechanics below are reconstructed from evidence elsewhere in this document (the BDD label pattern in the Generator's CSV rules, the mandatory-field/toast conventions above). **Re-verify against the live application before treating this as equally authoritative.**

**Form entry points and always-present controls (verify live per module):**
- Every Create/Edit form (modal, drawer, or page) has a Cancel button and/or an `X` close control.
- Both controls trigger the same unsaved-changes check when the form has been modified from its initial state.

**Cancel / Clear (X) unsaved-changes popup behaviour:**
1. User opens a Create or Edit form and changes at least one field.
2. User clicks Cancel or the `X` close control.
3. If any field differs from its initial value, a confirmation popup appears warning that unsaved changes will be lost.
4. Confirming the popup discards changes and closes the form, returning to the list page with no new/updated record.
5. Dismissing the popup (its own Cancel/X) returns the user to the form with all entered values intact.
6. If no field was changed, Cancel/X closes the form immediately with no popup.

**TC table (generate in S3/S4 for every module with a Create/Edit form):**
- `Given user has {Permission} Then cancelling {Module} form with unsaved changes shows confirmation popup`
- `Given user has {Permission} Then confirming the popup discards changes and returns to list`
- `Given user has {Permission} Then dismissing the popup preserves entered form values`
- `Given user has {Permission} Then cancelling with no changes closes the form without a popup`

**BDD label pattern for these TCs:** follow the same `"feature-{MODULE},module-{Create|Update},sanity-no,regression-yes"` label format used for other Create/Update TCs (see the CSV label rules in the Planner agent's §1.9 and the Generator's own rules).

---

## Dynamic Context Per Feature

Every feature may have a different set of:
- Permission names (the `{Module}` segment changes)
- Status values and allowed transitions
- Form fields and mandatory/optional rules
- API endpoints and DB tables
- Toast message text

The Planner agent must **never copy context from a previous feature run**. For every new `TARGET_MODULE` in CONFIG, start fresh. Discover everything from the live application. The only things that stay constant across features are the rules in this section.

---

## Scenario Generation Rules (permission-aware)

**Phase 1 always runs with `FULL_USER` who has ALL capabilities active.** The Planner generates positive AND negative TCs for every permission in a single pass.

Rules:

1. **Positive TCs** — generated for every capability (`Get`, `Create`, `Update`, `Approver`, `Admin`). Since `FULL_USER` has all of them, every feature is visible and interactable.
2. **Negative TCs** — always generated for each capability even though `FULL_USER` has them all. Negative TCs are written based on what was observed (e.g. "Create button IS visible with Create permission → negative TC: Create button must NOT be visible without Create permission").
3. **Label negative TCs correctly:**
   ```
   "feature-{MODULE},module-{Section},sanity-no,regression-yes"
   ```
4. **For each permission, generate at minimum:**
   - 1 positive TC — UI element IS visible and functional
   - 1 negative TC — UI element is NOT visible when permission is absent
   - 1 negative TC — direct API call is blocked (401/403) without permission
5. **Business logic TCs (Approver/Admin)** go in section **S6 — STATUS TRANSITIONS** in the CSV.

---

## Negative TC Execution Strategy

Negative TCs require a user who is **missing** the specific capability being tested. Use whichever option is feasible:

**Option A — Dedicated restricted user:**
Use `RESTRICTED_USER` from CONFIG — a dedicated user with no capabilities for `TARGET_MODULE`.

**Option B — Temporary DB deactivation:**
Deactivate the relevant capability in DB before the TC, then restore it after. See [`db_validation.md`](db_validation.md) → **Permission Deactivation Queries** for the exact SQL.

> Option A is safer for parallel or CI execution — Option B can cause race conditions if tests run concurrently.
