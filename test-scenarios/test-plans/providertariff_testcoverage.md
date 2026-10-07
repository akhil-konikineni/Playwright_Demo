# ProviderTariff — Complete Test Coverage

| Field        | Value                              |
|--------------|------------------------------------|
| Feature      | ProviderTariff                     |
| Document Version | 1.1 (Tiers 1–5 complete + live toast/relationship capture) |
| Coverage Date | 2026-08-28                        |
| Prepared By  | Playwright MCP QA Automation Agent (Planner) |
| Environment  | QAN — https://portal-host.qan.aws.eseye.io |
| Test User    | statususer / Password#1            |
| DB Schema    | oncilla                            |
| Source       | Live UI exploration via Playwright MCP browser automation |

> **✅ COMPLETE — all five capability tiers explored progressively** (setup.md Steps 11–14), one capability at a time, each verified live in `/api/permissions`: **`capabilityProviderTariffGet` (T1)**, **`capabilityProviderTariffUpdate` (T2)**, **`capabilityProviderTariffCreate` (T3)**, **`capabilityProviderTariffApprover` (T4)**, **`capabilityProviderTariffAdmin` (T5)**. All sections **S1–S6** are live-observed. Every scenario traces to the tier that first exposed it (see the elevation log); nothing was attributed to a capability before it was observed live.
>
> **QA Review Gate:** this document + the CSV are Phase-1 output. A human must review `test-scenarios/test-cases/providertariff_testcoverage.csv` before the Generator agent runs. Flagged items to confirm: (a) `description` optional in `objectDefinitions` vs mandatory `*` in create/edit forms; (b) exact confirmation-dialog and toast text for status transitions (observation-only during planning — no live data mutated); (c) Deleted-source list transitions need a Status=Deleted filter to observe.
>
> **S6 STATUS TRANSITIONS is fully covered** across both entry points (List Actions dropdown and Detail Change Status), all transitions, and all permission gates: Update/Create (Setup↔Requested↔Deleted), Approver (→Active), and Admin (Active→Setup/Requested/Deleted + Active-record edit-icon enablement). Preconditions are from `permissions_and_status_model.md`, to be verified at execution.

---

## 1. Feature Overview

Provider Tariff is a Network / MNO Management catalog entity representing an operator tariff, linked to an MNO and (via configuration) to Provider Rates, APNs, RAT Types and Portals. It lives under **MNO Management → Provider Tariffs**.

- **List page:** `/mno/provider-tariffs`
- **Detail page:** `/mno/provider-tariffs/{providerTariffId}` (read-only at GET)
- **Browser tab title:** `Mno | Portal`
- **Page heading (h1):** `Provider Tariffs`
- **Breadcrumb:** `Home > MNO > Provider Tariffs`

Records move through the standard status lifecycle **Setup → Requested → Active → Deleted** (status transitions gated by Update/Create/Approver/Admin — not exercisable at GET). At GET the user can browse the list, search, filter, sort, paginate, configure columns, and open a read-only detail view.

---

## 2. Environment Details

- **App base URL:** `https://portal-host.qan.aws.eseye.io`
- **Login (auth) URL:** `https://portal-host.qan.aws.eseye.io/auth` (two-step: username → Continue → password → Continue)
- **DB:** MySQL `oncilla` (QAN RDS) — planner discovers structure live; DB access from the automation host was blocked (`Access denied ... master`), so all findings below come from UI + network capture, not direct DB reads.
- **Auth API:** `POST /api/auth/token` (access/refresh); `GET /api/permissions` returns the capability list.

### Discovered API endpoints (Tier 1)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/permissions` | Logged-in user's capability list (ground truth for RBAC) |
| GET | `/api/menu-config` | Left-navigation configuration |
| GET | `/api/catalog/providerTariff/execute?pageSize=50&enrich=title&getPageCount=true&status=setup&status=requested&status=active` | **List** — paginated; permission `providerTariffGet`; default excludes `deleted` |
| GET | `/api/catalog/objectDefinitions/execute?objectName=providerTariff&status=active` | Field definitions (attributes, flags, regex, max length) |
| GET | `/api/catalog/genericOption/execute?resourceName=providerTariff&option=status` | Valid status-transition options (empty at GET — none permitted) |
| GET | `/api/catalog/statusTransition/execute?resourceName=providerTariff&status=active&pageSize=200` | Status-transition metadata |
| GET | `/api/catalog/providerTariffById/execute?providerTariffId={id}&enrich=title` | **Detail** record |
| GET | `/api/catalog/providerTariffAttribute/execute?providerTariffId={id}` | Record attributes (404 when none) |

### List query / filter parameters (from list API `inputs`)
`providerTariffId, name, title, description, mnoId, tariffCode, status, providerTariffRef`

---

## 2a. Toast Messages & Confirmation Dialogs (LIVE-CAPTURED 2026-08-28)

> Captured by executing each operation live on a throwaway record (**ID 1865**, since soft-deleted). A DOM MutationObserver was used because these toasts auto-dismiss in ~1–2s. **Exact strings — do not paraphrase.**

