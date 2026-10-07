# Subnet — Complete Test Coverage

| Field        | Value                              |
|--------------|------------------------------------|
| Feature      | Subnet                             |
| Document Version | 1.0 (Tiers 1–5 / GET + UPDATE + CREATE + APPROVER + ADMIN — COMPLETE) |
| Coverage Date | 2026-08-31 (Tier 1) · 2026-09-01 (Tiers 2–5) |
| Prepared By  | Playwright MCP QA Automation Agent (Planner) |
| Environment  | QAN — https://portal-host.qan.aws.eseye.io |
| Test User    | statususer / Password#1            |
| DB Schema    | oncilla                            |
| Source       | Live UI exploration via Playwright MCP browser automation |

> **✅ COVERAGE COMPLETE — all five permission tiers explored live.** Per the tiered discovery model (setup.md Steps 11–14), each capability was activated one at a time and diffed against the previous tier. All of **`capabilitySubnetGet` (T1)**, **`…Update` (T2)**, **`…Create` (T3)**, **`…Approver` (T4)** and **`…Admin` (T5)** were active and verified live in the DB (`userPermission`) and `/api/permissions`. Every section is live-observed: **S1 VIEW**, **S2 FILTER** (T1), **S4 UPDATE**, **S5 ATTRIBUTE**, S6 Update-subset (T2), **S3 CREATE** (T3), **S6 Approver → Active** (T4), and **S6 Admin (Active → X + Active-state editing)** (T5). *Still open for a later pass (not tier-gated):* Subnet delete/activate **preconditions** were not forced, and the two defects under `defects/subnet/` remain outstanding.

---

## 1. Feature Overview

Subnet is a Network Management catalog entity representing an IP subnet **belonging to a parent Supernet** (`supernetId`, mandatory) and optionally mapped to an IP Pool. Each subnet has a Min/Max host IP range, a Range Type, an Allocation Strategy, and may extend a parent Subnet (`extensionId`, self-referential). It lives under **Network Management → Subnets**.

- **List page:** `/network-management/subnets`
- **Detail page (NESTED):** `/network-management/subnets/{supernetId}/{subnetId}` — a subnet is addressed by both its parent supernet id and its own id.
- **Browser tab title:** `Network Management | Portal`
- **Page heading (h1):** `Subnets`
- **Breadcrumb:** `Home > Network Management > Subnets > {supernetId} > {subnetId}` on the detail page.

Records follow the standard lifecycle **Setup → Requested → Active → Deleted**. At GET the user can browse, search, filter, sort, paginate, configure columns, and open a read-only detail view.

---

## 2. Environment Details

- **App base URL:** `https://portal-host.qan.aws.eseye.io`
- **Login (auth) URL:** `https://portal-host.qan.aws.eseye.io/auth` (two-step)
- **DB:** MySQL `oncilla` (QAN RDS). Findings below are from UI + network capture.

### Discovered API endpoints (Tier 1)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/permissions` | User capability list (ground truth) |
| GET | `/api/catalog/globalSubnet/execute?pageSize=50&enrich=title&getPageCount=true&status=setup&status=requested&status=active` | **List** — permission `subnetGet`; path `/v2/subnet`; default excludes `deleted` |
| GET | `/api/catalog/objectDefinitions/execute?objectName=subnet&status=active` | Field definitions |
| GET | `/api/catalog/genericOption/execute?resourceName=subnet&option=status` | Valid status-transition options (empty at GET) |
| GET | `/api/catalog/statusTransition/execute?resourceName=subnet&status=active&pageSize=200` | Status-transition metadata |
| GET | `/api/catalog/subnetById/execute?supernetId={sid}&subnetId={id}&enrich=title` | **Detail** — path `/v2/supernet/{supernetId}/subnet/{subnetId}` |
| GET | `/api/catalog/subnetAttribute/execute?supernetId={sid}&subnetId={id}` | Record attributes |

> ⚠ `GET /api/catalog/genericOption/execute?resourceName=**globalSubnet**&option=status` returns **403** for this user — the `globalSubnet` status option is forbidden; the `subnet` variant (used by the UI) returns 200.

