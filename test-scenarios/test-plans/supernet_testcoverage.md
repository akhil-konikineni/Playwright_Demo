# Supernet — Complete Test Coverage

| Field        | Value                              |
|--------------|------------------------------------|
| Feature      | Supernet                           |
| Document Version | 1.1 (Tiers 1–5 complete + live toast/relationship capture) |
| Coverage Date | 2026-08-31                        |
| Prepared By  | Playwright MCP QA Automation Agent (Planner) |
| Environment  | QAN — https://portal-host.qan.aws.eseye.io |
| Test User    | statususer / Password#1            |
| DB Schema    | oncilla                            |
| Source       | Live UI exploration via Playwright MCP browser automation |

> **✅ COMPLETE — all five capability tiers explored progressively** (setup.md Steps 11–14), one capability at a time, each verified live in DB + `/api/permissions`: **`capabilitySupernetGet` (T1)**, **`capabilitySupernetUpdate` (T2)**, **`capabilitySupernetCreate` (T3)**, **`capabilitySupernetApprover` (T4)**, **`capabilitySupernetAdmin` (T5)**. All sections **S1–S6** are live-observed; every scenario traces to the tier that first exposed it (see elevation log).
>
> **QA Review Gate:** this document + the CSV are Phase-1 output. A human must review the CSV before the Generator runs. Items to confirm at execution: (a) deeper Supernet business validations (IP-range no-overlap, `extensionId` Active/no-circular, active-Subnet-in-range) that only fire on a real submit; (b) exact status-change dialog/toast text for Supernet (observation-only during planning — the shared platform pattern was used); (c) Deleted-source list transitions need a Status=Deleted filter. The Update-permitted transitions (Setup↔Requested↔Deleted) are observable now; the full S6 will be generated at Tier 4/5.

---

## 1. Feature Overview

Supernet is a Network Management catalog entity representing an IP super-network defined by a Min/Max host IP range, optionally **extending a parent Supernet** (`extensionId`, self-referential). It lives under **Network Management → Supernets**.

- **List page:** `/network-management/supernets`
- **Detail page:** `/network-management/supernets/{supernetId}` (read-only at GET)
- **Browser tab title:** `Network Management | Portal`
- **Page heading (h1):** `Supernets`
- **Breadcrumb:** `Home > Network Management > Supernets`

Records follow the standard lifecycle **Setup → Requested → Active → Deleted** (transitions gated by Update/Create/Approver/Admin — not exercisable at GET). At GET the user can browse, search, filter, sort, paginate, configure columns, and open a read-only detail view.

---

## 2. Environment Details

- **App base URL:** `https://portal-host.qan.aws.eseye.io`
- **Login (auth) URL:** `https://portal-host.qan.aws.eseye.io/auth` (two-step: username → Continue → password → Continue)
- **DB:** MySQL `oncilla` (QAN RDS). All findings below are from UI + network capture.

### Discovered API endpoints (Tier 1)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/permissions` | User capability list (ground truth for RBAC) |
| GET | `/api/catalog/supernet/execute?pageSize=50&enrich=title&getPageCount=true&status=active&status=setup&status=requested` | **List** — paginated; permission `supernetGet`; default excludes `deleted` |
| GET | `/api/catalog/objectDefinitions/execute?objectName=supernet&status=active` | Field definitions (flags, regex, max length) |
| GET | `/api/catalog/genericOption/execute?resourceName=supernet&option=status` | Valid status-transition options (empty at GET) |
| GET | `/api/catalog/statusTransition/execute?resourceName=supernet&status=active&pageSize=200` | Status-transition metadata |
| GET | `/api/catalog/supernetById/execute?supernetId={id}&enrich=title` | **Detail** record (enriches `extensionId` → title) |
| GET | `/api/catalog/supernetAttribute/execute?supernetId={id}` | Record attributes |
| GET | `/api/catalog/objectDefinitions/execute?objectName=supernetAttribute&status=active` | Attribute definitions — **empty** (no defined attributes) |

### List query / filter parameters (from list API `inputs`)
`supernetId, name, title, minIp, maxIp, extensionId, networkAddressesId, status`

---

## 2a. Toast Messages & Confirmation Dialogs (LIVE-CAPTURED 2026-08-31)

> Captured by executing each operation live on a throwaway record (**ID 14551**, since soft-deleted), using a DOM MutationObserver (toasts auto-dismiss in ~1–2s). **Exact strings — do not paraphrase.**

| Operation | Exact toast text | Notes |
|---|---|---|
| Create | `Supernet created successfully` | on Submit of Create form |
| Update (Standard Fields) | `Supernet updated successfully` | on Submit of Edit form |
| Status change (any transition) | `Status changed to "<state>"` | `<state>` lowercase, e.g. `Status changed to "requested"`, `Status changed to "deleted"` |
| Attribute add / edit / delete | `Attributes updated successfully` | single toast for all attribute saves (shared Submit) |
| Add Portal (Related Portals) | `Successfully added Portal` | |
| Remove Portal | `Successfully removed Portal` | |

