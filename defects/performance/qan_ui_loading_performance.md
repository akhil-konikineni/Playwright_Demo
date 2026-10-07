# QAN UI Loading Performance Investigation

## Environment

| | |
|---|---|
| Environment | QAN |
| Application | Eseye QAN Portal (`portal-host`) — micro-frontend / module-federation SPA (Next.js RSC) |
| Application URL | `https://portal-host.qan.aws.eseye.io` |
| Test account | `statususer` (status-tier user) |
| Test date | 2026-10-01, ~05:06–05:25 UTC |
| Tooling | Playwright MCP (live session) + browser Performance API (`navigation` + `resource` timing); read-only MySQL probe against `oncilla` |
| Evidence | `defects/performance/evidence/qan-loading-feature-navigation.png` + per-request timing tables below |

> **Measurement note.** Absolute "time-since-click" across separate MCP tool calls is contaminated by tool-orchestration latency (the in-page `performance.now()` clock keeps advancing while the harness round-trips). To avoid this, each feature was measured **entirely inside a single in-page `evaluate`** (click + poll-to-ready in one call). **Per-request TTFB and duration values are taken directly from the browser Resource Timing API and are accurate regardless of harness latency** — they are the primary evidence. TTFB here = `responseStart − requestStart` (pure server time, excludes download).

---

## Objective

Determine **where** the post-login loading delay occurs (left-nav availability and per-feature navigation), measure the real timings, identify the slow stages/requests, and classify likely root-cause candidates — **without** modifying the application, DB, or config. This is a baseline/measurement exercise, not an optimization.

---

## Login Performance

Login is a two-step form (username → Continue → password → Continue). After submit the browser performs a Cognito auth exchange on `/auth`, then redirects to `/` where the full application shell bootstraps. The table below is the **cold app-shell bootstrap** measured on the post-redirect `/` document (document `timeOrigin` = 05:09:43.412Z); timings are **offset from that document's start**.

| Stage | Observed | Evidence |
|---|---:|---|
| App-shell HTML document load (DOMContentLoaded ≈ load) | ~2,254 ms | `navigation` entry |
| `/api/auth/token` (token bootstrap) | TTFB 1,041 ms / dur 4,974 ms | resource timing |
| `/api/permissions` (gates nav visibility) | TTFB **1,631 ms** / dur 4,218 ms (5.2 KB) | resource timing |
| `/api/menu-config` (gates nav structure) | TTFB **1,167 ms** / dur 4,216 ms (**969 bytes**) | resource timing |
| `esm-module/AuthKeeper` (JS bundle) | TTFB 1,265 ms / dur **11,489 ms** / **1.50 MB** | resource timing |
| `esm-module/menu` (left-nav micro-frontend JS) | TTFB 1,264 ms / dur **13,383 ms** / **1.47 MB** | resource timing |
| 2nd `/api/auth/token` (refresh) @ ~13.7 s | dur 1,545 ms | resource timing |
| `catalog/languages` + `catalog/userSessionContext` @ ~15.6 s | ~270 ms each | resource timing |
| 3rd `/api/auth/token` @ ~17.0 s | 249 ms | resource timing |

**Observed:** the left-navigation menu depends on three things completing — the `esm-module/menu` JS bundle (1.47 MB, ~13.4 s to fully arrive), `/api/menu-config`, and `/api/permissions`. The two large JS modules (`menu` + `AuthKeeper`, ~3 MB combined) dominate the cold shell load; the menu/permissions **API** responses are small (<6 KB) but still cost **1.2–1.6 s of server time (TTFB)** each.

**Observed:** a full-page load re-runs this entire bootstrap. A `location.reload()` of a feature URL re-executed the whole shell (auth storm + menu + AuthKeeper + permissions + menu-config) before the feature rendered — the esm bundles served from cache (TTFB 0) but the shell still took **~16–27 s** end-to-end.

---

## Navigation Performance (per feature)

