# Defect — Device Validation shows "IccID belongs to other Telcos" for an ICCID in an Eseye-owned range

| Field | Value |
|---|---|
| Module | Validation |
| Area | Device Validation — ICCID Lookup (`/validation/device-validation`) |
| Severity | Low/Medium — misleading validation message; no functional data loss (see Severity note) |
| Type | UI display/handling defect (message wording), **not** a backend defect |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| Test account | `GlobalTester` (global-tier user; investigation only) |
| Found | 2026-09-25 (live UI + API + DB investigation) |

---

## Summary
On the **Device Validation** page, entering ICCID **`8999922409260000032`** (19 digits, valid format) causes the UI to display:

> **"IccID belongs to other Telcos."**

and keep the **Get information** button disabled.

The backend lookup actually returns **HTTP 200 with an empty result set** (`itemCount: 0`), i.e. *the ICCID is simply not found*. The DB confirms the ICCID does not exist as a SIM — **but its prefix range `8999922` is one of Eseye's largest owned ranges** (1,460,868 SIMs; MNO `899992` = "Gemalto EUICC"). So the specific message "belongs to other Telcos" is **factually incorrect / misleading** for this ICCID: it belongs to an Eseye-managed range, it just isn't a provisioned SIM.

The button-disable behaviour itself is reasonable (a non-existent SIM cannot be validated). The **problem is the message wording**, which asserts a wrong reason instead of "ICCID not found / not recognised".

---

## Preconditions
1. User can log in and access **Validation → Device Validation**.
2. User is authenticated.

## Steps to reproduce (manual)
1. Log in as `GlobalTester`.
2. Left nav → **Validation** → **Device Validation**.
3. In the **ICCID *** field, enter exactly: `8999922409260000032`
4. Observe the field helper/validation area and the **Get information** button.

## Expected result
For an ICCID that is valid in format but not found in Eseye's inventory, the UI should show an accurate message such as **"ICCID not found"** / **"ICCID not recognised"**. It should not claim the ICCID "belongs to other Telcos" when the ICCID's prefix range is Eseye-managed. (No formal requirement doc was available — expected behaviour is inferred from the DB evidence of range ownership.)

## Actual result
- UI shows: **"IccID belongs to other Telcos."**
- **Get information** button remains **disabled**; the validation flow cannot proceed.
- No client-side format error (19 digits satisfies the "Minimum 19 digits, maximum 20 digits" rule).

---

## Evidence (captured live)

### UI
- Page: H1 "Start device validation", H2 "Enter ICCID to retrieve device information and configure validation test".
- ICCID field labelled **`ICCID *`** (asterisk → mandatory, confirmed). Helper: "Minimum 19 digits, maximum 20 digits".
- After entry: message `IccID belongs to other Telcos.` appears; **Get information** disabled.
- Screenshot: `.playwright-mcp/device-validation-iccid-rejected.png`
- No browser console errors (0 errors / 0 warnings).

### API / Network
```
Method:   GET
Endpoint: /api/catalog/sim/execute?iccId=8999922409260000032
Status:   200 OK
Response: {"data":{"itemCount":0,"items":[],"pageToken":"0","requestedPageSize":50}, ...}
```
- The catalog object is `sim` → `iccEnriched` (permission `iccGet`), i.e. the SIM/ICC lookup.
- This was the **only** ICCID-related request; no separate "telco ownership" endpoint was called. The "other Telcos" text is therefore **client-side derived** (from the empty result and/or a static prefix rule), not returned by the backend.
- No failed/5xx calls related to the lookup. (Auth tokens redacted.)

### Database (`oncilla`, read-only)
- `SELECT * FROM icc WHERE iccId = '8999922409260000032'` → **0 rows** (ICCID does not exist — consistent with API `itemCount:0`).
- No `iccRange` row's `start`/`end` bounds contain this ICCID.
- **Prefix ownership:** `icc` rows with prefix `8999922` = **1,460,868** (2nd-largest prefix in the 5.8M-row table). These SIMs map to `iccMnoId = 899992` = **"Gemalto EUICC"** (active MNO on Eseye's platform). → the `8999922` range is **Eseye-managed**, not another telco's.

---

## Correlation
```
User enters ICCID 8999922409260000032 (valid format)
        ↓
UI fires GET /api/catalog/sim/execute?iccId=... 
        ↓
HTTP 200, itemCount:0 (not found — backend behaves correctly)
        ↓
DB: ICCID absent, but prefix 8999922 is an Eseye range (Gemalto EUICC, 1.46M SIMs)
        ↓
UI displays "IccID belongs to other Telcos." + disables Get information
```
The backend and DB are consistent (ICCID genuinely not found). Only the **UI message** is inconsistent with reality.

## Root cause
**UI display/handling issue (message wording).** The frontend maps a "not found" (empty 200) result — or a static prefix rule — to the label "belongs to other Telcos", which is contradicted by DB evidence that prefix `8999922` is an Eseye-owned range. Not a backend defect (API correctly returns 200/empty), not a data-integrity issue (the specific ICCID simply doesn't exist).

## Suggested fix
- Replace "IccID belongs to other Telcos." with an accurate message for the not-found case (e.g. "ICCID not found" / "ICCID not recognised").
- If an "other telco" classification is genuinely intended, base it on authoritative range/ownership data (`iccRange` / MNO), not on an empty SIM lookup — and ensure Eseye-owned ranges (e.g. `8999922` / Gemalto EUICC) are not misclassified.

## Open questions / recommended verification
- Confirm with product/requirements whether "belongs to other Telcos" is a deliberate catch-all message. If so, its accuracy for Eseye-owned ranges should still be revisited.
- **Distinguish the trigger:** enter a *real* existing `8999922…` ICCID and observe whether the same "other Telcos" message appears. If it does → the check is a faulty static prefix rule; if it doesn't → the message is purely the "empty result" path mislabeled. (Skipped here to respect the exact-ICCID scope and avoid displaying real SIM data.)

## Severity note
Left at Low/Medium: no data corruption and the button-disable is safe, but the message actively misinforms users about why validation cannot proceed. Map to the project's severity definitions once product confirms intended behaviour.