### List query / filter parameters (from list API `inputs`/`outputs`)
`subnetId, supernetId, status, name, title, minIp, maxIp, rangeTypeId, allocationStrategyId, extensionId, ipPoolId, networkAddressesId, netmaskBits, vlanId`

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | STATUS TRANSITION TCs | Total |
|---------|----------|------------|------------|------------|---------------|-----------------------|-------|
| Subnet (Tier 1 so far) | 14 | 15 | ⏳ pending T3 | ⏳ pending T2 | ⏳ pending T3 | ⏳ pending T4/T5 | 29 (partial) |

---

## 4. Module Discovery Report

```
MODULE NAME        : Subnet
CAPABILITY PREFIX  : Subnet → capabilitySubnetGet / Update / Create / Approver / Admin
                     (live: only capabilitySubnetGet + subnetGet ACTIVE; all others deleted)
MODULE PLURAL      : Subnets
MENU PATH          : Network Management → Subnets
LIST URL           : /network-management/subnets
DETAIL URL (NESTED): /network-management/subnets/{supernetId}/{subnetId}
LIST API RESOURCE  : globalSubnet (permission subnetGet)
PRIMARY KEY FIELD  : subnetId  (integer, auto-generated, write forbidden; grid hyperlink -> nested detail)
FOREIGN KEY FIELDS : supernetId  -> Supernet (MANDATORY); grid + detail hyperlink to /network-management/supernets/{supernetId}; shown as "Title (id)"
                     ipPoolId    -> IP Pool (optional); grid hyperlink to /network-management/ip-pools/{ipPoolId}; shown as "Title (id)"
                     rangeTypeId -> Range Type (MANDATORY); plain text "Title (id)" (not linked)
                     allocationStrategyId -> Allocation Strategy (MANDATORY); plain text "Title (id)" (not linked)
                     extensionId -> parent Subnet (SELF-REFERENTIAL, optional); plain text; grid header labelled "Extention ID" (UI typo)
                     vlanId      -> VLAN (optional)
TEXT FIELDS        : name  — mandatory (max 128; regex ^[^\n]{1,128}$)  [label "subnet server name"]
                     title — mandatory, unique (max 32; regex ^\S{1,32}$; no spaces)  [label "subnet title"]
                     minIp — mandatory (max 36)  [label "Min Host Ip"]
                     maxIp — mandatory (max 36)  [label "Max Host Ip"]
                     netmaskBits — optional (integer; regex ^\d{1,11}$)
                     networkAddressesId — optional, unique (integer)
STATUS VALUES      : Setup, Requested, Active, Deleted  (status filter dropdown shows lowercase: setup/requested/deleted/active)
TABLE HEADERS      : Subnet ID, Name, Title, Supernet, Min IP, Max IP, Range Type, Allocation Strategy, Extention ID, IP Pool, Status, Actions
FILTER FIELDS      : Subnet Id (text), Status (multi dropdown), Supernet Id (dropdown), Name (text), Title (text), Min Ip (text),
                     Max Ip (text), Range Type Id (dropdown), Allocation Strategy Id (dropdown), Extension Id, Ip Pool Id (dropdown),
                     Network Addresses Id (text), VLAN ID, Netmask Bits (text)  [Primary + Secondary sections]
CRUD AVAILABLE     : (at Tier 1 GET) Read only — list + read-only detail. Create/Update/Delete/StatusTransition NOT exposed.
ATTRIBUTE SECTION  : yes — CUSTOM attributes only. Defined Attributes group shows "This item has no defined attributes".
                     Records carry attribute[] (subnetAttributeId/attribute/value/status).
RELATED SECTIONS   : NONE observed on the detail page (unlike Supernet's Related Portals).
TEST REPOSITORY    : test-scenarios/test-plans/subnet_testcoverage.md
APIs CAPTURED      : see §2
OBSERVED QUIRKS    : (1) Detail page renders slowly — several seconds stuck on "Loading..." before the body appears (performance/UX note).
                     (2) Detail label reads "Network Adress" (missing 's') — confirmed still present at Tier 2.
                         NOTE: the grid column header reads "Extension ID" (correctly spelled) as observed at Tier 2 (2026-09-01);
                         the earlier Tier-1 note of "Extention ID" was not reproduced — treat the grid header as "Extension ID".
                     (3) [Tier 2] Editing a record whose Allocation Strategy references an INACTIVE value (e.g. unique (1)) fails on
                         Submit with error toast "allocationStrategyId doesn't exist or not active." The inactive value is shown as
                         pre-filled display text but is not a selectable active option; a valid active strategy must be chosen to save.
                     (4) [Tier 3] Creating a Subnet with certain Range Types (observed with "SSRTesting0 (35)") fails with a RAW
                         MySQL error surfaced to the UI: '1265 (01000): Data truncated for column \'rangeType\' at row 1'. Other range
                         types (e.g. "external (27)") create fine. Raw DB errors leaking to the toast is a defect; capture live per range type.
                     (5) [Tier 3] The Title uniqueness pre-check GET /api/catalog/checkUnique/execute?objectName=subnet&title=... returns
                         403 for this user, so the form cannot pre-validate Title uniqueness client-side — uniqueness is enforced only on submit.
```

