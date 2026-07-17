# PLAYWRIGHT QA PIPELINE — MASTER CONTEXT

> **HOW TO USE:**
> 1. Set `TARGET_MODULE` in the CONFIG block below — that is the only thing you change.
> 2. Invoke the **`playwright-test-planner`** agent → it navigates the live app, discovers the module, saves the test plan.
> 3. Invoke the **`playwright-test-generator`** agent → it reads the saved plan, executes each step live in the browser, writes test files.
> 4. Run the tests. If any fail, invoke the **`playwright-test-healer`** agent → it runs, debugs, and fixes them.

---

## ⚙️ CONFIG — CHANGE ONLY THIS

```
TARGET_MODULE        : DataCentre
APP_URL              : https://portal.qan.aws.eseye.io/login
ENVIRONMENT          : QAN
PROJECT              : PV3

# User for Phase 1 (scenario generation) + positive TCs — must have ALL capabilities active
FULL_USER            : statususer
FULL_PASSWORD        : Password#1

# User for negative permission TCs — must have NO capabilities for TARGET_MODULE
# Either a separate restricted user OR same user with permissions deactivated in DB before execution
RESTRICTED_USER      : <restricted username>
RESTRICTED_PASSWORD  : <restricted password>
```

> **Why two users?**
> The Planner agent (Phase 1) needs `FULL_USER` with ALL capabilities active so it can discover
> and interact with every feature — Create button, Edit icon, status transitions, filter panel.
> If any capability is missing, those UI elements are hidden and the Planner cannot generate
> scenarios for them. Negative TCs (verifying elements are hidden) are executed separately
> using `RESTRICTED_USER` or by temporarily deactivating permissions in DB.

---

---

# SETUP & PREREQUISITES

> Complete every step below before running any phase. Each step includes a verification command so you know it worked before moving on.

## Step 1 — Install Node.js

Playwright requires Node.js 18 or higher.

**Check if already installed:**
```bash
node --version
```
Expected output: `v18.x.x` or higher.

**If not installed:** Download from https://nodejs.org and install the LTS version. Re-run the check above before continuing.

---

## Step 2 — Clone / Open the Project

Open the project folder `Playwright_MCP` in VS Code (or your IDE). All commands below must be run from this folder.

**Verify you are in the right folder:**
```bash
ls package.json
```
Expected: `package.json` is listed.

---

## Step 3 — Install Playwright and Project Dependencies

**Check if Playwright is already installed:**
```bash
npx playwright --version
```

**If Playwright is NOT installed** (command not found or version too old), run:
```bash
npm init playwright@latest
```

This always installs the latest version of Playwright and sets up `playwright.config.ts`, browser binaries, and example tests.

**Then install remaining project dependencies:**
```bash
npm install
```

This installs: `dotenv`, `mysql2`, and all other dependencies declared in `package.json`.

**Verify:**
```bash
npx playwright --version
```
Expected output: latest Playwright version.

---

## Step 4 — Install Playwright Browser Binaries

```bash
npx playwright install chromium
```

This downloads the Chromium browser that the agents use to interact with the application.

**Verify:**
```bash
npx playwright install --dry-run
```
Expected: Chromium listed as already installed (no download triggered).

---

## Step 5 — Verify the Playwright MCP Server

The three agents communicate with the browser through the Playwright MCP server. Verify it can start:

```bash
npx playwright run-test-mcp-server --help
```

Expected: help text is printed without errors. If this command fails, your Playwright version may be too old — run `npm init playwright@latest` to upgrade to the latest version.

---

## Step 6 — Verify the Three Agent Files

The agents live in `.github/agents/` inside your project folder. All three must be present for the pipeline to work.

**Check (run from your project root):**
```bash
ls .github/agents/
```

Expected — you must see all three files:
```
playwright-test-planner.agent.md
playwright-test-generator.agent.md
playwright-test-healer.agent.md
```

**If any file is missing or the `.github/agents/` folder does not exist**, install the agents by running this command from your project root:

```bash
npx playwright init-agents --loop=vscode
```

This installs the official Playwright agent definitions for VS Code into your current project folder — it works regardless of what your project folder is named.

**After installation, re-verify:**
```bash
ls .github/agents/
```

All three files must now be present before proceeding. Do not rename or move these files — Claude Code resolves them by their exact path.

---

## Step 7 — Verify Claude Code is Installed

The agents run inside **Claude Code** (VS Code extension or CLI). You must have one of these set up:

**Option A — VS Code Extension:**
- Open VS Code → Extensions → search `Claude Code` → Install
- Sign in with your Anthropic / Claude account
- Confirm the extension is active in the status bar

**Option B — CLI:**
```bash
claude --version
```
Expected: version number printed. If not found, install via: `npm install -g @anthropic-ai/claude-code`

**Invoke an agent (confirm it works):**
In the Claude Code chat panel, type:
```
@playwright-test-planner
```
Expected: the planner agent is recognized and responds. If it says "agent not found", check that the `.github/agents/` files exist and Claude Code has access to the project folder.

---

## Step 8 — Create the `.env` File

The project uses `dotenv` for credentials and URLs. Create a `.env` file in the project root:

```bash
# .env — create this file in the project root (Playwright_MCP/.env)
APP_URL=https://portal.qan.aws.eseye.io/login
USERNAME=statususer
PASSWORD=Password#1
ENVIRONMENT=QAN
PROJECT=PV3
```

**Important:** `.env` must never be committed to git. Confirm `.gitignore` includes it:
```bash
grep ".env" .gitignore
```
If `.env` is not listed in `.gitignore`, add it before committing anything.

---

## Step 9 — Verify the Output Folder Exists

The agents write their output to `Test Case Folder/`. If it does not exist, create it:

```bash
ls "Test Case Folder/"
```

If missing:
```bash
mkdir "Test Case Folder"
```

This folder is where both Phase 1 output files land:
- `Test Case Folder/test-plans/<Module>_TESTCOVERAGE.md` — for automation engineers (reference, discovery report, API/DB context)
- `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` — for manual testers (Excel/Jira) AND the Generator agent (post-review source of truth)

---

## Step 10 — Enable ALL Capabilities in DB Before Phase 1

> This is mandatory. If any capability is missing from the DB for `FULL_USER`, the Planner agent will not be able to see or interact with the corresponding UI feature, and those test scenarios will never be written.

Before starting Phase 1, confirm ALL five capabilities for `TARGET_MODULE` are `active` in the DB for `FULL_USER`. Run this query in your DB client (MySQL Workbench / DBeaver / TablePlus) — you cannot run this from the agent due to network restrictions.

> See `prompts/DB_VALIDATION.md` → **Query E — Pre-Phase 1 Capability Check** for the exact SQL.

**Expected result — all five rows must show `status = 'active'`:**

| title | status |
|---|---|
| `capability{Module}Admin` | active |
| `capability{Module}Approver` | active |
| `capability{Module}Create` | active |
| `capability{Module}Get` | active |
| `capability{Module}Update` | active |

**If any row is missing or shows `inactive`**, activate it before proceeding using the query in `prompts/DB_VALIDATION.md` → **Query E — Pre-Phase 1 Capability Check**.

**What happens if you skip this:**

| Missing capability | What the Planner cannot discover |
|---|---|
| `Get` | Module not visible in navigation → **nothing can be generated** |
| `Create` | Create button hidden → no Create scenarios or form field discovery |
| `Update` | Edit icon hidden → no Update scenarios |
| `Approver` | Status transition options hidden → no Approver business logic scenarios |
| `Admin` | Admin actions hidden → no Admin status transition scenarios |

