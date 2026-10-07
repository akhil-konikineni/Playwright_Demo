# NUI-1827 — Exploratory Testing of the UI with real Integration DB data

How, as a QA engineer, to drive exploratory testing of the Unsequential SIM Assignment "Validate SIM IDs" screen using the **actual data** in the Integration `oncilla` DB — including what ICCIDs are available to this user, and how positive / negative / edge cases were derived and checked. Also documents **UI enhancements present in the build that are NOT in the AC but are correct**.

- **Env:** Integration https://portal-host.int.aws.eseye.io · **User:** `OGlobalUser` · **DB:** `oncilla` (read-only via `scratchpad/dbq.js`)
- Screenshots referenced: `screenshots/11-…`, `12-…`, `13-…` (plus 01–10 from the functional report).

---

## 1. The method (data-driven exploratory loop)

```
(1) Derive the user's visibility scope from the DB  ──►  (2) Mine real ICCIDs per test category
        │                                                        │
        ▼                                                        ▼
(4) Verify effect in DB (status/subscription)  ◄──  (3) Drive them through the UI and observe banners/tabs/messages
```

1. **Scope first** — find *what this user can even see*, so tests use data that is actually in-scope (no false negatives from visibility).
2. **Mine by category** — pull real rows for positive / negative / edge from `icc` (+ `iccType`, `icc2PortfolioPackage`).
3. **Execute in UI** — validate the mined ICCIDs, capture the exact banner/tab/error text and button states.
4. **Verify in DB** — confirm what the UI claims matches the DB (e.g. did a "success" SIM's status actually allow it; did a submit really persist).

---

## 2. What is available to THIS user (OGlobalUser)

```sql
SELECT userId, portfolioId, userTypeId, status FROM user WHERE username='OGlobalUser';
-- userId 79063b6e0ea0449a825fea096f785f9a | portfolioId '0' | userTypeId 1 (Portal Users) | active
```
- **`portfolioId = '0'` = "All portfolios" (the global root).** OGlobalUser therefore has **global visibility** — its sphere is the whole portfolio tree, so for the Validate step (which resolves each ICCID via `simById`) **any existing ICCID in the platform is in-scope**. (For a scoped/customer user you would instead constrain candidate ICCIDs to their portfolio subtree via `icc2PortfolioPackage.portfolioId`.)

**Population of ICCIDs (whole platform = this user's scope):**
```sql
SELECT status, COUNT(*) FROM icc GROUP BY status;      -- active 3,199,318 | available 2,159,491 | inactive 41 | deleted 4
SELECT LENGTH(iccId), COUNT(*) FROM icc GROUP BY LENGTH(iccId);  -- 19:4.09M | 20:1.27M | 16:161 | 17:102 | 18:47
```
Key point for assignment testing: **`available` (2.16M) = unassigned stock** (the natural "assignable" positive set); **`active` (3.2M) = already in service**; `inactive`/`deleted` are lifecycle-ended. Lengths run **16–20** (matters for edge cases, see §5).

**Mining queries used (each returns real, in-scope ICCIDs):**
```sql
-- Positive: unassigned stock, one ICC type
SELECT i.iccId, t.title FROM icc i JOIN iccType t ON i.iccTypeId=t.iccTypeId WHERE i.status='available' LIMIT 5;
-- Edge: unusual short lengths
SELECT iccId, LENGTH(iccId), status FROM icc WHERE LENGTH(iccId) IN (16,17,18) LIMIT 5;
-- Negative/edge: lifecycle-ended
SELECT iccId, status FROM icc WHERE status IN ('deleted','inactive') LIMIT 5;
-- Edge: suspended
SELECT iccId, adminSuspend, systemSuspend FROM icc WHERE status='active' AND (adminSuspend='yes' OR systemSuspend='yes') LIMIT 3;
-- Same-ICC-type set (needed because of the mixed-type rule, see §4): pick many of ONE type
SELECT iccId FROM icc i WHERE i.iccTypeId=<type> AND i.status='available' LIMIT 200;
```

---

## 3. Positive / Negative / Edge matrix with REAL data (and observed results)

| Class | Real ICCID (from DB) | DB fact | UI result observed |
|---|---|---|---|
| **Positive** | `89011703278149842125` | ES0000, status *available* | ✅ Success (ICC Type ES0000) |
| **Positive** | `1234567890123456788` | ES0000, status *available* (looks like junk but is real stock) | ✅ Success (ES0000) — shows real data ≠ "looks fake" |
| **Positive** | `89011703278149842208` | ES4711, active (ticket sample) | ✅ Success (ES4711) — functional report |
| **Negative** | `00000000000000000000` | not in `icc` | ❌ "ICCID not found in system or invalid checksum verification failed" |
| **Negative** | `89011703278149842209` | not in `icc` (1 digit off) | ❌ not found (404) |
| **Negative (format)** | `12345` | — | 🚫 **Blocked client-side** — "need to be between 16 to 20 digits long"; Validate disabled |
| **Negative (format)** | `89148A1000043D213FA` | real CDMA ICCID with hex chars, status *available* | 🚫 **Blocked client-side** — "must contain only numeric characters" (⇒ real CDMA/hex ICCIDs cannot be entered — see §6) |
| **Edge (length)** | `9953447452423884` (16) / `99534479247502001` (17) | active, short ICCIDs | Accepted by format guard (16–20). In a mixed batch flagged as *Mixed ICC type*; assignable if batch is same type |
| **Edge (lifecycle)** | `89254021024071373346` | status **deleted**, ES4840 | ⚠️ **Validates as SUCCESS** — status not checked (see §6 gap) |
| **Edge (type mix)** | any 2 different ICC types together | — | ❌ "Mixed ICC type detected. All ICCIDs must have the same ICC type." (see §4) |
| **Edge (dup/format)** | same ICCID twice, spaces, commas, newlines | — | Whitespace ignored; comma/newline both accepted as separators (per helper text) — dedup behaviour worth a dedicated check |
| **Edge (volume)** | 200 vs 201 same-type ICCIDs | — | Field states max 200 — boundary 200 (accept) / 201 (reject) worth a dedicated check |

**How the batches were run:** all mined into one textarea (one per line), Validate, then read the Success/Error tab counts and per-row messages; ambiguous cases (e.g. deleted) re-run **alone** to remove interference from the same-type rule.

---

## 4. UI enhancements present but NOT in the AC (correct behaviour)

These are real, sensible behaviours the build has that NUI-1827's acceptance criteria do not mention. They should be added to the AC / test coverage:

1. **Client-side format pre-validation with Validate disabled.** Before any API call the UI enforces **16–20 digits** and **numeric-only**, disables **Validate**, and shows a categorised inline alert: *"N invalid ICCIDs — Fix or remove them to validate the list"* → "…need to be between 16 to 20 digits long" and "…must contain only numeric characters", listing the offending ICCIDs. (2 days ago `12345` was only rejected *after* Validate; the guard is newer.) — `screenshots/11`.
2. **Same-ICC-type enforcement.** All ICCIDs in one validation must share an ICC type; others error **"Mixed ICC type detected. All ICCIDs must have the same ICC type."** (with each row's ICC type shown). — `screenshots/12`.
3. **Error-summary banner + "Download ICCID file"** above the form when errors exist ("N ICCIDs could not be validated" + per-reason counts).
4. **All-success confirmation banner** — "All ICCIDs have been successfully validated / You can proceed to the next step."
5. **Auto-switch to the Errors tab** when any error is present.
6. **"Showing X of Y entries"** footer on each results table.
7. **Clear form** button + disabled states (Validate/Clear disabled until input; Next disabled until validated).
8. **Sequential mode** (First ICCID + Number of ICCIDs with live last-ICCID generation) — covered by NUI-2615.
9. Stepper label now reads **"Add SIM Attributes"** (was "Provide SIM Attributes").

---

## 5. Why real data matters here (vs. synthetic)

- The **16–20 digit** guard is only meaningfully tested with the platform's actual length spread (there really are 16/17/18-digit ICCIDs — 310 of them). Synthetic 20-digit-only data would miss it.
- The **same-ICC-type** rule can only be exercised by pulling ICCIDs of *known, differing* ICC types from `iccType` — you must know each candidate's type up front (from the DB) to predict pass/fail.
- **Lifecycle edge** (deleted/inactive/suspended) requires the rare real rows (only 4 deleted, 41 inactive) — impossible to guess blindly.
- Distinguishing **available vs active** stock lets you test the true "assignable" positive path rather than reassigning live customer SIMs.

---

## 6. Gaps found via this real-data pass (for the team to confirm)

1. **Lifecycle status not validated.** A **deleted** SIM (`89254021024071373346`) validates as **Success** and would be carried into assignment. Validation is existence + checksum + same-ICC-type only; it does not reject `deleted`/`inactive` (and, from the functional report, does not flag already-assigned SIMs). — `screenshots/13`.
2. **Real CDMA/hex ICCIDs are unenterable.** `89148A1000043D213FA` is a real *available* CDMA SIM, but the numeric-only guard blocks it — confirm whether CDMA ICC types are out of scope for this flow or the guard is too strict.
3. **401-as-"not found"** (from NUI-2615/NUI-192 work) — an expired session makes valid SIMs show as "ICCID not found," indistinguishable from a real 404.

---

## 7. Reusable recipe (for any SIM-Assignment-style screen)
1. `SELECT portfolioId,userTypeId FROM user WHERE username=?` → decide global vs scoped visibility.
2. Mine one same-type **available** set (positive), a **non-existent** valid-format value (negative), **deleted/inactive/suspended** rows (lifecycle edge), **16/17/18-digit** rows (length edge), and a **different-type** value (mixed-type edge).
3. Run each through Validate; record counts, tab, per-row message, and button enabled/disabled state.
4. Re-run ambiguous rows **alone** to isolate one rule at a time.
5. Cross-check every "Success" against the DB (`icc.status`, `icc2PortfolioPackage`) to catch positive-path leaks (e.g. deleted-but-success).