| Feature | State | Total to UI-ready | Slowest request (TTFB) | Status |
|---|---|---:|---|---|
| Data Centres | Cold (1st after login) | eventually rendered | esm-bundle 551 ms; catalog `dataCentre` 274 ms | OK (slow) |
| Data Centres | Warm (client-nav, run 1) | **2,101 ms** | catalog `genericOption` 723 ms | OK |
| Data Centres | Warm (client-nav, run 2) | **6,265 ms** | (under contention w/ Supernets) | OK (inconsistent) |
| IP Pools | Cold / 1st visit | did not render within 30 s window; rendered after | esm-bundle **long-lived 47,885 ms** conn; catalog `ipPool` 561 ms | Stalled then OK |
| Billing Transactions | Cold | **did not render within 30 s** | esm-bundle TTFB **3,922 ms**, request left **pending**; no catalog calls fired | Stalled |
| Provider Tariffs | Cold | **did not render within 35 s** | esm-bundle TTFB **9,346 ms**; no catalog calls fired | Stalled |

**Observed:** once a feature's micro-frontend bundle is cached, warm client-side navigation completes in **~2–6 s**. Cold first-access of a feature is gated by the `/api/esm-bundle/{module}` request and ranged from fast (~0.5 s) to **stalling the feature for 30 s+**.

---

## Slow Requests (sorted by server time / TTFB)

| Context | Method | Endpoint | Status | TTFB (server) | Duration |
|---|---|---|---:|---:|---:|
| Feature nav (Provider Tariffs, cold) | GET | `/api/esm-bundle/mno%2Fprovider-tariffs` | (pending in window) | **9,346 ms** | 20,632 ms |
| Feature nav (Billing, cold) | GET | `/api/esm-bundle/finance%2Fbilling-transactions` | pending | **3,922 ms** | 10,744 ms |
| Login bootstrap | GET | `/api/permissions` | 200 | 1,631 ms | 4,218 ms |
| Login bootstrap | POST | `/api/auth/token` | 200 | 1,041 ms | 4,974 ms |
| Login bootstrap | GET | `/api/menu-config` | 200 | 1,167 ms | 4,216 ms |
| Login bootstrap | GET | `/api/esm-module/AuthKeeper` | 200 | 1,265 ms | 11,489 ms (1.5 MB) |
| Login bootstrap | GET | `/api/esm-module/menu` | 200 | 1,264 ms | 13,383 ms (1.47 MB) |
| Feature nav (IP Pools) | GET | `/api/esm-bundle/network-management%2Fip-pools` | 200 | 954 ms | 47,885 ms (long-lived) |
| Warm catalog (Data Centres) | GET | `catalog/genericOption/execute` | 200 | 723 ms | 726 ms |
| Warm catalog (Data Centres) | GET | `catalog/dataCentre/execute` | 200 | 287 ms | 289 ms |

**Observed:** the largest single server-side waits are on `/api/esm-bundle/{module}` (the per-feature micro-frontend module endpoint), with **highly variable cold TTFB from ~0.5 s up to ~9.3 s**. Warm, the same endpoint serves from cache (TTFB 0). The `catalog/*/execute` data calls, once they fire, are consistently fast in this session (**~270–730 ms**).

---

## Retry / Failure Analysis

| Request | Observation | Count | Classification |
|---|---|---:|---|
| `POST cognito-idp.eu-west-1.amazonaws.com` | one **HTTP 400** then retried to success (200) | 1 fail + retries | Authentication |
| `GET catalog/identityUser/execute?username=statususer` | **HTTP 404**, issued **twice** (retry) | 2 | Authorization/identity lookup |
| `GET catalog/userSessionContext/execute` | **HTTP 404** | 1 | Session context (same 404 noted in prior report) |
| `POST /api/auth/token` | **FAILED — net::ERR_ABORTED** | 2 | Aborted in-flight token calls (superseded/cancelled) |
| `POST/DELETE /api/auth/token` | ~8 token create/delete operations during a single login | 8 | Auth-token churn |
| `GET /api/esm-bundle/{feature}` | request stays **pending** well beyond render window on cold access | repeated | Feature-load stall |

**Observed:** the login flow produces a burst of token operations (multiple POST/DELETE `/api/auth/token`, two of them aborted) plus two `404`-returning catalog lookups (`identityUser` ×2, `userSessionContext`). These do not hard-fail login but add round-trips and noise during the critical bootstrap window.

---

## API Timing Analysis