---

## Setup Verification Checklist

Run through this before starting any phase:

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | Node.js ≥ 18 | `node --version` | `v18.x.x` or higher |
| 2 | Playwright installed | `npx playwright --version` | Latest version printed (run `npm init playwright@latest` if missing) |
| 3 | Chromium installed | `npx playwright install --dry-run` | No download needed |
| 4 | MCP server available | `npx playwright run-test-mcp-server --help` | Help text printed |
| 5 | Planner agent file | `ls .github/agents/playwright-test-planner.agent.md` | File listed |
| 6 | Generator agent file | `ls .github/agents/playwright-test-generator.agent.md` | File listed |
| 7 | Healer agent file | `ls .github/agents/playwright-test-healer.agent.md` | File listed |
| 8 | Claude Code active | `@playwright-test-planner` in chat | Agent recognized |
| 9 | `.env` file present | `ls .env` | File listed |
| 10 | Output folders exist | `ls "Test Case Folder/test-plans" && ls "Test Case Folder/test-cases"` | Both subfolders listed |
| 11 | All module capabilities active in DB | Run Step 10 query in DB client | 5 rows, all `status = active` |

All 11 checks must pass before proceeding to Phase 1.

---

---

# PERMISSION & BUSINESS LOGIC MODEL

> This section applies to **every feature** in the pipeline. The permission names are dynamic — replace `{Module}` with the actual module name (e.g. `Datacentre`, `Mno`, `Apn`). The Planner agent must discover which permissions the current test user holds before generating any scenario, then apply the rules below to decide what to validate.

---

## Permission Naming Convention

All capability names follow this exact pattern:

