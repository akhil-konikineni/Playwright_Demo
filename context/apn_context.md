# APN Feature — User Stories & Acceptance Criteria

> Jira-ready. One story per permission level, each with Acceptance Criteria covering exactly what the UI shows, hides, enables, and disables — plus the APIs and data rules behind it.
> **Portal:** `https://portal.qan.aws.eseye.io` | **Test account:** `statususer`
> Live-verified: 2026-07-10, with `statususer` having permissions layered on one at a time (flat permissions disabled in DB).

---

## Feature Summary

APN Management lets users view, create, edit, and change the lifecycle status of Access Point Names (APNs), and link them to IP Pools. Access to each action is gated by a separate permission, so what a user can do ranges from pure read-only browsing up to full control over every record regardless of status.

| Item | Value |
|---|---|
| Sidebar path | MNO Management > APNs |
| List page | `/apn/manage-apns` |
| Detail page | `/apn/manage-apns/{apnId}` |
| Breadcrumb (list) | Home > APN > Manage APNs |
| Breadcrumb (detail) | Home > APN > Manage APNs > {apnId} |
| Page heading | APNs |

---

## Background — Status Model

Every APN sits in one of four statuses: `setup` · `requested` · `active` · `deleted`. Which permission a user holds determines which of these transitions they can trigger:

| From | To | Who can do it |
|---|---|---|
| Setup | Setup | Update or Create permission |
| Setup | Requested | Update permission |
| Setup | Active | Approver or Admin permission |
| Setup | Deleted | Create or Update permission |
| Requested | Setup | Update permission |
| Requested | Requested | Update permission |
| Requested | Active | Approver or Admin permission |
| Requested | Deleted | Update permission |
| Deleted | Setup | Update permission |
| Deleted | Requested | Update permission |
| Deleted | Active | Approver or Admin permission |
| Deleted | Deleted | Update permission |
| Active | Setup | Admin permission only |
| Active | Requested | Admin permission only |
| Active | Active | Admin permission only |
| Active | Deleted | Admin permission only |

Every transition, from either the list page or the detail page, opens a confirmation dialog before it's applied:

- Dialog body reads: *Are you sure you want to change the status from "{fromStatus}" to "{toStatus}"?* — status names render lowercase.
- Clicking the backdrop does **not** dismiss the dialog — only Cancel, the × close icon, or the confirm button do.
- The confirm button is labelled **Request** (→ requested), **Delete** (→ deleted), **Approve** (→ active), or **Set Up** (→ setup).
- On success, a toast reads: *Status changed to "{targetStatus}"* and auto-dismisses.
- The **same transition is labelled differently depending on where you trigger it**: the list page's Actions dropdown uses "Delete / Request / Set Up / Approve", while the detail page's Change Status dropdown uses "Set to Deleted / Set to Requested / Set to Setup / Set to Active". Any option that results in `deleted` is styled red; everything else is plain black text.

**Blocked transitions:** a transition can be attempted and confirmed, but still rejected by the system if:
- Any mandatory APN field is `NULL` — blocks Requested → Active.
- An active ProviderTariff, Package, or IPPool still references the APN — blocks any status → Deleted.

The exact error presentation (toast vs inline) for these blocks hasn't been live-verified yet — treat them as expected business rules to test against, not confirmed copy.

---

## Story 1 — View APNs (read-only)

**As a** user with the APN "Get" permission,
**I want** to browse, search, filter, sort, and open any APN,
**so that** I can review APN data without any risk of changing it.

### Acceptance Criteria

- Toolbar shows Search (placeholder "Search APN by name...", filters by `name`), Add filter, Clear all, and Configure visible columns — all usable. There is **no "Add APN" button**.
- The list grid shows 7 columns: APN ID (link to detail page) · Title · APN Name · APN Reference (may be blank — it's optional) · MNO (link to the MNO's own detail page) · Status (colour-coded badge) · Actions. There is no row-selection checkbox column.
- The per-row **Actions button is visible but disabled** — greyed out (50% opacity), not clickable, and opens no dropdown.
- Pagination is server-side: 50 records per page, ~9 pages across ~450 test APNs. First/Previous are disabled on page 1; Next/Last are enabled once more pages exist.
- Add filter opens a right-hand slide-over with two collapsible sections:
  - *Primary filters:* Status (multi-select: active/deleted/requested/setup, with Select all/Clear all), APN Ref, Title, Name, APN ID (all free-text except Status).
  - *Secondary filters:* MNO (searchable dropdown of MNO titles).
  - Footer: Reset · Apply · Close.