- **Important observation (cold feature nav):** the dominant delay on first access to a feature is the **`/api/esm-bundle/{module}` TTFB** (server time to begin sending the micro-frontend bundle), observed at **3.9 s (billing)** and **9.3 s (provider-tariffs)**. Because the feature's React code lives in that bundle, **no catalog/data calls can fire until the bundle arrives** — so a slow/stalled bundle blocks the whole feature (both pages sat on "Loading…" for the full 30–35 s measurement window).
- **Sequential dependency (warm):** on Data Centres warm nav, three metadata calls (`genericOption`, `objectDefinitions`, `statusTransition`) fire in parallel (~640–730 ms) and the actual list query `catalog/dataCentre/execute` only fires **after** them (at +1.5 s), adding a serial hop before the grid populates.
- **Long-lived esm connections:** each feature's `/api/esm-bundle/*` also shows a very long *duration* (observed **47.9 s** and **76.9 s**) at low incremental TTFB — consistent with a streaming / keep-alive module-federation connection rather than a render-blocking download. Flagged as a separate item; it is not the primary render-blocker (matches the note in the existing `api-response-latency-on-feature-navigation.md` report).
- **Warm catalog calls are fast:** 270–730 ms TTFB, so the catalog backend was **not** in a cold state during the feature-nav measurements in this session.

---

## UI Timing Analysis

- **Observed:** app-shell HTML/DOM is ready at ~2.25 s, but the **left-nav becomes usable only after** the 1.47 MB `esm-module/menu` bundle + `menu-config` + `permissions` complete — i.e. the nav is gated on the heavier of (big JS download) vs (1.2–1.6 s API TTFB), landing in the **~13–17 s** range on a cold login.
- **Observed:** feature pages render a bare **"Loading…"** placeholder and only swap to the grid once the feature bundle has loaded **and** its data calls have returned. When the bundle TTFB is high (or the request stalls), the page sits on "Loading…" with no visible progress — exactly the user-reported symptom (see evidence screenshot).
- **Observed:** warm client-side navigation was itself **inconsistent** (Data Centres 2.1 s vs 6.3 s on two runs), i.e. the delay is not purely first-load caching.

---

## Database Investigation

Read-only probe of `oncilla` (QAN RDS, `eu-west-1`) from the test client:

| Metric | Value |
|---|---:|
| Connect (TCP + handshake) | 948 ms |
| `SELECT 1` round-trip | 276 ms (client→RDS network RTT) |
| `dataCentre` rows | 249 (count query 284 ms) |
| `ipPool` rows | 173 (255 ms) |
| `providerTariff` rows | 541 (266 ms) |
| `billingTransaction` rows | 454 (258 ms) |
| Representative list query (`dataCentre`, 50 rows, status filter) | 284 ms |

**Observed / Conclusion:** all four resource tables are **small (173–541 rows)** and queries return in ~255–284 ms — a figure **dominated by the ~276 ms network round-trip from the test client to the in-region RDS**; actual execution on these tiny tables is sub-millisecond. **Data volume is not a factor, and the database is not the bottleneck.** Note also that the slowest endpoint — `/api/esm-bundle/{module}` — serves JavaScript modules and **does not query these tables at all**.

> Database-level per-API execution time *inside the services* could not be measured directly (no server-side APM available); this probe measures DB from the client side only. But the combination of tiny tables + fast queries + the esm-bundle endpoint being non-DB **rules DB out as the cause** of the observed multi-second TTFB.

---

## Root Cause Candidates

### Confirmed observations (facts)
1. Cold first-access to a feature is gated by `/api/esm-bundle/{module}`, whose **server-side TTFB is large and highly variable (observed 0.5 s → 9.3 s)**; when high, the feature sits on "Loading…" for tens of seconds with no data calls issued.
2. The cold login/app-shell is dominated by **two large JS modules** — `esm-module/menu` (1.47 MB) and `esm-module/AuthKeeper` (1.50 MB) — plus `permissions`/`menu-config` API TTFB of **1.2–1.6 s** each; the left-nav is usable only after these complete (~13–17 s cold).
3. Warm catalog data calls are **fast (~270–730 ms)**; the DB is **fast with trivial data volume**. Neither is the primary bottleneck in this session.
4. The login flow incurs **auth churn**: a Cognito 400→retry, two aborted `/api/auth/token` POSTs, and two 404 catalog lookups (`identityUser` ×2, `userSessionContext`).