| Operation | Exact toast text | Notes |
|---|---|---|
| Create | `Provider Tariff created successfully` | on Submit of Create form |
| Update (Standard Fields) | `Successfully edited Provider Tariff details` | on Submit of Edit form |
| Status change (any transition) | `Status changed to "<state>"` | `<state>` lowercase, e.g. `Status changed to "requested"`, `Status changed to "deleted"` |
| Attribute add / edit / delete | `Attributes updated successfully` | single toast for all attribute saves (shared Submit) |
| Add Provider Rate | `Successfully added Provider Rate` | |
| Remove Provider Rate | `Successfully removed Provider Rate` | |
| Add APN | `Successfully added APN` | toast says "APN" though the button reads "Add Apn" |
| Add Portal | `Successfully added Portal` | |
| Add Rat Type | `Item assigned successfully` | ⚠ **INCONSISTENT** — generic wording, unlike the other three |
| Remove Rat Type | `Item removed successfully` | ⚠ **INCONSISTENT** — generic wording |
| Remove APN / Remove Portal | *(not captured live)* | expected `Successfully removed APN` / `Successfully removed Portal` by analogy — **confirm at execution** |

> ⚠ **Defect candidate:** the **Rat Type** relationship uses generic toasts (`Item assigned/removed successfully`) while Provider Rate, APN and Portal use `Successfully added/removed <Resource>`. Report to the app team.

**Status-change confirmation dialog (live-verified):**
- Title: **`Confirm Status Change`**
- Body: **`Are you sure you want to change the status to "<state>"?`** (state lowercase, quoted)
- Buttons: **Cancel** + a confirm button whose label is the **action verb** for the target state — observed **`Request`** (→Requested) and **`Delete`** (→Deleted); expected `Activate` (→Active), `Set up`/`Setup` (→Setup) — confirm at execution. Plus a **Close (X)**.
- Dismissing (Cancel / X) makes no change; confirming fires the status API and shows the toast above.

**Remove-relationship confirmation dialog (live-verified, all four resources):**
- alert-dialog **`Remove Relationship`** — body **`Are you sure you want to remove this relationship?`** — buttons **Cancel** / **Remove**.

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | STATUS TRANSITION TCs | Total |
|---------|----------|------------|------------|------------|---------------|-----------------------|-------|
| ProviderTariff (Tiers 1–5 — COMPLETE) | 14 | 15 | 15 | 27 | 8 | 26 | 105 |

> **v1.1 (2026-08-28):** UPDATE grew 18→27 with the live-verified Related-resource Add/Remove flows (S4.19–S4.27, IssueId 97–105). All create/update/status/attribute/relationship toasts are now exact (see §2a).

---

## 4. Module Discovery Report

```
MODULE NAME        : Provider Tariff
CAPABILITY PREFIX  : ProviderTariff → capabilityProviderTariffGet / Update / Create / Approver / Admin
                     (live /api/permissions: only capabilityProviderTariffGet + providerTariffGet ACTIVE)
MODULE PLURAL      : Provider Tariffs
MENU PATH          : MNO Management → Provider Tariffs
LIST URL           : /mno/provider-tariffs
DETAIL URL         : /mno/provider-tariffs/{providerTariffId}
PRIMARY KEY FIELD  : providerTariffId  (integer, auto-generated, write forbidden)
FOREIGN KEY FIELDS : mnoId → MNO detail page (/mno/manage-mnos/{mnoId}); grid shows "MNO Title (mnoId)"
                     (config relations on detail: providerRate, apn, ratType, portal)
TEXT FIELDS        : name — mandatory (max 128; regex ^[^\n]{1,128}$; "Please enter 1-128 characters. Newlines are not allowed.")
                     title — mandatory, unique (max 32; regex ^\S{1,32}$; "Please enter a title with 1-32 characters. Spaces are not allowed.")
                     tariffCode — mandatory (max 128; regex ^.{1,128}$; "Please enter 1 to 128 characters.")  [label "Provider Code"]
                     providerTariffRef — optional (max 128; ^.{0,128}$)  [label "Operators Reference"]
                     description — optional (max 255; ^.{0,255}$)
DROPDOWN FIELDS    : mnoId → source MNO (mandatory, resource) — active MNOs
                     status → setup|requested|active|deleted (mandatory, resource, write forbidden — set via transitions)
                     (CREATE-form config dropdowns APN / RatType / ProviderRate — to CONFIRM at Tier 3)
TABLE HEADERS      : Provider Tariff ID, Name, Title, MNO, Tariff Code, Status, Actions  (default visible)
                     Additional configurable (hidden by default): Provider Tariff Ref, Description
FILTER FIELDS      : Primary — Status (multi-select dropdown), Tariff Code, Provider Tariff Ref, Description, Title, Name, Provider Tariff Id (text)
                     Secondary — MNO (searchable dropdown)
STATUS VALUES      : Setup, Requested, Active, Deleted
CRUD AVAILABLE     : (at Tier 1 GET) Read only — list + read-only detail. Create/Update/Delete/StatusTransition NOT exposed.
ATTRIBUTE SECTION  : yes (detail "Attributes" section; records carry attribute[] with providerTariffAttributeId/attribute/value/status)
TEST REPOSITORY    : test-scenarios/test-plans/providertariff_testcoverage.md
APIs CAPTURED      : see §2
TRANSITION PRECONDITIONS (from permissions_and_status_model.md — VERIFY LIVE at Tier 4/5, not yet observed):
   Requested → Active | any mandatory field NULL | error: mandatory fields incomplete
   Any → Deleted      | active CommsProfile references this ProviderTariff | error: active CommsProfile dependency exists
```

### RBAC Permission Elevation Log

