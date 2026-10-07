# Playwright QA Automation Framework — Structure & Conventions

**Purpose.** End-to-end UI test automation for the **Eseye QAN Portal**, built on Playwright with a
Page-Object-Model (POM) architecture. The **same test code runs unchanged** against
**QAN / Integration / Stage / Prod** — only the active environment (`TEST_ENV`) changes.

**What's in this repo vs. local.** This repository holds the **test framework** (config, page objects,
fixtures, specs, utilities, CI/CD) plus the **QA outputs** (formal test coverage and the defect log).
The internal *AI test-authoring* artifacts — the curated feature context, the reverse-engineered database
knowledge base, and the agent workflow specs — are **kept local and gitignored** (see "Local-only" at the
foot of this document); they support test authoring but are not part of the shared framework.

---

## Directory tree (shared repo)

```
Playwright_MCP/
├── playwright.config.js          # single chromium project · baseURL from ENV · serial (workers:1) · html+junit reporters
├── package.json / package-lock.json
├── .env.example                  # committed template (placeholders only; real .env.<env> are gitignored secrets)
├── .gitignore
├── .gitlab-ci.yml                # GitLab CI/CD pipeline
│
├── config/
│   └── env.js                    # the ONLY reader of process.env; resolves TEST_ENV → one frozen ENV interface
│
├── constants/                    # no magic strings anywhere else
│   ├── endpoints.js              # BFF API paths
│   ├── routes.js                 # UI route paths
│   ├── permissions.js            # capability enums
│   └── statuses.js               # status enums
│
├── pages/                        # Page Object Models — locators + flows live here, never in specs
│   ├── base/
│   │   └── base.page.js          # BasePage: shared helpers; all POMs extend it
│   ├── common/
│   │   ├── login.page.js         # WAF-aware two-step login + logout
│   │   └── navigation.page.js    # sidebar + direct routing
│   └── datacentre/
│       ├── datacentre-list.page.js
│       ├── datacentre-detail.page.js
│       └── datacentre-filter.component.js
│
├── fixtures/
│   └── test-fixtures.js          # extends base test → injects POMs + applyAuthHooks(test)
│
├── utils/                        # reusable helpers (not page-specific)
│   ├── api/datacentre.api.js     # API-level client wrappers (for API assertions)
│   ├── db/
│   │   ├── db-client.js          # mysql2 helper for the `oncilla` schema (reads ENV.db)
│   │   └── datacentre.db.js      # feature-specific DB assertions
│   └── assertions/               # custom / soft assertion helpers
│
├── tests/                        # ONE spec per feature: {feature}.spec.js
│   ├── datacentre.spec.js        #   describe('DataCentre') → nested describe per scenario group (S1 VIEW, S2 FILTER, …)
│   └── ippool.spec.js            #   describe('IP Pool') → scenario groups S1–S7 (scaffold; POMs are Phase 2)
│
├── testdata/                     # all test data lives here (data is driven into the app from this folder)
│   ├── datacentre/               # per-feature static JSON (positive + negative)
│   └── generate_test_data.js     # dynamic-value helpers (uniqueTitle / uniqueName) for runtime data
│
├── test-scenarios/               # formal test coverage (QA-reviewed, importable)
│   ├── test-plans/{feature}_testcoverage.md    # discovery report + scenario plan
│   └── test-cases/{feature}_testcoverage.csv   # formal test cases
│
└── defects/                      # DEFECT LOG — one .md per defect, grouped by module
    ├── {module}/{slug}.md        # e.g. ippool/…, subnet/…  (verbatim evidence + repro + coverage impact)
    └── performance/…             # perf findings + evidence/ screenshots
```

---

## Architectural layers (how a test flows)

```
 tests/{feature}.spec.js   →  declarative: calls POM methods + asserts
        │ imports { test, expect, applyAuthHooks } from fixtures/test-fixtures.js
        ▼
 fixtures/test-fixtures.js →  injects POMs, applies per-test login/logout hooks
        ▼
 pages/**/*.page.js        →  all locators + UI flows (extend pages/base/base.page.js)
        ▼
 config/env.js (ENV)       →  baseURL / credentials / db — resolved once from TEST_ENV
        ▼
 utils/db, utils/api       →  DB + API assertions (the "oracle" for each check)
```

