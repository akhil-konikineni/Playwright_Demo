# QA PIPELINE — ORCHESTRATION

> This file tells you **how to run** the 3-phase pipeline and **where each piece of context lives**. It does not restate agent tool-invocation order or business rules — those are owned elsewhere so they exist in exactly one place. See "Where things live now" at the bottom.

**HOW TO USE:**
1. Set `TARGET_MODULE` in the CONFIG block below — that is the only thing you change.
2. Invoke `@playwright-test-planner` → it navigates the live app, discovers the module, saves the test plan.
3. Complete the QA Review Gate (below) — human sign-off on the CSV before Phase 2.
4. Invoke `@playwright-test-generator` → it reads the reviewed CSV, executes each step live in the browser, writes test files.
5. Run the tests. If any fail, invoke `@playwright-test-healer` → it runs, debugs, and fixes them.

---

## ⚙️ CONFIG — CHANGE ONLY THIS

```
TARGET_MODULE        : DataCentre
APP_URL              : https://portal.qan.aws.eseye.io/login
ENVIRONMENT          : QAN
PROJECT              : PV3

User for Phase 1 (scenario generation) + positive TCs — must have ALL capabilities
FULL_USER            : statususer
FULL_PASSWORD        : Password#1

User for negative permission TCs — must have NO capabilities on TARGET_MODULE
Either a separate restricted user OR the same user with permissions deactivated in DB before execution
RESTRICTED_USER      : <restricted username>
RESTRICTED_PASSWORD  : <restricted password>
```

**Why two users?**
The Planner agent (Phase 1) needs `FULL_USER` with ALL capabilities active to discover and interact with every feature — Create button, Edit icon, status transitions, filter panel. If a capability is missing, the UI elements are hidden and the Planner cannot generate scenarios for them. Negative TCs (verifying elements are hidden) are executed separately using `RESTRICTED_USER` or by temporarily deactivating permissions in DB.

---

## Phase 1 — Planner

Invoke: **`@playwright-test-planner`**

- Tool invocation order + available browser tools: owned by `.github/agents/playwright-test-planner.agent.md` — do not restate them here.
- Mission, login flow, exploration rules, validation areas, module discovery report, and the two-file output spec (`.md` + `.csv`): see `prompts/QA_PIPELINE.md` (Phase 1 section).
- Generic cross-feature business rules (status dialogs, toasts, form popups, permission model, grid/RBAC rules): see `prompts/QA_MASTER_CONTEXT.md`.
- Feature-specific deltas (fields, endpoints, unique per-module overrides): see the matching `*_Context.md` file (e.g. `APN_Context.md`, `Transaction_Context.md`) for the `TARGET_MODULE` in play.

## QA Review Gate — mandatory before Phase 2

> The Planner agent stops after Phase 1. Phase 2 must NOT be started until this review is complete and signed off.

**What the Planner must confirm before stopping:**

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

### QA Engineer Review Steps

Open `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` in Excel and review every test case against the checklist below. Make edits directly in the CSV — remove invalid rows, fix incorrect steps, update expected results.

**What to check per test case:**

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

**Common invalid cases to remove:**

- TCs for UI elements that do not exist in this module (copied from another feature).
- Negative TCs where the user actually HAS the permission (wrong assertion).
- Duplicate TCs that test the same flow with no meaningful variation.
- TCs with placeholder text like `Field1`, `Dropdown1`, `<value>` instead of real field names.
- TCs where the expected result is too vague (e.g. "system should work correctly").
- Status transition TCs for transitions not present in the discovered transition map.

### Sign-off Instruction

Once all invalid cases are removed and the CSV is clean:

1. Save the final reviewed CSV as `Test Case Folder/test-cases/<Module>_TESTCOVERAGE.csv` (overwrite).
2. Update the `.md` file's **Test Coverage Summary** table to reflect the final TC counts.
3. Then — and only then — invoke `@playwright-test-generator` to start Phase 2.

> The Generator reads directly from the reviewed CSV — not the `.md`. The CSV is the single source of truth for script generation after the review gate.

**Start Phase 2 with:**
```
@playwright-test-generator — use Test Case Folder/test-cases/{Module}_TESTCOVERAGE.csv as the test plan
```

---

## Phase 2 — Generator

Invoke: **`@playwright-test-generator`**

- Tool invocation order + available tools: owned by `.github/agents/playwright-test-generator.agent.md` — do not restate them here.
- CSV parsing rules, API/DB assertion enrichment, generated-file naming/structure, framework architecture, best practices, session/logout rules, and test-data rules: see `prompts/QA_PIPELINE.md` (Phase 2 section) — these are Playwright-framework conventions, not agent workflow or business rules, so they stay there.
- Business rules the generated assertions must encode: see `prompts/QA_MASTER_CONTEXT.md` and the matching feature `*_Context.md` file.

## Phase 3 — Healer

Invoke: **`@playwright-test-healer`** (only after running tests and seeing failures)

- Tool invocation order + available tools: owned by `.github/agents/playwright-test-healer.agent.md` — do not restate them here.
- Failure diagnosis table, healing rules (Always/Never), the `test.fixme()` fallback pattern, regression guard, and output template: see `prompts/QA_PIPELINE.md` (Phase 3 section).

---

## Where things live now

| Kind of content | Canonical location |
|---|---|
| Agent tool-invocation order & tool lists | `.github/agents/playwright-test-planner.agent.md`, `-generator.agent.md`, `-healer.agent.md` |
| Generic cross-feature business rules (status dialogs, toasts, form popups, RBAC, grid rules) | `prompts/QA_MASTER_CONTEXT.md` |
| Feature-specific deltas (fields, API endpoints, unique overrides) | Per-feature `prompts/*_Context.md` (e.g. `APN_Context.md`, `Transaction_Context.md`) |
| Playwright automation framework conventions (naming, directory layout, session/logout, test data, CSV parsing, API/DB assertion enrichment, failure diagnosis, healing rules) | `prompts/QA_PIPELINE.md` |
| This file | How to run the pipeline end-to-end, phase by phase, and the QA Review Gate between Phase 1 and Phase 2 |
