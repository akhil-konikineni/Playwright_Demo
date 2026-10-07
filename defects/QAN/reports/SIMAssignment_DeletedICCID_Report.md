# SIMAssignment_DeletedICCID_Report

## Test Summary
| | |
|---|---|
| Scenario | Scenario 2 — Deleted ICCID |
| Execution date | 2026-10-06 (QAN) |
| Tester | QA (automated UI+DB), user `resellerqa` |
| Environment | QAN — https://portal-host.qan.aws.eseye.io · DB `oncilla` |
| ICCID used | **89500990000000000807** (ES0000, **icc.status=deleted**) |
| Result | Validate ✅ (accepted) · **Package write REJECTED ❌ (400)** · No job · SIM unchanged |

## Database Evidence
**Query:**
```sql
SELECT pp.iccId, i.status, t.title iccType, pp.portfolioId, pp.packageId
FROM icc2PortfolioPackage pp JOIN icc i ON pp.iccId=i.iccId JOIN iccType t ON i.iccTypeId=t.iccTypeId
WHERE pp.portfolioId IN (<reseller subtree>) AND i.status='deleted';
-- → 89500990000000000807 | deleted | ES0000 | 262400… | 23137
```
**Before → After:**
| table | before | after |
|---|---|---|
| `icc.status` | **deleted** (mod 2026-07-07) | deleted (unchanged) |
| `icc2PortfolioPackage.packageId` | 23137 (mod 2026-01-29) | **23137 (UNCHANGED)** |
| `job` | — | none |

> **No DB change** — the deleted SIM was **not** reassigned. (Verified alongside the inactive/active SIMs submitted in the same batch, which DID change — so this is a per-SIM rejection, not a whole-batch failure.)

## UI Evidence
- `scenario-deleted/validate-all3-success.png` — the deleted ICCID **validates as Success** (Success (3), Errors (0)) — the UI does **not** block it at validation.
- `confirm-batch.png` — Confirm Assignment dialog.
- `batch-submit-result.png` — final dialog "Saved, but no job was created — Failed to fetch".

## API Evidence
| Step | Endpoint | Method | Code |
|---|---|---|---|
| Validate | `/api/catalog/simById/execute?iccId=89500990000000000807&enrich=title` | GET | **200** (deleted SIM still returned) |
| Submit | `/api/catalog/simPackage/execute` (for 807) | PATCH | **400** |
| Submit | `job/execute` | POST | never sent |

**400 payload (errorCode 6016):**
```json
{"additionalDetails":{"myStatus":"ERR: SQL Exception finding IMSI label on package (tigrillo)"},
 "errorCode":6016,"errorTag":"invalid_request_error","message":"Error from stored procedure"}
```

## Observations (Expected vs Actual)
| Expected | Actual |
|---|---|
| Can a deleted ICCID be selected? | ⚠️ **Yes — it passes Validate** (simById 200, shown under Success). The UI gives no indication the SIM is deleted. |
| Validation messages | None at validate time; the block only happens later, at the package-write step. |
| API behaviour | `simPackage` PATCH returns **400** with an **obscure stored-procedure error** ("SQL Exception finding IMSI label on package"), not a clear "SIM is deleted / not assignable" message. |
| Assignment blocked? | ✅ Effectively blocked — DB shows **no change** to the deleted SIM. |
| No unintended DB updates | ✅ Confirmed — package/status unchanged. |

### Defects
1. **Deleted SIM is accepted at Validate** (shown as Success) — users can select a deleted ICCID and proceed; it is only rejected at the final write. Validation should flag/exclude deleted SIMs up front.
2. **Unclear error** — the rejection surfaces as a raw stored-procedure SQL error (6016), not an actionable message.
3. **Misleading batch dialog** — "The changes were saved to every SIM" was shown even though the deleted SIM was **not** saved (and no job was created).

## Recommendations
- Reject deleted (and other non-assignable lifecycle states) at the Validate step with a clear per-ICCID error, rather than at the final write.
- Replace the stored-procedure error with a user-facing message.
- Fix the "saved to every SIM" dialog to reflect per-SIM success/failure.
