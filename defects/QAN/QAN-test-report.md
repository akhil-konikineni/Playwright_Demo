# QAN Exploratory Test Report — SIM Assignment (NUI-1827 / NUI-2615 / NUI-192 / NUI-7742)

- **Env:** QAN — https://portal-host.qan.aws.eseye.io · **User:** `resellerqa` (display "Testing132 Purpose973"), password `Password#1` *(not the .env.qan statususer)*
- **DB:** QAN `oncilla` @ eseye-qan-db-master… (read-only, akonikineni creds) · **Date:** 2026-10-05
- **Scope:** exploratory on live UI + DB. **No Jira writes.** One authorized UI submit executed (idempotent-ish, reseller's own QA portfolio) — see §Submit.

## User scope (RBAC)
`resellerqa` = userId `a72f5ee8…`, portfolio **`262400371049f8d61d9937f891e7a57a` "Prudhvi Dwarapureddi - QA 2"**, parent `1eb2f624…`, type "Portal Users", active. A **scoped (reseller) user**, not global.
- **Portfolio dropdown shows only 14 portfolios** (its subtree: QA2, TestSim, QA, Prudhvi Dwarapureddi - QA 2, child_PF_test, using_reseller…) — vs thousands for the global OGlobalUser on Integration. **RBAC scoping verified.** ✅
- In-scope SIMs (subtree): ~110 available, 8 active, 2 setup, 1 deleted, 1 inactive. Mostly **ES0000** (iccTypeId 89).

## Results by ticket

### NUI-1827 (Unsequential) — PASS
- Default Unsequential; field "Enter ICCIDs (max 200) *" with asterisk ✅
- Validate mixed batch (2 in-scope ES0000 + 1 non-existent) → Total 3 / Success 2 / Errors 1; `00000…` → "ICCID not found…" ✅ (`01-nui1827-validate-mixed.png`)
- **Client-side format guard** present (16–20 digits + numeric-only, Validate disabled, categorised inline alert) ✅ (`02-format-guard.png`)

### NUI-2615 (Sequential) — PASS
- "First ICCID *" + "Number of ICCIDs (Max 200) *" mandatory; last-ICCID generation Luhn-correct (…1425 → …1466) ✅
- All-success range → Next enabled; **error range → Next disabled** + dialog ✅ (`07-seq-ac4-firsticcid-message.png`)

### NUI-192 (Jobs/Attributes) — UI PASS, **Submit job-creation FAILS for this user** (see §Submit)
- Portfolio + Package reseller-scoped. **Package eligibility matches the DB algorithm exactly**: for ES0000 (iccTypeId 89) + "Prudhvi Dwarapureddi - QA 2" the dropdown showed the same 10 packages the RR-consumer query returns.
- Add SIM Attributes step: defined attributes (Device Profile ID pre-filled 3844), custom attributes, **Activate SIMs switch (checked)**, mandatory Job Name. (`05-addattrs-activate-toggle.png`)

### NUI-7742 (UI Enhancements) — mostly IMPLEMENTED; 1 deviation + 1 blocked
| # | Requirement | Result |
|---|---|---|
| 1 | Remove toast after Next; rename step → "Add SIM attributes" | ✅ Step is "Add SIM Attributes"; no toast seen after Next |
| 2 | Range helper/placeholder text; confirm max count | ✅ Helper text present. **Max = 200** (field + "Maximum of 200 ICCIDs"); the "150" only appears in the example sentence |
| 3 | Error msg "Starting ICCID" → "First ICCID" | ✅ Dialog now reads **"…the First ICCID value and / or number of ICCIDs must be amended…"** |
| 4 | Highlight Add SIM attributes, keep Submit un-highlighted, remove right-arrow, guidance text, hover on Submit | ⚠️ **Partial** — right-arrow removed ✅, guidance paragraph present ✅, **but both "Add SIM Attributes" and "Submit Assignment" share the same primary styling** (Submit not de-emphasised) and **no hover title/aria** on Submit (`03-…`, `04-…`) |
| 5 | Job-name step: add Activate SIMs toggle | ✅ Activate SIMs switch present on the step, checked by default, with helper text |
| 6 | Both submits behave same → loader → redirect to Jobs (auto-filtered), no popup | ❌ **Blocked / defect** — submit failed job creation ("user not found"); **no redirect**, and the "Saved, but no job was created" popup DID appear (see §Submit). Happy-path redirect could not be verified for this user |
| 7 | CSV preserves full ICCIDs as text in Excel | ✅ `Invalid_Sims.csv` wraps each ICCID as `"⇥<iccid>"` (leading tab + quotes = Excel text), full 20 digits preserved |

## Submit (§) — **P1 defect confirmed with DB proof**
Submitted 2 ES0000 SIMs (`…001425`, `…000708`) → portfolio "Prudhvi Dwarapureddi - QA 2" → package 22512, Activate=Yes, via Add SIM Attributes → Submit.
- UI result: dialog **"Saved, but no job was created — user not found."** (`06-submit-user-not-found.png`)
- Network: `PUT /simAttribute` → **200**, `PATCH /simPackage` → **200 ×2** (SIM writes succeeded); `userMe` → 200; **`userPermissionMeFlat` → 404**; `jobType` → 200; **no `POST /job/execute` made**.
- DB after-state: `…000708` packageId **6962672 → 22512**, modifiedDate **2026-10-05** (today) — write persisted; `…001425` unchanged (already 22512). **No `job` row created** (`QA NUI-7742%` → none).
- Root cause: resellerqa **has `capabilityJob` (active)** and 36 permissions, but the **`userPermissionMeFlat` endpoint 404s** for this user → job step aborts "user not found" while the SIM-mutation path (different endpoints) succeeds. Jobs are created normally by other QAN flows (jobId 815/814/813…), so it is not a global outage.

**Impact:** the assignment **mutates SIMs but creates no tracking Job** — a real partial write that contradicts NUI-192's premise and blocks NUI-7742 #6. And the misleading **"changes were saved to every SIM"** message is literally true here (writes happened), making the inconsistency worse.

## Consolidated gaps (QAN)
1. **[P1] Submit as reseller: SIMs written, Job not created ("user not found" / `userPermissionMeFlat` 404).** Partial write, no Jobs redirect (NUI-7742 #6 unverifiable for this user). Recommend fixing the flat-permission resolution for reseller users / failing the whole submit atomically if the job can't be created.
2. **[P2] NUI-7742 #4 not fully met** — Submit button is styled identically to Add SIM Attributes (should be un-highlighted/secondary) and has no hover tooltip.
3. **[P2/confirm] Cross-env gaps still present:** validation success is existence-only (lifecycle status ignored); package dropdown ICC-type-gated with bare "No results"; 401/analogous auth failures surface generically.
4. **[info] Max count = 200** (NUI-7742 #2 asked to confirm "150" — actual is 200; only the example text says 150, which is slightly inconsistent).

## Evidence
Screenshots `defects/QAN/screenshots/01…07`; downloaded `.playwright-mcp/Invalid-Sims.csv`; DB via `scratchpad/dbq.js` + `utils/db/seqcheck.js` with QAN creds.