### RBAC Permission Elevation Log

| Tier | Capability Activated | Explored | New Scenarios Captured | Inherited From |
|---|---|---|---|---|
| 1 | `capabilitySubnetGet` | ✅ | S1 VIEW (14), S2 FILTER (15) | — |
| 2 | `capabilitySubnetUpdate` | ✅ | S4 UPDATE (6), S5 ATTRIBUTE (3), S6 STATUS TRANSITIONS – Update subset (11) | Tier 1 |
| 3 | `capabilitySubnetCreate` | ✅ | S3 CREATE (9) | Tiers 1–2 |
| 4 | `capabilitySubnetApprover` | ✅ | S6 (Approver → Active transitions) (6) | Tiers 1–3 |
| 5 | `capabilitySubnetAdmin` | ✅ | S6 Admin (Active→X transitions + Active-state editing) (5) | Tiers 1–4 |

> **Note (Tier 2 discovery):** the **Attributes editor (S5)** is unlocked at the **Update** tier (not Create as tentatively assumed) — `module-Attribute` maps to `capabilitySubnetUpdate`. Only **S3 CREATE** remains for Tier 3.

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|----------|--------|----------------|
| 1 | Subnet ID | Integer; **hyperlink** → `/network-management/subnets/{supernetId}/{subnetId}` (nested); sortable |
| 2 | Name | String; sortable |
| 3 | Title | String (unique); sortable |
| 4 | Supernet | **FK hyperlink** → `/network-management/supernets/{supernetId}`; `Title (id)`; sortable |
| 5 | Min IP | IP string; sortable |
| 6 | Max IP | IP string; sortable |
| 7 | Range Type | `Title (id)` plain text (FK, not linked); sortable |
| 8 | Allocation Strategy | `Title (id)` plain text (FK, not linked); sortable |
| 9 | Extention ID | Parent subnet id — plain text (empty when no parent); ⚠ header misspelled; sortable |
| 10 | IP Pool | **FK hyperlink** → `/network-management/ip-pools/{ipPoolId}`; `Title (id)` (empty when unmapped); sortable |
| 11 | Status | Badge: Setup / Requested / Active (Deleted excluded from default list query); sortable |
| 12 | Actions | Present; **empty at GET** (no edit icon — correct, no Update permission) |

**Toolbar:** `Search by Name…` · `Add filter` · `Clear all` · `Configure visible columns` (column preset).
**Pagination footer:** per-page selector (default 50) · First / Previous / numbered pages / Next / Last. `pageCount = 1`, `itemCount = 17` in the default view.

---

## 6. Discovered Form Fields (Create / Edit)

> Read-only Standard Fields observed on the detail page at GET (create/edit form to be confirmed at Tiers 2–3). Field metadata below is authoritative (from `objectDefinitions`).

| Field | Type | Mandatory | Unique | Max Length / Regex | Source (if dropdown) |
|-------|------|-----------|--------|--------------------|----------------------|
| subnetId | integer | yes (auto) | yes | `^\d{1,21}$` | — (PK, write forbidden) |
| name | string | yes | no | 128 · `^[^\n]{1,128}$` | — |
| title | string | yes | **yes** | 32 · `^\S{1,32}$` | — |
| supernetId | integer | **yes** | no | `^\d{1,21}$` | Supernet |
| minIp | string | yes | no | 36 (IP — business logic) | — |
| maxIp | string | yes | no | 36 (IP — business logic) | — |
| rangeTypeId | integer | **yes** | no | `^\d{1,21}$` | Range Type |
| allocationStrategyId | integer | **yes** | no | `^\d{1,21}$` | Allocation Strategy |
| extensionId | integer | no | no | `^\d{1,21}$` | Subnet (self, parent) |
| ipPoolId | integer | no | no | `^\d{1,21}$` | IP Pool |
| networkAddressesId | integer | no | **yes** | `^\d{1,21}$` | — |
| vlanId | integer | no | no | `^\d{1,21}$` | VLAN |
| netmaskBits | integer | no | no | `^\d{1,11}$` | — |
| status | string | yes | no | `setup\|requested\|active\|deleted` | status transition (write forbidden) |