### Likely contributors (evidence-based)
- **Primary:** server-side latency / cold behaviour of the **`/api/esm-bundle` and `/api/esm-module` module-serving layer** (the micro-frontend / module-federation host). The TTFB-heavy, highly-variable profile (and the fact that warm = cached = instant) points to a cold or contended module server (build/resolve on demand, cold container, or upstream CDN miss) rather than data processing. *Inference, strongly supported; not yet a confirmed server-side defect.*
- **Secondary:** large uncached JS bundle sizes (~3 MB of modules on cold login) inflate the shell load even when server time is modest.
- **Secondary:** per-feature **sequential metadata→data** call chain adds a serial hop to warm loads.
- **Minor/noise:** auth-token churn and 404 lookups add round-trips during the critical window.

### Unknown / Requires further investigation
- Whether `/api/esm-bundle`/`esm-module` is served by a serverless/container host with cold starts, a CDN, or an on-demand bundler — needed to confirm the module-server cold-start hypothesis.
- Idle timeout / how long a "warm" module endpoint stays warm before it goes cold again.
- Root cause of the two **aborted** `/api/auth/token` POSTs and the `identityUser`/`userSessionContext` **404s** (benign race vs real misconfiguration).
- Server-side (in-service) execution time of `permissions`, `menu-config`, and `esm-bundle` — needs backend APM.

---

## Summary

The user-perceived delay has **two distinct stages**, both server-time-dominated, and **neither is caused by the database**:

1. **After login → left-nav usable (~13–17 s cold):** gated by two large micro-frontend JS modules (`menu` 1.47 MB, `AuthKeeper` 1.50 MB) plus `permissions`/`menu-config` API TTFB of ~1.2–1.6 s, amid a burst of auth-token operations. A full page reload re-runs this entire ~16–27 s bootstrap.
2. **Clicking a feature → feature usable:** warm ≈ 2–6 s (inconsistent); **cold is dominated by `/api/esm-bundle/{module}` server TTFB**, observed up to **9.3 s** and occasionally stalling the feature on "Loading…" for 30 s+. Catalog data calls, once fired, are fast (~0.3–0.7 s).

**Primary bottleneck (evidence-based):** server-side latency of the **module-serving endpoints** (`/api/esm-bundle`, `/api/esm-module`) on cold/first access, compounded by large bundle sizes. **The database and the catalog data queries are not the bottleneck in this session.**

**Confirmed root cause:** Root cause could not be conclusively determined from the available (client-side) evidence — confirming it requires server-side APM on the module-serving and auth/permissions layers. The data **localises** the delay to those layers with high confidence.

---

## Recommendations for Further Investigation

1. Add server-side APM/timing on `/api/esm-bundle/*` and `/api/esm-module/*` to confirm where the cold TTFB (up to ~9 s) is spent (container spin-up vs on-demand build vs CDN miss).
2. Confirm the hosting model of the module layer; if serverless/container, evaluate keep-warm / provisioned concurrency; if CDN-fronted, check cache-hit ratios and TTL.
3. Measure bundle sizes against a budget — `menu` (1.47 MB) and `AuthKeeper` (1.50 MB) are large for a bootstrap-blocking path; investigate code-splitting / long-term caching headers.
4. Investigate the aborted `/api/auth/token` POSTs and the `identityUser`/`userSessionContext` 404s to remove avoidable round-trips from the login critical path.
5. Consider skeleton/progressive rendering so the grid shell appears while the bundle/data load, instead of a full-page blank "Loading…".
6. Re-run this baseline at different times of day and after idle periods to quantify cold-vs-warm frequency for real users.

---

## Clean-cache (incognito) vs Cached-window Comparison

To isolate **what caching actually changes**, two controlled passes were run on the same browser context, controlling the HTTP cache via a CDP session (`Network.clearBrowserCache` / `clearBrowserCookies`). Each pass was executed inside a single Playwright script (Node-side `Date.now()` timing — no harness-latency contamination) using locator-based readiness (`waitForURL` + a *new* `catalog/{resource}/execute` completing + grid visible), not stale text.

