# NUI-2615 — Test Report: Sequential SIM Assignment / ICCID list display

- **Ticket:** [NUI-2615](https://siam4eseye.atlassian.net/browse/NUI-2615) — Story, Priority **High**, Component *SIM Management/SIM Assignment*, Status *In Testing*
- **Environment:** Integration — https://portal-host.int.aws.eseye.io · **User:** `OGlobalUser`
- **Date:** 2026-09-28 · **Scope:** exploratory functional test of ACs. **No DB writes. No assignment submitted.**
- **Test data (from DB, read-only):**
  - Contiguous ES4711 block `89011703278149842208`+ (bases …4220–…4229 etc.)
  - Deliberate gap: base tail **84283** is missing → generated ICCID `89011703278149842836` (404)
  - Start `89011703278149842794` count 6 → hits the gap (5 success + 1 error)

## Result summary

| AC | Description | Result |
|----|-------------|--------|
| AC1 | Sequential → Starting ICCID & Number of rows mandatory (asterisk) | ✅ Pass (wording differs) |
| AC2 | Enter start + count → last ICCID generated | ✅ Pass |
| AC3 | Validate → results table, counts, Success/Error tabs, colours | ⚠️ Pass with colour deviation (same as NUI-1827) |
| AC4 | Errors present → **Next disabled** + specific message | ✅ Pass |
| AC5 | Re-generate by amending start / number of rows | ✅ Pass |
| AC6 | All success → Next enabled → proceed to Portfolio & Package | ✅ Pass |
| AC7 | Back from Portfolio → validated **range (start & end)** displayed | ✅ Pass |

**Overall:** All 7 ACs functionally pass. Same AC2/AC3 colour deviation as NUI-1827. One **cross-cutting defect** found during AC5 (see Defects): an expired-session **HTTP 401 is displayed as "ICCID not found"**.

---

## Details

### AC1 — Sequential fields mandatory ✅
Selecting **Sequential ICCIDs** replaces the free-text box with two fields, both asterisked:
- **"First ICCID \*"** (AC calls it "Starting ICCID")
- **"Number of ICCIDs (Max 200) \*"** (AC calls it "Number of rows")

Helper text: "We will validate the starting ICCID and the next SIMs in sequence… Maximum of 200 ICCIDs per validation." Validate/Clear form disabled until both filled.
> Minor wording deviation vs AC ("First ICCID" vs "Starting ICCID"; "Number of ICCIDs" vs "Number of rows"). Screenshot `01-ac1-sequential-fields.png`.

### AC2 — Last ICCID generated ✅
First ICCID `89011703278149842208` + count 5 → panel shows **First ICCID: …842208 / Last ICCID: …842240**. The generator increments the 19-digit base and **recomputes the Luhn check digit** (…220→…224, check 8→0). Verified against the actual validated rows (…208, …216, …224, …232, …240). Screenshot `02-ac2-last-iccid-generated.png`.

### AC3 — Results table / tabs / colours ⚠️
Same results component as unsequential: header **Total / Success / Errors**; tabs **Success (N)** and **Errors (N)**; Success columns **ICCID, ICC Type**; Error columns **ICCID, Error, ICC Type**. All-success run of 3 → 3/3/0. Screenshot `03-ac3-ac6-sequential-all-success.png`.
> **Colour deviation (same as NUI-1827):** only the ICC-Type column (green) / Error-message column (red) are coloured; ICCID stays dark with a status icon — AC asks for every column coloured.

### AC4 — Errors present: Next disabled + message ✅ (key differentiator vs unsequential)
Start `89011703278149842794` count 6 → **Total 6 / Success 5 / Errors 1**; error row `89011703278149842836` → "ICCID not found in system or invalid checksum verification failed". 
- **Next button is DISABLED** ✅ (unsequential instead allows Proceed-with-warning; sequential blocks entirely — correct per AC).
- A modal shows the **exact AC message**: *"Due to failed ICCIDs, the Starting ICCID value and / or number of ICCIDs must be amended, as the process cannot continue."* ✅
- Error-summary banner + "Download ICCID file" also present.
Screenshot `04-ac4-error-next-disabled-dialog.png`.

### AC5 — Re-generate ✅
Amending **Number of ICCIDs** from 6 → 4 re-computed Last ICCID (…842828) and required re-Validate. (During this step the session had expired — see Defects — so the re-validate returned 401s surfaced as "not found"; after re-login the mechanism works as designed.) Editing First ICCID / count and re-validating restarts the process per AC5.

### AC6 — All success → proceed ✅
All-success sequential run → **Next enabled** → advances to **Select Portfolio & Package**. Screenshot `03…`.

### AC7 — Back retains range ✅
From Portfolio & Package, **Back** returns to Validate SIMs with **First ICCID / Number of ICCIDs retained AND the range display (First …842208 → Last …842224)** plus the full results table. Matches AC7 "validated ICCIDs range (starting and ending values) displayed". Screenshot `06-ac7-back-retains-range.png`.

---

## Checking a sequential range against the DB (data-driven verification)

Given a **First ICCID + count**, you can check every generated ICCID's real status (`active` / `available` / `deleted` / `inactive` / `NOT FOUND`) — but **not** with a plain SQL numeric range: the UI increments the 19-digit **base** and **re-computes the Luhn check digit** at each step, so the values are not contiguous numbers. Regenerate the exact sequence first, then look each up in `icc`.

Helper added: **`utils/db/seqcheck.js`** (read-only). Usage:
```
TEST_ENV=INTEGRATION node utils/db/seqcheck.js <firstIccId> <count>
```
Example — First `89011703278149842794`, count 6 (the AC4 range):
```
1 89011703278149842794 active      ES4711
2 89011703278149842802 active      ES4711
3 89011703278149842810 active      ES4711
4 89011703278149842828 active      ES4711
5 89011703278149842836 NOT FOUND   -
6 89011703278149842844 available   ES4711
Status tally: {"active":4,"NOT FOUND":1,"available":1}
UI prediction: 5 Success / 1 Error
```

**Key nuance — status vs. existence:** the Validate step decides Success/Error on **existence + checksum + same-ICC-type only; it does NOT check lifecycle status.** So `active`, `available`, and even `deleted`/`inactive` all count as **Success** as long as the ICCID exists — only a missing ICCID (`NOT FOUND`) becomes an **Error**. That is why the range above shows **5 Success / 1 Error** in the UI (5 of 6 exist regardless of active vs available; only `…842836` is missing). ⇒ To predict a sequential range's Success/Error split, the question reduces to *"how many of the generated ICCIDs exist in `icc` at all."* (This confirms the same lifecycle-status gap noted for NUI-1827: a `deleted` SIM would validate as Success.)

---

## Defects / observations
1. **[Defect — cross-cutting] HTTP 401 (expired session) is reported as "ICCID not found in system or invalid checksum verification failed".** During AC5, 4 ICCIDs that had just validated 200 returned **401** on re-validate (access-token expiry; background `AuthKeeper` token-rotation was failing with 400). The UI showed them as "not found" — identical to a genuine 404 — so valid SIMs appear invalid and a user could wrongly amend correct input. The UI should distinguish auth/session errors (401/403) from not-found (404). Evidence: `screenshots/05-defect-401-shown-as-not-found.png`, `console-auth-token-failures.log`, network reqs 68–71 (200) vs 80–83 (401).
2. **[Deviation] AC2/AC3 colour spec** — only one column per tab is coloured (see NUI-1827 report).
3. **[Minor] Field wording** — "First ICCID"/"Number of ICCIDs" vs AC "Starting ICCID"/"Number of rows".
4. **[Positive]** Luhn check-digit recalculation in sequence generation works correctly; error-summary banner + Download ICCID file; auto-switch to Errors tab.