Detail page also shows an **Attributes** section (Defined: none; Custom: displayed). Detail Standard Fields observed: Name, Supernet, Min Ip, Max Ip, Range Type, Allocation Strategy, Extension, Ip Pool, Network Adress.

---

## 7. Discovered Filter Fields

| Filter Field | Type | Values / Source |
|--------------|------|-----------------|
| Subnet Id | Text | numeric id |
| Status | Multi-select dropdown (checkboxes + Select all) | setup, requested, deleted, active |
| Supernet Id | Dropdown | Supernets |
| Name | Text | free text |
| Title | Text | free text |
| Min Ip | Text | free text |
| Max Ip | Text | free text |
| Range Type Id | Dropdown | Range Types |
| Allocation Strategy Id | Dropdown | Allocation Strategies |
| Extension Id | Dropdown / text | parent Subnets |
| Ip Pool Id | Dropdown | IP Pools |
| Network Addresses Id | Text | numeric id |
| VLAN ID | Dropdown / text | VLANs |
| Netmask Bits | Text | integer |

Filters dialog has **Primary** + **Secondary** sections, a **Search filters…** box, and **Reset** / **Apply**. Toolbar **Clear all** removes active filters.

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW  *(capabilitySubnetGet · module-View)*

#### S1.1. List page loads with correct heading, breadcrumb and tab title
**Steps:** 1. Log in → Network Management → Subnets → list loads 2. Verify h1 = `Subnets`; breadcrumb `Home > Network Management > Subnets`; tab title contains `Network Management | Portal`
**API:** `GET /api/catalog/globalSubnet/execute...` → 200

#### S1.2. Grid shows the 12 default columns in order
**Steps:** 1. Verify headers in order: Subnet ID | Name | Title | Supernet | Min IP | Max IP | Range Type | Allocation Strategy | Extention ID | IP Pool | Status | Actions

#### S1.3. Subnet ID hyperlink opens the nested detail page
**Steps:** 1. Click a Subnet ID → navigates to `/network-management/subnets/{supernetId}/{subnetId}` → detail loads with matching Subnet Id/Title

#### S1.4. Supernet FK hyperlink opens the Supernet detail
**Steps:** 1. Click a Supernet cell → navigates to `/network-management/supernets/{supernetId}`

#### S1.5. IP Pool FK hyperlink opens the IP Pool detail
**Steps:** 1. For a row with an IP Pool, click the IP Pool cell → navigates to `/network-management/ip-pools/{ipPoolId}` 2. Rows with no IP Pool show an empty cell

#### S1.6. Range Type / Allocation Strategy / Extension shown as Title (id) plain text
**Steps:** 1. Verify Range Type, Allocation Strategy and Extention ID cells show `Title (id)` (Extention ID empty when no parent) and are NOT hyperlinks

