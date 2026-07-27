# ProviderTariff — Complete Test Coverage

| Field | Value |
|---|---|
| Feature | ProviderTariff |
| Document Version | 1.0 |
| Coverage Date | 2026-07-03 |
| Prepared By | Playwright MCP QA Automation Agent |
| Environment | https://portal.qan.aws.eseye.io |
| Test User | statususer / Password#1 |
| DB Schema | oncilla |
| Source | Live UI exploration via Playwright MCP browser automation |

---

## 1. Feature Overview

The **ProviderTariff** module lives at `/mno/provider-tariffs`, reached via **MNO Management → Provider Tariffs** in the left navigation. It manages the tariff records that link an MNO to a tariff code (used downstream by CommsProfiles). The module has a single list/grid view — there is no tabbed structure and no detail/view page for individual records. Records support Create and a 4-state status lifecycle (Setup, Requested, Active, Deleted) driven entirely through an Actions-menu "Set to X" pattern gated behind a confirmation dialog. No in-place Edit/Update UI flow exists despite a `CapabilityProviderTariffUpdate` permission apparently being modeled server-side — this is a confirmed deviation from the standard CRUD assumption and is documented throughout this report rather than fabricated.

---

## 2. Environment Details

| Parameter | Value |
|---|---|
| Application URL | https://portal.qan.aws.eseye.io |
| Login URL | https://portal.qan.aws.eseye.io/login |
| Provider Tariffs URL | /mno/provider-tariffs |
| Auth Provider | AWS Cognito (eu-west-1) |
| API Base URL | https://package.api.qan.eseye.io/v2 |
| Database | MySQL (oncilla schema) |
| Test User | statususer / Password#1 |

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | Total |
|---|---|---|---|---|---|---|
| ProviderTariff | 16 | 16 | 14 | 2 | 0 | **48** |
| StatusTransitions (S6, separate section) | | | | | | 9 |
| **Grand Total** | | | | | | **57** |

---

## 4. Module Discovery Report

```
MODULE NAME        : ProviderTariff
CAPABILITY PREFIX  : ProviderTariff → CapabilityProviderTariffGet / CapabilityProviderTariffCreate / CapabilityProviderTariffUpdate / CapabilityProviderTariffApprover / CapabilityProviderTariffAdmin
MODULE PLURAL      : Provider Tariffs
MENU PATH          : MNO Management → Provider Tariffs
PRIMARY KEY FIELD  : providerTariffId
FOREIGN KEY FIELDS : mnoId → links to MNO page (/mno/{mnoId}), rendered as a hyperlink in the MNO grid column
TEXT FIELDS        :
  name — mandatory
  title — mandatory
  description — optional in UI (no asterisk) but mandatory in backend API (400 bad_request, missingFields:["description"] observed when omitted) — CONFIRMED VALIDATION-MISMATCH DEFECT
  tariffCode — mandatory
DROPDOWN FIELDS    :
  mnoId → MNO (searchable combobox, "Select item..." placeholder) — mandatory. Options should be Active MNO records only (per module-specific rule). mnoId 1001 (Valid8US) is the confirmed-good MNO for Create.
TABLE HEADERS      : Provider Tariff ID, Name, Title, MNO, Tariff Code, Status, Actions (7 visible by default; Description exists as an 8th column, hidden by default, selectable via "Configure visible columns")
FILTER FIELDS      : Tariff Code, Description, Title, Name, Provider Tariff ID, Status (Primary — free text/combobox), MNO (Secondary — combobox).
STATUS VALUES      : Setup, Requested, Active, Deleted
CRUD AVAILABLE     : Create, Read. NO Update/Edit UI flow (no Edit/Clone menu item anywhere — Actions menu contains only 3 status-transition entries per record, always enabled regardless of status). NO Delete UI — soft-delete only via the "Set to Deleted" status transition. NO detail/view page (Name/Title/Tariff Code cells are plain non-interactive text; only the MNO cell links out, to a different module's page).
ATTRIBUTE SECTION  : no — CapabilityAttribute-eligible per the pipeline's static module list, but no attribute section, no detail page, and no APN/RatType/ProviderRate configuration mapping exist in the live UI — CONFIRMED DEVIATION from the pipeline's static module-specific rule ("ProviderTariff Object must have a Configuration mapped to APN, RatType, and ProviderRate").
APIs CAPTURED      :
  GET   https://package.api.qan.eseye.io/v2/providerTariff        — load Provider Tariffs grid
  POST  https://package.api.qan.eseye.io/v2/providerTariff        — create Provider Tariff (confirmed 400 bad_request when description omitted)
  PATCH https://package.api.qan.eseye.io/v2/providerTariff/{id}   — status transition (confirmed live this session: body {"status":"<target>"}, response 200 echoing full updated record e.g. {"providerTariffId":1855,"name":"qatestcreate02","title":"qatestcreate02","description":"QA test create description","mnoId":1001,"tariffCode":"QATESTCODE02","providerTariffRef":null,"status":"requested"})
  GET   https://package.api.qan.eseye.io/v2/mno                   — MNO combobox source (Create form + Secondary filter)
TRANSITION PRECONDITIONS :
  Requested → Active | All mandatory fields must NOT be NULL | Blocked if any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete
  Any state → Deleted | No active CommsProfiles using this ProviderTariff | Blocked if at least one active CommsProfileId references this ProviderTariff | System error toast/banner indicating active CommsProfile dependency exists
  (Both preconditions above are documented in the pipeline's known ProviderTariff precondition list; they were not triggered live this session — TCs below assume the blocking data state must be set up by the executor.)
```