- Configure visible columns opens a "Search Results View" dialog with a saved "Default View" preset (Load & Apply / Delete) and checkboxes for all 6 data columns (Select All / Deselect All available); footer: Cancel · Apply · Save · Close.
- Opening an APN's detail page shows: APN ID, Title, and status badge in the header; Name, Title, MNO (as "MNO Title (mnoId)"), and APN Ref in the Standard Fields card; any active attributes (or "This item has no defined attributes") in the Attributes card; and a collapsed-by-default "Related IP Pools" accordion listing linked IP Pool ID (link) and Title.
- On the detail page, **every mutating control is completely absent** (not just disabled): no Change Status, no Edit on either card, no Link IP Pool button, and no Actions column in the Related IP Pools grid.
- Clicking an APN ID cell navigates to that APN's own detail page; clicking an MNO cell navigates away, to that MNO's detail page instead.

---

## Story 2 — Edit APNs and manage their lifecycle (Update)

**As a** user with the APN "Update" permission,
**I want** to edit an APN's fields and attributes, link or unlink its IP Pools, and move it between statuses,
**so that** I can keep APN records accurate and current — for every status except `active`, which stays locked to me.

### Acceptance Criteria

- The list page's Actions button becomes **enabled** for `setup`, `requested`, and `deleted` rows, offering:
  - `setup` → Delete · Request
  - `requested` → Delete · Set Up
  - `deleted` → Request · Set Up
  - `active` → the button **stays disabled** — I cannot act on active APNs with this permission alone.
- On the detail page, a **Change Status** button appears on the header card, but only when at least one transition is available to me from the current status — it is absent for `active` APNs. "Set to Deleted" is styled red; other options are plain text.
- **Edit (Standard Fields)** is visible on the detail page regardless of status — including `active`. It opens an "Edit APN" modal pre-filled with Name*, Title*, MNO* (searchable, clearable combobox), and APN Ref (optional). Footer: Cancel · Submit.
- **Edit (Attributes)** is also visible regardless of status. It opens an "Edit APN Attributes" modal where I can select from the standard attributes — Alias, Max Session Time, Username Overwrite — or add a free-text custom attribute via "+ Add custom attribute". Footer: Cancel · Submit.
- A **"+ Link IP Pool"** button appears in the Related IP Pools section header, and each linked row gains a delete/unlink icon. The "Link IP Pool" dialog has a single searchable IP Pool combobox and an Add button (no Cancel — use the × icon to back out).
- **Note:** Edit is available for `active` APNs even though Change Status is not — the two controls are gated independently. Don't assume "active is locked" applies uniformly across the whole detail page.
- **Note:** an APN must already have a Configuration mapped to it before "Link IP Pool" can be used — without one, linking is blocked regardless of permission.

---

## Story 3 — Create a new APN

**As a** user with the APN "Create" permission,
**I want** a dedicated form to create a brand-new APN,
**so that** I can add records without needing broader edit access.

### Acceptance Criteria

- A **"+ Create APN"** button appears at the top-right of the list toolbar (dark/primary styling). It is completely absent without this permission.
- The "Create APN" modal is a 2×2 grid:
  - MNO* — searchable combobox ("Select item...", tooltip "MNO Id"), populated from active MNOs only, clearable once selected.
  - APN Ref — optional text (tooltip "External APN Reference").
  - Title* — text (tooltip "APN title").
  - Name* — text (tooltip "APN name").
- **Submit stays disabled** until MNO, Title, and Name all have values; APN Ref is optional and never blocks Submit.
- Footer: Cancel (always enabled) · Submit (enabled only once required fields are valid) · × close (same effect as Cancel).
- Creating an APN does not add anything new to the detail page or change any Actions-dropdown behaviour — those follow the Update permission's rules exactly.

---

## Story 4 — Approve APNs into service

**As a** user with the APN "Approver" permission,
**I want** to move a `setup`, `requested`, or `deleted` APN directly to `active`,
**so that** I can put a fully-configured APN into live service — the one transition Update alone can't reach.

### Acceptance Criteria

- The list page's Actions dropdown gains an **Approve** option (plain black text, not destructive) for `setup`, `requested`, and `deleted` rows:
  - `setup` → Delete · **Approve** · Request
  - `requested` → Delete · **Approve** · Set Up
  - `deleted` → **Approve** · Request · Set Up
  - `active` → the button remains disabled, same as without Approver.
