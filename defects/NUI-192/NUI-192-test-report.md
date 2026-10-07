# NUI-192 — Test Report: Use Jobs for Portfolio/Package, SIM Attributes and Activation

- **Ticket:** [NUI-192](https://siam4eseye.atlassian.net/browse/NUI-192) — Story, Priority **High**, Component *SIM Management/SIM Assignment*, Status *In Testing*
- **Environment:** Integration — https://portal-host.int.aws.eseye.io · **User:** `OGlobalUser`
- **Date:** 2026-09-28 · **Scope:** exploratory functional test. **No DB writes. Submit Assignment intentionally NOT clicked** (it creates a Job = write).
- **Test data:** ES5610 SIM `8944538523018602170` (portfolio *RL Capital Ltd*, needed because packages are ICC-type-gated — see finding #1) + package *RL Capital Ltd - 10MB pooled Data - 15582*.

## Result summary

| AC (per ticket definition-of-done) | Result |
|---|---|
| Validate SIMs → Next → Portfolio & Package | ✅ Pass |
| Select portfolio & package → Add SIM Attributes or Submit | ✅ Pass |
| Defined attributes (supported list, selectable) | ✅ Pass (19 available; superset of AC's 12) |
| Custom attributes (name + value, **max 5**) | ✅ Pass (max-5 enforced) |
| Each attribute has title + description/hover | ✅ Pass (descriptions present) |
| Activate SIMs option | ✅ Pass (toggle, default **Enabled**) |
| Job name mandatory | ✅ Pass (gates Submit) |
| Job type 'Generic' sent | ✅ **Verified** — `jobTypeId 11` = "Generic" (see Write verification) |
| Submit → creates background Job + appears in Jobs | ✅ **Verified** — Job **206** created, listed in Bulk Management → Jobs |

**Overall:** UI functionally matches the ticket, **including the write/Submit path** (executed with authorization on an idempotent SIM). Flagging: **portfolio/package eligibility filtering**, one **UX dead-end**, and a **session-expiry partial-failure** worth confirming.

---

## Write verification (Submit executed — authorized)
Executed on ES5610 SIM `8944538523018602170` → RL Capital Ltd → package 15582 (its **existing** portfolio+package, so an idempotent no-op; DB before/after unchanged — modifiedDate still 2019-10-16).

- **Two Submit entry points exist:**
  1. From **step 3 (Provide SIM Attributes)** — Submit disabled until Job Name filled.
  2. From **step 2 (Select Portfolio & Package)** — "Submit Assignment" is enabled immediately; clicking it opens a **"Confirm Assignment"** dialog (Portfolio ID, Package ID, SIMs to be assigned, and a **mandatory Job Name**). This is the ticket's "or submit SIM Assignment" path. Job Name is enforced here too (via the dialog).
- **Job type = 'Generic' ✅** — the flow calls `GET /api/catalog/jobType` and creates the job with `jobTypeId 11`; DB `jobType.jobTypeId=11` → **name "Generic"**, template `https://resources.anynetiot.com/template/generic.CSV` (the generic-CSV orchestration template the ticket describes).
- **Job created ✅** — `POST /api/catalog/job/execute` → 200, returned **jobId 206**: `{jobTypeId:11, name:"QA NUI-192 job-creation verify…", title:"job_1790590178172", portfolioId:"0", status:"setup", requestFileId:"8d0b01dd…"}` (requestFileId = the generated CSV). Requires permission `jobCreate`.
- **Appears in Jobs list ✅** — Bulk Management → Jobs shows row **`206 | QA NUI-192 job-creat… | generic | OGlobalUser | Request | Setup`**. Screenshot `10-job-206-in-jobs-list.png`.
- **Data safety:** SIM subscription & attributes verified unchanged in DB (idempotent target). Job 206 is a harmless test job (status Setup).

### ⚠️ Session-expiry partial failure (first attempt) — Defect candidate
A first Submit (on an older session) returned a dialog **"Saved, but no job was created — Unauthorized"**. Network showed the access token expired mid-submit (cognito refresh 400 → token deleted → `userMe`/`userPermissionMeFlat`/`jobType` all 401). Two concerns:
- The dialog claimed **"The changes were saved to every SIM"**, but the DB showed **no modification** (modifiedDate unchanged) — **misleading success text** on a failed submit.
- The **same session-expiry root cause** as NUI-1827/2615 (background token rotation failing) can silently break Submit → job creation. A fresh login made the identical submit succeed (Job 206), proving it is session/token-lifetime, not a permission gap. Screenshot `08-submit-saved-but-no-job-unauthorized.png`.

---

## Details

### Portfolio & Package step ✅ (+ eligibility finding)
- **Portfolio \*** and **Package \*** both mandatory (asterisks); Package disabled until a Portfolio is chosen; Package enabled after.
- Portfolio dropdown = searchable typeahead (`/api/catalog/portfolio?status=active`, pageSize 20, infinite scroll).
- **Package dropdown is filtered by ICC type AND portfolio** via `GET /api/catalog/iccTypePackage/execute?iccTypeId=<type>&portfolioId=<pf>&status=active` (endpoint `/v2/iccType/{iccTypeId}/getPackage`). Only packages compatible with the validated SIMs' ICC type **and** offered by the chosen portfolio appear.
  - For ES4711 (iccTypeId 141): "Data Print Telecom" and "Marketplace Customer" returned **"No results found"** even though they have active packages in `packagePortfolio` — because none are ES4711-compatible. **Not a bug**, but see finding #1/#2.
  - For ES5610 + "RL Capital Ltd": one package appeared — "RL Capital Ltd - 10MB pooled Data - 15582". Screenshot `02-package-shows-for-compatible-portfolio.png`.
- Once portfolio+package chosen, **Add SIM Attributes** and **Submit Assignment** both enable. Screenshot `03-portfolio-package-selected-buttons-enabled.png`.

### Provide SIM Attributes step ✅
Screenshot `04-provide-sim-attributes-screen.png`. Layout: left = attributes form, right = **Assignment summary** (Validated SIMs, Portfolio, Package, Defined attributes count, Custom attributes count, Activate SIMs) + "This assignment will be submitted as a background job. You can track progress in Jobs."

**Defined attributes** — multi-select of supported SIM attributes (source: `GET /api/catalog/objectDefinitions?objectName=iccAttribute`). **19 available** (raw file `iccAttribute-definitions.json`):
`orderItemRef, orderRef, messagingProfileId, reportingProfileId, alertProfileId, deviceProfileId, taxPortfolioAddressId, deploymentPortfolioAddressId, orderItemId, orderId, imei, groupName, friendlyName, field1–field5, mEId`.
- Covers **all 12** attributes named in the ticket AC3 (Group=groupName, SIM Name=friendlyName, Order ID/Item ID/Reference/Item reference, IMEI, Deployment/Tax portfolio address ID, Device/Alert/Reporting Profile ID) **plus extras** (messagingProfileId, field1–5, mEId).
- Each attribute has a title + **description** used as placeholder/hover (AC4), e.g. "The Tigrillo Messaging Profile", "The unique International Mobile Equipment Identity…". All `dataType: string`.
- On this run 3 were **pre-selected with pre-filled values** (Messaging Profile ID `19e767…`, Reporting Profile ID `3324`, Alert Profile ID `4593`) — appear to be Tigrillo/portfolio defaults. Each selected attribute renders an editable input with a Remove (×) control.

**Custom attributes** ✅ — "Add custom attribute" creates an **Attribute name + Attribute value** pair (placeholders "E.g. Attribute name" / "E.g. Attribute value"). **Max 5 enforced** — after 5 rows the Add button is **disabled**. Screenshots `05-custom-attribute-added.png`, `06-custom-attributes-max5-disabled.png`.

**Activation** ✅ — an "Activation" panel with a toggle, **default Enabled** ("SIM Activation Enabled / Enabled State - Click to disable"), helper "When enabled, all successfully assigned SIMs will be activated automatically after the assignment job completes." Summary shows "Activate SIMs: Yes".

**Job Name** ✅ (AC "must input Job name") — mandatory (asterisk), placeholder "E.g. Customer Name", helper "Used to identify this assignment in the Jobs list." **Submit Assignment stays disabled until Job Name is filled**; filling it enables Submit. Screenshot `07-jobname-enables-submit.png`.

### Not executed (write operations)
- **Submit Assignment** — would create the background Job (writes `icc2PortfolioPackage` / a job record). Not clicked per instructions.
- Therefore **Job type = 'Generic'** (AC7) and the **post-submit redirect + Job ID** (AC8) were not verified. Both are only observable in/after the Submit request. Recommend verifying the submit payload contains `jobType: Generic` and that the confirmation shows a Job ID linking to Bulk Management → Jobs.

---

## Findings / observations
1. **[Confirm design] Package list is ICC-type-gated.** A portfolio with many active packages shows "No results" if none match the validated SIMs' ICC type. Correct per `iccTypePackage`, but the UI gives no hint *why* the list is empty — a user may think packages are missing. Consider an inline note ("No packages for ICC type X in this portfolio").
2. **[UX dead-end]** If a user selects a portfolio with zero ICC-type-compatible packages, Package shows "No results" and Add SIM Attributes / Submit stay disabled with no guidance — the only recovery is to change portfolio. Worth a hint/validation message.
3. **[Positive]** Custom-attribute max-5 correctly enforced; defined-attribute set is a superset of the AC; descriptions present for hover/help; activation defaults to on; assignment summary is clear; Job Name correctly gates Submit.
4. **[Cross-cutting]** Same session-expiry issue as NUI-2615 (401 shown as "not found") applies to any long session on this flow.
