# DB Investigation — How Portfolios relate to SIMs / ICCIDs (Integration `oncilla`)

Read-only investigation (SELECT/SHOW only) supporting NUI-1827 / NUI-2615 / NUI-192 SIM Assignment testing. Connection: `INTEGRATION_DB_*` from `.env.integration` (host `eseye-integration-db-master…rds.amazonaws.com`, db `oncilla`, user `tigrillo`).

## 1. The relationship model

```
icc (the SIM/ICCID)                         iccType (ES4711, ES5610, …)
  iccId  PK (char20)                          iccTypeId PK, title, iccMnoId
  iccTypeId ──────────────► iccType.iccTypeId
  iccMnoId, status, …                        iccMno (network, e.g. AT&T USA)
      │
      │ 1 : 1  (icc2PortfolioPackage.iccId is UNIQUE)
      ▼
icc2PortfolioPackage  ── THE LIVE SUBSCRIPTION / ASSIGNMENT RECORD
  icc2PortfolioPackageId PK
  iccId          UNIQUE ► icc.iccId        (each SIM has exactly ONE current subscription)
  portfolioId    ───────► portfolio.portfolioId
  packageId      ───────► package.packageId
  commsProfileId, contractStartDate/EndDate, portfolioStartDate, packageStartDate, status

portfolio                                   package
  portfolioId PK (char32)                     packageId PK
  name, title, status                         title, name, status, price, …
  parentPortfolioId ─► portfolio (self-nest)
  portalId ─► portal

packagePortfolio  (which packages a portfolio may sell — N:M)
  packageId ─► package     portfolioId ─► portfolio     status
```

**Key facts established:**
- **A SIM's portfolio = `icc2PortfolioPackage.portfolioId`.** The `icc` table itself has **no** `portfolioId`; the link is only through this junction.
- `icc2PortfolioPackage.iccId` is **UNIQUE** → a SIM belongs to exactly **one** portfolio+package at a time (its current subscription). "Assigning" a SIM writes/updates this row.
- **"ICCIDs within a portfolio"** = `SELECT iccId FROM icc2PortfolioPackage WHERE portfolioId = ? AND status='active'`.
- `packagePortfolio` says which packages a portfolio *offers*; `icc2PortfolioPackage` says which package a SIM *has*.

## 2. Concrete data (verified)

**Test SIM `89011703278149842208`** (NUI-1827/2615 ticket data):
| iccStatus | iccType | portfolioId | portfolio | packageId | package | subStatus | contract |
|---|---|---|---|---|---|---|---|
| active | ES4711 | `0` | All portfolios | 12421 | 7PGPS-2MBGlobalAT&TPla_12421 | active | 2018-08-31 → 2019-08-31 (expired) |

**Portfolio `0` = "All portfolios"** (title `Allportfolios`, active, parent `fd652405…`, portal `970c36ae…`) — the global/root bucket. Holds **57,853 active** subscriptions. This is the "All Portfolios (0)" referenced in the tickets' test-data comment.

**Real customer portfolios (sample):** SIM `89500990000000000005` (ES0000) → *Yoco Technologies API Testing*; top holders by SIM count: M-Kopa Ltd (1.19M), Telli Health (210k), CHEP USA (206k), Bosch Lawn & Garden (200k)…

## 3. Package eligibility model (drives NUI-192 Package dropdown)

The SIM-Assignment Package dropdown calls `GET /api/catalog/iccTypePackage/execute?iccTypeId=<type>&portfolioId=<pf>` (`/v2/iccType/{iccTypeId}/getPackage`). There is **no** `iccTypePackage` table — the endpoint computes eligibility with a **two-step check** (verified against real data end-to-end):

