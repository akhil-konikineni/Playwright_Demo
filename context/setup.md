# SETUP & PREREQUISITES

> Steps 1–10 are a **one-time environment setup checklist**. Steps 11–14 are **not** one-time — they define the RBAC permission baseline the Planner re-establishes at the start of every invocation, once per `TARGET_MODULE`, and progress through five permission tiers over the course of a single Phase 1 run. Credentials and URLs are configured in `.env` (see Step 8); module-specific run details (e.g. `TARGET_MODULE`, `FULL_USER`) are supplied directly when invoking the Planner agent.

Complete each step below before running any phase. Each step includes a verification command so you know it worked before moving on.

---

## Step 1 — Install Node.js

Playwright requires Node.js 18 or higher.

**Check if already installed:**
```bash
node --version
```
Expected output: `v18.x.x` or higher.

**If not installed:** Download from https://nodejs.org and install the LTS version. Re-run the check before continuing.

---

## Step 2 — Clone / Open Project

Open the project folder `Playwright_MCP` in your IDE (e.g. VS Code). All commands below run from that folder.

**Verify you're in the right folder:**
```bash
ls package.json
```
Expected: `package.json` listed.

---

## Step 3 — Install Playwright Project Dependencies

**Check if Playwright is already installed:**
```bash
npx playwright --version
```

**If Playwright is NOT installed** (command not found or version too old), run:
```bash
npm init playwright@latest
```

This installs the latest version of Playwright and sets up `playwright.config.js`, browser binaries, and example tests.

**Then install the remaining project dependencies:**
```bash
npm install
```

This installs: `dotenv`, `mysql2`, and all other dependencies declared in `package.json`.

**Verify:**
```bash
npx playwright --version
```
Expected output: the latest Playwright version.

---

## Step 4 — Install Playwright Browser Binaries

```bash
npx playwright install chromium
```

Downloads the Chromium browser the agents use to drive the application.

**Verify:**
```bash
npx playwright install --dry-run
```
Expected: Chromium listed as already installed (no download triggered).

---

## Step 5 — Verify Playwright MCP Server

All three agents communicate with the browser through the Playwright MCP server. Verify it starts:

```bash
npx playwright run-test-mcp-server --help
```

Expected: help text printed without errors. If the command fails, your Playwright version may be too old — run `npm init playwright@latest` to upgrade to the latest version.

---

## Step 6 — Verify Three Agent Files

The agents live in `.github/agents/` inside the project folder. All three must be present for the pipeline to work.

**Check (run from project root):**
```bash
ls .github/agents/
```

Expected — you see three files:
```
playwright-test-planner.agent.md
playwright-test-generator.agent.md
playwright-test-healer.agent.md
```

**If a file is missing or the `.github/agents/` folder does not exist**, install the agents by running from the project root:

```bash
npx playwright init-agents --loop=vscode
```

This installs the official Playwright agent definitions for VS Code into the current project folder — works regardless of what the project folder is named.

**After installation, re-verify:**
```bash
ls .github/agents/
```

All three files must now be present before proceeding. Do not rename or move these files — Claude Code resolves them by exact path.

---

## Step 7 — Verify Claude Code Installed

The agents run inside **Claude Code** (VS Code extension or CLI). Set up one of:

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
Expected: the planner agent is recognized and responds. If it says "agent not found," check that the `.github/agents/` files exist and Claude Code has access to the project folder.

---

## Step 8 — Create `.env` File

The project uses `dotenv` for credentials and URLs. Create a `.env` file in the project root:

```bash
# .env — create in project root (Playwright_MCP/.env)
# ENVIRONMENT=stage
URL=https://portal.qan.aws.eseye.io/login

# Login Credentials
USERNAME=statususer
PASSWORD="Password#1"

#------ QAN DB Credentials --------#
QA_DB_HOST=<qan-db-host>
QA_DB_USER=<qan-db-user>
QA_DB_PASSWORD=<qan-db-password>
QA_DB_NAME=<qan-db-name>
```

`ENVIRONMENT` is optional and currently commented out. `PROJECT` (the Jira project key) has no `.env` counterpart — it must be supplied manually per run.

**Important:** `.env` must never be committed to git. Confirm `.gitignore` includes it:
```bash
grep ".env" .gitignore
```
If `.env` is not listed in `.gitignore`, add it before committing anything.

---

## Step 9 — Verify Ortoni Report Setup