**Status-change confirmation dialog (live-verified):** title **`Confirm Status Change`** — body **`Are you sure you want to change the status to "<state>"?`** (state lowercase, quoted) — buttons **Cancel** + a confirm button whose label is the **action verb** for the target state (observed **`Request`**, **`Delete`**; expected `Activate` for →Active, `Set up`/`Setup` for →Setup — confirm at execution) + a **Close (X)**.

**Related Portals dialogs:** Add dialog title **`Portal`** (searchable "Select…" combobox, active-only via `GET /api/catalog/portal/execute?...status=active`); remove uses the shared **`Remove Relationship`** alert-dialog ("Are you sure you want to remove this relationship?", Cancel / Remove). The relationship is modelled with **Supernet as the source**: `sourceResourceName=supernet, destinationResourceName=portal, relationship=consumer`.

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | STATUS TRANSITION TCs | Total |
|---------|----------|------------|------------|------------|---------------|-----------------------|-------|
| Supernet (Tiers 1–5 — COMPLETE) | 13 | 14 | 15 | 20 | 8 | 27 | 97 |

> **v1.1 (2026-08-31):** all create/update/status/attribute/relationship toasts are now exact, live-captured (see §2a). UPDATE grew 17→19 with the live-verified Add/Remove Portal flow (S4.17–S4.18, IssueId 95–96).

---

## 4. Module Discovery Report

```
MODULE NAME        : Supernet
CAPABILITY PREFIX  : Supernet → capabilitySupernetGet / Update / Create / Approver / Admin
                     (live: only capabilitySupernetGet + supernetGet ACTIVE; all others deleted)
MODULE PLURAL      : Supernets
MENU PATH          : Network Management → Supernets
LIST URL           : /network-management/supernets
DETAIL URL         : /network-management/supernets/{supernetId}
PRIMARY KEY FIELD  : supernetId  (integer, auto-generated, write forbidden; grid hyperlink → detail)
FOREIGN KEY FIELDS : extensionId → parent Supernet (SELF-REFERENTIAL, supernet.supernetId); optional.
                     Grid shows the raw parent id (plain text, NOT a hyperlink); detail shows it enriched as "Title (id)".
TEXT FIELDS        : name — mandatory (max 128; regex ^[^\n]{1,128}$; "Please enter 1-128 characters. Newlines are not allowed.")  [label "supernet server name"]
                     title — mandatory, unique (max 32; regex ^\S{1,32}$; "Please enter a title with 1-32 characters. Spaces are not allowed.")
                     minIp — mandatory (max 36; "Min Host Ip") — objectDefinitions enforces length only; IPv4/IPv6 validity is business logic
                     maxIp — mandatory (max 36; "Max Host Ip") — same as minIp
                     networkAddressesId — optional, unique (integer; "Id of supernet record in Infrastructure.NetworkAddresses")
DROPDOWN FIELDS    : extensionId → source Supernet (optional, resource/FK)
                     status → setup|requested|active|deleted (mandatory, resource, write forbidden — via transitions)
TABLE HEADERS      : Supernet ID, Name, Title, Min IP, Max IP, Extension ID, Network Addresses ID, Status, Actions
FILTER FIELDS      : Status (multi-select dropdown), Extension ID (searchable dropdown), Max IP (text), Min IP (text), Name (text), Supernet Id (text), Title (text)
STATUS VALUES      : Setup, Requested, Active, Deleted
CRUD AVAILABLE     : (at Tier 1 GET) Read only — list + read-only detail. Create/Update/Delete/StatusTransition NOT exposed.
ATTRIBUTE SECTION  : yes — CUSTOM attributes only. Defined Attributes group shows "This item has no defined attributes"
                     (objectDefinitions?objectName=supernetAttribute returns empty). Records carry attribute[] (supernetAttributeId/attribute/value/status).
RELATED SECTIONS   : Related Portals (single related section on the detail page)
TEST REPOSITORY    : test-scenarios/test-plans/supernet_testcoverage.md
APIs CAPTURED      : see §2
TRANSITION PRECONDITIONS (from permissions_and_status_model.md — VERIFY LIVE at Tier 4/5):
   Requested → Active | any mandatory field NULL | error: mandatory fields incomplete
   Any → Deleted      | active IPPool(s) reference this Supernet | error: active IPPool dependency exists
   Any → Deleted      | active Subnet(s) reference this Supernet | error: active Subnet dependency exists
CREATE/EDIT VALIDATION (from permissions_and_status_model.md — VERIFY LIVE at Tier 2/3):
   minIp / maxIp must be valid IPv4 or IPv6
   IP range must NOT overlap with any other Supernet it extends
   editing must not push an active Subnet outside the updated range (blocked)
   extensionId must reference an ACTIVE Supernet; no circular extension chains
```