```
Capability{Module}{Action}

Examples for DataCentre:
  CapabilityDatacentreGet
  CapabilityDatacentreCreate
  CapabilityDatacentreUpdate
  CapabilityDatacentreApprover
  CapabilityDatacentreAdmin
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

> For DB-level permission verification queries during script execution, see `prompts/DB_VALIDATION.md`.

---

## Permission Matrix

| Permission | What the user CAN see / do | What is HIDDEN / BLOCKED when missing |
|---|---|---|
| `Capability{Module}Get` | Module visible in nav · List page loads · All records visible · Filter panel · Search bar · Sort columns · Pagination · Records-per-page · Reset filters · Clear all filters · Column presets | Module NOT visible in left navigation · Direct URL access → 401/403 · All module content hidden |
| `Capability{Module}Create` | **Create {Module}** button visible on list page · Create form opens · Mandatory fields marked `*` · Submit disabled until mandatory fields filled · Submit enabled once all mandatory filled · Success toast after creation · Error toast on failure | Create button NOT visible on list page |
| `Capability{Module}Update` | Edit icon (pencil) visible in Actions column for every row · Edit form opens with pre-populated values · Success toast after update · Error toast on failure | Edit icon NOT visible in any row of the Actions column |
| `Capability{Module}Approver` | Status transition options visible for permitted states (see Business Logic below) · Status change triggers toast | Status change options NOT visible / disabled |
| `Capability{Module}Admin` | Admin-level status transitions and admin actions visible (see Business Logic below) | Admin actions NOT visible / disabled |

---

## Per-Permission Validation Rules

### GET — `Capability{Module}Get`

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

### CREATE — `Capability{Module}Create`

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

### UPDATE — `Capability{Module}Update`

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

### APPROVER — `Capability{Module}Approver`

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

### ADMIN — `Capability{Module}Admin`

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
| Setup | `Capability{Module}Update` OR `Capability{Module}Create` | Visible and enabled |
| Requested | `Capability{Module}Update` OR `Capability{Module}Create` | Visible and enabled |
| Deleted | `Capability{Module}Update` OR `Capability{Module}Create` | Visible and enabled |
| Active | `Capability{Module}Admin` only | Visible and enabled |
| Active | No Admin permission | **Visible but DISABLED** (greyed out, not clickable) |

> `Capability{Module}Create` carries `Capability{Module}Update` as its underlying permission. A user with Create can do everything Update can do.

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

### Actions Menu Behaviour Per State + Permission

The Planner must open the Actions menu for a record in each state and capture exactly which options are visible:

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

---

### Status Change Confirmation Dialog

Every status transition requires the user to confirm via a modal dialog before the change is applied.

**Dialog anatomy:**

| Element | Value |
|---|---|
| Title | Confirm Status Change |
| X icon | Top-right corner — cancels and closes dialog; no change applied |
| Body text | Are you sure you want to change the status from "{fromState}" to "{toState}"? |
| Left button | Cancel — closes dialog, no change applied |
| Right button | Action-specific label (see table below) — applies the transition |

**Confirm button label is determined by the target state:**

| Target State | Confirm Button Label |
|---|---|
| Requested | Request |
| Deleted | Delete |
| Active | Approve |
| Setup | Set Up |

**Full transition matrix with exact button labels:**

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

**Dialog validation rules for TC generation:**

- Assert dialog title = "Confirm Status Change"
- Assert body text matches exact pattern with correct from/to state names (capitalised as above)
- Assert confirm button label matches target state mapping above
- X icon top-right → click → dialog closes → no DB status change
- Cancel button → dialog closes → no DB status change
- Confirm button → dialog closes → DB status updated → success toast appears
- Backdrop click behaviour: the Planner **must observe and record** whether clicking outside the dialog dismisses it — do not assume; capture from the live application

---

### Toast Validation for Every Status Change

After **every** status transition — successful or failed — validate the toast:

| Scenario | What to validate |
|---|---|
| Successful status change | Success toast appears · correct message text · correct state shown in grid after toast · toast auto-closes · no duplicate toast |
| Failed status change (permission) | Error toast appears · 401/403 shown · no state change in DB |
| Failed status change (invalid transition) | Error toast or option simply absent · no state change in DB |

The Planner must capture the **exact toast message text** observed from the live application and include it in the Module Discovery Report. Never assume the message text.

---

### Test Cases to Generate for Status Transitions (S6 in CSV)

Add a **S6 — STATUS TRANSITIONS** section to the CSV continuing the IssueId sequence. Generate one TC per row in the transition map above, plus one negative TC per blocked transition:

**Positive TCs (one per allowed transition):**
- TC title: `Given user has {Permission} Then user can change status from {FromState} to {ToState} for {Module}`
- Steps: navigate → find record in {FromState} → open Actions → select {ToState} → confirm → verify toast → verify UI state → verify API → verify DB

**Negative TCs (one per blocked transition):**
- TC title: `Given user does not have {Permission} Then user cannot change status from {FromState} to {ToState} for {Module}`
- Steps: navigate → find record in {FromState} → verify option NOT in Actions OR Edit icon disabled → verify API returns 401/403

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

> See `prompts/DB_VALIDATION.md` → **Query F — Precondition Verification Queries** for IPPool verify SQL.

**TC generation rules for preconditions:**
1. **Negative TC — precondition fails:** Attempt the transition with the blocking condition in place → assert transition is blocked, correct error message displayed, status unchanged in grid and DB.
2. **Positive TC — precondition passes:** Ensure all mandatory fields are populated (for →Active) or all dependency counts return 0 (for →Deleted) → assert transition succeeds, correct success toast, status updated in grid and DB.
3. Label these in section **S6 — STATUS TRANSITIONS** with `module-StatusTransition`.
4. Each precondition gets at least one negative TC + one positive TC.

> See `prompts/DB_VALIDATION.md` → **Query F — Precondition Verification Queries** for DataCentre verify SQL.

**Known APN preconditions (discovered from live app):**

| Transition | Precondition | Blocked if | Expected error |
|---|---|---|---|
| `Requested → Active` | All mandatory fields must NOT be NULL | Any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete |
| `Any state → Deleted` | No active ProviderTariffs using this APN | At least one active ProviderTariff references this APN | System error toast/banner indicating active ProviderTariff dependency exists |
| `Any state → Deleted` | No active Packages using this APN | At least one active Package references this APN | System error toast/banner indicating active Package dependency exists |
| `Any state → Deleted` | No active IPPool mapped to this APN | APN has an active IPPool configuration | System error toast/banner indicating active IPPool dependency exists |

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
- APN Object must have a Configuration mapped to an IPPool.
- `name` and `apnRef` must be unique within the selected `mnoId` when creating or editing.
- `title` must be unique when creating or editing an APN.
- Dropdowns must show only Active MNO and IPPool records — cross-verify options against DB.

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

> **Transactions UI context** (tabs, columns, forms, API endpoints, status rules) is documented in [`Transaction_Context.md`](Transaction_Context.md). Planner agent must load that file before generating Transactions test cases.

> **APN UI context** (list page, detail page, filter panel, column preset, API endpoints, status transition matrix, permission-gated behaviour) is documented in [`APN_Context.md`](APN_Context.md). Planner agent must load that file before generating APN test cases.

---

> This behaviour applies to **every Create form and every Edit form across all modules**. The Planner agent must validate all scenarios below during exploration and the Generator must generate corresponding TCs in S3 (CREATE) and S4 (UPDATE).

---

### Form Entry Points

| Action | Form Type | Pre-filled Data |
|---|---|---|
| Click **Create {Module}** button | Create form | Empty — no pre-filled values |
| Click **Edit icon** (pencil) in Actions column | Edit form | All existing record values pre-populated |

---

### Form Controls — Always Present

Every Create and Edit form must have exactly two controls visible at all times:

| Control | Location | Enabled State |
|---|---|---|
| **Submit** button | Bottom of form | **Disabled** when any mandatory field is empty · **Enabled** only after all mandatory fields contain valid values |
| **Cancel** button | Bottom of form | Always enabled |
| **Clear (X) icon** | Top-right corner of the form | Always enabled |

---

### Cancel Button Behaviour

**Scenario A — Form has unsaved changes (user has typed or modified any field):**

1. User clicks **Cancel**.
2. A confirmation popup opens with:
   - **Title:** `Unsaved Changes`
   - **Body:** `You have unsaved changes. Are you sure you want to leave?`
   - **Buttons:** `Stay` · `Discard`
3. If user clicks **Discard** → form closes completely; all entered data is lost.
4. If user clicks **Stay** → popup closes; form remains open with all entered data still intact.

**Scenario B — Form has no unsaved changes (user has not typed or modified any field):**

1. User clicks **Cancel**.
2. Form closes immediately — **no confirmation popup is shown**.

---

### Clear (X) Icon Behaviour

The Clear (X) icon in the top-right corner of the form follows the **identical logic** as the Cancel button:

**Scenario A — Form has unsaved changes:**

1. User clicks the **X** icon.
2. The same `Unsaved Changes` confirmation popup opens with `Stay` and `Discard` options.
3. **Discard** → form closes; all data lost.
4. **Stay** → popup closes; form remains open with data intact.

**Scenario B — Form has no unsaved changes:**

1. User clicks the **X** icon.
2. Form closes immediately — no popup.

---

### Validation Rules for Planner and Generator

**Create form TCs to include in S3:**

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Open Create form → click Cancel immediately (no data entered) | Form closes with no popup |
| 2 | Open Create form → enter data in any field → click Cancel | `Unsaved Changes` popup appears with Stay and Discard options |
| 3 | Popup open after Cancel → click **Stay** | Popup closes · form remains open · entered data is preserved |
| 4 | Popup open after Cancel → click **Discard** | Form closes · all entered data is discarded |
| 5 | Open Create form → enter data → click **X** icon | `Unsaved Changes` popup appears with Stay and Discard options |
| 6 | Popup open after X icon → click **Stay** | Popup closes · form remains open · entered data is preserved |
| 7 | Popup open after X icon → click **Discard** | Form closes · all entered data is discarded |
| 8 | Open Create form → click **X** icon immediately (no data entered) | Form closes with no popup |

**Edit form TCs to include in S4:**

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Open Edit form → verify all fields are pre-populated with existing record values | All fields show correct current values |
| 2 | Open Edit form → click Cancel immediately (no changes made) | Form closes with no popup |
| 3 | Open Edit form → modify any field → click Cancel | `Unsaved Changes` popup appears with Stay and Discard options |
| 4 | Popup open after Cancel → click **Stay** | Popup closes · form remains open · modified data is preserved |
| 5 | Popup open after Cancel → click **Discard** | Form closes · record in list is unchanged (original values retained) |
| 6 | Open Edit form → modify any field → click **X** icon | `Unsaved Changes` popup appears with Stay and Discard options |
| 7 | Popup open after X icon → click **Stay** | Popup closes · form remains open · modified data is preserved |
| 8 | Popup open after X icon → click **Discard** | Form closes · record in list is unchanged |
| 9 | Open Edit form → click **X** icon immediately (no changes made) | Form closes with no popup |

---

### Popup Validation Checklist (apply to every popup occurrence)

- Popup title is exactly `Unsaved Changes`.
- Popup body text is exactly `You have unsaved changes. Are you sure you want to leave?`.
- Both `Stay` and `Discard` buttons are visible and enabled.
- No other buttons or close icons are present in the popup.
- Clicking outside the popup (backdrop) does NOT close it — user must explicitly choose Stay or Discard.
- After Discard: the list page is visible; no partial or orphan record is created/updated.
- After Stay: the form is fully functional; the user can continue editing and submit successfully.

---

### BDD Label for these TCs

```
"feature-{MODULE},module-Create,sanity-no,regression-yes"   ← for Create form cancel/discard TCs
"feature-{MODULE},module-Update,sanity-no,regression-yes"   ← for Edit form cancel/discard TCs
```

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
Deactivate the relevant capability in DB before the TC, then restore it after. See `prompts/DB_VALIDATION.md` → **Permission Deactivation Queries** for the exact SQL.

> Option A is safer for parallel or CI execution — Option B can cause race conditions if tests run concurrently.

---

---

# PHASE 1 — PLAYWRIGHT-TEST-PLANNER AGENT

**Agent file:** `.github/agents/playwright-test-planner.agent.md`  
**MCP server:** `npx playwright run-test-mcp-server`  
**Role:** Senior QA Automation Architect + Exploratory Tester

## 1.1 Mandatory Tool Invocation Order

> The agent MUST follow this sequence exactly. Skipping or reordering these calls breaks the MCP session.

```
Step 1 → planner_setup_page          ← ALWAYS call this FIRST before any browser tool
Step 2 → browser_navigate            ← navigate to APP_URL
Step 3 → browser_snapshot            ← explore UI state (prefer this over screenshots)
Step 4 → browser_* tools             ← interact, explore, capture network, fill forms
Step N → planner_save_plan           ← ALWAYS call this LAST to persist the test plan
```

**Screenshot rule:** Use `browser_take_screenshot` only when absolutely necessary (e.g., a visual bug that cannot be described). For all exploration use `browser_snapshot`.

## 1.2 Available Browser Tools

The agent has access to these tools via the `playwright-test` MCP server:

| Tool | Purpose |
|---|---|
| `planner_setup_page` | Sets up the browser page — call FIRST |
| `browser_navigate` | Go to a URL |
| `browser_snapshot` | Capture accessibility snapshot for exploration |
| `browser_click` | Click an element |
| `browser_type` | Type text into a field |
| `browser_select_option` | Select a dropdown option |
| `browser_hover` | Hover over element |
| `browser_press_key` | Press keyboard key |
| `browser_wait_for` | Wait for element or condition |
| `browser_network_requests` | Capture all network/API traffic |
| `browser_console_messages` | Capture browser console output |
| `browser_evaluate` | Execute JavaScript in page context |
| `browser_handle_dialog` | Handle alert/confirm/prompt dialogs |
| `browser_file_upload` | Upload files |
| `browser_drag` | Drag and drop |
| `browser_navigate_back` | Browser back navigation |
| `browser_run_code` | Run arbitrary browser code |
| `browser_tabs` | Manage browser tabs |
| `browser_resize` | Resize browser window |
| `planner_save_plan` | Save the completed test plan to file |

## 1.3 Mission

Log in to the application using CONFIG credentials. Navigate to `TARGET_MODULE`. Perform complete exploratory testing by directly interacting with the live application via MCP/browser automation. Dynamically discover all module structure, fields, APIs, DB tables, and behaviors — never assume anything not observed in the UI or network traffic.

## 1.4 Login Flow

- Navigate to `APP_URL`.
- Use `browser_snapshot` to detect whether the login is one-step or multi-step before acting.
- Never enter the password before the username step is confirmed visible in the snapshot.
- Never submit a field before it is visible and enabled.
- After login, use `browser_network_requests` to capture: access token, refresh token, session ID, user permissions, portfolio mappings.
- Validate: successful login response, authenticated API responses, correct home page load, user-specific menu visibility.
- Never assume login is complete until both UI snapshot and API state confirm it.

## 1.5 Exploration Rules

Navigate to `TARGET_MODULE` via the left navigation menu. Then:

**You must:**
- Use `browser_snapshot` after every navigation to understand current UI state.
- Use `browser_click` to open every reachable menu, expand all sub-nodes, open all tabs, sub-tabs, modals, dialogs, and drawers.
- Use `browser_network_requests` continuously to capture every API endpoint triggered.
- Interact with every form, button, dropdown, and action control.
- Observe all state transitions and conditional rendering.
- Identify all CRUD capabilities available to the current user role.
- Identify filters, search bars, sorting columns, pagination controls.
- Identify permission-controlled elements (role-based visibility/disable).
- Identify nested workflows and multi-step flows.

**You must not:**
- Stop after the happy path.
- Skip disabled controls, hidden tabs, or collapsed sections.
- Assume creation is exposed by a "Create" button only — inspect Actions dropdowns, toolbar icons, and role-based controls too.
- Assume any field, API, or DB table without directly observing it.

## 1.6 Validation Areas to Explore

Cover all of the following during exploration — everything you discover feeds directly into the test plan:

### UI
Page title · browser title · breadcrumbs · section headers · table headers · column names · labels · tooltips · placeholders · buttons · icons · tabs · dropdowns · search bars · filters · pagination controls · loaders · empty states · error states · toast messages · confirmation dialogs · preset column customization (open panel → select columns via checkboxes → click OK → verify grid refreshes to show only selected columns) · alignment · visibility · enable/disable states · dynamic rendering · hidden fields by permission

### API (via `browser_network_requests`)
For every interaction capture: endpoint URL · HTTP method · request headers · authorization header · request payload · query/path parameters · response status code · response schema · response body · pagination params · filter/search/sort params.

### Grid / Table
Table rendering · dynamic columns · column ordering · sticky headers · data types (string/int/decimal/bool/date/currency/status) · null/empty/truncated/special-char values · record count consistency.

### Filters
Filter panel open/close · all filter field types present · single filter · multiple filters · combined filters · clear/reset/remove filter · filter persistence · filter count display.

### Search / Sort / Pagination
Exact/partial match · case sensitivity · debounce · search clearing · ascending/descending sort per column · sort persistence · default page size · page size change · next/prev/first/last page.

### CRUD
**Create:** mandatory fields · field validations · duplicate prevention · UI + API + DB  
**Update:** editable vs read-only fields · update persistence · UI + API + DB  
**Delete:** confirmation popup · hard/soft delete · UI + API + DB  
**View:** detailed view data · linked/related entities

### Permissions & Session
Role-based visibility · direct URL restriction · API restriction · 401/403 handling · session timeout · logout/session invalidation.

### Toast Notifications
Every create/update/delete/status-change action must trigger toast validation: correct text · auto-close · error toast for failures · no false success messages.

### Attributes (if module is eligible)
Attribute-eligible modules: MNO · APN · ProviderRate · ProviderTariff · Supernet · IPPool · DataCenter · Portfolio  
Cover: create/edit/delete default + custom attributes · regex validations · dropdown data vs DB · success/error banners · cancel at any stage.

## 1.7 Module Discovery Report

After exploration, the agent must include this structured report in the saved plan — Phase 2 reads it directly. Every field must come from actual observation; no placeholders:

```
## MODULE DISCOVERY REPORT
MODULE NAME        : <discovered from UI>
CAPABILITY PREFIX  : <e.g. DataCenter → CapabilityDataCenterGet/Create/Update>
MODULE PLURAL      : <e.g. Data Centers>
MENU PATH          : <e.g. Network Management → Data Centers>
PRIMARY KEY FIELD  : <e.g. dataCentreId>
FOREIGN KEY FIELDS : <field → links to X page, one per line>
TEXT FIELDS        : <fieldName — mandatory/optional, one per line>
DROPDOWN FIELDS    : <fieldName → source — mandatory/optional, one per line>
TABLE HEADERS      : <comma-separated exact column headers as seen in UI>
FILTER FIELDS      : <comma-separated>
STATUS VALUES      : <comma-separated>
CRUD AVAILABLE     : <Create / Read / Update / Delete>
ATTRIBUTE SECTION  : <yes / no>
TEST REPOSITORY    : <Test Case Folder/test-plans/test-<module>-plan.md>
APIs CAPTURED      : <endpoint + HTTP method, one per line>
TRANSITION PRECONDITIONS : <transition | blocking condition | error message — one per line, or NONE>
```

## 1.8 Phase 1 Outputs — Two Files Per Module

The Planner agent produces **exactly two files** per module. Both must be saved before Phase 1 is complete.

---

### Output File 1 — Test Coverage & Plan (`.md`)

**File path:** `Test Case Folder/test-plans/<Module>_TESTCOVERAGE.md`  
**Example:** `Test Case Folder/test-plans/DataCenter_TESTCOVERAGE.md`  
**Saved via:** `planner_save_plan`  
**Purpose:** Human-readable test coverage document AND the reference input for the Generator agent.

Required sections:

```markdown
# <MODULE> — Complete Test Coverage