### STATUS TRANSITION OVERRIDE — ProviderTariff

```
This feature's live Actions-menu behaviour is a full mesh, not gated per the common Approver/Admin model — because FULL_USER holds every capability, every one of the 4 statuses (Setup, Active, Requested, Deleted) shows the other 3 statuses as "Set to X" options in its Actions menu (confirmed live for all 4 statuses). Every transition is gated behind a "Confirm Status Change" modal dialog (title: Confirm Status Change; body: `Are you sure you want to change the status from "<from>" to "<to>"?`; buttons: Cancel, "Set to <To>", plus a Close X icon) — this dialog was previously undocumented and must be included in every S6 test case.
REASON : Discovered live this session; toast/notification text was NOT visible in the accessibility snapshot immediately after a confirmed transition despite a Notifications region existing in the DOM — documented as an unresolved/unobserved gap, not fabricated. Grid Status column was confirmed to update immediately after a successful transition.
```

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|---|---|---|
| 1 | Provider Tariff ID | Plain text — NOT a hyperlink (no detail page exists for this module) |
| 2 | Name | Plain text |
| 3 | Title | Plain text |
| 4 | MNO | Hyperlink — navigates to `/mno/{mnoId}` (a different module's page) |
| 5 | Tariff Code | Plain text |
| 6 | Status | Colour badge: Setup / Requested / Active / Deleted |
| 7 | Actions | Menu/dropdown icon — always enabled regardless of record status; contains exactly 3 "Set to X" entries per record, no Edit/Clone option |

- **Hidden-by-default column:** Description (8th column) — selectable via "Configure visible columns" / "Search Results View" dialog, unchecked by default, which explains its absence from the default 7-column grid despite being a real, populated field.
- **Total rows:** not exhaustively counted this session — pagination confirmed with 5 page links (Page 1–5); exact total record count was not independently queried against the DB.
- **Grid API:** GET https://package.api.qan.eseye.io/v2/providerTariff

---

## 6. Discovered Form Fields (Create/Edit)

| Field | Type | Mandatory | Max Length/Regex | Source |
|---|---|---|---|---|
| Name | textbox | Yes (*) | Not observed/enforced client-side this session | — |
| Title | textbox | Yes (*) | Not observed/enforced client-side this session | — |
| Description | textbox | No asterisk in UI — but mandatory in backend API (400 missingFields if omitted) | Not observed | — |
| MNO | combobox (searchable) | Yes (*) | Placeholder: "Select item..." | GET /v2/mno — should show Active MNO records only |
| Tariff Code | textbox | Yes (*) | Must be unique (`providerTariffCode` uniqueness rule per module-specific config) | — |

- No Edit form exists — the fields above apply to the Create dialog only.
- Every field has an adjacent "More information" tooltip icon; tooltip content did not appear in the accessibility snapshot or a screenshot after click/hover — documented as an unresolved cosmetic gap, not fabricated.
- New records default to `status: "setup"`; response schema includes `providerTariffRef` (null when unset).

---

## 7. Discovered Filter Fields

| Filter Field | Type | Values/Source |
|---|---|---|
| Tariff Code | text (Primary) | Free text |
| Description | text (Primary) | Free text |
| Title | text (Primary) | Free text |
| Name | text (Primary) | Free text |
| Provider Tariff ID | text (Primary) | Free text |
| Status | combobox (Primary) | Setup, Requested, Active, Deleted |
| MNO | combobox (Secondary) | GET /v2/mno — dynamic |

---

## 8. Test Scenarios (for Generator Agent)

> The CSV (`test-cases/test-cases/providertariff_testcoverage.csv`) is the authoritative source for script generation. This section is a narrative scenario inventory for traceability and API/DB context only.

### S1 — VIEW (CSV IssueId 1–16, `Capability{Module}Get`)

| ID | Scenario | Sanity |
|---|---|---|
| PT-V-01 | List page loads with 7-column grid; matches discovered column order | yes |
| PT-V-02 | Column headers appear in exact order: Provider Tariff ID, Name, Title, MNO, Tariff Code, Status, Actions | no |
| PT-V-03 | Provider Tariff ID displays as plain non-interactive text (no detail page) | no |
| PT-V-04 | MNO column hyperlink navigates to `/mno/{mnoId}` | yes |
| PT-V-05 | Status column shows distinct colour badges for Setup/Requested/Active/Deleted | no |
| PT-V-06 | Actions menu control present on every row regardless of status | yes |
| PT-V-07 | Actions menu contains exactly 3 status options, never Edit/Clone | yes |
| PT-V-08 | Search bar placeholder is "Search Provider Tariff by name..." | no |
| PT-V-09 | Records-per-page selector changes row count displayed | no |
| PT-V-10 | Next/Previous/First/Last pagination controls function correctly | no |
| PT-V-11 | First/Previous disabled on page 1 | no |
| PT-V-12 | "Configure visible columns" (Search Results View) panel opens from toolbar | yes |
| PT-V-13 | Description listed but unchecked by default in Search Results View | no |
| PT-V-14 | Selecting Description + Apply adds it to the grid | no |
| PT-V-15 | Status column always precedes Actions column | no |
| PT-V-16 | Negative — Get: module hidden from nav + direct URL blocked without permission | yes |

**API:** GET /v2/providerTariff → 200, itemCount matches UI row count. **DB:** `SELECT COUNT(*) FROM oncilla.providerTariff WHERE status != 'deleted'`.

### S2 — FILTER (CSV IssueId 17–32, `Capability{Module}Get`)

| ID | Scenario | Sanity |
|---|---|---|
| PT-F-01 | Filters dialog opens with Primary + Secondary sections | yes |
| PT-F-02 | Tariff Code primary filter narrows grid | no |
| PT-F-03 | Description primary filter narrows grid | no |
| PT-F-04 | Title primary filter narrows grid | no |
| PT-F-05 | Name primary filter narrows grid | no |
| PT-F-06 | Provider Tariff ID primary filter narrows grid | no |
| PT-F-07 | MNO secondary combobox loads active MNOs | yes |
| PT-F-08 | MNO secondary filter narrows grid to selected MNO | yes |
| PT-F-09 | Status primary filter narrows grid | yes |
| PT-F-10 | Combined Name + MNO filters narrow correctly (AND logic) | no |
| PT-F-11 | Reset clears all filters | yes |
| PT-F-12 | Apply applies filter and closes dialog | no |
| PT-F-13 | Close (×) dismisses dialog without applying | no |
| PT-F-14 | Filter icon reachable from grid toolbar | no |
| PT-F-15 | Non-existent Tariff Code returns empty grid/state | no |
| PT-F-16 | Special characters in Tariff Code filter handled without client error | no |

**API:** GET /v2/providerTariff?filter params. **DB:** cross-check filtered row count against `oncilla.providerTariff`.

### S3 — CREATE (CSV IssueId 33–46, `Capability{Module}Create`)

| ID | Scenario | Sanity |
|---|---|---|
| PT-C-01 | Create entry point visible on list page | yes |
| PT-C-02 | Create dialog opens with exactly 5 fields | yes |
| PT-C-03 | Name mandatory + auto-focused | no |
| PT-C-04 | Title mandatory | no |
| PT-C-05 | Description has no asterisk (validation-mismatch defect) | yes |
| PT-C-06 | MNO mandatory searchable combobox | no |
| PT-C-07 | Tariff Code mandatory | no |
| PT-C-08 | Submit disabled while mandatory field empty | yes |
| PT-C-09 | Submit enabled once all mandatory fields filled | yes |
| PT-C-10 | Cancel with no data closes immediately, no popup | yes |
| PT-C-11 | Cancel with data shows Unsaved Changes popup | yes |
| PT-C-12 | Happy path create (mnoId 1001/Valid8US) → new row, status Setup | yes |
| PT-C-13 | Duplicate Tariff Code rejected | no |
| PT-C-14 | All 5 fields show "More information" tooltip icon | no |

**API:** POST /v2/providerTariff → 200/201 on success, 400/404 on failure per above. **DB:** `SELECT * FROM oncilla.providerTariff WHERE providerTariffId = [id]`.

### S4 — UPDATE (CSV IssueId 47–48, `Capability{Module}Update`)

| ID | Scenario | Sanity |
|---|---|---|
| PT-U-01 | No Edit icon in Actions column for any record in any status (deviation) | yes |
| PT-U-02 | Actions menu never exposes a form-based edit flow despite Update permission | yes |

**Note:** ProviderTariff has NO edit/update UI flow — this section intentionally documents the deviation rather than fabricating an edit form.

### S5 — ATTRIBUTE

N/A — `ATTRIBUTE SECTION = no`. No attribute section, no detail page exists live. 0 TCs.

### S6 — STATUS TRANSITIONS (CSV IssueId 49–57, `Capability{Module}Update` + `Create` + `Approver` + `Admin`)

**Note:** each transition TC (PT-S-01 through PT-S-07) now includes an explicit step verifying the Confirm Status Change dialog's title, body text, and buttons, in addition to the confirm action itself.

| ID | Scenario | Sanity |
|---|---|---|
| PT-S-01 | Setup → Requested (live-confirmed: Confirm Status Change dialog → PATCH → grid update) | yes |
| PT-S-02 | Setup → Deleted | no |
| PT-S-03 | Requested → Setup | no |
| PT-S-04 | Requested → Deleted | no |
| PT-S-05 | Deleted → Setup | no |
| PT-S-06 | Deleted → Requested | no |
| PT-S-07 | Setup/Requested/Deleted → Active (Approver/Admin) | yes |
| PT-S-08 | Negative precondition — Requested → Active blocked when mandatory field is NULL | yes |
| PT-S-09 | Negative precondition — → Deleted blocked when active CommsProfile references the record | yes |

**API:** PATCH /v2/providerTariff/{id} body `{"status":"<target>"}` → 200 on success. **DB:** `SELECT status FROM oncilla.providerTariff WHERE providerTariffId = [id]` before/after.

---

## 9. Known Findings / Defects

| ID | Severity | Description |
|---|---|---|
| PT-DEFECT-01 | P1 | Description field has no mandatory asterisk in the UI but the backend rejects Create with 400 `missingFields:["description"]` when omitted — validation mismatch between UI and API |
| PT-OBS-01 | Observation | Toast/notification text was not visible in the accessibility snapshot immediately after a confirmed live status transition, despite a Notifications region existing in the DOM — not fabricated, flagged as unconfirmed |
| PT-OBS-02 | Observation | "More information" tooltip content on all 5 Create-form fields did not surface via accessibility snapshot, click, or hover — cosmetic, non-blocking |
| PT-OBS-03 | Observation | ProviderTariff is listed as Attribute-eligible and requiring an APN/RatType/ProviderRate configuration mapping per the pipeline's static module rules, but no such configuration, attribute section, or detail page exists live — confirmed deviation |

---

## 10. Preconditions

1. Environment accessible at https://portal.qan.aws.eseye.io
2. `statususer / Password#1` is active with ALL ProviderTariff capabilities (Get, Create, Update, Approver, Admin) per QA_PIPELINE.md Step 10
3. At least one Provider Tariff record exists in each of the 4 status states before running S1/S6 tests
4. A valid Active MNO (e.g. mnoId 1001 / Valid8US) is available for Create happy-path tests
5. For precondition TCs (PT-S-08, PT-S-09): a record with a NULL mandatory field and a record referenced by an active CommsProfile must be set up in DB beforehand
6. DB read access to `oncilla` schema for DB validation steps (Phase 2 only — not in CSV)

---

*End of providertariff_testcoverage.md*
*Generated from live UI exploration via Playwright MCP browser automation | 2026-07-03*
*Total test scenarios: 57 (S1-View: 16, S2-Filter: 16, S3-Create: 14, S4-Update: 2, S5-Attribute: 0, S6-StatusTransitions: 9)*
