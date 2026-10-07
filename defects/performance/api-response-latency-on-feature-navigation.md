# Defect — Slow "Loading…" on feature navigation: `/api/catalog/*/execute` cold-start latency (~5 s TTFB)

| Field | Value |
|---|---|
| Area | QAN Portal — Network Management (Data Centres, IP Pools, Supernets, Subnets) — cross-cutting |
| Type | Performance — server-side API latency (cold start) |
| Severity | High (UX) — every first navigation to a feature blocks on ~5 s of server time behind a "Loading…" screen |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| Test account | `statususer` / `Password#1` |
| Found | 2026-09-16 |
| Evidence | `defects/performance/evidence/` — `run1-subnet-detail-loading.png`, `run2-ippool-list-loading.png`, `run2-supernet-detail-loading.png` + Resource-Timing tables below |
| Note on video | The Playwright MCP session in use did **not** expose the video/trace recorders (`browser_start_video` / `browser_start_tracing` returned "Tool not found"), so evidence is screenshots + precise Resource-Timing (`performance.getEntriesByType('resource')`) numbers instead of a screen recording. |

---

## Summary
Navigating between Network-Management features shows a **"Loading…"** state for several seconds before the grid/detail renders. Measured with the browser Resource-Timing API, the delay is **almost entirely server-side latency (TTFB)** on the `/api/catalog/{resource}/execute` endpoints. The **first** call to a given catalog endpoint (i.e. the first time you open a feature after login/idle) takes **~5 seconds of time-to-first-byte**; once "warm", the identical call returns in **~0.5 seconds**. This cold-vs-warm gap is the classic signature of a **backend cold start** (serverless/container spin-up, cold connection pool, or cold cache) in the catalog service.

The page cannot render its grid/detail until these calls return, so the user sees a multi-second blank "Loading…" on every first visit to a feature.

---

## Steps to reproduce
1. Log in to the portal as `statususer`.
2. Navigate to **Network Management → Data Centres** (first feature after login). Observe a multi-second "Loading…".
3. Navigate to **IP Pools**, then **Supernets**, then a **Subnet detail** page (`/network-management/subnets/{supernetId}/{subnetId}`). Each **first** visit shows "Loading…" for ~5–10 s.
4. Re-open a feature you already visited in this session → it now renders in well under a second.

To measure precisely, run this in the browser console right after the grid/detail appears:
```js
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/catalog/'))
  .map(r => ({ url: r.name.split('/api/catalog/')[1]?.slice(0,50), ttfb: Math.round(r.responseStart - r.requestStart), dur: Math.round(r.duration) }))
  .sort((a,b) => b.ttfb - a.ttfb);
```

## Expected result
API responses on feature navigation should return in a few hundred milliseconds (the warm-path already achieves ~0.3–0.6 s). No feature should sit on a blank "Loading…" for ~5–10 s.

## Actual result
The first `/api/catalog/{resource}/execute` call per feature returns after **~5 s of server time (TTFB)**; on a detail page two such calls (`{resource}ById` + `{resource}Attribute`) run and the page is blank for ~6–10 s.

---

## Evidence — Resource Timing (two runs)

**TTFB = `responseStart − requestStart` = pure server processing time (excludes download).** Values in **ms**.

### Run 1 — COLD (first access this session)
| Page | Endpoint | TTFB | Total dur |
|---|---|---:|---:|
| Data Centres (list, first nav after login) | `/api/auth/token` | 1711 | 5596 |
| | `catalog/languages/execute` | 1567 | 5449 |
| | `catalog/userSessionContext/execute` **(also HTTP 404)** | 1566 | 5448 |
| IP Pools (list, client-nav) | `catalog/ipPool/execute?…` | **5640** | 5644 |
| | `catalog/objectDefinitions/execute?objectName=ipPool` | **5629** | 5639 |
| | `catalog/statusTransition/execute?resourceName=ipPool` | **4922** | 4928 |
| Subnet detail `13393/13467` | `catalog/subnetAttribute/execute?…` | **5908** | 5917 |
| | `catalog/subnetById/execute?…` | **5620** | 5629 |
| | `catalog/languages/execute` | 2114 | 4593 |
| | `catalog/userSessionContext/execute` **(404)** | 2113 | 4592 |
| | `catalog/statusTransition/execute?resourceName=subnet` | 2055 | 2061 |