| Field        | Value                              |
|--------------|------------------------------------|
| Feature      | <MODULE>                           |
| Document Version | 1.0                            |
| Coverage Date | <today>                           |
| Prepared By  | Playwright MCP QA Automation Agent |
| Environment  | {APP_URL}                          |
| Test User    | {USERNAME} / {PASSWORD}            |
| DB Schema    | <discovered schema name>           |
| Source       | Live UI exploration via Playwright MCP browser automation |

---

## 1. Feature Overview
<narrative description of module purpose, URL path, tabs if any>

---

## 2. Environment Details
<API base URL, DB name, auth provider, all discovered endpoints>

---

## 3. Test Coverage Summary
| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | Total |
|---------|----------|------------|------------|------------|---------------|-------|
| <module>| N        | N          | N          | N          | N             | N     |

---

## 4. Module Discovery Report
MODULE NAME        : <discovered>
CAPABILITY PREFIX  : <e.g. DataCenter → CapabilityDataCenterGet/Create/Update>
MODULE PLURAL      : <e.g. Data Centres>
MENU PATH          : <e.g. Network Management → Data Centres>
PRIMARY KEY FIELD  : <e.g. dataCentreId>
FOREIGN KEY FIELDS : <field → links to X page, one per line>
TEXT FIELDS        : <field name — mandatory/optional, one per line>
DROPDOWN FIELDS    : <field name → source — mandatory/optional, one per line>
TABLE HEADERS      : <comma-separated exact column header names as seen in UI>
FILTER FIELDS      : <comma-separated>
STATUS VALUES      : <comma-separated>
CRUD AVAILABLE     : <Create / Read / Update / Delete>
ATTRIBUTE SECTION  : <yes / no>
APIs CAPTURED      : <endpoint + HTTP method, one per line>
TRANSITION PRECONDITIONS : <transition | blocking condition | error message — one per line, or NONE>