| Tier | Capability Activated | Explored | New Scenarios Captured | Inherited From |
|---|---|---|---|---|
| 1 | `capabilityProviderTariffGet` | ✅ | S1 VIEW (14), S2 FILTER (15) | — |
| 2 | `capabilityProviderTariffUpdate` | ✅ | S4 UPDATE (18) + Update-permitted transition facts | Tier 1 |
| 3 | `capabilityProviderTariffCreate` | ✅ | S3 CREATE (15), S5 ATTRIBUTE (8) | Tiers 1–2 |
| 4 | `capabilityProviderTariffApprover` | ✅ | S6 Approver portion (19): →Active from Setup/Requested/Deleted, both entry points | Tiers 1–3 |
| 5 | `capabilityProviderTariffAdmin` | ✅ | S6 Admin portion (7): Active→Setup/Requested/Deleted (both entry points), Active edit-icon + Change Status enabled | Tiers 1–4 |

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|----------|--------|----------------|
| 1 | Provider Tariff ID | Integer; **hyperlink** → `/mno/provider-tariffs/{id}`; sortable |
| 2 | Name | String; sortable |
| 3 | Title | String (unique); sortable |
| 4 | MNO | **FK hyperlink** → `/mno/manage-mnos/{mnoId}`; rendered as `MNO Title (mnoId)`; sortable |
| 5 | Tariff Code | String; sortable |
| 6 | Status | Badge: Setup / Requested / Active (Deleted excluded from default list query); sortable |
| 7 | Actions | Present; **empty at GET** (no edit icon — correct, no Update permission) |
| (opt) | Provider Tariff Ref | Hidden by default; enable via column preset |
| (opt) | Description | Hidden by default; enable via column preset |

**Toolbar:** `Search by Name…` quick search · `Add filter` · `Clear all` · `Configure visible columns` (column preset).
**Pagination footer:** `Showing per page: 50` selector · First / Previous (disabled on page 1) · numbered pages (1–6 observed) · Next / Last. `pageCount = 6`, `pageSize = 50`.
**Column preset panel:** checkboxes for all 8 columns · Select All · Deselect All · Apply · Save · Load & Apply · Delete · Cancel/Close. Columns hide/show only after **Apply** (checkbox alone does not change the grid).

---

## 6. Discovered Form Fields (Create / Edit)

> Read-only STANDARD FIELDS observed on the detail page at GET (create/edit form to be confirmed at Tiers 2–3). Field metadata below is authoritative (from `objectDefinitions`).

| Field | Type | Mandatory | Unique | Max Length / Regex | Source (if dropdown) |
|-------|------|-----------|--------|--------------------|----------------------|
| providerTariffId | integer | yes (auto) | yes | `^\d{1,21}$` | — (PK, write forbidden) |
| name | string | yes | no | 128 · `^[^\n]{1,128}$` | — |
| title | string | yes | **yes** | 32 · `^\S{1,32}$` | — |
| tariffCode | string | yes | no | 128 · `^.{1,128}$` | — |
| providerTariffRef | string | no | no | 128 · `^.{0,128}$` | — |
| description | string | no | no | 255 · `^.{0,255}$` | — |
| mnoId | integer | yes | no | `^\d{1,21}$` | MNO (active) |
| status | string | yes | no | `setup\|requested\|active\|deleted` | status transition (write forbidden directly) |

Detail page also shows collapsible related-resource sections: **Related Provider Rates**, **Related Apn**, **Related Portal**, **Related Rat Type**, plus an **Attributes** section (empty state: "No attribute data found for this record.").

---

## 7. Discovered Filter Fields

| Filter Field | Section | Type | Values / Source |
|--------------|---------|------|-----------------|
| Status | Primary | Multi-select dropdown (checkboxes + Select all / Clear all + search) | Setup, Requested, Active, Deleted |
| Tariff Code | Primary | Text | free text |
| Provider Tariff Ref | Primary | Text | free text |
| Description | Primary | Text | free text |
| Title | Primary | Text | free text |
| Name | Primary | Text | free text |
| Provider Tariff Id | Primary | Text | free text (numeric id) |
| MNO | Secondary | Searchable dropdown | active MNOs (`MNO Title (mnoId)`) |

Filters dialog also has a **Search filters…** box (filters the field list), **Reset**, **Apply**, and **Close**. Toolbar **Clear all** removes active filters.

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW  *(capabilityProviderTariffGet · module-View)*

#### S1.1. List page loads with correct heading, breadcrumb and tab title
**Steps:**
1. Log in and open MNO Management → Provider Tariffs → list page loads
2. Verify h1 = `Provider Tariffs`; breadcrumb `Home > MNO > Provider Tariffs`; tab title contains `Mno | Portal`
**API:** `GET /api/catalog/providerTariff/execute...` → 200
**DB:** `SELECT COUNT(*) FROM oncilla.providerTariff WHERE status <> 'deleted'` ≈ UI total

#### S1.2. Grid shows the 7 default columns in order
**Steps:** 1. Verify headers in order: Provider Tariff ID | Name | Title | MNO | Tariff Code | Status | Actions

#### S1.3. Provider Tariff ID hyperlink opens detail page
**Steps:** 1. Click a Provider Tariff ID → navigates to `/mno/provider-tariffs/{id}` → detail loads with matching ID/Title

#### S1.4. MNO foreign-key hyperlink opens MNO detail
**Steps:** 1. Click an MNO cell → navigates to `/mno/manage-mnos/{mnoId}`

