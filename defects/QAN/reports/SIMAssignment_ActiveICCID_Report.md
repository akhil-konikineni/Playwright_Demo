# SIMAssignment_ActiveICCID_Report

## Test Summary
| | |
|---|---|
| Scenario | Scenario 4 — Active ICCID |
| Execution date | 2026-10-06 (QAN) |
| Tester | QA (automated UI+DB), user `resellerqa` |
| Environment | QAN — https://portal-host.qan.aws.eseye.io · DB `oncilla` |
| ICCID used | **89500990000000120019** (ES0000, **icc.status=active**) |
| Result | Validate ✅ · **Package reassigned ✅ (write succeeded)** · No restriction on already-active · No job |

## Database Evidence
**Query:**
```sql
SELECT pp.iccId, i.status, t.title, pp.packageId FROM icc2PortfolioPackage pp
JOIN icc i ON pp.iccId=i.iccId JOIN iccType t ON i.iccTypeId=t.iccTypeId
WHERE pp.portfolioId IN (<reseller subtree>) AND i.status='active';
-- → 89500990000000120019 | active | ES0000 | 22509
```
**Before → After:**
| table | before | after |
|---|---|---|
| `icc.status` | active (mod 2024-04-09) | active (unchanged) |
| `icc2PortfolioPackage.packageId` | 22509 (mod 2026-10-05) | **22512** (mod **2026-10-06T00:22:24Z**) |
| `job` | — | none |

> The **already-active SIM WAS reassigned** to a different package (22509 → 22512) with no restriction. No Job created.

## UI Evidence
- `scenario-deleted/validate-all3-success.png` — active ICCID validates as Success.
- `confirm-batch.png`, `batch-submit-result.png` — Confirm dialog + "Saved, but no job was created — Failed to fetch".

## API Evidence
| Step | Endpoint | Method | Code |
|---|---|---|---|
| Validate | `/api/catalog/simById/execute?iccId=89500990000000120019` | GET | **200** |
| Submit | `/api/catalog/simPackage/execute` (for 120019) | PATCH | **200** |
| Submit | `job/execute` | POST | never sent |

## Observations (Expected vs Actual)
| Expected | Actual |
|---|---|
| Behaviour when assigning an already-active ICCID | ⚠️ **No restriction** — validates Success and the package reassignment persists (22509 → 22512). The app lets you re-assign/re-package a live SIM with no warning. |
| Validations / restrictions | None surfaced. |
| API responses | `simPackage` PATCH 200. |
| DB integrity | Package changed; status stayed active; **no Job** → the change is untracked. |

### Defects
1. **No guard on re-assigning an already-active SIM** — a live SIM's package can be silently changed; confirm whether this should warn/block or is intended (re-packaging).
2. **No Job created** (recurring submit defect) → untracked change, no audit/rollback trail.
3. **Misleading "saved to every SIM"** dialog despite job failure.

## Recommendations
- Confirm intended behaviour for re-assigning active SIMs; add a confirmation/warning if unintended.
- Fix Job creation so every assignment is tracked (critical for active-SIM changes).