---

## 5. Discovered Grid Structure
| Column # | Header | Format / Notes |
|----------|--------|----------------|
| 1        | <name> | <format>       |

---

## 6. Discovered Form Fields (Create / Edit)
| Field | Type | Mandatory | Max Length / Regex | Source (if dropdown) |
|-------|------|-----------|-------------------|----------------------|

---

## 7. Discovered Filter Fields
| Filter Field | Type | Values / Source |
|--------------|------|-----------------|

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW

#### <Scenario ID>. <Scenario Title>
**Seed:** tests/seed.spec.ts
**Steps:**
1. <action> → <expected result>
2. ...
**API:** <endpoint + expected behavior>
**DB:** <table + expected state>

### S2 — FILTER
...
### S3 — CREATE
...
### S4 — UPDATE
...
### S5 — ATTRIBUTE (if applicable)
...
```

> Section names under `## 8.` become `test.describe()` blocks in the Generator. Scenario titles become `test()` names.

---

### Output File 2 — Formal Test Cases (`.csv`)

**File path:** `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv`  
**Example:** `Test Case Folder/test-cases/DataCenter_TESTCOVERAGE.csv`  
**Purpose:** Jira / Xray import-ready test case file.

**Exact CSV header (12 columns in this order):**
```
IssueId,Project,Issue_Type,Summary,Description,Test Steps,Test Data,Expected Result,Test Repository,Test Status,labels,Test Type
```

**Column rules:**
- `IssueId` — sequential integer across all 5 sections, never resets
- `Project` — value from CONFIG `PROJECT` field (e.g. `PV3`)
- `Issue_Type` — always `Test`
- `Summary` = `Description` — BDD sentence, ≤255 chars
- `Test Data` — login row only: `credentials: ${USERNAME}/${PASSWORD}` — all other step rows BLANK
- `Test Repository` — format: `{PROJECT}-{Module}` e.g. `PV3-DataCenter`
- `Test Status` — always `TODO`
- `Test Type` — always `Manual` — first row of each TC only; subsequent step rows BLANK
- `labels` — wrap in quotes since it contains commas (see format below)
- `Test Repository`, `Test Status`, `labels`, `Test Type` → **first row of each TC only**; subsequent step rows leave these BLANK

**BDD Summary pattern:**
- Positive: `Given Integra exists when user login having {Capability} Permission Then the user can {action}`
- Negative: `Given Integra exists when user login without having {Capability} Permission Then the user can not {action}`
- Capability mapping: View/Filter → `Capability{Module}Get` | Create → `Capability{Module}Create` | Update/Attribute → `Capability{Module}Update`

**Label format (always quote in CSV — value contains commas):**
```
"feature-{MODULE},module-{Section},sanity-{yes|no},regression-yes"
```
- `regression-yes` — always lowercase, never `regression-Yes`
- `sanity-yes` — smoke/critical TCs only; `sanity-no` for all others
- Section values: `View` · `Filter` · `Create` · `Update` · `Attribute` · `StatusTransition`

**Standard 4 opening steps (every TC):**
1. `login to URL: {APP_URL}` → `login page should be displayed successfully`
2. `Enter credentials and click on login` | Data: `credentials: ${USERNAME}/${PASSWORD}` → `User should be logged in successfully`
3. `Click on {Module Management menu}` → `{Module} menu should be displayed`
4. `Click on {Module}` → `{Module} list page should be displayed`

**Row structure:**
- First row of each TC: all 12 columns filled
- Subsequent step rows: `Test Steps` + `Test Data` (login row only) + `Expected Result` only — all other columns BLANK

**Example (2 TCs, DataCenter):**
```csv
IssueId,Project,Issue_Type,Summary,Description,Test Steps,Test Data,Expected Result,Test Repository,Test Status,labels,Test Type
1,PV3,Test,Given Integra exists when user login having CapabilityDatacenterGet Permission Then the user can see the List on Data Centre Objects,Given Integra exists when user login having CapabilityDatacenterGet Permission Then the user can see the List on Data Centre Objects,login to URL: https://portal.qan.aws.eseye.io/,,login page should be displayed successfully,PV3-DataCenter,TODO,"feature-DataCenter,module-View,sanity-yes,regression-yes",Manual
,,,,,Enter credentials and click on login,credentials: ${statususer}/${Password#1},User should be logged in successfully,,,,
,,,,,Click on Network Management,,Network Management menu should be displayed,,,,
,,,,,Click on Data Centres,,Verify user should be able to see Data Centres list page,,,,
,,,,,Verify grid displays 8 columns: Data Centre ID | Name | Title | Data Centre Ref | Subdomain | Country Code | Status | Actions,,All 8 column headers are visible in correct order,,,,
2,PV3,Test,Given Integra exists when user login having CapabilityDatacenterGet Permission Then the user can see the hyperlink for Data Centre ID,...
```

## 1.9 Six Sections to Cover in the CSV (IssueId continues sequentially across all)

**S1 — VIEW** (`module-View`, `Capability{Module}Get`)  
Cover: list page load · PK hyperlink visible + clickable · FK hyperlinks (1 TC per FK) · column sort asc/desc · records-per-page selector · next/last page navigation · action column state · search result view button · column preset (see steps below) · status column placement · status colors · column header tooltips · columns match DB · select-all/deselect-all  
> **Do NOT include** Create button visibility, Edit icon visibility, or status transition controls in S1 TCs — those are governed by Create, Update, and Approver/Admin permissions and belong in S3, S4, and S6 respectively. When FULL_USER has all permissions active, these elements are visible but must not be attributed to Get permission.

**Column Preset TC — mandatory step sequence (use for every preset-related TC in S1):**
1. Navigate to the `{Module}` list page.
2. Click the column settings / preset button on the grid toolbar.
3. Verify the column selection panel opens and all available columns are listed with checkboxes.
4. Select the desired columns by checking their checkboxes; uncheck the columns to hide.
5. Click **OK**.
6. Verify the grid refreshes and shows **only** the selected columns.
7. Verify the unselected columns are **no longer visible** in the grid.