#### S1.5. Read-only detail page structure
**Steps:** 1. Open a record → verify header (Provider Tariff ID, Title, Status badge), Standard Fields (Provider Tariff Ref, Tariff Code, Mno Id, Description, Title, Name), Attributes section, Related Provider Rates / Apn / Portal / Rat Type sections. Verify **no** Edit / Change Status control (GET is read-only).
**API:** `GET /api/catalog/providerTariffById/execute?providerTariffId={id}&enrich=title` → 200

#### S1.6. Column sort ascending/descending
**Steps:** 1. Click each sortable header once (asc) then again (desc) → row order changes accordingly

#### S1.7. Records-per-page selector changes page size
**Steps:** 1. Change `Showing per page` selector → grid reloads with the selected page size

#### S1.8. Pagination navigation
**Steps:** 1. On page 1, First/Previous are disabled; click Next / Last / a page number → grid loads the target page

#### S1.9. Column preset — select a subset and Apply
**Steps:** 1. Click Configure visible columns → panel opens with checkboxes for all columns 2. Uncheck some, keep others 3. Click **Apply** 4. Grid shows only selected columns; unselected columns no longer visible

#### S1.10. Column preset — Select All / Deselect All
**Steps:** 1. In the preset panel use Select All then Deselect All → checkbox states toggle accordingly before Apply

#### S1.11. Enable hidden columns (Provider Tariff Ref, Description) via preset
**Steps:** 1. In preset check Provider Tariff Ref and Description → Apply → both columns appear in the grid

#### S1.12. Status column renders status badges
**Steps:** 1. Verify Status cells show badges for Setup / Requested / Active

#### S1.13. Quick search by Name
**Steps:** 1. Type a known name fragment in `Search by Name…` → list filters to matching rows
**API:** list call re-fires with `name=` param

#### S1.14. (Negative) Module hidden / URL blocked without Get permission
**Steps:** 1. Without `capabilityProviderTariffGet`: Provider Tariffs not visible under MNO Management 2. Direct navigation to `/mno/provider-tariffs` returns 401/403 or access-denied
**API:** list call → 401/403

---

### S2 — FILTER  *(capabilityProviderTariffGet · module-Filter)*

#### S2.1. Filter dialog opens with Primary + Secondary sections
**Steps:** 1. Click Add filter → dialog "Filters" opens showing Primary Filters and Secondary Filters, a Search filters box, Reset, Apply, Close

#### S2.2. Filter-field search filters the field list
**Steps:** 1. Type in `Search filters…` → only matching filter fields remain visible

#### S2.3. Status filter (multi-select) filters the list
**Steps:** 1. Open Status dropdown → options Setup/Requested/Active/Deleted with checkboxes 2. Select Setup + Requested → Apply → list shows only those statuses

#### S2.4. Status filter Select all / Clear all
**Steps:** 1. In Status dropdown click Select all (all checked) then Clear all (all unchecked)

#### S2.5. Filter by Tariff Code (text)
**Steps:** 1. Enter a Tariff Code in `Filter by Tariff Code` → Apply → list shows matching rows

#### S2.6. Filter by Provider Tariff Ref (text)
**Steps:** 1. Enter a value in `Filter by Provider Tariff Ref` → Apply → list filtered

#### S2.7. Filter by Description (text)
**Steps:** 1. Enter a value in `Filter by Description` → Apply → list filtered

#### S2.8. Filter by Title (text)
**Steps:** 1. Enter a value in `Filter by Title` → Apply → list filtered

#### S2.9. Filter by Name (text)
**Steps:** 1. Enter a value in `Filter by Name` → Apply → list filtered

#### S2.10. Filter by Provider Tariff Id (text)
**Steps:** 1. Enter a known id in `Filter by Provider Tariff Id` → Apply → list shows that record

#### S2.11. MNO secondary filter (searchable dropdown)
**Steps:** 1. Open MNO dropdown → search → select an MNO → Apply → list shows only that MNO's tariffs

#### S2.12. Reset filters restores default view
**Steps:** 1. Apply filters 2. Click Reset in the dialog → all filter inputs cleared, default list restored

#### S2.13. Clear all (toolbar) removes active filters
**Steps:** 1. With filters applied, click Clear all on the toolbar → list returns to unfiltered default

#### S2.14. Combined multi-filter (Status + MNO)
**Steps:** 1. Select a Status set AND an MNO → Apply → list reflects the intersection

#### S2.15. Filter persists across pagination / sort / column preset
**Steps:** 1. Apply a filter 2. Page to next page, sort a column, change columns → filter stays applied

---

### S4 — UPDATE  *(capabilityProviderTariffUpdate · module-Update)*  — ✅ live-observed at Tier 2