- **Clean window** = cache + cookies + storage emptied, then fresh login → reproduces a **first-ever / incognito visit** (every JS bundle fetched from the server, uncached).
- **Cached window** = same context immediately afterwards, nothing cleared → bundles served from the browser cache (returning visitor).

### Shell / login bootstrap

| Request | Clean (uncached) TTFB / dur / size | Cached TTFB / dur |
|---|---|---|
| `esm-module/menu` | 1,146 ms / 9,116 ms / 144 KB | **0 ms / 0 ms (from cache)** |
| `esm-module/AuthKeeper` | 3,140 ms / 10,378 ms / 146 KB | **0 ms / 0 ms (from cache)** |
| `/api/permissions` | 3,624 ms / 6,918 ms / 5.2 KB | not re-fetched / not cacheable API* |
| `/api/menu-config` | 2,644 ms / 6,917 ms / 969 B | not re-fetched / not cacheable API* |
| **Left-nav usable** | **did NOT render within 70 s** | **1,108 ms** |

<sub>*On the warm reload, `permissions`/`menu-config`/`auth/token` did not re-appear in the resource-timing snapshot (served from memory state or fired after the nav-ready snapshot). These are dynamic APIs and are **not** HTTP-cacheable — they hit the server on a genuine new session.</sub>

### Feature navigation

| Feature | Clean (uncached) | Cached |
|---|---|---|
| Data Centres — bundle | **4.25 MB**, TTFB 1,581 ms, **47,495 ms** to download | TTFB **0 ms / 0 ms (cache)** |
| Data Centres — time to usable | **60,306 ms (~60 s)** | **2,524 ms** |
| Billing Transactions — bundle | (uncached, large) | TTFB **0 ms / 0 ms (cache)** |
| Billing Transactions — time to usable | — | 16,462 ms (bundle cached, but `catalog/billingTransaction/execute` TTFB **5,571 ms**) |
| Data Centres — data call (cached) | — | `catalog/dataCentre/execute` TTFB 2,167 ms |

### What the difference tells us (two independent cost layers)

1. **First-visit / incognito cost — CACHE-FIXABLE (client/CDN layer).** The dominant cost on a clean window is **downloading large uncached JavaScript bundles** — shell modules (~0.3 MB) plus a **4.25 MB per-feature bundle** that alone took **47.5 s** to arrive. On a clean cache the left-nav didn't even become usable within 70 s, and Data Centres took ~60 s. **Caching removes almost all of this** (bundles → TTFB 0): nav-ready dropped **70 s+ → 1.1 s** and Data Centres **60 s → 2.5 s**.

2. **Recurring cost — NOT cache-fixable (server-side API/auth layer).** Even with every bundle served from cache, the window still waits on **server-side TTFB of dynamic APIs**: `auth/token`, `permissions`, `menu-config`, and `catalog/{resource}/execute`. These returned **2–5.6 s TTFB** in the cached run (Billing still took **16.5 s** cached purely because its catalog data call had a 5.6 s server TTFB). HTTP caching cannot help here because these responses are per-session/per-query.

**Bottom line of the comparison:** a cached (returning) window is **dramatically faster** — the enormous bundle-download penalty is a **one-time, cache-fixable, first-visit cost** (reducible via smaller/code-split bundles + long-lived cache headers + CDN). What remains in a cached window, and therefore what *every* user hits *every* session, is **server-side API/auth latency** — this is the part that needs backend work (bundle caching will not fix it). The user-reported "slow after login, slow opening features" is worst on first/incognito visits (bundle download) and still present but smaller on cached visits (server API TTFB).

---

## Related

- Existing report `defects/performance/api-response-latency-on-feature-navigation.md` (2026-09-16) documented the **catalog `/api/catalog/*/execute` cold-start (~5 s)**. This investigation did **not** reproduce a catalog cold-start in this session (catalog calls were fast), but **newly identifies the `/api/esm-bundle`/`esm-module` module layer** as the dominant cold-navigation bottleneck and documents the login/app-shell bootstrap cost. The two reports are complementary.