> Do NOT write "toggle visibility of columns" — the user explicitly selects via checkboxes then confirms with OK. Never assume the columns hide on checkbox click alone.

**S2 — FILTER** (`module-Filter`, `Capability{Module}Get`)  
Cover: filter panel open/close · all filter fields present · field search works · primary/secondary sections visible · filter by status (multiple + select-all) · 1 TC per text filter field · 1 TC per dropdown filter · select-all/deselect-all per dropdown · dropdown options vs DB (1 TC per dropdown) · reset/clear filters · filter count shown · multi-filter + pagination + column preset + sorting

**S3 — CREATE** (`module-Create`, `Capability{Module}Create`)  
Cover: create entry visible (button/action/toolbar) · form opens · mandatory fields marked * · submit disabled when mandatory empty / enabled when filled · cancel + submit present · success banner → verify new record appears in list · error banner on failure · unique field validation · regex validation · text fields (1 TC per group) · dropdown fields (1 TC per group) · FK dropdown active records only · searchable dropdown search · field tooltips

**S4 — UPDATE** (`module-Update`, `Capability{Module}Update`)  
Cover: edit button visible · negative TC (no edit without permission) · edit form title + pre-populated values · mandatory asterisk + submit state · cancel + submit · success banner → verify record updated in list · error banner · unique/regex in edit form · text/dropdown fields in edit form · FK dropdown in edit · editable in any state

**S5 — ATTRIBUTE** (`module-Attribute`, `Capability{Module}Update`) — *only if `ATTRIBUTE SECTION = yes`*  
After step 4 add: `Click {PrimaryKeyId}` → details page | `Scroll down` → attribute section  
Cover: edit button on attribute section · default + custom attributes visible · attribute fields vs DB · select single/multiple · create single/multiple defined + custom · success/error banner · edit/update single/multiple defined + custom · delete single/multiple defined + custom · cancel at any stage

**S6 — STATUS TRANSITIONS** (`module-StatusTransition`, `Capability{Module}Update` + `Capability{Module}Create` + `Capability{Module}Approver` + `Capability{Module}Admin`)  
Cover one TC per valid transition per permission — use the full transition map from the PERMISSION & BUSINESS LOGIC MODEL:
- **Update/Create permission:** Setup→Requested · Setup→Deleted · Requested→Setup · Requested→Deleted · Deleted→Setup · Deleted→Requested
- **Approver/Admin permission:** Setup→Active · Requested→Active · Deleted→Active
- **Admin permission only:** Active→Setup · Active→Requested · Active→Deleted
- **Edit icon visibility:** visible+enabled for Setup/Requested/Deleted with Update/Create · visible but DISABLED for Active without Admin · visible+enabled for Active with Admin
- **Negative TCs (permission):** attempt transition without required permission → action not visible / disabled · no toast shown
- **Negative TCs (precondition):** 1 TC per known precondition — attempt transition with blocking data state (e.g. null mandatory field for →Active; active IPPool FK for →Deleted) → transition blocked · correct error message shown · status unchanged in grid and DB
- **Positive TCs (precondition):** matching positive TC per precondition — blocking condition resolved → transition succeeds · success toast · grid + DB updated
- **Toast:** every successful transition → correct toast message verified · auto-closes · no false success on failure
- **Grid:** status column reflects new status immediately after transition

**Out of scope — never generate:** SQL injection, XSS, CSRF, security/penetration, API load/stress/performance, network failure, browser compatibility

**Consolidation rules (UI steps only in CSV — no API or DB steps):**
- **Do NOT add API verification steps to the CSV.** The CSV is for UI/functional test cases only.
- **Do NOT add DB verification steps to the CSV.**
- Create/Update success flow: fill form → submit → verify success toast → verify new/updated record appears in list.
- Filter/Search flow: apply filter → verify list shows expected results.
- Dropdown options: open dropdown → verify expected options are present in the UI.
- Status transition: open Actions → select state → confirm → verify success toast → verify status badge updated in grid.
- UI-structural checks (button visibility, labels, colors, asterisks, tooltips) = UI-only steps.

---

---

# QA REVIEW GATE — MANDATORY BEFORE PHASE 2

> **The Planner agent stops here. Phase 2 must NOT be started until this review is complete and signed off.**

---

## What the Planner agent must do before stopping

Before handing off, the Planner agent must confirm both output files are saved and complete:

```
✅ Test Case Folder/test-plans/<Module>_TESTCOVERAGE.md   — test plan + discovery report
✅ Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv  — formal test cases ready for review
```

The Planner then outputs this handoff message and stops:

```
─────────────────────────────────────────────────────────
PHASE 1 COMPLETE — AWAITING QA REVIEW

Module          : {TARGET_MODULE}
MD file         : Test Case Folder/test-plans/{Module}_TESTCOVERAGE.md
CSV file        : Test Case Folder/test-cases/{Module}_TESTCOVERAGE.csv
Total TCs       : {count}
Sections        : S1-View({n}) | S2-Filter({n}) | S3-Create({n}) | S4-Update({n}) | S5-Attribute({n}) | S6-StatusTransitions({n})

⚠️  DO NOT start Phase 2 until the QA review below is complete.
─────────────────────────────────────────────────────────
```

---

## QA Engineer Review Steps

Open `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` in Excel and review every test case against the checklist below. Make edits directly in the CSV — remove invalid rows, fix incorrect steps, update expected results.

### What to check per test case

| Check | What to look for |
|---|---|
| **Scope** | TC matches only the `TARGET_MODULE` — no scenarios from other modules |
| **BDD summary** | Follows the correct pattern, ≤255 chars, no typos |
| **Steps completeness** | Every step is actionable, no vague steps like "verify it works" |
| **Mandatory field coverage** | Create/Edit TCs include all mandatory fields discovered live |
| **No API/DB steps** | CSV must contain UI/functional steps only — remove any API verification or DB query steps |
| **Permission accuracy** | Positive TCs only for permissions the test user actually holds |
| **Negative TC present** | At least one negative TC per permission that was found missing |
| **Status transitions** | S6 TCs cover every row in the transition map — no gaps |
| **Toast validation** | Every create/update/delete/status-change TC includes a toast verification step |
| **No duplicates** | No two TCs have identical steps and expected results |
| **IssueId sequence** | IssueId is continuous across all sections with no gaps or resets |
| **Label format** | `feature-{MODULE},module-{Section},sanity-{yes|no},regression-yes` — no spaces |
| **Out-of-scope rows** | Remove any SQL injection, XSS, performance, or network failure TCs |

### Common invalid cases to remove

- TCs for UI elements that do not exist in this module (copied from another feature).
- Negative TCs where the user actually HAS the permission (wrong assertion).
- Duplicate TCs that test the same flow with no meaningful variation.
- TCs with placeholder text like `Field1`, `Dropdown1`, `<value>` instead of real field names.
- TCs where the expected result is too vague (e.g. "system should work correctly").
- Status transition TCs for transitions not present in the discovered transition map.

---

## Sign-off Instruction

Once all invalid cases are removed and the CSV is clean:

1. Save the final reviewed CSV as `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` (overwrite).
2. Update the `.md` file's **Test Coverage Summary** table to reflect the final TC counts.
3. Then — and only then — invoke the **`playwright-test-generator`** agent to start Phase 2.

> The Generator reads directly from the reviewed CSV — not the `.md`. The CSV is the single source of truth for script generation after the review gate.