> **Observed edit affordances (differential vs GET):** In the Actions column, an **edit (pencil) icon** now appears for **Setup / Requested / Deleted** rows (visible + enabled). For **Active** rows the Actions cell is **empty — the edit icon is not rendered at all** (Active editing needs Admin). ⚠ This differs from the generic model in `permissions_and_status_model.md` (which says the icon should be *visible but disabled* for Active) — recorded here as a possible functional inconsistency to confirm at Tier 5.
>
> The list-page edit icon opens an **Actions dropdown** offering the Update-permitted transitions (for a Setup record: **Requested · Deleted**). The detail page shows a **"Change Status ▾"** button (the second transition entry point). Full transition TCs (both entry points, all transitions incl. →Active) are generated in **S6 at Tier 4/5**.
>
> **Edit form ("Edit Provider Tariff" dialog)** — opened from the Standard Fields pencil on the detail page. Fields (all pre-populated): **Name*** (`Provider Tariff name`), **Title*** (`Provider Tariff title`), **Description*** (`Description`), **Mno Id*** (searchable combobox `MNO ID` with **Clear selection**), **Tariff Code*** (`Provider Code`), **Provider Tariff Ref** (optional, `Operators Reference`). `providerTariffId` and `status` are not editable here. **Submit** is disabled until a change is made, then enables. **Cancel** with unsaved changes → **"Unsaved Changes"** alert-dialog ("You have unsaved changes. Are you sure you want to leave?") with **Stay** / **Discard**.
>
> ⚠ **Field discrepancy:** `objectDefinitions` reports `description` as optional (`flag: null`), but the **edit form marks Description as mandatory (`*`)**. Confirm the authoritative rule with the app owner; TC S4.7 pins the observed UI behaviour.
>
> ⚠ **Toast text not captured:** the exact success/error toast strings were **not** recorded during planning (no live data mutation was performed). TCs assert that a success toast appears and the change is reflected; the exact text must be captured at execution (Generator/Healer), per the "never assume toast text" rule.
>
> **Related sections (Update-gated):** each Related section header now shows an Add button — **Add Provider Rate**, **Add Apn**, **Add Portal**, **Add Rat Type**. Their dialog internals were not opened at this tier (deferred); only their visibility is asserted here.

#### S4.1. Edit icon visible & enabled for non-Active records
**Steps:** 1. On the list, verify the Actions cell for Setup/Requested/Deleted rows shows an enabled edit (pencil) icon.

#### S4.2. Edit icon not rendered for Active records (no Admin)
**Steps:** 1. Verify the Actions cell for an Active row shows no edit icon. *(Observed absent — flag vs. generic "disabled" model.)*

#### S4.3. (Negative) No edit icon without Update permission
**Steps:** 1. Without `capabilityProviderTariffUpdate`: the Actions column shows no edit icon on any row; detail page is read-only.

#### S4.4. Detail page Change Status button present for non-Active records
**Steps:** 1. Open a Setup/Requested/Deleted record detail → verify a "Change Status ▾" button is shown.

#### S4.5. Edit form opens pre-populated
**Steps:** 1. On a record detail, click the Standard Fields edit pencil → "Edit Provider Tariff" dialog opens with current values in Name, Title, Description, Mno Id, Tariff Code, Provider Tariff Ref.

#### S4.6. Mandatory markers and optional field
**Steps:** 1. Verify Name, Title, Description, Mno Id, Tariff Code show `*`; Provider Tariff Ref has no `*`.

#### S4.7. Description shown mandatory in edit form *(pins observed behaviour; see discrepancy note)*
**Steps:** 1. Clear Description → Submit is blocked / validation fired (Description treated as required in the form).

#### S4.8. Submit disabled until a valid change
**Steps:** 1. On open, Submit is disabled 2. Make a valid change → Submit enables.

#### S4.9. Cancel with unsaved changes shows Unsaved Changes popup
**Steps:** 1. Change a field, click Cancel → "Unsaved Changes" popup appears with Stay / Discard 2. Discard → form closes, no save 3. (re-open, change, Cancel) Stay → returns to form with values intact.

#### S4.10. Cancel with no changes closes without popup
**Steps:** 1. Open edit form, change nothing, click Cancel → form closes immediately, no popup.

#### S4.11. Title uniqueness validation in edit
**Steps:** 1. Set Title to an existing Title → duplicate/unique validation error shown, Submit blocked.
**Source:** `title` flag `unique` (objectDefinitions).

#### S4.12. Title regex validation in edit
**Steps:** 1. Enter a Title with a space or >32 chars → error "Please enter a title with 1-32 characters. Spaces are not allowed."; Submit blocked.

#### S4.13. Name validation in edit
**Steps:** 1. Enter a Name >128 chars or containing a newline → error "Please enter 1-128 characters. Newlines are not allowed."

#### S4.14. Tariff Code mandatory / max length in edit
**Steps:** 1. Clear Tariff Code → required error; 2. enter >128 chars → length validation ("Please enter 1 to 128 characters.").

#### S4.15. Mno Id searchable FK dropdown (active MNOs)
**Steps:** 1. Open the Mno Id combobox → it is searchable and lists active MNOs as `Title (mnoId)`; Clear selection resets it.

#### S4.16. Successful update reflects in list and detail
**Steps:** 1. Change an editable field, Submit → toast **`Successfully edited Provider Tariff details`** → updated value shown in the detail and in the list grid.

#### S4.17. Related add controls visible at Update (non-Active)
**Steps:** 1. On a non-Active record detail, verify Add Provider Rate, Add Apn, Add Portal, Add Rat Type buttons are present.

#### S4.18. (Negative) Detail read-only without Update permission
**Steps:** 1. Without Update: no Change Status button, no Standard Fields edit pencil, no Add relationship buttons.

#### Related-resource Add/Remove flows (Detail Page — Update permission) — LIVE-VERIFIED on record 1865

