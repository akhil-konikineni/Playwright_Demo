# SIMAssignment_InactiveICCID_Report

## Test Summary
| | |
|---|---|
| Scenario | Scenario 3 — Inactive ICCID |
| Execution date | 2026-10-06 (QAN) |
| Tester | QA (automated UI+DB), user `resellerqa` |
| Environment | QAN — https://portal-host.qan.aws.eseye.io · DB `oncilla` |
| ICCID used | **89500990000000001169** (ES0000, **icc.status=inactive**) |
| Result | Validate ✅ · **Package reassigned ✅ (write succeeded)** · status stays inactive · No job |

## Database Evidence
**Query:**
```sql
SELECT pp.iccId, i.status, t.title, pp.packageId FROM icc2PortfolioPackage pp
JOIN icc i ON pp.iccId=i.iccId JOIN iccType t ON i.iccTypeId=t.iccTypeId
WHERE pp.portfolioId IN (<reseller subtree>) AND i.status='inactive';
-- → 89500990000000001169 | inactive | ES0000 | 6962672
```
**Before → After:**
| table | before | after |
|---|---|---|
| `icc.status` | **inactive** (mod 2026-09-30) | inactive (unchanged) |
| `icc2PortfolioPackage.packageId` | 6962672 (mod 2026-07-08) | **22512** (mod **2026-10-06T00:22:19Z**) |
| `job` | — | none |

> The **inactive SIM WAS reassigned** (package 6962672 → 22512). Its lifecycle status remained `inactive` (no activation on the direct submit path). No Job created.

## UI Evidence
- `scenario-deleted/validate-all3-success.png` — inactive ICCID validates as Success.
- `confirm-batch.png`, `batch-submit-result.png` — Confirm dialog + "Saved, but no job was created — Failed to fetch".

## API Evidence
| Step | Endpoint | Method | Code |
|---|---|---|---|
| Validate | `/api/catalog/simById/execute?iccId=89500990000000001169` | GET | **200** |
| Submit | `/api/catalog/simPackage/execute` (for 1169) | PATCH | **200** |
| Submit | `job/execute` | POST | never sent ("Failed to fetch") |

## Observations (Expected vs Actual)
| Expected | Actual |
|---|---|
| Is assignment allowed for an inactive SIM? | ⚠️ **Yes** — validates Success and the package reassignment **persists** (6962672 → 22512). No guard against assigning an inactive SIM. |
| Activation workflow | Not triggered on the direct submit path; `icc.status` stayed `inactive`. (With the Add-SIM-Attributes path + Activate ON, activation would be attempted and may hit the currency rule — see Available report.) |
| API responses | `simPackage` PATCH 200 (assignment applied). |
| DB updates / state transitions | Package changed; **no lifecycle transition** (stayed inactive); **no Job** created. |

### Defects
1. **Inactive SIM is assignable with no warning** — confirm whether an inactive SIM should be reassignable; validation accepts it and the write persists.
2. **No Job created** (same recurring submit defect) → untracked assignment.
3. **Misleading "saved to every SIM"** dialog despite job failure.

## Recommendations
- Decide and enforce the policy for inactive SIMs (allow with clear indication, or block at Validate).
- Resolve the Job-creation failure so assignments are tracked.