### RBAC Permission Elevation Log

| Tier | Capability Activated | Explored | New Scenarios Captured | Inherited From |
|---|---|---|---|---|
| 1 | `capabilitySupernetGet` | ✅ | S1 VIEW (13), S2 FILTER (14) | — |
| 2 | `capabilitySupernetUpdate` | ✅ | S4 UPDATE (17) + Update-permitted transition facts | Tier 1 |
| 3 | `capabilitySupernetCreate` | ✅ | S3 CREATE (15), S5 ATTRIBUTE (8) | Tiers 1–2 |
| 4 | `capabilitySupernetApprover` | ✅ | S6 Approver portion (20): →Active from Setup/Requested/Deleted, both entry points | Tiers 1–3 |
| 5 | `capabilitySupernetAdmin` | ✅ | S6 Admin portion (7): Active→Setup/Requested/Deleted (both entry points), Active edit-icon + Change Status enabled | Tiers 1–4 |

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|----------|--------|----------------|
| 1 | Supernet ID | Integer; **hyperlink** → `/network-management/supernets/{id}`; sortable |
| 2 | Name | String; sortable |
| 3 | Title | String (unique); sortable |
| 4 | Min IP | IP string (e.g. `192.124.28.1`); sortable |
| 5 | Max IP | IP string (e.g. `192.124.28.50`); sortable |
| 6 | Extension ID | Parent Supernet id — **plain text, NOT a hyperlink** (empty when no parent); sortable |
| 7 | Network Addresses ID | Integer; sortable |
| 8 | Status | Badge: Setup / Requested / Active (Deleted excluded from default list query); sortable |
| 9 | Actions | Present; **empty at GET** (no edit icon — correct, no Update permission) |

**Toolbar:** `Search by Name…` quick search · `Add filter` · `Clear all` · `Configure visible columns` (column preset).
**Pagination footer:** per-page selector (default 50) · First / Previous (disabled on page 1) · numbered pages (1–2 observed) · Next / Last. `pageCount = 2`, `pageSize = 50`.

---

## 6. Discovered Form Fields (Create / Edit)

> Read-only Standard Fields observed on the detail page at GET (create/edit form to be confirmed at Tiers 2–3). Field metadata below is authoritative (from `objectDefinitions`).

| Field | Type | Mandatory | Unique | Max Length / Regex | Source (if dropdown) |
|-------|------|-----------|--------|--------------------|----------------------|
| supernetId | integer | yes (auto) | yes | `^\d{1,21}$` | — (PK, write forbidden) |
| name | string | yes | no | 128 · `^[^\n]{1,128}$` | — |
| title | string | yes | **yes** | 32 · `^\S{1,32}$` | — |
| minIp | string | yes | no | 36 (IPv4/IPv6 — business logic) | — |
| maxIp | string | yes | no | 36 (IPv4/IPv6 — business logic) | — |
| extensionId | integer | no | no | `^\d{1,21}$` | Supernet (active parent) |
| networkAddressesId | integer | no | **yes** | `^\d{1,21}$` | — |
| status | string | yes | no | `setup\|requested\|active\|deleted` | status transition (write forbidden) |

Detail page also shows an **Attributes** section (Defined: none; Custom: displayed) and a **Related Portals** collapsible section.

---

## 7. Discovered Filter Fields

| Filter Field | Section | Type | Values / Source |
|--------------|---------|------|-----------------|
| Status | Primary | Multi-select dropdown (checkboxes + Select all) | Setup, Requested, Active, Deleted |
| Extension ID | Primary | Searchable dropdown | Supernet parents |
| Max IP | Primary | Text | free text |
| Min IP | Primary | Text | free text |
| Name | Primary | Text | free text |
| Supernet Id | Primary | Text | free text (numeric id) |
| Title | Primary | Text | free text |

Filters dialog has a **Search filters…** box, **Reset** and **Apply**. Toolbar **Clear all** removes active filters. (No Secondary Filters section — all fields are Primary.)

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW  *(capabilitySupernetGet · module-View)*

#### S1.1. List page loads with correct heading, breadcrumb and tab title
**Steps:** 1. Log in → Network Management → Supernets → list loads 2. Verify h1 = `Supernets`; breadcrumb `Home > Network Management > Supernets`; tab title contains `Network Management | Portal`
**API:** `GET /api/catalog/supernet/execute...` → 200