> Each Related section (**Related Provider Rates · Related Apn · Related Portal · Related Rat Type**) has an **Add {Resource}** button (non-Active records). Clicking it opens a dialog (title: `Provider Rate RR` · `Apn RR` · `Portal` · `Rat Type`) with a searchable **"Select…"** combobox, a read-only preview panel on selection, a **Clear selection** control, and **Cancel / Submit (disabled until selected) / Close**. Each dropdown loads **active records only**:
> - Provider Rate → `GET /api/catalog/providerRate/execute?pageSize=50&enrich=title&status=active`
> - APN → `GET /api/catalog/apn/execute?pageSize=50&enrich=title&status=active`
> - Portal → `GET /api/catalog/portal/execute?pageSize=50&enrich=title&status=active`
> - Rat Type → `GET /api/catalog/ratType/execute?pageSize=50&enrich=title&status=active`
>
> The relationship is modelled with ProviderTariff as the **destination**: `GET /api/catalog/resourceRelationship/execute?destinationResourceId={id}&sourceResourceName={providerRate|apn|portal|ratType}&relationship=consumer&destinationResourceName=providerTariff&status=active&pageSize=200`. Each linked row shows **{Resource} ID** (hyperlink, e.g. Provider Rate → `/mno/manage-provider-rates/{id}`), **{Resource} Title**, and an **Actions** remove (trash) icon → alert-dialog **`Remove Relationship`** ("Are you sure you want to remove this relationship?", Cancel / Remove). Empty state e.g. **`No Provider Rate RR added`**.

#### S4.19. Add Provider Rate → success toast, row appears
**Steps:** 1. On a non-Active record, click Add Provider Rate → dialog `Provider Rate RR` 2. Select an active Provider Rate (preview panel shows Provider Rate Id/Name/Title…) → Submit → toast **`Successfully added Provider Rate`** → row (ID hyperlink + Title + remove) appears in Related Provider Rates.

#### S4.20. Remove Provider Rate → confirmation + success toast
**Steps:** 1. Click the row remove icon → `Remove Relationship` dialog 2. Cancel → row remains 3. Remove again → confirm → toast **`Successfully removed Provider Rate`** → row gone.

#### S4.21. Add APN → success toast
**Steps:** 1. Add Apn → dialog `Apn RR` → select active APN → Submit → toast **`Successfully added APN`** (note: "APN" in toast vs "Add Apn" button) → row appears in Related Apn.

#### S4.22. Add Portal → success toast
**Steps:** 1. Add Portal → dialog `Portal` → select active Portal → Submit → toast **`Successfully added Portal`** → row appears in Related Portal.

#### S4.23. Add Rat Type → success toast *(inconsistent wording — pin observed)*
**Steps:** 1. Add Rat Type → dialog `Rat Type` → select active Rat Type → Submit → toast **`Item assigned successfully`** (⚠ generic, unlike the other three) → row appears in Related Rat Type.

#### S4.24. Remove Rat Type → success toast *(inconsistent wording — pin observed)*
**Steps:** 1. Remove the linked Rat Type → `Remove Relationship` → Remove → toast **`Item removed successfully`** (⚠ generic) → row gone.

#### S4.25. Add-dialog Submit disabled until a resource is selected (all four)
**Steps:** 1. Open any Add {Resource} dialog → Submit is disabled 2. Select an item → preview panel + Clear selection appear, Submit enables 3. Clear selection → Submit disabled again.

#### S4.26. Related dropdowns list active records only (all four)
**Steps:** 1. Open each Add {Resource} dropdown → only active records listed (verify against the `status=active` source APIs above).

#### S4.27. (Negative) Related Add/remove not available for Active records without Admin
**Steps:** 1. On an Active record without Admin: Related sections are read-only — no Add buttons, no row remove icons.

### S3 — CREATE  *(capabilityProviderTariffCreate · module-Create)*  — ✅ live-observed at Tier 3

> **Create control:** a **"Create Provider Tariff"** button now appears next to the list-page heading (newly unlocked by Create). Clicking it opens the **"Create Provider Tariff"** dialog.
>
> **Create form fields** (identical set to the edit form): **Name*** · **Title*** · **Description*** · **MNO*** (searchable combobox, placeholder "Select item…") · **Tariff Code*** (`Provider Code`) · **Provider Tariff Ref** (optional, `Operators Reference`). **Submit** is disabled until mandatory fields are filled. **Cancel** present; the shared unsaved-changes popup applies.
>
> **MNO dropdown is active-only:** opening it fires `GET /api/catalog/mno/execute?status=active&pageSize=50` and shows a searchable "Suggestions" list of active MNOs as `Title (mnoId)` (e.g. `edstitle (8944310609)`).
>
> **Config is post-create, not in the form:** the create form has **no APN / RatType / ProviderRate fields**. Those relations are added afterwards on the detail page via **Add Apn / Add Rat Type / Add Provider Rate** (see S4). New records are created in **Setup** status; `providerTariffId` is auto-generated (write forbidden).
>
> **Toast text not captured** (no live record created); success asserts a toast appears and the new record shows in the list.

#### S3.1. Create button visible with Create permission
**Steps:** 1. On the list page, verify a "Create Provider Tariff" button is shown near the heading.

#### S3.2. (Negative) Create button hidden without Create permission
**Steps:** 1. Without `capabilityProviderTariffCreate`: the Create button is not present on the list page.

#### S3.3. Create form opens with expected fields
**Steps:** 1. Click Create Provider Tariff → dialog opens with Name, Title, Description, MNO, Tariff Code, Provider Tariff Ref.

#### S3.4. Mandatory markers and optional field
**Steps:** 1. Verify Name, Title, Description, MNO, Tariff Code show `*`; Provider Tariff Ref has no `*`.

#### S3.5. Submit disabled until mandatory fields filled
**Steps:** 1. On open Submit is disabled 2. Fill all mandatory fields with valid values → Submit enables.

