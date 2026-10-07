# SIMAssignment_AvailableICCID_Report

## Test Summary
| | |
|---|---|
| Scenario | Scenario 1 — Available ICCID |
| Execution date | 2026-10-06 (QAN DB modifiedDate ~00:09 UTC) |
| Tester | QA (automated UI+DB), user `resellerqa` (reseller-scoped) |
| Environment | QAN — https://portal-host.qan.aws.eseye.io · DB `oncilla` @ eseye-qan-db-master |
| ICCID used | **89500990000000001177** (ES0000, icc.status=available) |
| Result | Validate ✅ · Package assigned ✅ (write) · **Job NOT created ❌** · Activation blocked on currency ⚠️ |

## Database Evidence
**Query (how the ICCID was chosen):**
```sql
WITH RECURSIVE sub AS (SELECT portfolioId FROM portfolio WHERE portfolioId='262400371049f8d61d9937f891e7a57a'
  UNION ALL SELECT p.portfolioId FROM portfolio p JOIN sub s ON p.parentPortfolioId=s.portfolioId)
SELECT pp.iccId, i.status, t.title iccType, pp.portfolioId, pp.packageId
FROM icc2PortfolioPackage pp JOIN icc i ON pp.iccId=i.iccId JOIN iccType t ON i.iccTypeId=t.iccTypeId
WHERE pp.portfolioId IN (SELECT portfolioId FROM sub) AND i.status='available';
```
**Before → After:**
| table | before | after |
|---|---|---|
| `icc.status` | available (mod 2026-02-25) | available (unchanged) |
| `icc2PortfolioPackage.packageId` | **9195509** (mod 2026-07-08) | **22512** (mod **2026-10-06T00:09:33Z**) |
| `job` (name `QA Scenario1%`) | — | **none created** |

> The package assignment **did persist** (9195509 → 22512); activation did not change `icc.status`; **no Job row exists**.

## UI Evidence
- `scenario-available/01-validate-success.png` — Validate → Total 1 / Success 1 / Errors 0 (ES0000).
- `02-presubmit-activate-on.png` — Add SIM Attributes step, Activate toggle ON, Job Name entered.
- `03-submit-result.png` / `05-submit-22512-result.png` — final dialog **"Saved, but no job was created — Failed to fetch"**.
- `04-confirm-dialog.png` — direct-submit "Confirm Assignment" dialog (Job Name + Continue).

## API Evidence
| Step | Endpoint | Method | Code |
|---|---|---|---|
| Validate | `/api/catalog/simById/execute?iccId=89500990000000001177&enrich=title` | GET | **200** |
| Submit (attributes path, Activate ON, pkg 22515) | `/api/catalog/simById/execute` (activation) | PATCH | **400** |
| Submit (direct path, pkg 22512) | `/api/catalog/simPackage/execute` | PATCH | **200** |
| Submit | `/api/catalog/userPermissionMeFlat/execute` | GET | 200 (was 404 earlier) |
| Submit | `/api/catalog/jobType/execute` | GET | 200 |
| Submit | `/api/catalog/job/execute` | POST | **never sent** (dialog: "Failed to fetch") |

**Activation 400 payload (errorCode 6016):**
```json
{"additionalDetails":{"myStatus":"ERR: Account currency does not match package currency"},
 "errorCode":6016,"errorTag":"invalid_request_error","message":"Error from stored procedure"}
```

## Observations (Expected vs Actual)
| Expected | Actual |
|---|---|
| ICCID accepted by UI | ✅ Accepted (validates Success) |
| Assignment completes successfully | ⚠️ Package write succeeds, **but the background Job is never created** ("Saved, but no job was created — Failed to fetch") |
| Correct APIs invoked; Portfolio/Package passed correctly | ✅ `simPackage` PATCH carried portfolio 262400… + package 22512 |
| SIM activation completes | ❌ With Activate ON + package 22515, activation returns **400 "Account currency does not match package currency"** (6016) and the whole submit is **atomically rolled back** (SIM unchanged) |
| DB updated correctly | ⚠️ Package updated, but **no Job** = untracked assignment (partial outcome) |

### Defects
1. **No Job created on submit** ("Failed to fetch" / earlier "user not found") — SIM package is written but there is no tracking Job (breaks NUI-192 / NUI-7742 #6). See `DEFECT-reseller-submit-no-job-created.md`.
2. **Misleading dialog** — "The changes were saved to every SIM" shown on a submit that failed to create the job.
3. **Activation currency block** — activating during assignment fails with 6016 when the account currency ≠ package currency (even portfolio currencyId=61 matched package 22515 currencyId=61, so the "account" currency is a deeper billing attribute — needs clarification).

## Recommendations
- Make submit atomic (don't persist the package write if the Job cannot be created) or clearly mark the assignment incomplete.
- Fix/clarify the currency rule (6016) and surface a specific, actionable message instead of a stored-procedure error.
- Correct the "changes were saved to every SIM" wording when the job step fails.
