# DEFECT — SIM Assignment Submit writes SIMs but creates no Job ("user not found")

| | |
|---|---|
| **Severity** | P1 (data integrity — partial write, untracked) |
| **Environment** | QAN — https://portal-host.qan.aws.eseye.io |
| **Build area** | SIM Assignment wizard → Submit Assignment |
| **Related tickets** | NUI-7742 (AC #6: Submit → loader → redirect to Jobs, no popup) · NUI-192 (Use Jobs for Portfolio/Package…) |
| **User** | `resellerqa` (display "Testing132 Purpose973"), reseller-scoped, password `Password#1` |
| **Date found** | 2026-10-05 |
| **Reproducible** | Yes (observed on the one submit performed; see root cause) |
| **Jira** | NOT logged (per instruction — documented here only) |

## Summary
When a reseller-scoped user submits a SIM Assignment, the **SIMs are actually mutated** (package reassigned + attributes written) but **no tracking Job is created**. The UI shows a dialog *"Saved, but no job was created — user not found."* instead of redirecting to the Jobs list. The permission-resolution call `userPermissionMeFlat` returns **404** mid-submit, aborting job creation while the SIM-write calls succeed — leaving an **untracked partial write**.

## Steps to reproduce
1. Log in to QAN as `resellerqa` / `Password#1`.
2. Go to **SIM Management → SIM Assignment**.
3. **Validate SIM IDs** (Unsequential): enter two in-scope ES0000 SIMs `89500990000000001425` and `89500990000000000708` → **Validate** → both Success.
4. **Next** → **Select Portfolio & Package**: Portfolio = `Prudhvi Dwarapureddi - QA 2`, Package = `Test package used by QA team - 75MB Data and 10 bundled MO SMS - 22512`.
5. **Add SIM Attributes**: leave the pre-filled Device Profile ID (3844), Activate SIMs = ON, Job Name = any.
6. Click **Submit Assignment**.

## Expected
- A background **Job is created** (type Generic), the UI shows a loader, then **redirects to Bulk Management → Jobs auto-filtered to the new job** (NUI-7742 #6), with **no** "bulk assignment submitted" popup.

## Actual
- Dialog: **"Saved, but no job was created"** / *"The changes were saved to every SIM, but no job was created — there is no progress to track for this assignment."* with error line **"user not found"**.
- **No redirect** to Jobs. The popup that NUI-7742 #6 says should not appear is shown.
- The SIMs **were written** (verified in DB) but **no Job row exists**.

Screenshot: `screenshots/06-submit-user-not-found.png`.

## Evidence — network (DevTools, submit request sequence)
| # | Method / endpoint | Status | Meaning |
|---|---|---|---|
| 50 | `PUT /api/catalog/simAttribute/execute` | **200** | SIM attributes written |
| 54 | `PATCH /api/catalog/simPackage/execute` | **200** | SIM #1 package reassigned |
| 55 | `PATCH /api/catalog/simPackage/execute` | **200** | SIM #2 package reassigned |
| 51 | `GET /api/catalog/userMe/execute` | 200 | session user resolves fine |
| 52 | `GET /api/catalog/userPermissionMeFlat/execute?enrich=title` | **404** | **permission resolution fails → "user not found"** |
| 53 | `GET /api/catalog/jobType/execute?status=active&pageSize=50` | 200 | job types load |
| — | `POST /api/catalog/job/execute` | **never sent** | job creation aborted |

**Root cause signal:** `userMe` 200 but `userPermissionMeFlat` **404**. The job-creation step depends on the flat-permission lookup; its 404 aborts the step ("user not found") *after* the SIM-mutation calls have already succeeded → partial write. (Not a session/auth expiry — the token is valid; cf. the Integration variant which was a 401 session expiry.)

---

## REAL DB DATA (QAN `oncilla`) — for cross-check
Read-only, via `scratchpad/dbq.js` with QAN creds. Queries + exact results:

### 1. The user
```sql
SELECT userId, username, firstName, lastName, portfolioId, userTypeId, status FROM user WHERE username='resellerqa';
```
| userId | username | firstName | lastName | portfolioId | userTypeId | status |
|---|---|---|---|---|---|---|
| a72f5ee80a5542fe906ff10127480d55 | ResellerQA | Testing132 | Purpose973 | 262400371049f8d61d9937f891e7a57a | 1 | active |

### 2. The two SIMs — subscription AFTER submit (`icc2PortfolioPackage`)
```sql
SELECT iccId, portfolioId, packageId, status, inService, modifiedDate, modifiedUserId
FROM icc2PortfolioPackage WHERE iccId IN ('89500990000000000708','89500990000000001425');
```
| iccId | portfolioId | packageId | status | inService | modifiedDate | modifiedUserId |
|---|---|---|---|---|---|---|
| 89500990000000000708 | 262400371049f8d61d9937f891e7a57a | **22512** | active | 2026-10-05T00:25:16Z | **2026-10-05T00:25:16.706Z** | **a72f5ee8…** (resellerqa) |
| 89500990000000001425 | 262400371049f8d61d9937f891e7a57a | 22512 | active | 2026-10-05T00:46:01Z | 2026-10-05T00:46:01.772Z | a72f5ee8… (resellerqa) |

> **Proof of write:** `…000708` package is now **22512** (was **6962672** pre-submit) with `modifiedDate` = **2026-10-05** and `modifiedUserId` = resellerqa. `…001425` was already on 22512 (no-op). *(Note: `…001425` modifiedDate also shows 2026-10-05 from a re-touch; both rows are now owned by resellerqa's change.)*

### 3. The two SIMs — lifecycle status (`icc`)
```sql
SELECT iccId, status, modifiedDate, modifiedUserId FROM icc WHERE iccId IN ('89500990000000000708','89500990000000001425');
```
| iccId | status | modifiedDate | modifiedUserId |
|---|---|---|---|
| 89500990000000000708 | active | 2026-04-13T04:27:31Z | 0209bb30… |
| 89500990000000001425 | active | 2026-07-07T23:47:15Z | a72f5ee8… |

### 4. Attribute written (`iccAttribute`)
```sql
SELECT iccId, attribute, value, status, modifiedDate FROM iccAttribute
WHERE iccId IN ('89500990000000000708','89500990000000001425') AND attribute='deviceProfileId';
```
| iccId | attribute | value | status | modifiedDate |
|---|---|---|---|---|
| 89500990000000000708 | deviceProfileId | 3844 | active | **2026-10-05T00:25:13.968Z** |
| 89500990000000001425 | deviceProfileId | 3844 | active | 2026-07-07T23:45:57Z |

### 5. Permissions (user DOES have job capability)
```sql
SELECT title, status FROM userPermission WHERE userId='a72f5ee80a5542fe906ff10127480d55' AND title LIKE '%ob%';
SELECT COUNT(*) totalPerms, SUM(status='active') activePerms FROM userPermission WHERE userId='a72f5ee80a5542fe906ff10127480d55';
```
| title | status |
|---|---|
| capabilityJob | active |

`totalPerms = 36`, `activePerms = 22`. ⇒ The "user not found" is **not** a missing-permission problem — `capabilityJob` is active.

### 6. Jobs owned by resellerqa (none from this submit)
```sql
SELECT jobId, name, status, createdDate FROM job WHERE userId='a72f5ee80a5542fe906ff10127480d55' ORDER BY jobId DESC LIMIT 5;
```
| jobId | name | status | createdDate |
|---|---|---|---|
| 778 | genericJobPortfolioUpdate | queued | 2026-09-16T00:00:52Z |
| 739 | Testing Attributes | completed | 2026-08-28T07:02:48Z |
| 738 | Test Attributes | completed | 2026-08-28T06:35:18Z |
| 732 | icc_GenericJobType | error | 2026-08-27T01:41:44Z |
| 731 | iccJobGeneric_Z | error | 2026-08-27T01:24:40Z |

> resellerqa **has created jobs before** (latest 2026-09-16), but **nothing from the 2026-10-05 submit** — confirming the submit failed to create a job, it is not that the user never can.

### 7. QAN Generic job type (for reference)
```sql
SELECT jobTypeId, name, title, status FROM jobType WHERE name='Generic';
```
| jobTypeId | name | title | status |
|---|---|---|---|
| 30 | Generic | generic | active |

*(QAN Generic jobTypeId = 30; cf. Integration = 11.)*

---

## Impact
- **Untracked partial write:** SIMs get reassigned/attributed with no Job to track or roll back — breaks NUI-192's "use Jobs for assignment" premise.
- **NUI-7742 #6 blocked:** no loader→Jobs redirect; the forbidden popup appears instead.
- **Misleading message:** "The changes were saved to every SIM" is literally true here, so a user believes it fully worked while the orchestration/tracking job is missing.

## Suggested fixes
1. Make submit **atomic** — if the Job cannot be created, do **not** leave the SIM writes applied (or clearly mark the assignment as incomplete and offer retry).
2. Investigate why `userPermissionMeFlat` returns **404** for a reseller user that holds active `capabilityJob` (flat-permission/sphere resolution for reseller users).
3. Replace the generic "user not found" with an actionable error, and reconcile the "changes were saved to every SIM" wording with the actual outcome.

## Artifacts
- Screenshots: `defects/QAN/screenshots/06-submit-user-not-found.png` (dialog), `05-addattrs-activate-toggle.png` (pre-submit state).
- Full QAN run: `defects/QAN/QAN-test-report.md`.
- DB helpers: `scratchpad/dbq.js`, `utils/db/seqcheck.js` (run with QAN creds).