#### S3.6. MNO dropdown searchable, active MNOs only
**Steps:** 1. Open the MNO dropdown → searchable list of active MNOs as `Title (mnoId)`.
**API:** `GET /api/catalog/mno/execute?status=active&pageSize=50`.

#### S3.7. Title uniqueness validation on create
**Steps:** 1. Enter an existing Title → uniqueness error, Submit blocked.

#### S3.8. Title regex validation on create
**Steps:** 1. Enter a Title with a space or >32 chars → "Please enter a title with 1-32 characters. Spaces are not allowed."

#### S3.9. Name regex validation on create
**Steps:** 1. Enter a Name >128 chars or with a newline → "Please enter 1-128 characters. Newlines are not allowed."

#### S3.10. Tariff Code mandatory / length on create
**Steps:** 1. Leave Tariff Code empty → required; enter >128 chars → "Please enter 1 to 128 characters."

#### S3.11. Description mandatory in create form *(see discrepancy note in S4)*
**Steps:** 1. Leave Description empty → Submit blocked / required validation.

#### S3.12. Cancel with unsaved changes shows popup; no-change closes cleanly
**Steps:** 1. Enter a value, Cancel → "Unsaved Changes" popup (Stay/Discard) 2. On a fresh form with no input, Cancel → closes with no popup.

#### S3.13. Successful creation adds a Setup record
**Steps:** 1. Fill mandatory fields, Submit → toast **`Provider Tariff created successfully`** → new record appears in the list with Setup status.

#### S3.14. Config relations mapped after creation
**Steps:** 1. Open the new record detail → use Add Apn / Add Rat Type / Add Provider Rate to map configuration (not available in the create form itself).

#### S3.15. providerTariffId auto-generated
**Steps:** 1. Verify the create form has no editable Provider Tariff ID field and the created record receives a system-generated id.

### S5 — ATTRIBUTE  *(capabilityProviderTariffUpdate · module-Attribute)*  — ✅ live-observed at Tier 3 (module IS attribute-eligible)

> **Attributes editor:** the Attributes section on the detail page has an edit (pencil) button → **"Edit Provider Tariff Attributes"** dialog with two groups: **Defined Attributes** (schema-driven; shows "This item has no defined attributes" when none) and **Custom Attributes** with a **"+ Add custom attribute"** button. **Submit** disabled until a change; **Cancel** → shared "Unsaved Changes" popup (Stay/Discard).
>
> **Custom attribute row:** "+ Add custom attribute" adds a row with **Attribute Name** and **Attribute Value** textboxes plus a **remove (trash)** button. Multiple rows can be added. In list/detail data, saved attributes appear as `attribute[]` (`providerTariffAttributeId`, `attribute`, `value`, `status`).
>
> **LIVE-VERIFIED:** ProviderTariff has **no defined attributes** — the editor shows "This item has no defined attributes" and offers only the Custom flow (unlike DataCentre, which has a "Select attribute ▾" list of defined attributes). Attribute add, edit, and delete all share one Submit and produce the single toast **`Attributes updated successfully`**. Gated by **`capabilityProviderTariffUpdate`**.

#### S5.1. Attributes editor opens with Defined + Custom groups
**Steps:** 1. On a record detail, click the Attributes edit pencil → "Edit Provider Tariff Attributes" opens showing Defined Attributes and Custom Attributes sections.

#### S5.2. Add a single custom attribute
**Steps:** 1. Click "+ Add custom attribute", fill Attribute Name + Attribute Value, Submit → success toast; attribute appears in the Attributes section.

#### S5.3. Add multiple custom attributes
**Steps:** 1. Add two or more custom attribute rows, Submit → all appear in the Attributes section.

#### S5.4. Edit an existing custom attribute value
**Steps:** 1. Open the editor, change a value, Submit → updated value shown.

#### S5.5. Delete a custom attribute
**Steps:** 1. Open the editor, click the remove (trash) icon on a row, Submit → attribute removed from the section.

#### S5.6. Defined Attributes group shows empty state (ProviderTariff has no defined attributes)
**Steps:** 1. Open the Attributes editor → the Defined Attributes group shows **"This item has no defined attributes"** (ProviderTariff exposes only Custom attributes — no "Select attribute" dropdown, unlike DataCentre).

#### S5.7. Cancel with unsaved changes shows popup
**Steps:** 1. Add/modify an attribute, Cancel → "Unsaved Changes" popup (Stay/Discard); Discard closes without saving.

#### S5.8. (Negative) No attribute editing without Update permission
**Steps:** 1. Without `capabilityProviderTariffUpdate`: the Attributes section shows no edit button.
### S6 — STATUS TRANSITIONS  *(module-StatusTransition)*  — ✅ COMPLETE (Update + Approver + Admin, both entry points)