**Start Phase 2 with:**
```
@playwright-test-generator — use Test Case Folder/test-cases/{Module}_TESTCOVERAGE.csv as the test plan
```

---

---

# PHASE 2 — PLAYWRIGHT-TEST-GENERATOR AGENT

**Agent file:** `.github/agents/playwright-test-generator.agent.md`  
**MCP server:** `npx playwright run-test-mcp-server`  
**Role:** Playwright Test Generator — creates tests by executing steps live in the browser

## 2.1 Mandatory Tool Invocation Order (per scenario)

> Repeat this exact sequence for EVERY scenario in the test plan. Never batch multiple scenarios in one setup.

```
Step 1 → generator_setup_page        ← call FIRST for each scenario before any browser tool
Step 2 → browser_* tools             ← execute EACH step from the plan live in the browser
Step 3 → generator_read_log          ← call IMMEDIATELY after executing all steps
Step 4 → generator_write_test        ← call IMMEDIATELY after reading the log
```

## 2.2 Available Tools

| Tool | Purpose |
|---|---|
| `generator_setup_page` | Sets up the browser page for a scenario — call FIRST per scenario |
| `browser_click` | Click an element |
| `browser_type` | Type text |
| `browser_select_option` | Select dropdown option |
| `browser_hover` | Hover over element |
| `browser_navigate` | Navigate to URL |
| `browser_press_key` | Press keyboard key |
| `browser_snapshot` | Capture accessibility snapshot |
| `browser_wait_for` | Wait for element or condition |
| `browser_handle_dialog` | Handle dialogs |
| `browser_evaluate` | Execute JavaScript |
| `browser_file_upload` | Upload files |
| `browser_drag` | Drag and drop |
| `browser_verify_element_visible` | Assert element visible |
| `browser_verify_list_visible` | Assert list visible |
| `browser_verify_text_visible` | Assert text visible |
| `browser_verify_value` | Assert element value |
| `generator_read_log` | Read execution log — call after all steps |
| `generator_write_test` | Write the generated test file — call after reading log |

## 2.3 What the Generator Does

The generator does NOT generate code from description alone. For every scenario it:
1. Calls `generator_setup_page` to prepare the browser.
2. Executes each step from the plan **live in the browser** using `browser_*` tools.
3. Reads the execution log via `generator_read_log`.
4. Writes the final test file via `generator_write_test` using best practices from the log.

This means the generated code reflects **actual observed behavior** of the application, not assumptions.

## 2.3.1 API and DB Assertions in Generated Tests

> The CSV contains UI steps only. The Generator must enrich every generated test with API and DB assertions on top of the CSV steps.

**How:** After executing the UI steps from the CSV, the Generator reads `Test Case Folder/test-plans/<Module>_TESTCOVERAGE.md` → **APIs CAPTURED** and **Module Discovery Report** to get the endpoint URLs and DB table names, then adds assertions to the generated Playwright code:

| TC type | What to add in generated code |
|---|---|
| Create success | After success toast: assert `POST /…/{module}` returns 201/200 via `request` · assert new record exists in DB |
| Update success | After success toast: assert `PUT/PATCH /…/{module}/{id}` returns 200 · assert DB record reflects updated values |
| Status transition success | After toast: assert API status-change endpoint returns 200 · assert DB `status` field updated |
| View/List | After list loads: assert `GET /…/{module}` returns 200 · assert DB record count matches UI count |
| Filter/Search | After list filtered: assert `GET /…/{module}?filter=…` returns 200 with filtered data |
| Negative (no permission) | Assert relevant API endpoint called directly returns 401 or 403 |

> These API and DB assertions live in the **generated `.spec.ts` files only** — they are never added back to the CSV.

## 2.4 Input Format — Reading from the Reviewed CSV

The Generator reads from `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` — the post-review, QA-approved file. This is the single source of truth for which TCs to generate. Do NOT use the `.md` file as the script source — it may not reflect QA edits made during the review gate.

**Why CSV over MD:** The reviewed CSV is authoritative. Any TCs removed or changed by the QA engineer during review are already reflected in the CSV. Generating from it guarantees scripts are only created for approved test cases.

**Why MD for API/DB context:** The `.md` file holds the API endpoints and DB table names discovered during Phase 1. The Generator reads this for API and DB assertions only — it never uses it as the TC source.

**How to parse the CSV multi-row TC structure:**

Each test case spans multiple rows. The first row of a TC has all columns filled. Subsequent rows for the same TC have only `Test Steps`, `Test Data`, and `Expected Result` — all other columns are blank. Group rows into a single TC by collecting consecutive rows until the next non-blank `IssueId`:

```
IssueId | labels           | Summary        | Test Steps       | Expected Result
──────────────────────────────────────────────────────────────────────────────
1       | module-View,...  | Given Integra…  | Login to URL     | Login page shown     ← TC 1 row 1
(blank) |                  |                 | Enter creds      | Logged in            ← TC 1 row 2
(blank) |                  |                 | Click module     | Module list shown    ← TC 1 row 3
2       | module-View,...  | Given Integra…  | Login to URL     | Login page shown     ← TC 2 row 1
```

**CSV column → Generator mapping:**

| CSV Column | Maps to |
|---|---|
| `Summary` | `test-name` — becomes the `test()` title |
| `labels` → `module-{Section}` segment | `test-suite` — becomes the `test.describe()` block |
| All `Test Steps` rows grouped by TC | `body` — each row is one step to execute live |
| All `Expected Result` rows grouped by TC | assertions inside each step |
| `Test Repository` | maps to the test file subfolder path |
| `labels` → `feature-{MODULE}` segment | module name for file path construction |

**Derived XML structure per TC (built from CSV before execution):**

```xml
<test-suite>{module-Section value from labels}</test-suite>
<test-name>{Summary column value}</test-name>
<test-file>tests/<module>/<fs-friendly-summary>.spec.ts</test-file>
<seed-file>tests/seed.spec.ts</seed-file>
<body>
  Step 1: {Test Steps row 1} → Expected: {Expected Result row 1}
  Step 2: {Test Steps row 2} → Expected: {Expected Result row 2}
  ...
</body>
```

- `test-suite` → `test.describe()` block name (e.g. `S1 — View DataCenters`)
- `test-name` → `test()` title (exact `Summary` value from CSV)
- `test-file` → filesystem-friendly name (lowercase, hyphens, no spaces)
- `seed-file` → always `tests/seed.spec.ts`

## 2.5 Generated File Rules

- **One test per file.** Never put multiple scenarios in one spec file.
- `test.describe()` block name must exactly match the section name from the plan including the ordinal prefix (e.g. `S1 — View DataCenters`, `S3 — Create DataCenter`).
- `test()` title must exactly match the scenario name from the plan.
- Include a `// spec: <plan file>` and `// seed: <seed file>` comment at the top of every file.
- Add a comment with the step text **before** each step execution. Do not duplicate comments if a step requires multiple actions.
- Apply best practices from `generator_read_log` output when writing the final test.
- Never hardcode credentials — read from environment or config.

**Example structure:**
```ts
// spec: specs/plan.md
// seed: tests/seed.spec.ts

test.describe('S1 — View DataCenters', () => {
  test('Verify user can see DataCenter list page', async ({ page }) => {
    // 1. Login to APP_URL
    await page.goto(process.env.APP_URL);
    // 2. Enter credentials and click login
    await page.getByLabel('Username').fill(process.env.USERNAME);
    ...
  });
});
```

## 2.6 Framework Architecture

