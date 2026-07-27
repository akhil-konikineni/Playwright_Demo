# DataCentre — Complete Test Coverage

| Field | Value |
|---|---|
| Feature | DataCentre |
| Document Version | 1.0 |
| Coverage Date | 2026-07-07 |
| Prepared By | Playwright MCP QA Automation Agent |
| Environment | https://portal.qan.aws.eseye.io |
| Test User | statususer / Password#1 |
| DB Schema | oncilla |
| Source | Live UI exploration via Playwright MCP browser automation |

---

## 1. Feature Overview

The **DataCentre** module lives at `/network-management/data-centres`, reached via **Network Management → Data Centres** in the left navigation. It manages the data centre records referenced by Supernets/IPPools for network topology. The module has a single list/grid view; a detail page (`/network-management/data-centres/{dataCentreId}`) exists but is **not linked from the grid** — Data Centre ID/Name cells are plain non-interactive text and the Actions menu never exposes a View/Details entry, so the detail page is only reachable by typing the ID directly into the URL. Since no real user flow exposes that ID-in-URL navigation, the detail page (and the Attributes section it hosts) is **out of scope for test coverage** — see DC-V-17 for the negative confirmation that no grid control links to it. Records support Create and a 4-state status lifecycle (Setup, Requested, Active, Deleted) driven entirely through an Actions-menu confirmation-dialog pattern, observed as a full mesh (every state exposes the other 3 as transition options). No in-place Edit/Update UI flow exists for the main record fields, despite a `CapabilityDataCenterUpdate` permission apparently being modeled server-side — this is a confirmed deviation, documented rather than fabricated, consistent with the pattern already established for ProviderTariff.

---

## 2. Environment Details

| Parameter | Value |
|---|---|
| Application URL | https://portal.qan.aws.eseye.io |
| Login URL | https://portal.qan.aws.eseye.io/login |
| Data Centres URL | /network-management/data-centres |
| Detail Page URL (direct-nav only) | /network-management/data-centres/{dataCentreId} |
| Auth Provider | AWS Cognito (eu-west-1) |
| API Base URL | https://mno.api.qan.eseye.io/v2 |
| Database | MySQL (oncilla schema) |
| Test User | statususer / Password#1 |

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | Total |
|---|---|---|---|---|---|
| DataCentre | 17 | 16 | 15 | 2 | **50** |
| StatusTransitions (S5, separate section) | | | | | 9 |
| **Grand Total** | | | | | **59** |

---

## 4. Module Discovery Report

```
MODULE NAME        : DataCentre
CAPABILITY PREFIX  : DataCenter → CapabilityDataCenterGet / CapabilityDataCenterCreate / CapabilityDataCenterUpdate / CapabilityDataCenterApprover / CapabilityDataCenterAdmin
                      (inferred by naming-convention analogy with ProviderTariff/IPPool; not independently confirmed against the resource-permission API this session)
MODULE PLURAL      : Data Centres
MENU PATH          : Network Management → Data Centres
PRIMARY KEY FIELD  : dataCentreId (Data Centre ID)
FOREIGN KEY FIELDS : countryCodeId → Country Code. Rendered in the grid as plain text in "{code}({id})" format (e.g. "testing121(273)") — NOT a hyperlink to another module's page, unlike ProviderTariff's MNO column. CONFIRMED STRUCTURAL DIFFERENCE.
TEXT FIELDS        :
  name — mandatory, 1-128 characters
  title — mandatory AND unique, 1-8 characters, whitespace not permitted
  dataCentreRef — optional, 0-128 characters
  subdomain — optional, 0-16 characters
DROPDOWN FIELDS    :
  countryCodeId → Country Code (searchable combobox, "Select item..." placeholder) — mandatory, present on both the Create form and the Secondary filter section
TABLE HEADERS      : Data Centre ID, Name, Title, Data Centre Ref, Subdomain, Country Code, Status, Actions (8 visible by default; ALL 7 toggleable data columns are already visible — NO hidden-by-default column, unlike ProviderTariff's hidden Description column)
FILTER FIELDS      : Status, Subdomain, Data Centre Ref, Title, Name, Data Centre ID (Primary — dropdown/free text), Country Code (Secondary — searchable combobox); plus a global search bar "Search Data Centre by name..."
STATUS VALUES      : setup, requested, active, deleted
CRUD AVAILABLE     : Create, Read (List + Detail page, detail page reachable by direct URL only). NO Update/Edit UI for main record fields (Actions menu contains only status-transition entries — Delete / Approve / Request / Set Up depending on current status — never Edit/Clone/View). NO hard Delete — soft-delete only via the "Delete" status transition (record moves to `deleted` status and remains visible in the grid/DB).
ATTRIBUTE SECTION  : UI is present on the detail page, but the detail page has no in-app entry point (no grid hyperlink) and is only reachable by typing an ID directly into the URL — OUT OF SCOPE for test coverage, not a valid user flow.
APIs CAPTURED      :
  GET   https://mno.api.qan.eseye.io/v2/dataCentre                              — load Data Centres grid
  GET   https://mno.api.qan.eseye.io/v2/dataCentre/definition                   — form/field definition (mandatory flags, max lengths, regex)
  POST  https://mno.api.qan.eseye.io/v2/dataCentre                              — create Data Centre
  PATCH https://mno.api.qan.eseye.io/v2/dataCentre/{id}                        — status transition, body {"status":"<target>"}
  GET   https://common.api.qan.eseye.io/v2/country                             — Country Code combobox source (Create form + Secondary filter)
  GET   https://common.api.qan.eseye.io/v2/resource?name=dataCentre            — captured, response body not inspected this session
TRANSITION PRECONDITIONS :
  Requested → Active | All mandatory fields must NOT be NULL | Blocked if any mandatory field is NULL in DB | System error toast/banner indicating mandatory fields are incomplete
  Any state → Deleted | No active IPPools linked to this DataCentre via oncilla.resourceRelationship | Blocked if at least one active resourceRelationship entry links this DataCentre to an active IPPool | System error toast/banner indicating active IPPool dependency exists
  (Both preconditions are documented in the pipeline's known DataCentre precondition list; neither was triggered live this session — TCs below assume the blocking data state must be set up by the executor.)
```

