# NUI-1827 — Test Report: Unsequential SIM Assignment / ICCID list display

- **Ticket:** [NUI-1827](https://siam4eseye.atlassian.net/browse/NUI-1827) — Story, Priority **Highest**, Component *SIM Management/SIM Assignment*, Status *In Testing*
- **Environment:** Integration — https://portal-host.int.aws.eseye.io
- **Test user:** `OGlobalUser` (Oli GlobalUser)
- **Date tested:** 2026-09-28
- **Feature path:** SIM Management → SIM Assignment → *Validate SIM IDs* (3-step wizard)
- **Test data used:**
  - Valid ICCID (from ticket comment): `89011703278149842208` (ICC Type `ES4711`, portfolioId `0`)
  - Non-existent ICCID: `89011703278149842209` (one digit off — API 404)
  - Malformed ICCID: `12345` (fails client-side format/checksum)
- **Scope:** Exploratory functional test of the ACs only. **No DB writes.** No `Submit Assignment` performed (would be a write operation).

---

## Result summary

| AC | Description | Result |
|----|-------------|--------|
| AC1 | Default view Unsequential; ICCID field mandatory (asterisk) | ✅ Pass |
| AC2 | Validate → results table with counts + Success/Error tabs + colours | ⚠️ Pass with deviation (column font colours) |
| AC3 | Errors present → Next warning popup (Proceed/Cancel); Clear form; edit + re-validate | ✅ Pass |
| AC4 | All success → Next proceeds directly (no warning) | ✅ Pass |
| AC5 | Back from Portfolio step retains validated ICCIDs | ✅ Pass |
| AC6 | Portfolio & Package fields mandatory (asterisk) | ✅ Pass |

**Overall:** All 6 ACs functionally pass. One genuine deviation (AC2 column font colouring) + several minor wording differences worth confirming with the reporter. Several positive extras beyond the AC.

---

## Detailed findings

### AC1 — Default Unsequential view & mandatory ICCID field ✅
- On opening SIM Assignment, the wizard shows 3 steps: **1 Validate SIM IDs** (active), **2 Select Portfolio & Package** (disabled), **3 Provide SIM Attributes** (disabled).
- **"Unsequential ICCIDs" radio is checked by default** (a "Sequential ICCIDs" radio is also present).
- ICCID input label is **"Enter ICCIDs (max 200) \*"** — asterisk present ⇒ mandatory.
- Helper text: "You can enter up to 200 ICCIDs", "Use one ICCID per line, or separate them with commas", "Spaces will be ignored".
- `Validate` and `Clear form` buttons are **disabled** until text is entered.
- Screenshot: `screenshots/01-ac1-default-unsequential-view.png`

> Minor: AC wording says field label "Enter a list of ICCIDs"; actual label is "Enter ICCIDs (max 200) \*".

### AC2 — Validation results table, counts, tabs & colours ⚠️
Results panel renders on the **right** next to the input on the left.

**Counts header** shows **Total / Success / Errors** (mixed list of 3 → Total 3, Success 1, Errors 2). ✅

**Tabs:** `Success (N)` and `Errors (N)`. When errors exist the UI **auto-selects the Errors tab**. ✅
- **Success tab columns:** `ICCID`, `ICC Type` — e.g. `89011703278149842208 | ES4711`.
- **Error tab columns:** `ICCID`, `Error`, `ICC Type` — e.g.
  - `89011703278149842209 | ICCID not found in system or invalid checksum verification failed | N/A`
  - `12345 | Invalid format or checksum mismatch | N/A`

**Colour deviation (⚠️ vs AC):** AC asks for whole-column green font (Success) / red font (Error). Actual computed colours:
- Success tab: **ICC Type is green** (`oklch(0.52 0.13 142)`); **ICCID text is dark/near-black** (`oklch(0.218 0 0)`) with a green status icon.
- Error tab: **Error message is red** (`oklch(0.55 0.22 15)`); **ICCID text is dark**, **ICC Type "N/A" is gray** (`oklch(0.475 0 0)`), with a red status icon next to the ICCID.
- ⇒ Only **one column per tab** is coloured (ICC Type / Error message), not every column as the AC states. Row status is instead conveyed by a coloured icon on the ICCID cell. **Recommend the reporter confirm whether this is the intended design or a defect.**

- Backend: each ICCID validated via `GET /api/catalog/simById/execute?iccId=...&enrich=title` (permission `iccGet`). Non-existent ICCID → HTTP 404 (surfaces a benign console 404 error, handled into the Error tab). Malformed `12345` is rejected client-side (no API call).
- Screenshots: `02-ac2-success-single.png`, `03-ac2-error-tab.png`, `04-ac2-success-tab-mixed.png`

> Minor wording: Error column header is "Error" (AC says "Error message"); tabs read "Errors" plural (AC says "Error").

### AC3 — Errors present: Next warning, Clear form, re-validate ✅
- **Next with errors → warning dialog** with text (near-exact AC match):
  > "Errors in validation. Only successful ICCID(s) can be assigned. Are you sure you want to proceed? Otherwise select Cancel to edit/re-submit the ICCIDs."
  - Dialog buttons: **Cancel**, **Proceed**, plus a **Close (X)**.
- **Cancel** → dialog closes, **workflow stays on step 1** (steps 2 & 3 remain disabled). ✅ (AC3.1.1.3)
- **Proceed** → moves to **step 2 Select Portfolio & Package** (step 1 marked done). ✅ (AC3.1.1.2)
- **Clear form** → empties the textbox, resets results to "No SIMs validated yet", removes the error-summary banner, disables Validate/Clear/Next. ✅ (AC3.2.1)
- **Edit + re-validate** → editing the free-text box (manual, no button) and clicking Validate re-runs validation. Exercised repeatedly across single → mixed → single lists. ✅ (AC3.2.2 / AC3.2.3)
- Screenshots: `05-ac3-next-warning-dialog.png`, `06-ac3-ac6-portfolio-package-step.png`

> Observation: On the Portfolio & Package step there is **no visible list/count of the carried-forward ICCIDs**, so "moves to next section with only successful ICCIDs" could not be *visually* confirmed on that step (would only be verifiable at Submit, which was intentionally not performed).

### AC4 — All success: Next proceeds directly ✅
- Validating only the valid ICCID shows a green banner: **"All ICCIDs have been successfully validated / You can proceed to the next step."** (Total 1 / Success 1 / Errors 0).
- **Next → moves straight to step 2 Select Portfolio & Package with NO warning popup.** ✅
- Screenshots: `08-ac4-all-success.png`, `09-ac4-direct-to-portfolio.png`

### AC5 — Back retains validated ICCIDs ✅
- From step 2, **Back → returns to step 1** with the **entered ICCIDs still in the textbox** and the **full validation results retained** (Total 3 / Success 1 / Errors 2, tabs + error-summary banner all preserved).
- Screenshot: `07-ac5-back-retains-iccids.png`

### AC6 — Portfolio & Package mandatory ✅
- Both **Portfolio \*** and **Package \*** fields carry an asterisk. ✅
- **Package** dropdown is **disabled until a Portfolio is selected** (sensible dependency).
- **Portfolio dropdown is functional** — a searchable typeahead listing portfolios (e.g. *Data Print Telecom, Marketplace Customer, RL Capital Ltd, Aberdeen City Council, Eseye – Pelican*, each with an ID hash). Not submitted.
- Screenshot: `10-ac6-portfolio-dropdown-open.png`

---

## Banners / toasts / messages captured
- Error-summary banner (errors present): **"N ICCIDs could not be validated"** with a breakdown list (e.g. "1 ICCID not found in system or invalid checksum verification failed", "1 Invalid format or checksum mismatch") and a **"Download ICCID file"** button. *(Beyond AC — positive extra.)*
- Success banner (all valid): **"All ICCIDs have been successfully validated — You can proceed to the next step."**
- Warning dialog (Next with errors): exact AC text (see AC3).
- Empty state: **"No SIMs validated yet — Enter ICCIDs and click Validate to see results."**
- Per-row error messages: "ICCID not found in system or invalid checksum verification failed"; "Invalid format or checksum mismatch".

## Console / network notes
- One console error observed: `404` for `.../simById/execute?iccId=89011703278149842209` — **expected** (non-existent ICCID) and handled gracefully into the Error tab. No other errors.

---

## Deviations / items for reporter to confirm
1. **AC2 column font colours (main item).** Only ICC Type (Success) and Error message (Error) are coloured; ICCID (both tabs) and ICC Type (Error tab) are not green/red per the AC — status is shown via a coloured row icon instead. Confirm intended vs defect.
2. **Wording:** field label "Enter ICCIDs (max 200)" vs AC "Enter a list of ICCIDs"; column "Error" vs "Error message"; tab "Errors" vs "Error".
3. **No ICCID list/count shown on the Portfolio & Package step**, so "only successful ICCIDs carried forward" is not visually verifiable pre-Submit.

## Positive extras beyond AC
- Auto-switch to Errors tab when errors exist.
- Error-summary banner + "Download ICCID file" for failed ICCIDs.
- All-success confirmation banner.
- "Showing X of Y entries" footer on each results table.
- Sequential ICCIDs mode also present (out of scope for this ticket).