**Design principles**
- **One spec per feature** — `tests/{feature}.spec.js`, organized with a top-level `describe('{Feature}')`
  and nested `describe`s per scenario group (`S1 — VIEW`, `S2 — FILTER`, …). Adding a feature = a new
  `tests/{feature}.spec.js` + its POMs under `pages/{feature}/`.
- **Specs stay declarative** — locators and flows live in POMs, never in specs.
- **No magic strings** — statuses, capabilities, routes, endpoints come from `constants/`.
- **Config is centralized** — only `config/env.js` reads `process.env`; everything else imports the
  frozen `ENV`. Switching environments = changing `TEST_ENV`, never code.
- **Per-test auth** — each test logs in fresh (cookies cleared) and logs out after; runs **serially**
  (`workers: 1`) so concurrent logins don't trip the portal's WAF.
- **Naming** — kebab-case with role suffix: `*.page.js`, `*.component.js`, `*.spec.js`, `*.api.js`, `*.db.js`.

---

## Environments

| Selector | Loads | Exposes (stable interface) |
|---|---|---|
| `TEST_ENV=QAN` \| `INTEGRATION` \| `STAGE` \| `PROD` | `.env.<env>` | `ENV.baseURL` · `ENV.credentials.{username,password}` · `ENV.db.{host,user,password,database}` |

`config/env.js` maps each environment's `<ENV>_*` variables onto that one stable `ENV` object and
**fails fast** (`assertEnv()`) if the active environment is misconfigured. Secrets live only in the
gitignored `.env.<env>` files (locally) or CI/CD variables (pipeline) — never in the repo.
`.env.example` is the committed placeholder template.

---

## Running

```bash
npm test                  # run the whole suite (default TEST_ENV=QAN)
npm run test:dc           # run the Data Centre feature spec
npm run test:headed       # headed mode
npm run report            # open the last HTML report
TEST_ENV=STAGE npm test   # run the same tests against Stage
```

---

## CI/CD

| Platform | File | Trigger |
|---|---|---|
| **GitLab** (tracked) | `.gitlab-ci.yml` | schedule or manual "Run pipeline" — **not** every push (WAF-sensitive live login) |

`.gitlab-ci.yml` is the pipeline that ships with the repo. It installs deps + browsers, publishes the
HTML report, emits **JUnit** (pipeline Tests tab), and runs under `xvfb` (the config is headed by design —
`headless:false`). *(A local GitHub Actions workflow exists under the gitignored `.github/` folder but is
not part of the shared repo.)*

**Runner & secrets:** these are LIVE tests hitting the real portal + DB, so the runner must reach both
hosts (typically a self-hosted / internal runner). Provide secrets as **CI/CD variables** (masked +
protected): `QAN_URL`, `QAN_USERNAME`, `QAN_PASSWORD`, `QAN_DB_HOST`, `QAN_DB_USER`, `QAN_DB_PASSWORD`,
`QAN_DB_NAME`. `config/env.js` reads them straight from the environment — no `.env` file is written in CI.

---

## Not committed (gitignored)

- **Secrets / deps:** `node_modules/` · `.env` + `.env.<env>` (`.env.example` **is** committed).
- **Generated artifacts:** `playwright-report/` · `test-results/` · `ortoni-report/` · `blob-report/` ·
  `.playwright-mcp/` · `playwright/.cache/`.
- **Tool-local:** `.vscode/` · `.mcp.json` (MCP config) · `.github/` (Actions + agent specs) ·
  `.claude/settings.local.json` · `.npm/` · `docs/` (external tool guides) · OS/editor cruft.
- **Local-only AI-authoring artifacts** — kept on disk for local test authoring, gitignored, and **not**
  part of the shared framework repo.