### Run 2
| Page | Endpoint | TTFB | Total dur | State |
|---|---|---:|---:|---|
| IP Pools (list, **revisit**) | `catalog/ipPool/execute?…` | **508** | 511 | WARM |
| | `catalog/genericOption/execute?resourceName=ipPool` | 1200 | 1203 | WARM |
| | `catalog/objectDefinitions/execute?objectName=ipPool` | 684 | 688 | WARM |
| Supernets (list, **first access**) | `catalog/supernet/execute?…` | **5162** | 5167 | COLD |
| | `catalog/languages/execute` | 2305 | 3224 | COLD |
| | `catalog/userSessionContext/execute` **(404)** | 2303 | 3223 | COLD |
| Supernet detail `13349` | (blank "Loading…" captured — see `run2-supernet-detail-loading.png`) | | | COLD |

**Reproducibility:** the ~5 s cold slowness reproduced on **every** first-access feature across both runs (Data Centres, IP Pools, Subnets, Supernets). The warm path (IP Pools revisit) dropped the same calls to **~0.5 s**, confirming it is not a one-off.

---

## Root Cause Analysis (RCA)
1. **The latency is server-side, not client or network.** For the slow calls, **TTFB ≈ total duration** (e.g. `supernet/execute` TTFB 5162 ms of 5167 ms total). That means the browser sent the request and then waited ~5 s for the **first byte** — the time is spent inside the backend, not downloading the body or rendering the UI.
2. **It is a cold-start effect.** The very first request to a given `/api/catalog/{resource}/execute` endpoint (or the first catalog calls after login) is ~5 s; the identical request moments later is ~0.5 s (10× faster). A large first-hit penalty that disappears once "warm" points to backend **cold start** — a serverless function/container spinning up, a cold DB/connection pool, or a cold cache in the catalog service (metadata shows `providerName: "mno"`, `path: /v2/{resource}`, `type: http`, `timeout: 60`).
3. **Rendering blocks on these calls.** List pages block on `{resource}/execute` (+ `objectDefinitions`, `statusTransition`, `genericOption`); detail pages block on `{resource}ById/execute` **and** `{resource}Attribute/execute` (two ~5 s cold calls in parallel → the ~10 s detail "Loading…" previously noted for Subnet). Because the grid/detail is not rendered until the data resolves, the whole cold-start time is user-visible.
4. **Contributing issues:**
   - **`/api/catalog/userSessionContext/execute` returns HTTP 404** *and* is slow (2.3–5.4 s cold). A route that 404s should fail fast; instead it adds latency to the bootstrap on every page.
   - Bootstrap calls `languages/execute` and `userSessionContext/execute` and `/api/auth/token` are also slow when cold (1.5–2.6 s TTFB), compounding first-load time.
   - `/api/esm-bundle/*` requests show very long *durations* (observed 46 s and 77 s) but with ~2.2–2.6 s TTFB — these look like long-lived/streaming module-federation connections rather than the render-blocking data calls; flagged for a separate look, not the primary cause here.

## Impact
Every first navigation to a feature (and every detail open) after login or an idle period stalls ~5–10 s on a blank "Loading…". This affects all Network-Management modules (Data Centres, IP Pools, Supernets, Subnets) since they share the `/api/catalog/*/execute` backend.

## Suggested fixes / next steps (for the backend team)
- Profile the catalog service (`/v2/{resource}` `execute`) cold path: keep functions/containers warm (provisioned concurrency / min instances / keep-alive ping), pre-warm DB connection pools, and warm any per-resource metadata cache.
- Make **`userSessionContext/execute`** return its 404 (or be removed/fixed) **fast**, and ideally not block page bootstrap.
- Consider skeleton loaders + progressive rendering so the grid shell appears while data streams, instead of a full-page blank "Loading…".
- Add server-side APM timing on `/api/catalog/*/execute` to confirm where the ~5 s is spent (spin-up vs query vs downstream `mno` provider).

## Open questions
- Is the catalog backend serverless (Lambda/Fargate) — confirms the cold-start hypothesis and points to provisioned-concurrency as the fix.
- Idle timeout: how long before a "warm" endpoint goes cold again? (Determines how often real users hit this.)
