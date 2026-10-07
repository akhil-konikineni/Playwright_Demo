# SIM Assignment — Exploratory Test Summary (NUI-1827, NUI-2615, NUI-192)

Consolidated index of local test documentation. **All findings are documented here in VS Code only — nothing was posted to Jira.**

- **Environment:** Integration — https://portal-host.int.aws.eseye.io · **User:** `OGlobalUser` (Oli GlobalUser)
- **Date:** 2026-09-28 · **Feature:** SIM Management → SIM Assignment (3-step wizard: Validate SIM IDs → Select Portfolio & Package → Provide SIM Attributes)
- **Method:** live UI exploratory testing + read-only DB verification (`oncilla`). UI **write** performed (with authorization) once — see NUI-192.

## Documents
| File | Contents |
|---|---|
| `NUI-1827/NUI-1827-test-report.md` | Unsequential SIM Assignment / ICCID list display (AC1–AC6) + 10 screenshots |
| `NUI-2615/NUI-2615-test-report.md` | Sequential SIM Assignment / ICCID list display (AC1–AC7) + 6 screenshots |
| `NUI-192/NUI-192-test-report.md` | Jobs / Portfolio-Package / SIM attributes / activation + write verification + 10 screenshots, `iccAttribute-definitions.json` |
| `DB-portfolio-sim-iccid-relationships.md` | How portfolios relate to SIMs/ICCIDs (icc, icc2PortfolioPackage, portfolio, package, packagePortfolio) + package eligibility model |

## Per-ticket result
| Ticket | Title | Result |
|---|---|---|
| NUI-1827 | Unsequential ICCID list display | All 6 ACs pass; AC2 **colour deviation** |
| NUI-2615 | Sequential ICCID list display | All 7 ACs pass; AC3 same colour deviation; AC4 (Next disabled + message) ✅ |
| NUI-192 | Use Jobs for Portfolio/Package, attributes, activation | Matches ticket **including Submit → Generic Job created (Job 206)** |

## Steps executed (high level)
**NUI-1827 (Unsequential):** default Unsequential + ICCID field `*` → validate mixed list (1 valid `89011703278149842208`, 1 non-existent, 1 malformed) → verified counts/Success+Error tabs/colours → Next-with-errors warning popup (Cancel keeps stage; Proceed → Portfolio&Package with successful only) → Clear form → all-success → Next direct → Back retains ICCIDs → Portfolio\*/Package\* mandatory.

**NUI-2615 (Sequential):** switch to Sequential → First ICCID\* + Number of ICCIDs\* → last-ICCID generation (Luhn-correct) → validate all-success → forced an error mix using a real DB gap (missing ICCID `89011703278149842836`) → **Next disabled** + message *"Due to failed ICCIDs, the Starting ICCID value and / or number of ICCIDs must be amended, as the process cannot continue."* → re-generate by amending count → all-success → Next → Back shows validated **range (First→Last)**.

**NUI-192 (Jobs/Attributes):** validated ES5610 SIM `8944538523018602170` → selected **RL Capital Ltd** + package **15582** → Provide SIM Attributes (19 defined attributes available; 3 pre-filled; custom attributes name+value, **max 5** enforced; **Job Name mandatory**; **Activate SIMs** default ON) → **Submitted** (authorized): step-2 "Submit Assignment" → **Confirm Assignment** dialog (Job Name mandatory) → Continue → **Job 206 created, type Generic**, listed in Bulk Management → Jobs.

## Key defects / findings (for the team)
1. **[Defect] HTTP 401 (expired session) shown as "ICCID not found in system or invalid checksum verification failed".** During validation, an expired token makes valid SIMs appear invalid — indistinguishable from a real 404. Root cause: background token rotation failing (`AuthKeeper` cognito refresh 400). Also breaks Submit → job creation ("Saved, but no job was created — Unauthorized"), and the "changes were saved to every SIM" message is **inaccurate** (DB showed no change). Evidence in NUI-2615/NUI-192 reports.
2. **[Deviation] AC2/AC3 tab colours** — spec asks every column green (Success)/red (Error); actual colours only the ICC-Type column (green) / Error-message column (red); ICCID stays dark with a status icon. Same in both NUI-1827 and NUI-2615.
3. **[Confirm design] Package dropdown is ICC-type-gated** (`iccTypePackage` by iccTypeId + portfolioId). A portfolio with many active packages can show "No results found" with no explanation when none match the SIM's ICC type → possible UX dead-end.
4. **[Confirm design] Validation checks existence only, not assignment status** — a SIM already live in another portfolio validates as "success" and would be reassigned on submit (`icc2PortfolioPackage.iccId` is UNIQUE = one portfolio+package per SIM).
5. **[Minor] Wording:** "Enter ICCIDs (max 200)" vs "Enter a list of ICCIDs"; "First ICCID"/"Number of ICCIDs" vs "Starting ICCID"/"Number of rows"; Error column header "Error" vs "Error message"; tab "Errors" vs "Error".

## Test data reference (DB, read-only)
- Ticket test SIM `89011703278149842208` (ES4711) → portfolio `0` "All portfolios", package 12421.
- Sequential gap for error tests: base tail 84283 missing → `89011703278149842836` (404).
- ES5610 SIM used for the write test: `8944538523018602170` (portfolio RL Capital Ltd, package 15582).
- DB runner: `scratchpad/dbq.js` (SELECT/SHOW/DESCRIBE only).

## Artifacts created by testing (Integration)
- **Job 206** ("QA NUI-192 job-creation verify…", type Generic, status Setup) — a harmless test job; the SIM's subscription/attributes were unchanged (idempotent target).