- The detail page's Change Status dropdown gains a matching **Set to Active** option for the same three statuses, also plain black text — still absent for `active` APNs.
- **Note:** "Approve" (list) and "Set to Active" (detail) trigger the identical transition to `active` — only the label differs by surface.
- **Note:** this unlocks `deleted → active` directly, not just `requested → active` — all three non-active statuses can go straight to active.

---

## Story 5 — Full control over active APNs

**As a** user with the APN "Admin" permission,
**I want** to change the status of `active` APNs (not just create/edit/approve everything else),
**so that** nothing in the APN lifecycle is permanently locked to me.

### Acceptance Criteria

- The list page's Actions button for `active` rows becomes **enabled**, offering Delete (red) · Request · Set Up. `setup`/`requested`/`deleted` rows are unchanged from Approver-level behaviour.
- The detail page for an `active` APN now shows a **Change Status** button (absent at every lower permission level), offering Set to Deleted (red) · Set to Requested · Set to Setup.
- Nothing else changes — Admin adds no new toolbar button and no new element beyond unlocking `active → *` in these two places.
- **Note:** there is no separate "Delete" permission for APN — Get, Update, Create, Approver, and Admin are the complete permission set.

---

## Reference Data

Supporting facts used across the stories above — API endpoints, field rules, and the exact data shape — kept together here rather than repeated in each story.

### Field Definitions

| Field | Type | Format rule | Max length | Notes |
|---|---|---|---|---|
| `apnId` | integer | `^\d{1,21}$` | – | Mandatory, unique, read-only after creation |
| `name` | string | no newlines | 128 | Mandatory; **unique within the selected MNO**, not globally |
| `title` | string | no spaces (`^\S{1,32}$`) | 32 | Mandatory; **globally unique** across all APNs |
| `mnoId` | integer | `^\d{1,21}$` | – | Mandatory; must reference an active MNO |
| `apnRef` | string | digits only (`^\d{0,10}$`) | 10 | Optional; **unique within the selected MNO** |
| `status` | string | `setup / requested / active / deleted` | 9 | Mandatory, read-only — changed only via status transitions |

**Two field-validation quirks worth testing explicitly:**
1. `name` and `apnRef` can't be format-checked until MNO is selected (their uniqueness depends on it) — trying to edit either first shows: *"MNO ID must be filled in first"*.
2. An invalid `title` shows the raw regex as the error text: `^\S{1,32}$` — i.e. spaces in the title fail validation, and the error message isn't a friendly sentence.

**Standard attributes** (all string, max 32 chars): Alias (`alias`), Max Session Time (`maxSessionTime`), Username Overwrite (`usernameOverwrite`). Free-text custom attribute keys are also supported.

### API Endpoints

| Method | Endpoint | Fires on |
|---|---|---|
| GET | `.../v2/apn?pageToken={n}&pageSize=50&getPageCount=true&enrich=title` | List page load |
| GET | `.../v2/apn/{apnId}?enrich=title` | Detail page load |
| GET | `.../v2/apn/{apnId}/attribute?status=active` | Detail page load |
| GET | `.../v2/apn/definition?enrich=title` | List + detail load |
| GET | `.../v2/mno?status=active&pageSize=50` | Opening Create APN modal, or the MNO field in Edit |
| GET | `.../v2/ipPool/definition?enrich=title&status=active` | Opening Link IP Pool dialog |
| POST | `.../v2/apn` | Submitting Create APN — body: `{ mnoId, title, name, apnRef? }` |
| PUT/PATCH | `.../v2/apn/{apnId}` | Submitting Edit, or confirming a status change |
| PUT/PATCH | `.../v2/apn/{apnId}/attribute` | Submitting Edit Attributes |
| POST | `.../v2/apn/{apnId}/ipPool` | Confirming Link IP Pool |
| DELETE | `.../v2/apn/{apnId}/ipPool/{ipPoolId}` | Unlinking an IP Pool |

All dropdowns sourcing MNO or IP Pool options only ever show `status=active` records — inactive/deleted ones must never appear as selectable.

### APN Record Shape

```json
{
  "apnId": 1722,
  "name": "qaapnname0708a",
  "title": "qaapntitle0708a",
  "mnoId": 8944310594,
  "apnRef": "1234567890",
  "status": "requested",
  "mnoTitle": "xxxxx",
  "ipPool": [{ "ipPoolId": 355, "ipPoolTitle": "test12" }],
  "attribute": [
    { "apnAttributeId": 229, "apnId": 1722, "attribute": "alias", "value": "abc", "status": "active" }
  ]
}
```

`ipPool` and `attribute` are optional arrays, absent entirely when there's nothing to show.

---

*End of APN feature context.*