### STATUS TRANSITION OVERRIDE — DataCentre

```
This feature's live Actions-menu behaviour is a full mesh, same as ProviderTariff — because FULL_USER holds every capability, every one of the 4 statuses (Setup, Requested, Active, Deleted) shows the other 3 statuses as transition options in its Actions menu (confirmed live for Setup, Requested, and Active as source states). Every transition is gated behind a "Confirm Status Change" modal dialog — BUT with wording that DIFFERS from ProviderTariff's dialog and must not be copied verbatim:
  - Title: "Confirm Status Change"
  - Body : Are you sure you want to change the status from "<from>" to "<to>"? — using the RAW LOWERCASE status enum value in quotes (e.g. "setup", "requested", "active", "deleted"), NOT the capitalised display label used in the grid's Status badge.
  - Buttons: "Cancel" and a SINGLE-WORD ACTION VERB matching the Actions-menu item clicked (observed: "Request", "Approve", "Delete" — the 4th, "Set Up", was not triggered live this session but is inferred by symmetry with the Actions-menu item of the same name) — this is NOT the "Set to <To>" phrasing used by ProviderTariff's dialog. CONFIRMED WORDING DEVIATION.
  - Plus a Close (X) icon.
REASON : Discovered live this session via accessibility-snapshot capture of 3 separate transition dialogs (setup→requested, requested→active, active→deleted). Grid Status column was confirmed to update immediately after each successful transition. Toast/notification text was not captured this session.
```

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|---|---|---|
| 1 | Data Centre ID | Plain text — NOT a hyperlink (detail page exists but is not linked from the grid) |
| 2 | Name | Plain text — NOT a hyperlink |
| 3 | Title | Plain text |
| 4 | Data Centre Ref | Plain text |
| 5 | Subdomain | Plain text |
| 6 | Country Code | Plain text badge in "{code}({id})" format — NOT a hyperlink, unlike ProviderTariff's MNO column |
| 7 | Status | Colour badge: Setup / Requested / Active / Deleted |
| 8 | Actions | Menu/dropdown icon — always enabled regardless of record status; contains only status-transition entries per record (Delete / Approve / Request / Set Up as applicable), no Edit/Clone/View option |