Test runs are reported with [Ortoni Report](https://github.com/ortoniKC/ortoni-report) (dashboard-style HTML report with history, trace viewer, and error grouping), alongside Playwright's own `html` and `list` reporters — configured in `playwright.config.js`.

**Check it's installed:**
```bash
npm ls ortoni-report
```
Expected: `ortoni-report@<version>` listed. If missing, install it:
```bash
npm install -D ortoni-report
```

**Verify after a test run:**
```bash
npx playwright test
```
Expected: an `ortoni-report/` folder is created in the project root containing `index.html`. Locally (non-CI) it opens automatically in your browser; on CI it does not (`open: 'never'`).

`ortoni-report/` is gitignored — never commit generated reports.

---

## Step 10 — Verify Output Folder Exists

Agents write output to `test-cases/`. If it does not exist, create it:

```bash
ls "test-cases/"
```

If missing:
```bash
mkdir -p "test-cases/test-plans" "test-cases/test-cases"
```

This is where Phase 1 output files land:
- `test-cases/test-plans/<module>_testcoverage.md` — for automation engineers (reference, discovery report, API/DB context)
- `test-cases/test-cases/<module>_testcoverage.csv` — for manual testers (Excel/Jira) AND the Generator agent (post-review source of truth)

---

## Step 11 — Understand the RBAC Permission Hierarchy

Before touching the database, understand the model the Planner is required to follow when exploring `TARGET_MODULE`.

This platform's RBAC is built from five capabilities per module, and — as in any well-formed permission hierarchy — each tier is additive: a user holding a higher-level capability implicitly holds everything the tiers beneath it grant.

| Tier | Capability | Inherits | Newly Unlocks |
|---|---|---|---|
| 1 | `capability{Module}Get` | — | Navigation, list view, search, filter, sort, pagination, export, read-only detail view |
| 2 | `capability{Module}Update` | GET | Edit icon, edit form, save/cancel, editable fields, update validation |
| 3 | `capability{Module}Create` | UPDATE + GET | Create button, create form, mandatory-field and duplicate validation, default values |
| 4 | `capability{Module}Approver` | CREATE + UPDATE + GET | Status transition controls, approval / rejection actions, approval workflow |
| 5 | `capability{Module}Admin` | APPROVER + CREATE + UPDATE + GET | Admin-only actions, system-level overrides, Active-state editing |

**Why exploration must be tiered, not flattened:** A senior QA engineer never opens an application with every permission unlocked at once and calls that "exploratory testing." Doing so collapses all five capabilities into a single undifferentiated pass — every scenario appears to belong to the highest tier, RBAC-specific negative test cases cannot be written with any confidence, and there is no reliable way to tell which permission actually gates which piece of functionality. The result is duplicated coverage and weak RBAC attribution, not thorough coverage.

The correct model is **progressive elevation**: activate one capability, explore, capture only what is newly available, then elevate to the next tier and repeat. Because inheritance is real, nothing already discovered at a lower tier is re-verified at a higher tier — it is carried forward automatically. This is the model enforced in Steps 12–14.

---

## Step 12 — Establish the Progressive Permission Baseline in DB

This step replaces any workflow that activates every capability at once. **Never set all five capabilities to `active` before Phase 1 starts** — doing so defeats the tiered discovery model in Step 11 and is the single most common cause of duplicated or misattributed test coverage. Use a DB client (Workbench / DBeaver / TablePlus) if you cannot run a query via the agent due to network restrictions.

> See [`db_validation.md`](db_validation.md) → **Query E — Progressive Permission Baseline Queries (Tiers 1–5)** for the exact SQL — it reads the current state and elevates one capability at a time from `deleted` to `active`.

**Baseline sequence — repeat "activate → explore → record" once per tier, in order:**

```
Tier 1  Activate capability{Module}Get       →  Explore  →  Record GET scenarios
Tier 2  Activate capability{Module}Update    →  Explore  →  Record UPDATE-only deltas
Tier 3  Activate capability{Module}Create    →  Explore  →  Record CREATE-only deltas
Tier 4  Activate capability{Module}Approver  →  Explore  →  Record APPROVER-only deltas
Tier 5  Activate capability{Module}Admin     →  Explore  →  Record ADMIN-only deltas
```

`FULL_USER` is the account whose capability set is progressively elevated across these five tiers — at Tier 1 it holds only `Get`, not "full access" despite the name. Do not confuse it with an account that starts pre-loaded with every capability.

**Before starting a Phase 1 run, confirm the DB is at Tier 1 only:**

| title | status |
|---|---|
| `capability{Module}Get` | active |
| `capability{Module}Update` | deleted |
| `capability{Module}Create` | deleted |
| `capability{Module}Approver` | deleted |
| `capability{Module}Admin` | deleted |

If any higher-tier capability is already `active` from a previous module's run, set it back to `deleted` first (see [`db_validation.md`](db_validation.md) → **Permission Deactivation Queries**). A stale elevated permission carried over from a prior run will cause the Planner to skip the differential discovery pass entirely and start mid-hierarchy.

**Failure modes and their consequences:**

| Failure mode | Consequence |
|---|---|
| All five capabilities active from the start | No tier boundary exists — every scenario is generated in one pass with no reliable RBAC attribution; duplicated coverage across sections |
| A tier is skipped (e.g. GET → CREATE, bypassing UPDATE) | The Planner cannot isolate what UPDATE alone unlocks; UPDATE-specific positive and negative TCs cannot be written |
| `Get` never activated | Module not visible in navigation — **nothing can be discovered at any tier** |
| Elevation happens without a differential pass in between | Newly exposed elements get attributed to the wrong tier, or re-discovered as if they belonged to the tier below |

---

## Step 13 — Run the Differential Discovery Pass at Each Tier

After each elevation in Step 12, the Planner performs one exploration pass and diffs it against the **previous tier's** UI state — never against a blank slate, and never against the fully-unlocked application.

**At every tier, the Planner must:**
1. Re-run `browser_snapshot` against the same screens already explored at the previous tier.
2. Identify only what is **newly visible or newly enabled**: buttons, icons, menu entries, forms, dialogs, status values, grid actions, context-menu entries, and any new API calls or response fields captured via `browser_network_requests`.
3. Discard anything already catalogued at a lower tier — it is inherited, not regenerated.
4. Tag every newly discovered scenario with its **minimum required permission** (`GET` / `UPDATE` / `CREATE` / `APPROVER` / `ADMIN`) before it is written into the test plan.

**Reference for what each tier is expected to newly expose — a starting point, not a substitute for live observation:**

| Tier | Newly visible at this tier | Must NOT be re-described here (already covered below) |
|---|---|---|
| GET | Navigation entry, list/grid, search, filter, sort, pagination, export, read-only detail view | — |
| UPDATE | Edit icon, edit form, save/cancel, editable fields, update-specific validation | Navigation, list, search, filter, sort |
| CREATE | Create button, create form, required-field markers, duplicate validation, default values | Edit icon, edit form |
| APPROVER | Status transition controls, approval/rejection actions, approval workflow | Create form, edit form |
| ADMIN | Admin-only actions, system overrides, Active-state editing | Approval workflow |

The exact controls exposed per tier are feature-specific and must be confirmed live against `TARGET_MODULE` — this table sets expectations, it does not replace the detailed discovery rules in [`permissions_and_status_model.md`](permissions_and_status_model.md).

---

## Step 14 — Record RBAC Coverage With a Permission Elevation Log

To keep tier boundaries auditable across a single Phase 1 run, the Planner maintains a short elevation log inside the module's discovery notes — this feeds directly into `test-cases/test-plans/<module>_testcoverage.md`:

| Tier | Capability Activated | Explored | New Scenarios Captured | Inherited From |
|---|---|---|---|---|
| 1 | `capability{Module}Get` | ✅ | N | — |
| 2 | `capability{Module}Update` | ✅ | N | Tier 1 |
| 3 | `capability{Module}Create` | ✅ | N | Tiers 1–2 |
| 4 | `capability{Module}Approver` | ✅ | N | Tiers 1–3 |
| 5 | `capability{Module}Admin` | ✅ | N | Tiers 1–4 |

A reviewer scanning this log should be able to confirm — without re-reading the full test plan — that no tier's coverage overlaps another's, and that every scenario in the CSV traces back to the tier that first exposed it.

---

## Setup Verification Checklist

Run through Steps 1–10 once, before the environment is used for the first time. Step 12's baseline check is re-run before every Phase 1 invocation (it is per-module, not one-time):

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
| 10 | Ortoni Report installed | `npm ls ortoni-report` | `ortoni-report@<version>` listed |
| 11 | Output folders exist | `ls "test-cases/test-plans" && ls "test-cases/test-cases"` | Both subfolders listed |
| 12 | Permission baseline at Tier 1 only | Run Step 12 query in DB client | `Get = active`; `Update`, `Create`, `Approver`, `Admin` = `deleted` |

All 12 checks must pass before proceeding to Phase 1. **Tiers 2 through 5 are not verified up front** — each is activated and explored progressively during Phase 1 itself, per Steps 12–14, and is never part of the one-time setup gate.