#### S1.2. Grid shows the 9 default columns in order
**Steps:** 1. Verify headers in order: Supernet ID | Name | Title | Min IP | Max IP | Extension ID | Network Addresses ID | Status | Actions

#### S1.3. Supernet ID hyperlink opens detail page
**Steps:** 1. Click a Supernet ID → navigates to `/network-management/supernets/{id}` → detail loads with matching ID/Title

#### S1.4. Extension ID display (grid vs detail)
**Steps:** 1. On the list, verify Extension ID cells show the parent id as plain text (no hyperlink), and are empty for records with no parent 2. Open a record that has a parent → detail Standard Fields shows Extension ID enriched as `Title (id)`

#### S1.5. Read-only detail page structure
**Steps:** 1. Open a record → verify header (Supernet ID, Title, Status badge), Standard Fields (Name, Title, Min Ip, Max Ip, Extension ID, Network Addresses Id), Attributes section (Defined = "This item has no defined attributes"; Custom shows the record's attributes), Related Portals section. Verify **no** Edit / Change Status control (GET is read-only).
**API:** `GET /api/catalog/supernetById/execute?supernetId={id}&enrich=title` → 200

#### S1.6. Column sort ascending/descending
**Steps:** 1. Click each sortable header once (asc) then again (desc) → row order changes

#### S1.7. Records-per-page selector changes page size
**Steps:** 1. Change the per-page selector → grid reloads with the selected page size

#### S1.8. Pagination navigation
**Steps:** 1. On page 1, First/Previous disabled; click Next / Last / a page number → grid loads the target page

#### S1.9. Column preset — select a subset and Apply
**Steps:** 1. Click Configure visible columns → panel opens with checkboxes 2. Uncheck some, keep others 3. Apply → grid shows only selected columns; unselected no longer visible

#### S1.10. Column preset — Select All / Deselect All
**Steps:** 1. In the preset panel use Select All then Deselect All → checkbox states toggle before Apply

#### S1.11. Status column renders status badges
**Steps:** 1. Verify Status cells show badges for Setup / Requested / Active

#### S1.12. Quick search by Name
**Steps:** 1. Type a known name fragment in `Search by Name…` → list filters to matching rows

#### S1.13. (Negative) Module hidden / URL blocked without Get permission
**Steps:** 1. Without `capabilitySupernetGet`: Supernets not visible under Network Management 2. Direct navigation to `/network-management/supernets` returns 401/403 or access-denied
**API:** list call → 401/403

---

### S2 — FILTER  *(capabilitySupernetGet · module-Filter)*

#### S2.1. Filter dialog opens with all fields
**Steps:** 1. Click Add filter → dialog "Filters" opens with Primary Filters (Status, Extension ID, Max IP, Min IP, Name, Supernet Id, Title), a Search filters box, Reset and Apply

#### S2.2. Filter-field search filters the field list
**Steps:** 1. Type in `Search filters…` → only matching filter fields remain visible

#### S2.3. Status filter (multi-select) filters the list
**Steps:** 1. Open Status dropdown → options Setup/Requested/Active/Deleted with checkboxes 2. Select Setup + Requested → Apply → list shows only those statuses

#### S2.4. Status filter Select all / Clear all
**Steps:** 1. In Status dropdown click Select all (all checked) then Clear all (all unchecked)

#### S2.5. Filter by Extension ID (searchable dropdown)
**Steps:** 1. Open the Extension ID dropdown → search/select a parent Supernet → Apply → list shows only Supernets extending that parent

#### S2.6. Filter by Max IP (text)
**Steps:** 1. Enter a value in `Filter by Max Ip` → Apply → list filtered

#### S2.7. Filter by Min IP (text)
**Steps:** 1. Enter a value in `Filter by Min Ip` → Apply → list filtered

#### S2.8. Filter by Name (text)
**Steps:** 1. Enter a value in `Filter by Name` → Apply → list filtered

#### S2.9. Filter by Supernet Id (text)
**Steps:** 1. Enter a known id in `Filter by Supernet Id` → Apply → list shows that record

#### S2.10. Filter by Title (text)
**Steps:** 1. Enter a value in `Filter By Title` → Apply → list filtered

#### S2.11. Reset filters restores default view
**Steps:** 1. Apply filters 2. Click Reset in the dialog → inputs cleared, default list restored

#### S2.12. Clear all (toolbar) removes active filters
**Steps:** 1. With filters applied, click Clear all on the toolbar → list returns to unfiltered default

#### S2.13. Combined multi-filter (Status + Extension ID)
**Steps:** 1. Select a Status set AND an Extension ID → Apply → list reflects the intersection

#### S2.14. Filter persists across pagination / sort / column preset
**Steps:** 1. Apply a filter 2. Page to next page, sort a column, change columns → filter stays applied

---

### S4 — UPDATE  *(capabilitySupernetUpdate · module-Update)*  — ✅ live-observed at Tier 2

> **Observed edit affordances (differential vs GET):** In the Actions column, an **edit (pencil) icon** appears for **Setup / Requested / Deleted** rows. For **Active** rows the Actions cell is **empty — no edit icon** (Active editing needs Admin). The list-page edit icon opens an **Actions dropdown** offering Update-permitted transitions (for a Setup record: **Requested · Deleted** — no Active). The detail page shows a **"Change Status ▾"** button. Full transition TCs are generated in S6 at Tier 4/5.
>
> **Edit form ("Edit Supernet" dialog)** — from the Standard Fields pencil. Fields (pre-populated): **Name*** (`supernet server name`), **Title*** (`supernet title`), **Min Ip*** (`Min Host Ip`), **Max Ip*** (`Max Host Ip`), **Extension** (optional, searchable combobox `Id of the parent this extends`). `supernetId`, `networkAddressesId` and `status` are NOT editable. **Submit** disabled until a valid change; **Cancel** with unsaved changes → **"Unsaved Changes"** popup ("You have unsaved changes. Are you sure you want to leave?", Stay / Discard).
>
> **IP validation (LIVE-CAPTURED):** entering a non-IP value in Min Ip or Max Ip shows an inline alert **`Please enter a valid IP address.`** and keeps Submit disabled.
>
> **Deeper Supernet validations** (from `permissions_and_status_model.md`, require a real submit — verify at execution / Tier 3): IP range must not overlap another Supernet it extends; `extensionId` must reference an **Active** Supernet with no circular chains; editing must not push an active Subnet outside the new range.
>
> **Attributes edit** button and **Related Portals → Add Portal** button also appear at Update (non-Active records). Exact toast strings were not captured (observation-only) — capture at execution.

#### S4.1. Edit icon visible & enabled for non-Active records
**Steps:** 1. Verify the Actions cell for Setup/Requested/Deleted rows shows an enabled edit (pencil) icon.

#### S4.2. Edit icon not rendered for Active records (no Admin)
**Steps:** 1. Verify the Actions cell for an Active row shows no edit icon.

#### S4.3. (Negative) No edit icon without Update permission
**Steps:** 1. Without `capabilitySupernetUpdate`: no edit icon on any row; detail page read-only.

#### S4.4. List edit icon opens Actions dropdown with permitted transitions
**Steps:** 1. Click the edit icon on a Setup record → dropdown offers Requested and Deleted (no Active at Update tier).

#### S4.5. Detail Change Status button present for non-Active records
**Steps:** 1. Open a Setup/Requested/Deleted detail → a "Change Status ▾" button is shown.

#### S4.6. Edit form opens pre-populated
**Steps:** 1. Click the Standard Fields edit pencil → "Edit Supernet" dialog opens with Name, Title, Min Ip, Max Ip and Extension pre-populated.

#### S4.7. Mandatory markers and optional field
**Steps:** 1. Verify Name, Title, Min Ip, Max Ip show `*`; Extension has no `*`.

#### S4.8. Min Ip / Max Ip IP-format validation
**Steps:** 1. Enter a non-IP value in Min Ip (or Max Ip) → inline alert "Please enter a valid IP address." shown, Submit disabled 2. Enter a valid IPv4/IPv6 → alert clears.

#### S4.9. Title uniqueness validation in edit
**Steps:** 1. Set Title to an existing Title → uniqueness error, Submit blocked.
**Source:** `title` flag `unique` (objectDefinitions).

#### S4.10. Title regex validation in edit
**Steps:** 1. Enter a Title with a space or >32 chars → "Please enter a title with 1-32 characters. Spaces are not allowed."

#### S4.11. Name validation in edit
**Steps:** 1. Enter a Name >128 chars or with a newline → "Please enter 1-128 characters. Newlines are not allowed."

#### S4.12. Submit disabled until a valid change
**Steps:** 1. On open Submit is disabled 2. Make a valid change → Submit enables.

#### S4.13. Cancel with/without unsaved changes
**Steps:** 1. Change a field, Cancel → "Unsaved Changes" popup (Stay/Discard); Discard closes without saving; Stay returns to form 2. Open again, no change, Cancel → closes with no popup.

#### S4.14. Extension is a searchable dropdown of parent Supernets
**Steps:** 1. Open the Extension combobox → searchable list of Supernets (must be an Active parent; no circular chain — verify on submit).

#### S4.15. Successful update reflects in list and detail
**Steps:** 1. Change an editable field, Submit → toast **`Supernet updated successfully`** → updated value shown in detail and list.

#### S4.16. Related Portals Add + Attributes edit available at Update (non-Active)
**Steps:** 1. On a non-Active detail, verify the Related Portals section shows an "Add Portal" button and the Attributes section shows an edit pencil.

#### S4.17. Add Portal relationship → success toast (LIVE-VERIFIED)
**Steps:** 1. On a non-Active detail, click "Add Portal" → dialog `Portal` opens with a searchable "Select…" combobox (active portals only) 2. Select a Portal → Submit → toast **`Successfully added Portal`** → the Portal row appears in Related Portals.
**API:** `GET /api/catalog/portal/execute?pageSize=50&enrich=title&status=active`.

#### S4.18. Remove Portal relationship → confirmation + success toast (LIVE-VERIFIED)
**Steps:** 1. Click the row remove icon → `Remove Relationship` dialog ("Are you sure you want to remove this relationship?", Cancel / Remove) 2. Remove → toast **`Successfully removed Portal`** → row gone.

#### S4.19. (Negative) Detail read-only without Update permission
**Steps:** 1. Without Update: no Change Status button, no Standard Fields edit pencil, no Add Portal button.

#### S4.20. Extension circular-reference is blocked on Submit (LIVE-VERIFIED 2026-08-31)
> **Rule (`permissions_and_status_model.md`):** `extensionId` must reference an Active Supernet with **no circular extension chains**. Verified live end-to-end.
>
> **Precondition:** two Active Supernets where **B extends A** (`B.extensionId = A`). *(Setup used: A = `QAcircA0831` and B = `QAcircB0831`, both created and set Active — creation + activation are already covered by S3 / S6, so this TC starts from that state.)*
> **Steps:** 1. Log in with `capabilitySupernetAdmin` (A is Active, so editing needs Admin). 2. Open **A**'s detail → Standard Fields edit pencil → "Edit Supernet". 3. In the **Extension** dropdown, select **B** (which already extends A — the dropdown does **not** hide it) → Submit.
> **Observed result:** the save is **REJECTED** with the error toast **`ExtensionId create circular reference`**. A's `extensionId` is **unchanged** (remains as before, DB-verified); no circular chain A→B→A is created.
> **Notes:** the Extension dropdown does not pre-filter the record itself or its descendants (they are selectable), but the **backend enforces the no-circular-chain rule on Submit**. The same validation applies on **Create**. *(A separate, subtler case — assigning a parent that only self-references, not looping back to the edited record — was observed to be accepted; treat that as a follow-up check.)*

### S3 — CREATE  *(capabilitySupernetCreate · module-Create)*  — ✅ live-observed at Tier 3

> **Create control:** a **"Create Supernet"** button appears next to the list heading. It opens the **"Create Supernet"** dialog with fields: **Name*** · **Title*** · **Min Ip*** · **Max Ip*** · **Extension** (optional, searchable combobox "Select item…"). `supernetId`, `networkAddressesId` and `status` are **not** in the form — `supernetId`/`networkAddressesId` are system-generated, status defaults to **Setup**. **Submit** disabled until mandatory filled; shared unsaved-changes popup applies.
>
> **Extension dropdown is Active-only:** opening it fires `GET /api/catalog/supernet/execute?status=active&pageSize=50` and lists Active Supernets as `Title (id)` (e.g. `demosupernet1234567 (14518)`).
>
> **IP validation** is the same as the edit form — a non-IP value gives the inline alert `Please enter a valid IP address.` **Deeper rules** (from `permissions_and_status_model.md`, trigger on submit — verify at execution): IP range must not overlap another Supernet it extends; `extensionId` must reference an Active Supernet with no circular chains.
>
> **Toast text not captured** (no live record created); success asserts a toast appears and the new Setup record shows in the list.

#### S3.1. Create button visible with Create permission
**Steps:** 1. Verify a "Create Supernet" button is shown near the heading.

#### S3.2. (Negative) Create button hidden without Create permission
**Steps:** 1. Without `capabilitySupernetCreate`: no Create button on the list page.

#### S3.3. Create form opens with expected fields
**Steps:** 1. Click Create Supernet → dialog opens with Name, Title, Min Ip, Max Ip, Extension.

#### S3.4. Mandatory markers and optional field
**Steps:** 1. Verify Name, Title, Min Ip, Max Ip show `*`; Extension has no `*`.

#### S3.5. Submit disabled until mandatory fields filled
**Steps:** 1. On open Submit disabled 2. Fill Name + Title + valid Min Ip + valid Max Ip → Submit enables.

#### S3.6. Min Ip / Max Ip IP-format validation on create
**Steps:** 1. Enter a non-IP value in Min Ip (or Max Ip) → "Please enter a valid IP address." shown, Submit disabled.

#### S3.7. Extension dropdown lists Active Supernets only (searchable)
**Steps:** 1. Open the Extension dropdown → searchable list of Active Supernets as `Title (id)`.
**API:** `GET /api/catalog/supernet/execute?status=active&pageSize=50`.

#### S3.8. Title uniqueness validation on create
**Steps:** 1. Enter an existing Title → uniqueness error, Submit blocked.

#### S3.9. Title regex validation on create
**Steps:** 1. Enter a Title with a space or >32 chars → "Please enter a title with 1-32 characters. Spaces are not allowed."

#### S3.10. Name regex validation on create
**Steps:** 1. Enter a Name >128 chars or with a newline → "Please enter 1-128 characters. Newlines are not allowed."

#### S3.11. IP-range / extension business validations on submit *(from model — verify live)*
**Steps:** 1. Attempt create with a range that overlaps a Supernet it extends, or an inactive/circular Extension → creation blocked with the relevant error.

#### S3.12. Cancel with/without unsaved changes
**Steps:** 1. Enter a value, Cancel → "Unsaved Changes" popup (Stay/Discard) 2. Fresh form, no input, Cancel → closes with no popup.

#### S3.13. Successful creation adds a Setup record
**Steps:** 1. Fill mandatory fields with valid unique values, Submit → toast **`Supernet created successfully`** → new Supernet appears with Setup status.

#### S3.14. Network Addresses ID is system-generated
**Steps:** 1. Verify the create form has no Network Addresses ID field; the created record is assigned one automatically.

#### S3.15. supernetId auto-generated
**Steps:** 1. Verify no editable Supernet ID field in the create form; the record receives a system-generated id.

### S5 — ATTRIBUTE  *(capabilitySupernetUpdate · module-Attribute)*  — ✅ live-observed at Tier 3 (Custom only)

> **Attributes editor** ("Edit Supernet Attributes"): **Defined Attributes** shows "This item has no defined attributes" (Supernet exposes NO defined attributes; `objectDefinitions?objectName=supernetAttribute` is empty). **Custom Attributes** has a **"+ Add custom attribute"** button → a row with **Attribute Name** + **Attribute Value** textboxes + a **remove** button. **Submit** disabled until a change; **Cancel** → shared "Unsaved Changes" popup (Stay/Discard). Gated by `capabilitySupernetUpdate`. Toast text not captured (no live save).

#### S5.1. Attributes editor opens with Defined + Custom groups
**Steps:** 1. Click the Attributes edit pencil → "Edit Supernet Attributes" opens with Defined and Custom sections.

#### S5.2. Add a single custom attribute
**Steps:** 1. Click "+ Add custom attribute", fill Name + Value, Submit → toast **`Attributes updated successfully`**; attribute appears in the Attributes section.

#### S5.3. Add multiple custom attributes
**Steps:** 1. Add two or more rows, Submit → all appear.

#### S5.4. Edit an existing custom attribute value
**Steps:** 1. Change a value, Submit → updated value shown.

#### S5.5. Delete a custom attribute
**Steps:** 1. Click the row remove icon, Submit → attribute removed.

#### S5.6. Defined Attributes group shows empty state
**Steps:** 1. Verify the Defined Attributes group shows "This item has no defined attributes" (Supernet has no defined attributes).

#### S5.7. Cancel with unsaved changes shows popup
**Steps:** 1. Add/modify an attribute, Cancel → "Unsaved Changes" popup (Stay/Discard); Discard closes without saving.

#### S5.8. (Negative) No attribute editing without Update permission
**Steps:** 1. Without `capabilitySupernetUpdate`: the Attributes section shows no edit button.
### S6 — STATUS TRANSITIONS  *(module-StatusTransition)*  — ✅ COMPLETE (Update + Approver + Admin, both entry points)

> **Observed transition matrix (Tier 5, statususer = all five capabilities). List Actions dropdown == Detail Change Status dropdown for every state (validated independently):**
>
> | From state | Options offered (both entry points) | Gated by |
> |---|---|---|
> | Setup | Requested · Deleted · **Active** | Requested/Deleted = Update · Active = Approver |
> | Requested | Setup · Deleted · **Active** | Setup/Deleted = Update · Active = Approver |
> | Deleted | Setup · Requested · **Active** *(reach Deleted rows via Status=Deleted filter)* | Update / Approver |
> | Active | **Setup · Requested · Deleted** | **Admin only** (edit icon + Change Status enabled only with Admin) |
>
> **Progressive-differential findings:** **Approver** adds the **Active** option to Setup/Requested/Deleted dropdowns (absent at Update-only). **Admin** enables the **edit icon (list) and Change Status (detail) for Active records** — empty/unavailable at every lower tier — and offers `Active → Setup/Requested/Deleted`. **Entry-point parity confirmed** for both a Setup record (`{Requested, Deleted, Active}`) and an Active record (`{Setup, Requested, Deleted}`).
>
> **Confirmation dialog + toast (LIVE-VERIFIED on Supernet 2026-08-31):** dialog **`Confirm Status Change`** — body **`Are you sure you want to change the status to "<state>"?`** — confirm button = action verb (observed **`Request`**, **`Delete`**; expected `Activate` for →Active) — success toast **`Status changed to "<state>"`** (e.g. `Status changed to "requested"`, `Status changed to "deleted"`).
>
> **Known Supernet delete preconditions (from `permissions_and_status_model.md`):** `Requested → Active` blocked if any mandatory field is NULL; `Any → Deleted` blocked if active **IPPool(s)** reference the Supernet; `Any → Deleted` blocked if active **Subnet(s)** reference the Supernet.

#### S6.1–S6.6 (List-page, Update-permitted transitions)
Positive, one per transition via List Actions dropdown → confirm → success toast → grid badge updates:
Setup→Requested · Setup→Deleted · Requested→Setup · Requested→Deleted · Deleted→Setup · Deleted→Requested.

#### S6.7–S6.9 (List-page, Approver transitions to Active)
Setup→Active · Requested→Active · Deleted→Active — Active option present only with Approver.

#### S6.10–S6.12 (Detail-page Change Status entry point)
Mirror via the Detail Change Status dropdown: Setup→Requested · Setup→Active · Requested→Active (remaining detail transitions mirror the list-page set; full parity finalised at Tier 5).

#### S6.13. Entry-point consistency
For a Setup record, the List Actions dropdown and Detail Change Status dropdown offer the identical set `{Requested, Deleted, Active}`. If they diverge, file as a defect.

#### S6.14. (Negative — permission) Active option hidden without Approver
Without `capabilitySupernetApprover`, neither dropdown offers Active (only the Update-permitted set).

#### S6.15. (Negative — permission) No transitions without Update/Create
Without Update/Create: no edit icon on rows, no Change Status button — no transition possible.

#### S6.16. (Negative — Active gating) Active record not editable without Admin
An Active record shows no edit icon and no usable Change Status affordance — Active→* requires Admin (validated at Tier 5).

#### S6.17. (Precondition) Requested→Active blocked when a mandatory field is NULL
Attempt Requested→Active on a record with a NULL mandatory field → blocked, error shown, status unchanged. Positive counterpart: all mandatory populated → succeeds.

#### S6.18. (Precondition) Any→Deleted blocked by active IPPool dependency
Attempt →Deleted on a Supernet referenced by an active IPPool → blocked, error shown, status unchanged. Positive: no active IPPool → succeeds.

#### S6.19. (Precondition) Any→Deleted blocked by active Subnet dependency
Attempt →Deleted on a Supernet referenced by an active Subnet → blocked, error shown, status unchanged. Positive: no active Subnet → succeeds.

#### S6.20. Confirmation dialog + toast + badge update
Selecting a transition (either entry point) shows the "Confirm Status Change" dialog; confirming fires the status API, shows a success toast, and the badge updates in the grid and on the detail page. Dismissing makes no change.

#### S6.21. (Admin) Active record edit icon + Change Status enabled
With `capabilitySupernetAdmin`, an Active record shows an enabled edit (pencil) icon in the grid and an enabled Change Status button on its detail page (both absent at every lower tier).

#### S6.22. (Admin) Active→Setup via List Actions dropdown
Find an Active record, open its Actions dropdown (options: Setup, Requested, Deleted), select Setup → confirm → success toast → grid badge changes to Setup.

#### S6.23. (Admin) Active→Requested via List Actions dropdown
As S6.22, selecting Requested → grid badge changes to Requested.

#### S6.24. (Admin) Active→Deleted via List Actions dropdown
As S6.22, selecting Deleted → grid badge changes to Deleted (subject to the active IPPool/Subnet delete preconditions).

#### S6.25. (Admin) Active→Setup via Detail Change Status dropdown
Open an Active record detail, click Change Status (options: Setup, Requested, Deleted), select Setup → confirm → header badge changes to Setup.

#### S6.26. (Admin) Active→Deleted via Detail Change Status dropdown
As S6.25, selecting Deleted → header badge changes to Deleted (subject to delete preconditions).

#### S6.27. Entry-point parity for an Active record
For an Active record, the List Actions dropdown and Detail Change Status dropdown offer the identical set `{Setup, Requested, Deleted}`. If they diverge, file as a defect.

> **S6 complete** — Update, Approver, and Admin transitions covered across both entry points, plus permission-negative and precondition (mandatory-field, active IPPool, active Subnet) TCs.

---

*End of Supernet coverage — Tiers 1–5 COMPLETE (GET + UPDATE + CREATE + APPROVER + ADMIN). 94 TCs across S1–S6. Ready for the QA Review Gate before Generator.*
