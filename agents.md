# Project rules for AI agents — Playwright QA Pipeline

You are working in a Playwright JavaScript QA automation project for the **Eseye QAN Portal**, built around a three-phase AI pipeline: **Planner → (QA Review Gate) → Generator → Healer**.

Read this file first, always. It is the single shared rulebook every agent (`playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`) defers to. Each agent's own `.github/agents/*.agent.md` file contains only what is unique to its phase — mission, workflow, and output format. **If anything in an agent file conflicts with this file, this file wins.**

For the full business/domain rules (permissions, status transitions, module validation rules, scenario generation rules), see [`context/permissions_and_status_model.md`](context/permissions_and_status_model.md). For environment setup, see [`context/setup.md`](context/setup.md).

---

## Stack

- Playwright (JavaScript specs, page objects, and utils — CommonJS throughout)
- Node.js 18+
- Test runner: `@playwright/test`
- MCP server: `npx playwright run-test-mcp-server` (all three agents connect through this)
- DB: MySQL (`oncilla` schema) — see [`context/db_validation.md`](context/db_validation.md)

## Folder structure

```
Playwright_MCP/
  agents.md                        ← this file
  .env                              ← URL / USERNAME / PASSWORD (+ optional ENVIRONMENT, QA_DB_* — never commit)
  .github/agents/                   ← the three thin agent files
    playwright-test-planner.agent.md
    playwright-test-generator.agent.md
    playwright-test-healer.agent.md
  context/
    setup.md                          ← one-time environment setup checklist
    permissions_and_status_model.md   ← permission matrix, status transitions, module validation rules
    apn_context.md                    ← APN module-specific business context
    transaction_context.md            ← Transactions module-specific business context
    db_validation.md                  ← DB queries for capability checks, precondition checks, negative TCs
  test-cases/
    test-plans/<module>_testcoverage.md   ← Planner output: discovery report + plan (for automation engineers)
    test-cases/<module>_testcoverage.csv  ← Planner output: formal test cases (for QA review, then Generator)
  tests/
    <module>/<scenario>.spec.js       ← one file per scenario, e.g. tests/datacentre/*.spec.js
  pages/
    common/                          ← base_page.js, login_page.js, navigation_page.js
    <module>/                        ← <Module>ListPage.js, <Module>CreatePage.js, <Module>DetailsPage.js, <Module>FilterPanel.js
  testdata/<module>/                 ← <module>.json (positive), <module>-negative.json
  utils/
    api/                              ← <module>Api.js — API request helpers
    assertions/                       ← <module>Assertions.js
    data/                             ← generate_test_data.js
    db_utils.js                       ← DB query helpers
  fixtures/test_fixtures.js
  constants/<module>.js
  enums/<module>.js
```

Mirror this structure for every new module — do not invent a parallel structure.

## Known Modules

APN · MNO · Supernet · ProviderRate · ProviderTariff · IPPool · Orders · DataCenters · Portfolio · Transactions · Network Management · Feature Management · any newly discovered module

## Attribute-Eligible Modules

MNO · APN · ProviderRate · ProviderTariff · Supernet · IPPool · DataCenter · Portfolio

## Dynamic Test Data Pattern

Always generate unique identifiers for create scenarios:
- `` `Auto_Test_${Date.now()}` ``
- `` `MCP_AI_${Math.random().toString(36).slice(2)}` ``
- `` `QA_${moduleName}_${new Date().toISOString()}` ``

## Coding conventions

- One test per file — never multiple scenarios in one spec file.
- `test.describe()` block name must exactly match the section name from the plan, including its ordinal prefix (e.g. `S1 — View DataCenters`).
- `test()` title must exactly match the scenario/`Summary` name from the source CSV.
- Include a `// spec: <plan file>` comment at the top of every generated spec file.
- Web-first assertions only (`expect(locator).toBeVisible()`, etc.) — never `page.waitForTimeout()` or `waitForNetworkIdle`.
- Store test data in `testdata/<module>/<module>.json` (positive) and `<module>-negative.json` (negative) — no bulky inline test data in spec files.
- Every test must end in a clean state; the next test must never depend on the previous test remaining logged in.

## Artifact Capture

`playwright.config.js` is already configured — do not override these inline in spec files:

| Setting | Value | Behaviour |
|---|---|---|
| `screenshot` | `'only-on-failure'` | Auto-captured to `test-results/` on failure |
| `video` | `'retain-on-failure'` | Video kept only for failing tests |
| `trace` | `'on-first-retry'` | Full trace (DOM + network + console) captured on first retry |

Open a trace with `npx playwright show-trace <path>.zip` to replay the exact UI state at every step.

### Visual Regression Snapshots (release regression runs)

For key UI states per module, add `toHaveScreenshot()` assertions so Playwright can detect UI changes between releases:

```js
// At list page load, create form, and detail view — one per major state
await expect(page).toHaveScreenshot('datacentre-list-loaded.png', { maxDiffPixelRatio: 0.02 });
await expect(page).toHaveScreenshot('datacentre-create-form.png', { maxDiffPixelRatio: 0.02 });
```

**Naming pattern:** `<module>-<page>-<state>.png` — all lowercase, hyphens, no spaces.
Examples: `apn-list-loaded.png`, `datacentre-create-form.png`, `ippool-detail-view.png`

**Baselines** are stored automatically in `tests/<module>/__snapshots__/` when first run with `--update-snapshots`.

**When `toHaveScreenshot` fails**, Playwright writes three files to `test-results/`:
- `actual.png` — what the UI looks like now
- `expected.png` — the baseline
- `diff.png` — red overlay showing exactly what changed

The **Healer agent** must read the diff image before diagnosing a snapshot failure — the diff reveals whether the UI changed intentionally (update the baseline) or broke (fix the test/app).

---

## Forbidden

- Do not generate SQL injection, XSS, CSRF, security/penetration, API load/stress/performance, network failure, or browser-compatibility test cases — out of scope for this pipeline.
- Do not add API or DB verification steps to the Planner's CSV output — the CSV is UI/functional steps only; API/DB assertions belong only in the Generator's `.spec.js` output.
- Do not hardcode credentials in generated test code — read from environment/config.
- Do not commit `.env` or credentials.
- Do not use `page.waitForTimeout()` or `waitForNetworkIdle` anywhere, ever (setup, generation, or healing).
- Do not silently skip or suppress a failing assertion — see the Healer's rules in its own agent file for the only sanctioned exception (`test.fixme()` with a mandatory explanatory comment).

## When you (the agent) are unsure

- Never assume a field, API, DB table, or UI behavior that has not been directly observed live — discover it via the browser/MCP tools.
- If a required source file (reviewed CSV, plan `.md`, context file) is missing, stop and say so rather than inventing its contents.
- Prefer a smaller, targeted change over a large refactor.

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