**Step 1 — ICC type → comms profiles, via `resourceRelationship` (RR).**
Find RR rows where `sourceResourceName='iccType'`, `sourceResourceId=<iccTypeId>`, `destinationResourceName='commsProfile'`, `relationship='consumer'`, `status='active'`. The `destinationResourceId`s are the **commsProfileIds** the ICC type can consume.
```sql
SELECT destinationResourceId AS commsProfileId
FROM resourceRelationship
WHERE sourceResourceName='iccType' AND sourceResourceId=<iccTypeId>
  AND destinationResourceName='commsProfile' AND relationship='consumer' AND status='active';
```

**Step 2 — comms profile must be a package offered by the selected portfolio.**
Each `commsProfileId` **is** a `packageId` — verified: in `packageCommsProfile` **all 5,588 rows have `packageId = commsProfileId`** (1:1, same numeric id). So a package is eligible iff that id is present in `packagePortfolio` for the selected portfolio (active). Full replication of the endpoint:
```sql
SELECT DISTINCT pp.packageId, pk.title
FROM packagePortfolio pp
JOIN package pk            ON pp.packageId = pk.packageId
JOIN packageCommsProfile pcp ON pcp.packageId = pp.packageId
JOIN resourceRelationship rr ON rr.destinationResourceId = CAST(pcp.commsProfileId AS CHAR)
     AND rr.sourceResourceName='iccType' AND rr.sourceResourceId=<iccTypeId>
     AND rr.destinationResourceName='commsProfile' AND rr.relationship='consumer' AND rr.status='active'
WHERE pp.portfolioId=<portfolioId> AND pp.status='active' AND pk.status='active';
```
**Verified example:** iccType **237 (ES5610)** + portfolio **RL Capital Ltd** → the query returns exactly **package 15582** (`commsProfileId 15582`), which is the single package the UI dropdown showed.

- Consequence: a portfolio with many active packages still shows **"No results"** when none of its packages' commsProfiles are `consumer`-linked to the SIM's ICC type. Verified: *Data Print Telecom* & *Marketplace Customer* (548 active pkgs) → 0 for ES4711 (iccType 141); *RL Capital Ltd* → 1 for ES5610.
- Chain summary: `iccType --RR(consumer)--> commsProfile == package --packagePortfolio--> portfolio`.
- (Earlier note that eligibility went via `packageItemMcc.mnoId` was a wrong guess — the real path is the RR `consumer` relationship above.)

## 4. Cross-cutting findings for the SIM-Assignment feature

1. **[Potential gap] Validation checks existence only, not assignment status.** The Validate step calls only `simById` (200 = success). A SIM **already assigned to another (real) portfolio validates as "success"** — e.g. ES5610 `8944538523018602170` is live in *RL Capital Ltd* yet validated green. Because `icc2PortfolioPackage.iccId` is UNIQUE, submitting would **reassign** it (move it off its current portfolio/package). Confirm whether the flow should warn when a SIM is already assigned / belongs to a different customer, or whether silent reassignment is intended.
2. **[Defect] 401 shown as "ICCID not found"** (see NUI-2615 report) — session/auth failures during validation are indistinguishable from genuine not-found.
3. **[Confirm design] Package ICC-type gating** produces empty dropdowns with no explanation (NUI-192 finding #1/#2).
4. Test-data note: the `8901170327814984xxxx` block is a dense sequential test range (781/800 present) — useful for sequential tests; the first missing base tail is **84283** (→ `89011703278149842836`).

## 5. Queries used (read-only)
Runner: `scratchpad/dbq.js` (guards to SELECT/SHOW/DESCRIBE/EXPLAIN/WITH only). Examples:
- SIM full picture: `icc ⋈ iccType ⋈ icc2PortfolioPackage ⋈ portfolio ⋈ package WHERE iccId=?`
- ICCIDs in a portfolio: `icc2PortfolioPackage WHERE portfolioId=? AND status='active'`
- Portfolios offering a package: `packagePortfolio ⋈ portfolio WHERE packageId=?`
- Portfolios holding a given ICC type: `icc2PortfolioPackage ⋈ icc WHERE iccTypeId=?`