- **No hidden-by-default column:** the "Search Results View" (Configure visible columns) dialog lists exactly 7 Output Columns — Data Centre ID, Name, Title, Data Centre Ref, Subdomain, Country Code, Status — matching precisely the 7 data columns already visible by default. CONFIRMED: no column-visibility defect exists for this module (structural difference from ProviderTariff's hidden Description column).
- **Total rows:** ~40 existing records observed in the environment during exploration; exact total was not independently queried against the DB.
- **Grid API:** GET https://mno.api.qan.eseye.io/v2/dataCentre

---

## 6. Discovered Form Fields (Create)

| Field | Type | Mandatory | Max Length/Regex | Source |
|---|---|---|---|---|
| Name | textbox | Yes (*) | 1–128 characters | GET /v2/dataCentre/definition |
| Title | textbox | Yes (*) | 1–8 characters, unique, whitespace not permitted | GET /v2/dataCentre/definition |
| Data Centre Ref | textbox | No asterisk | 0–128 characters | GET /v2/dataCentre/definition |
| Subdomain | textbox | No asterisk | 0–16 characters | GET /v2/dataCentre/definition |
| Country Code | combobox (searchable) | Yes (*) | Placeholder: "Select item..." | GET /v2/country |

- No Edit form exists for main record fields — the fields above apply to the Create dialog only.
- New records default to `status: "setup"`.

---

## 7. Discovered Filter Fields

| Filter Field | Type | Values/Source |
|---|---|---|
| Status | combobox (Primary) | Setup, Requested, Active, Deleted |
| Subdomain | text (Primary) | Free text |
| Data Centre Ref | text (Primary) | Free text |
| Title | text (Primary) | Free text |
| Name | text (Primary) | Free text |
| Data Centre ID | text (Primary) | Free text |
| Country Code | combobox (Secondary) | GET /v2/country — dynamic, searchable |

---

## 8. Test Scenarios (for Generator Agent)

> The CSV (`test-cases/test-cases/datacentre_testcoverage.csv`) is the authoritative source for script generation. This section is a narrative scenario inventory for traceability and API/DB context only.

### S1 — VIEW (CSV IssueId 1–17, `Capability{Module}Get`)

| ID | Scenario | Sanity |
|---|---|---|
| DC-V-01 | List page loads with 8-column grid; matches discovered column order | yes |
| DC-V-02 | Data Centre ID displays as plain non-interactive text (no navigation on click) | no |
| DC-V-03 | Name displays as plain non-interactive text (no navigation on click) | no |
| DC-V-04 | Country Code column displays "{code}({id})" plain text, not a hyperlink | yes |
| DC-V-05 | Status column shows distinct colour badges for Setup/Requested/Active/Deleted | no |
| DC-V-06 | Actions menu control present on every row regardless of status | yes |
| DC-V-07 | Actions menu contains only status-transition entries, never Edit/Clone/View | yes |
| DC-V-08 | Search bar placeholder is "Search Data Centre by name..." | no |
| DC-V-09 | Records-per-page selector changes row count displayed | no |
| DC-V-10 | Next/Previous/First/Last pagination controls function correctly | no |
| DC-V-11 | First/Previous disabled on page 1 | no |
| DC-V-12 | "Configure visible columns" (Search Results View) panel opens from toolbar | yes |
| DC-V-13 | All 7 Output Columns listed are already visible by default (no hidden column) | no |
| DC-V-14 | Select All / Deselect All in Search Results View function correctly | no |
| DC-V-15 | Status column always precedes Actions column | no |
| DC-V-16 | Negative — Get: module hidden from nav + direct URL blocked without permission | yes |
| DC-V-17 | Detail page is reachable only via direct URL navigation; no grid control links to it (confirmed navigation-gap deviation) | yes |

**API:** GET /v2/dataCentre → 200, itemCount matches UI row count. **DB:** `SELECT COUNT(*) FROM oncilla.dataCentre WHERE status != 'deleted'`.

### S2 — FILTER (CSV IssueId 18–33, `Capability{Module}Get`)

| ID | Scenario | Sanity |
|---|---|---|
| DC-F-01 | Filters dialog opens with Primary + Secondary sections | yes |
| DC-F-02 | Status primary filter narrows grid | yes |
| DC-F-03 | Subdomain primary filter narrows grid | no |
| DC-F-04 | Data Centre Ref primary filter narrows grid | no |
| DC-F-05 | Title primary filter narrows grid | no |
| DC-F-06 | Name primary filter narrows grid | no |
| DC-F-07 | Data Centre ID primary filter narrows grid | no |
| DC-F-08 | Country Code secondary combobox loads data | yes |
| DC-F-09 | Country Code secondary filter narrows grid | yes |
| DC-F-10 | Combined Name + Country Code filters narrow correctly (AND logic) | no |
| DC-F-11 | Reset clears all filters | yes |
| DC-F-12 | Apply applies filter and closes dialog | no |
| DC-F-13 | Close (×) dismisses dialog without applying | no |
| DC-F-14 | Filter icon reachable from grid toolbar | no |
| DC-F-15 | Non-existent Title returns empty grid/state | no |
| DC-F-16 | Special characters in Title filter handled without client error | no |

**API:** GET /v2/dataCentre?filter params. **DB:** cross-check filtered row count against `oncilla.dataCentre`.

### S3 — CREATE (CSV IssueId 34–48, `Capability{Module}Create`)

| ID | Scenario | Sanity |
|---|---|---|
| DC-C-01 | Create entry point visible on list page | yes |
| DC-C-02 | Create dialog opens with exactly 5 fields | yes |
| DC-C-03 | Name mandatory | no |
| DC-C-04 | Title mandatory and unique | yes |
| DC-C-05 | Title enforces max length of 8 characters | no |
| DC-C-06 | Title rejects whitespace | no |
| DC-C-07 | Data Centre Ref has no mandatory asterisk (optional) | no |
| DC-C-08 | Subdomain has no mandatory asterisk (optional) | no |
| DC-C-09 | Country Code mandatory searchable combobox | no |
| DC-C-10 | Submit disabled while a mandatory field is empty | yes |
| DC-C-11 | Submit enabled once all mandatory fields are filled | yes |
| DC-C-12 | Cancel with no data closes immediately, no popup | yes |
| DC-C-13 | Cancel with data shows Unsaved Changes popup | yes |
| DC-C-14 | Happy path create → new row, status Setup | yes |
| DC-C-15 | Duplicate Title rejected | no |

**API:** POST /v2/dataCentre → 200/201 on success, 400/404 on failure per above. **DB:** `SELECT * FROM oncilla.dataCentre WHERE dataCentreId = [id]`.

### S4 — UPDATE (CSV IssueId 49–50, `Capability{Module}Update`)

| ID | Scenario | Sanity |
|---|---|---|
| DC-U-01 | No Edit icon in Actions column for any record in any status (deviation) | yes |
| DC-U-02 | Actions menu never exposes a form-based edit flow despite Update permission | yes |

**Note:** DataCentre has NO edit/update UI flow for main record fields — this section intentionally documents the deviation rather than fabricating an edit form, consistent with ProviderTariff.

### S5 — STATUS TRANSITIONS (CSV IssueId 51–59, `Capability{Module}Update` + `Approver` + `Admin`)

**Note:** each transition TC includes an explicit step verifying the Confirm Status Change dialog's title, body text (raw lowercase status values), and buttons (Cancel + single-word action verb), per the confirmed wording deviation from ProviderTariff documented above.

| ID | Scenario | Sanity |
|---|---|---|
| DC-S-01 | Setup → Requested (live-confirmed: Confirm Status Change dialog → PATCH → grid update) | yes |
| DC-S-02 | Setup → Deleted | no |
| DC-S-03 | Requested → Setup | no |
| DC-S-04 | Requested → Deleted | no |
| DC-S-05 | Deleted → Setup | no |
| DC-S-06 | Deleted → Requested | no |
| DC-S-07 | Setup/Requested/Deleted → Active (Approve, live-confirmed for Requested→Active) | yes |
| DC-S-08 | Negative precondition — Requested → Active blocked when a mandatory field is NULL | yes |
| DC-S-09 | Negative precondition — → Deleted blocked when an active IPPool references the record | yes |

**API:** PATCH /v2/dataCentre/{id} body `{"status":"<target>"}` → 200 on success. **DB:** `SELECT status FROM oncilla.dataCentre WHERE dataCentreId = [id]` before/after.

---

## 9. Known Findings / Defects

| ID | Severity | Description |
|---|---|---|
| DC-OBS-01 | Observation | No grid control (ID cell, Name cell, or Actions menu entry) links to the existing detail page — it is reachable only by typing an ID directly into the URL. Since no real user flow exposes this navigation, the detail page (and its Attributes section) is out of scope for test coverage; see DC-V-17 |
| DC-OBS-02 | Observation | Confirm Status Change dialog wording differs from ProviderTariff's: body uses raw lowercase status enum values in quotes, and the confirm button uses a single-word action verb (Request/Approve/Delete/Set Up) rather than "Set to \<Status\>" phrasing — documented, not assumed |

---

## 10. Preconditions

1. Environment accessible at https://portal.qan.aws.eseye.io
2. `statususer / Password#1` is active with ALL DataCentre capabilities (Get, Create, Update, Approver, Admin) per QA_PIPELINE.md Step 10
3. At least one Data Centre record exists in each of the 4 status states before running S1/S5 tests
4. A valid Country Code (e.g. testing121/273) is available for Create happy-path tests
5. For precondition TCs (DC-S-08, DC-S-09): a record with a NULL mandatory field and a record referenced by an active IPPool (via `oncilla.resourceRelationship`) must be set up in DB beforehand
6. DB read access to `oncilla` schema for DB validation steps (Phase 2 only — not in CSV)

---

*End of datacentre_testcoverage.md*
*Generated from live UI exploration via Playwright MCP browser automation | 2026-07-07*
*Total test scenarios: 59 (S1-View: 17, S2-Filter: 16, S3-Create: 15, S4-Update: 2, S5-StatusTransitions: 9)*