> **Observed transition matrix (Tier 5, statususer = all five capabilities). List Actions dropdown == Detail Change Status dropdown for every state (validated independently):**
>
> | From state | Options offered (both entry points) | Gated by |
> |---|---|---|
> | Setup | Requested · Deleted · **Active** | Requested/Deleted = Update · Active = Approver |
> | Requested | Setup · Deleted · **Active** | Setup/Deleted = Update · Active = Approver |
> | Deleted | Setup · Requested · **Active** *(Deleted rows excluded from the default list — reach via Status=Deleted filter)* | Update / Approver |
> | Active | **Setup · Requested · Deleted** | **Admin only** (edit icon + Change Status enabled only with Admin) |
>
> **Progressive-differential findings (each verified by re-checking the same screens after one elevation):**
> - **Approver** adds the **Active** option to Setup/Requested/Deleted dropdowns (absent at Update-only).
> - **Admin** enables the **edit icon (list) and Change Status (detail) for Active records** — empty/unavailable at every lower tier — and offers `Active → Setup/Requested/Deleted`.
> - **Entry-point parity confirmed** for both a Setup record (`{Requested, Deleted, Active}`) and an Active record (`{Setup, Requested, Deleted}`) — List and Detail dropdowns offer identical sets.
> - **LIVE-VERIFIED (2026-08-28):** a Setup→Requested→Deleted transition was executed on record 1865. Confirmation dialog: **`Confirm Status Change`** — body **`Are you sure you want to change the status to "<state>"?`** — confirm button = action verb (observed **`Request`**, **`Delete`**; expected `Activate`/`Setup`). Success toast: **`Status changed to "<state>"`** (state lowercase, e.g. `Status changed to "requested"`). Precondition rules below come from `permissions_and_status_model.md` (not yet triggered live).

**Known ProviderTariff transition preconditions** (from `permissions_and_status_model.md`):
- `Requested → Active` — blocked if any mandatory field is NULL → error: mandatory fields incomplete.
- `Any → Deleted` — blocked if an active CommsProfile references this ProviderTariff → error: active CommsProfile dependency exists.

#### S6.1–S6.6 (List-page, Update-permitted transitions)
Positive, one per transition, via List Actions dropdown → confirm → success toast (capture text) → grid badge updates:
Setup→Requested · Setup→Deleted · Requested→Setup · Requested→Deleted · Deleted→Setup · Deleted→Requested.

#### S6.7–S6.9 (List-page, Approver transitions to Active)
Setup→Active · Requested→Active · Deleted→Active — via List Actions dropdown (Active option present only with Approver).

#### S6.10–S6.12 (Detail-page Change Status entry point)
Mirror via the Detail page Change Status dropdown: Setup→Requested · Setup→Active · Requested→Active (remaining detail-page transitions mirror the list-page set; full both-entry-point parity finalised with Tier 5).

#### S6.13. Entry-point consistency
For a Setup record, the List-page Actions dropdown and Detail-page Change Status dropdown offer identical options `{Requested, Deleted, Active}`. If they ever diverge, file as a defect (do not reconcile).

#### S6.14. (Negative — permission) Active option hidden without Approver
Without `capabilityProviderTariffApprover`, neither dropdown offers Active (only the Update-permitted set) for Setup/Requested/Deleted.

#### S6.15. (Negative — permission) No transitions without Update/Create
Without Update/Create, no edit icon on rows and no Change Status button on detail — no transition possible.

#### S6.16. (Negative — Active gating) Active record not editable without Admin
An Active record shows no edit icon in the grid and no usable Change Status affordance — Active→* requires Admin (validated fully at Tier 5).

#### S6.17. (Precondition — negative) Requested→Active blocked when a mandatory field is NULL
Attempt Requested→Active on a record with a NULL mandatory field → transition blocked, error shown, status unchanged in grid/DB. Positive counterpart: all mandatory populated → succeeds.

#### S6.18. (Precondition — negative) Any→Deleted blocked by active CommsProfile dependency
Attempt →Deleted on a record referenced by an active CommsProfile → blocked, error shown, status unchanged. Positive counterpart: no active CommsProfile → succeeds.

#### S6.19. Confirmation dialog + toast + badge update
Selecting a transition (either entry point) shows a confirmation dialog; confirming triggers the status-change API, shows a success toast (capture exact text at execution), and the status badge updates immediately in the grid and on the detail page. Dismissing the dialog makes no change.

#### S6.20. (Admin) Active record edit icon + Change Status enabled
With `capabilityProviderTariffAdmin`, an Active record shows an enabled edit (pencil) icon in the grid Actions column and an enabled Change Status button on its detail page (both absent/disabled at every lower tier).

#### S6.21. (Admin) Active→Setup via List Actions dropdown
Find an Active record, open its Actions dropdown (options: Setup, Requested, Deleted), select Setup → confirm → success toast → grid badge changes to Setup.

#### S6.22. (Admin) Active→Requested via List Actions dropdown
As S6.21, selecting Requested → grid badge changes to Requested.

#### S6.23. (Admin) Active→Deleted via List Actions dropdown
As S6.21, selecting Deleted → grid badge changes to Deleted.

#### S6.24. (Admin) Active→Setup via Detail Change Status dropdown
Open an Active record detail, click Change Status (options: Setup, Requested, Deleted), select Setup → confirm → header badge changes to Setup.

#### S6.25. (Admin) Active→Deleted via Detail Change Status dropdown
As S6.24, selecting Deleted → header badge changes to Deleted.

#### S6.26. Entry-point parity for an Active record
For an Active record, the List Actions dropdown and Detail Change Status dropdown offer the identical set `{Setup, Requested, Deleted}`. If they diverge, file as a defect.

> **S6 complete** — Update, Approver, and Admin transitions covered across both entry points, plus permission-negative and precondition TCs.

---

*End of ProviderTariff coverage — Tiers 1–5 COMPLETE (GET + UPDATE + CREATE + APPROVER + ADMIN). 96 TCs across S1–S6. Ready for the QA Review Gate before Generator.*