```
project-root/
  playwright.config.js
  package.json
  tests/
    <module>/
      <scenario-name>.spec.js       ← one file per scenario
      test-plan.md
  pages/
    common/
      LoginPage.js
      NavigationPage.js
      BasePage.js
    <module>/
      <Module>ListPage.js
      <Module>CreatePage.js
      <Module>DetailsPage.js
      <Module>FilterPanel.js
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
    testFixtures.js
  constants/
  enums/
  reports/
```

## 2.7 Playwright Best Practices (apply when writing tests)

- Prefer `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, stable test-ids.
- Avoid brittle XPath unless no reliable alternative exists.
- Use Playwright auto-waiting — never `waitForTimeout()` or `waitForNetworkIdle`.
- Keep tests independent and order-agnostic.
- Use unique test data for create scenarios: `Auto_Test_${Date.now()}`.
- One business objective per test.
- Use fixtures for shared setup.
- Design tests to be CI-friendly and parallel-safe.
- Capture trace, screenshot, video per config — not inline in tests.

## 2.8 Session and Logout Rules

- Every test must end in a clean state.
- If persistent login is used, perform explicit logout in tests that validate the logout flow.
- The next test must not depend on the previous test remaining logged in.

## 2.9 Test Data Rules

- Store in `testdata/<module>/<module>.json` (positive) and `<module>-negative.json` (negative).
- No bulky test data embedded directly in spec files.
- Support env-aware overrides via `process.env`.
- Runtime unique values generated inline: `` `Auto_Test_${Date.now()}` ``.

---

---

# PHASE 3 — PLAYWRIGHT-TEST-HEALER AGENT

**Agent file:** `.github/agents/playwright-test-healer.agent.md`  
**MCP server:** `npx playwright run-test-mcp-server`  
**Role:** Test Automation Reliability Engineer — debugs and fixes failing tests

## 3.1 Mandatory Tool Invocation Order

```
Step 1 → test_run                    ← run ALL tests first to identify every failure
Step 2 → test_debug                  ← run once per failing test (pauses on error)
Step 3 → browser_snapshot            ← examine page state at the point of failure
Step 4 → browser_generate_locator    ← generate resilient locator if selector is broken
Step 5 → browser_network_requests    ← inspect network if an API assertion failed
Step 6 → browser_console_messages    ← check console errors
Step 7 → edit                        ← apply targeted fix to the test or page object file
Step 8 → test_run (re-run the test)  ← verify the fix
Step 9 → repeat 2–8 until passes     ← fix one error at a time
```

## 3.2 Available Tools

| Tool | Purpose |
|---|---|
| `test_run` | Run tests (all or specific) |
| `test_debug` | Debug a specific failing test — pauses at error |
| `test_list` | List all available tests |
| `browser_snapshot` | Capture page state at failure point |
| `browser_generate_locator` | Generate a resilient locator for an element |
| `browser_network_requests` | Inspect network/API traffic |
| `browser_console_messages` | Inspect browser console output |
| `browser_evaluate` | Execute JavaScript to inspect DOM state |
| `edit` | Edit test or page object files to apply fixes |

## 3.3 Failure Diagnosis

For every failing test, identify the category before applying any fix:

| Category | Symptoms | Fix Strategy |
|---|---|---|
| **Locator broken** | `locator not found`, `strict mode violation`, `nth-match` error | Use `browser_generate_locator` on the actual element; update selector in page object |
| **Timing / race** | `timeout exceeded`, `not visible`, `not interactable` | Add appropriate Playwright wait (`waitFor`, `toBeVisible`, `toBeEnabled`) — never `waitForTimeout` |
| **Test data mismatch** | Assertion fails on value that no longer matches app state | Update test data file or expectation to match current app |
| **API response change** | Schema assertion failure, unexpected status code | Update API helper types and response assertions |
| **Flow change** | Step fails because UI flow changed (new dialog, extra step, redirect) | Update page object to reflect new flow; preserve all validation steps |
| **Permission change** | Element not found due to permission update | Validate role assignment, update fixtures or role-specific test |
| **Config / env** | Wrong URL, wrong credentials, env var missing | Update config — never hardcode credentials in test files |

## 3.4 Healing Rules

**Always:**
- Fix the root cause — never suppress with `try/catch` or `.catch(() => {})`.
- Preserve the original test intent and all assertions.
- Keep changes minimal and targeted.
- Update the page object if the locator/flow changed — not the spec.
- Fix one error at a time, then re-run before fixing the next.
- Use `browser_generate_locator` to get resilient locators for broken selectors — prefer result over manual guessing.
- Use `browser_evaluate` to inspect DOM state when snapshot alone is not enough.
- For inherently dynamic data, use regular expressions in assertions to produce resilient matchers.

**Never:**
- Skip or remove a failing assertion.
- Replace a specific assertion with a weaker one.
- Add `waitForTimeout()` or `waitForNetworkIdle` as a fix — these are discouraged/deprecated.
- Change the test to pass by asserting the wrong thing.
- Ask the user questions — make the most reasonable decision and proceed.

## 3.5 When the Test Is Correct But Still Fails

If after exhausting all reasonable fixes you have high confidence the test is correct but the application behavior is broken:
1. Mark the test as `test.fixme()`.
2. Add a comment immediately before the failing step explaining what is happening instead of the expected behavior.
3. Never leave a failing test unmarked.

```ts
test.fixme('Verify DataCenter list loads correctly', async ({ page }) => {
  // FIXME: API returns 500 on GET /datacenters — application-side bug, not test issue.
  // Expected: list renders with records. Actual: error state shown.
  ...
});
```

## 3.6 Regression Guard

After every fix:
- Confirm the fix does not break any other test in the same spec file.
- If a locator or method was renamed in a page object, search all specs that import it and apply the same rename.
- Re-run the full test suite (or at minimum the affected module suite) after the final fix to confirm no regressions.

## 3.7 Output Per Healed Test

```
## HEALED: <spec file> — <test name>

Failure Category  : <from 3.3>
Root Cause        : <one sentence>
Files Changed     :
  - pages/<module>/<Page>.ts  line X: <what changed>
  - tests/<module>/<spec>.ts  line Y: <what changed> (if any)
Fix Applied       : <before/after code block>
Verification      : <test name + npx playwright test command to confirm>
```

---

---

# SHARED CONTEXT — ALL PHASES

## Application

```
APP_URL      : https://portal.qan.aws.eseye.io/login
USERNAME     : statususer
PASSWORD     : Password#1
ENVIRONMENT  : QAN
```

## Known Modules

APN · MNO · Supernet · ProviderRate · ProviderTariff · IPPool · Orders · DataCenters · Portfolio · Transactions · Network Management · Feature Management · any newly discovered module

## Attribute-Eligible Modules

MNO · APN · ProviderRate · ProviderTariff · Supernet · IPPool · DataCenter · Portfolio

## Dynamic Test Data Pattern

Always generate unique identifiers for create scenarios:
- `` `Auto_Test_${Date.now()}` ``
- `` `MCP_AI_${Math.random().toString(36).slice(2)}` ``
- `` `QA_${moduleName}_${new Date().toISOString()}` ``

## Final Checklist (before marking any phase complete)

- No missing validations
- No inconsistent UI/API/DB data
- No unauthorized access gaps
- No broken workflows
- No unsupported assumptions
- No hardcoded credentials in generated code
- No skipped negative scenarios
- No stale toast messages unvalidated
- No `waitForTimeout` or `waitForNetworkIdle` in generated tests