#### S1.7. Read-only detail page structure
**Steps:** 1. Open a record → verify header (Subnet Id, Title, Status badge), Standard Fields (Name, Supernet, Min Ip, Max Ip, Range Type, Allocation Strategy, Extension, Ip Pool, Network Adress), Attributes section (Defined = "This item has no defined attributes"; Custom shows the record's attributes). Verify **no** Edit / Change Status control (GET is read-only) and **no** related sections.
**API:** `GET /api/catalog/subnetById/execute?supernetId={sid}&subnetId={id}&enrich=title` → 200

#### S1.8. Column sort ascending/descending
**Steps:** 1. Click each sortable header once (asc) then again (desc) → row order changes

#### S1.9. Records-per-page selector changes page size
**Steps:** 1. Change the per-page selector → grid reloads with the selected page size

#### S1.10. Pagination navigation
**Steps:** 1. On page 1, First/Previous are disabled; with more than one page, Next/Last/page numbers load the target page

#### S1.11. Column preset — select a subset and Apply
**Steps:** 1. Click Configure visible columns → panel with checkboxes 2. Uncheck some, keep others 3. Apply → grid shows only selected columns; unselected no longer visible

#### S1.12. Column preset — Select All / Deselect All
**Steps:** 1. In the preset panel use Select All then Deselect All → checkbox states toggle before Apply

#### S1.13. Quick search by Name
**Steps:** 1. Type a known name fragment in `Search by Name…` → list filters to matching rows

#### S1.14. (Negative) Module hidden / URL blocked without Get permission
**Steps:** 1. Without `capabilitySubnetGet`: Subnets not visible under Network Management 2. Direct navigation to `/network-management/subnets` returns 401/403 or access-denied
**API:** list call → 401/403

---

### S2 — FILTER  *(capabilitySubnetGet · module-Filter)*

#### S2.1. Filter dialog opens with Primary + Secondary sections and all fields
**Steps:** 1. Click Add filter → dialog "Filters" opens with Primary + Secondary sections showing Subnet Id, Status, Supernet Id, Name, Title, Min Ip, Max Ip, Range Type Id, Allocation Strategy Id, Extension Id, Ip Pool Id, Network Addresses Id, VLAN ID, Netmask Bits; plus Search filters, Reset, Apply

#### S2.2. Filter-field search filters the field list
**Steps:** 1. Type in `Search filters…` → only matching filter fields remain visible

#### S2.3. Status filter (multi-select) filters the list
**Steps:** 1. Open Status dropdown → options setup/requested/deleted/active with checkboxes 2. Select setup + requested → Apply → list shows only those statuses

#### S2.4. Status filter Select all / Clear all
**Steps:** 1. In Status dropdown click Select all then Clear all → checkboxes toggle accordingly

#### S2.5. Filter by Supernet Id (dropdown)
**Steps:** 1. Open Supernet Id dropdown → select a Supernet → Apply → list shows only subnets of that Supernet

#### S2.6. Filter by Range Type Id (dropdown)
**Steps:** 1. Open Range Type Id dropdown → select a value → Apply → list filtered

#### S2.7. Filter by Allocation Strategy Id (dropdown)
**Steps:** 1. Open Allocation Strategy Id dropdown → select a value → Apply → list filtered

#### S2.8. Filter by IP Pool Id (dropdown)
**Steps:** 1. Open Ip Pool Id dropdown → select an IP Pool → Apply → list shows only subnets mapped to it

#### S2.9. Filter by Subnet Id (text)
**Steps:** 1. Enter a known id in `Filter By Subnet Id` → Apply → list shows that record

#### S2.10. Filter by Name (text)
**Steps:** 1. Enter a value in `Filter By Name` → Apply → list filtered

#### S2.11. Filter by Title (text)
**Steps:** 1. Enter a value in `Filter By Title` → Apply → list filtered

#### S2.12. Filter by Min Ip / Max Ip (text)
**Steps:** 1. Enter a value in Filter By Min Ip (and Max Ip) → Apply → list filtered

#### S2.13. Reset filters restores default view
**Steps:** 1. Apply filters 2. Click Reset in the dialog → inputs cleared, default list restored

#### S2.14. Clear all (toolbar) removes active filters
**Steps:** 1. With filters applied, click Clear all on the toolbar → unfiltered default list returns

#### S2.15. Combined multi-filter + persistence across pagination/sort/column preset
**Steps:** 1. Apply Status + Supernet Id together → list reflects the intersection 2. Page/sort/change columns → the applied filter stays active

---

### S4 — UPDATE  *(capabilitySubnetUpdate · module-Update)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 30–35

**What UPDATE newly unlocks (diff vs GET):**
- **List Actions column:** an **Edit (pencil) icon** now appears on **editable rows (Setup / Requested / Deleted)**; it is **ABSENT (empty cell)** on **Active** rows (no Admin) — absent, *not* a disabled/greyed icon. Clicking it opens a **status-transition dropdown** (not a field editor — see S6).
- **Detail page:** a **`Change Status ▾`** button (header), an **Edit pencil on the Standard Fields section** (opens the *Edit Subnet* form), and an **Edit pencil on the Attributes section** (opens the *Edit Subnet Attributes* editor — see S5).

**`Edit Subnet` modal anatomy (live):** heading `Edit Subnet`; Close (X); Cancel; Submit (disabled until a change).
- Field rows: `[Supernet]` · `[Title, Name]` · `[Min IP, Max IP]` · `[Range Type, Allocation Strategy]` · `[Extension ID, IP Pool]` · `[VLAN, Netmask Bits]`.
- **Mandatory (\*):** Supernet, Title, Name, Min IP, Max IP, Range Type, Allocation Strategy. **Optional:** Extension ID, IP Pool, VLAN, Netmask Bits.
- **Supernet is DISABLED** (cannot re-parent an existing subnet); helper text under it: `IP range between {min} and {max}` (the parent supernet's usable range, e.g. `IP range between 249.237.123.37 and 249.237.123.42`).
- Min IP / Max IP helper: `Should be within Supernet IP range`. Range Type / Allocation Strategy / Extension ID / IP Pool / VLAN are searchable comboboxes; Range Type & Allocation Strategy expose `Clear selection`.

**Toasts (live-captured):** success = **`Subnet updated successfully`**; error (inactive FK) = **`allocationStrategyId doesn't exist or not active.`** (see Observed Quirk 3).

#### S4.1 Update controls appear at Update tier (Change Status ▾, Standard Fields Edit, Attributes Edit) — absent at GET
#### S4.2 List Edit icon present for Setup/Requested/Deleted rows, **absent** for Active rows
#### S4.3 Open `Edit Subnet` form — verify layout, mandatory `*` markers, Supernet disabled + parent-range helper, IP helper, Submit-disabled-until-change
#### S4.4 Edit a field (Name/Title) → Submit → toast `Subnet updated successfully`; value persists (DB `oncilla.subnet`)
#### S4.5 Supernet field is read-only in edit (re-parenting not allowed)
#### S4.6 Cancel / Close discards the edit without saving

---

### S5 — ATTRIBUTE  *(capabilitySubnetUpdate · module-Attribute)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 36–38

**Available at the Update tier** (not Tier 3). Editor heading **`Edit Subnet Attributes`**; **Custom only** — the Defined Attributes group shows `This item has no defined attributes`; Custom group has `+ Add custom attribute`.
- Custom row: `Attribute Name` + `Attribute Value` textboxes + remove (trash) icon; Submit disabled until both are filled.
- Removing a row opens confirm alertdialog **`Delete attributes?`** — body `You are about to permanently delete 1 attribute(s). This action cannot be undone.` · Cancel / Remove — then Submit to persist.
- **Toast:** `Attributes updated successfully` (single shared toast for add / edit / delete).

#### S5.1 Open `Edit Subnet Attributes` — Defined none, Custom only, `+ Add custom attribute`
#### S5.2 Add a custom attribute (requires Name **and** Value) → Submit → toast `Attributes updated successfully`; shows on detail
#### S5.3 Remove a custom attribute → `Delete attributes?` confirm → Remove → Submit → toast `Attributes updated successfully`

---

### S6 — STATUS TRANSITIONS — Update-tier subset  *(capabilitySubnetUpdate · module-StatusTransition)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 39–49

**Two entry points, identical options:** the **list Actions pencil** and the detail **`Change Status ▾`**.
**Update-tier transition map (live-verified, both entry points):**

| From | Offered targets at Update tier | Active offered? |
|---|---|---|
| Setup | Requested, Deleted | No |
| Requested | Setup, Deleted | No |
| Deleted | Setup, Requested | No |

- **Active is never offered** at Update (→ Active requires Approver/Admin; Active rows have no Edit icon).
- **Confirm dialog (live):** title `Confirm Status Change`; body `Are you sure you want to change the status to "<state>"?`; confirm button = the action **verb**: **`Request`** (→Requested), **`Set Up`** (→Setup), **`Delete`** (→Deleted); plus Cancel + Close (X).
- **Success toasts (live-captured):** `Status changed to "requested"`, `Status changed to "setup"`, `Status changed to "deleted"`.
- **Deleted records are hidden from the default list** — to reach Deleted-source transitions, apply **Add filter → Status = Deleted → Apply** first. (At capture time zero Deleted subnets existed, so the filtered grid showed `No data` until a record was deleted.)

#### S6.1 List Edit pencil opens a status dropdown; Setup row offers Requested + Deleted (not Active)
#### S6.2 Setup → Requested (list) — confirm `Request` → toast `Status changed to "requested"`
#### S6.3 Setup → Deleted (list) — confirm `Delete` → toast `Status changed to "deleted"`
#### S6.4 Requested → Setup (detail `Change Status ▾`) — confirm `Set Up` → toast `Status changed to "setup"`
#### S6.5 Requested → Deleted
#### S6.6 Deleted → Setup (must filter Status=Deleted to locate the record)
#### S6.7 Deleted → Requested
#### S6.8 Detail `Change Status ▾` offers the same options as the list pencil for each state
#### S6.9 *(negative)* Active transition is unavailable from any state at Update tier
#### S6.10 Cancel on `Confirm Status Change` makes no change (no API call)
#### S6.11 Deleted records excluded from default list; visible only via Status=Deleted filter

---

### S3 — CREATE  *(capabilitySubnetCreate · module-Create)*  — ✅ Tier 3, live-observed 2026-09-01  → CSV TC 50–58

**What CREATE newly unlocks:** a **`Create Subnet`** button on the Subnets list (absent at Get/Update), opening the **`Create New Subnet`** modal.

**`Create New Subnet` modal anatomy (live):**
- Heading `Create New Subnet`; Close (X); Cancel; Submit (disabled until valid).
- **Supernet-first gating:** only **Supernet\*** is enabled at first. **Title, Name, Min IP, Max IP are DISABLED** until a Supernet is selected — helper `Select Supernet to proceed`; Extension ID/Range Type/Allocation Strategy helpers also read `Select Supernet to proceed`; IP Pool reads `Fill in supernetId first`.
- **Supernet is a searchable dropdown** with its own `Search...` box (server-side — only ~50 supernets load initially, so search is required to reach others; real keystrokes needed to trigger it). *(Contrast with Edit, where Supernet is disabled/locked.)*
- On selecting a Supernet the other fields enable and the Supernet helper shows **`IP range between {minIp} and {maxIp}`**; Min/Max IP helper `Should be within Supernet IP range`.
- **Mandatory (\*):** Supernet, Title, Name, Min IP, Max IP, Range Type, Allocation Strategy. **Optional:** Extension ID, IP Pool, VLAN, Netmask Bits.

**Toast / result:** success = **`Subnet created successfully`**; new record **default status = Setup** (DB-confirmed). API = `POST /api/catalog/subnet/execute` (permission `subnetCreate`).

**Validation observed live:**
- IP at the edge of / outside the supernet applicable range → error toast **`Outside the supernet applicable range`** (HTTP 400, errorCode 6006). The *applicable* range is narrower than the displayed supernet min–max: it excludes the first/last address (network/broadcast) and any range overlapping existing subnets.
- **Min IP = Max IP** (single address) → **Submit stays disabled** (max must exceed min).
- Title must be unique (client pre-check unavailable — see Observed Quirk 5); certain Range Types raise a raw DB error (Observed Quirk 4).

#### S3.1 `Create Subnet` button available at Create tier (absent at Get/Update)
#### S3.2 `Create New Subnet` form gates Title/Name/Min IP/Max IP until a Supernet is selected (helpers `Select Supernet to proceed` / `Fill in supernetId first`)
#### S3.3 Supernet dropdown is searchable; selecting a Supernet unlocks fields and shows `IP range between {minIp} and {maxIp}`
#### S3.4 Create a valid Subnet → toast `Subnet created successfully`; new record default status `Setup`
#### S3.5 Submit stays disabled until all mandatory `*` fields are valid
#### S3.6 Duplicate Title is rejected on submit (unique constraint; client pre-check returns 403)
#### S3.7 Min/Max IP must fall within the supernet applicable range → out-of-range gives `Outside the supernet applicable range`
#### S3.8 Min IP must be lower than Max IP (equal values keep Submit disabled)
#### S3.9 Cancel / Close discards the create without saving

### S6 (continued) — APPROVER → Active transitions  *(capabilitySubnetApprover · module-StatusTransition)*  — ✅ Tier 4, live-observed 2026-09-01  → CSV TC 59–64

**What APPROVER newly unlocks:** the **`Active`** option is added to the status control for **every non-Active state** (both entry points — list Actions pencil and detail `Change Status ▾`). Live-verified option sets at Approver tier:

| From state | Offered targets (Approver tier) |
|---|---|
| Setup | Requested, Deleted, **Active** |
| Requested | Setup, Deleted, **Active** |
| Deleted | Setup, Requested, **Active** |

- **Confirm dialog:** title `Confirm Status Change`; body `Are you sure you want to change the status to "active"?`; confirm button verb = **`Active`**; plus Cancel + Close (X). Success toast **`Status changed to "active"`**.
- Live-executed: **Setup → Active** (record 13467) and **Requested → Active** (record 13452 via Setup→Requested→Active). **Deleted → Active** option confirmed offered on a Deleted record.
- **Active records stay LOCKED at Approver (Admin-only beyond this):** an Active record's detail shows **no `Change Status` control** and **no Edit (pencil)** on either the Standard Fields or Attributes section; Active rows in the list have an **empty Actions cell**. So Approver can move records *into* Active but cannot transition *out of* Active or edit an Active record — those are Tier 5 (Admin).

#### S6.12 `Active` option is offered from Setup, Requested and Deleted at Approver tier
#### S6.13 Setup → Active — confirm `Active` → toast `Status changed to "active"`
#### S6.14 Requested → Active — confirm `Active` → toast `Status changed to "active"`
#### S6.15 Deleted → Active (filter Status=Deleted to locate) — confirm `Active` → toast `Status changed to "active"`
#### S6.16 Confirm Status Change dialog for Active (title/body/verb `Active`); Cancel makes no change
#### S6.17 *(boundary)* An Active Subnet exposes no Change Status control and no Edit icons at Approver tier (Active→X and Active-state editing require Admin)

### S6 (continued) — ADMIN transitions  *(capabilitySubnetAdmin · module-StatusTransition / module-Admin)*  — ✅ Tier 5, live-observed 2026-09-01  → CSV TC 65–69

**What ADMIN newly unlocks (all on/around ACTIVE records):**
- **List:** **Active rows now show the Actions Edit (pencil) icon** (empty at Get/Update/Approver). All statuses are now actionable from the list.
- **Detail (Active record):** the **`Change Status ▾`** control returns, and **both** the Standard Fields and Attributes sections show their **Edit (pencil)** icons.
- **Active → X transitions** now offered (both entry points): an **Active** record offers **{Setup, Requested, Deleted}**. Confirm verbs `Set Up` / `Request` / `Delete`; toasts `Status changed to "setup" / "requested" / "deleted"`. Live-executed **Active → Setup** (records 13467 and 13452).
- **Active-state editing:** the Edit Subnet form opens on an **Active** record; editing a field and submitting gives **`Subnet updated successfully`** and the record **stays Active**. Live-executed on record 13467.

#### S6.18 Admin unlocks Active-row management — list Active rows show the Actions edit icon; Active detail shows Change Status + Standard Fields/Attributes edit
#### S6.19 Active-state editing — edit an Active Subnet's fields → toast `Subnet updated successfully`; record stays Active
#### S6.20 Active → Setup — confirm `Set Up` → toast `Status changed to "setup"`
#### S6.21 Active → Requested — confirm `Request` → toast `Status changed to "requested"`
#### S6.22 Active → Deleted — confirm `Delete` → toast `Status changed to "deleted"`

---

## Full status-transition matrix by tier (live-verified)

| From \ min permission | → Setup | → Requested | → Active | → Deleted |
|---|---|---|---|---|
| **Setup** | — | Update | **Approver** | Update |
| **Requested** | Update | — | **Approver** | Update |
| **Deleted** | Update | Update | **Approver** | — |
| **Active** | **Admin** | **Admin** | — | **Admin** |

Confirm-button verbs: `Set Up` / `Request` / `Active` / `Delete`. Success toast always `Status changed to "<state>"`.

---

*End of Subnet coverage — **all five tiers (GET → UPDATE → CREATE → APPROVER → ADMIN) complete**. 69 test cases in `subnet_testcoverage.csv`. Remaining follow-ups: force delete/activate preconditions, and the two open defects under `defects/subnet/`.*
