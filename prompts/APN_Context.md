# APN Feature — UI Context

> **Living document.** One section per permission level, added as each is enabled and explored live.
> **Portal**: `https://portal.qan.aws.eseye.io` | **Test account**: `statususer`
>
> **How to use:** Agents generating test cases for APN must load this file. Each permission-level section documents exactly what the UI shows and hides, what buttons are enabled vs. absent, and which APIs fire.

---

## Feature Overview

| Item | Value |
|---|---|
| Sidebar path | MNO Management → APNs |
| List URL | `/apn/manage-apns` |
| Detail URL | `/apn/manage-apns/{apnId}` |
| Breadcrumb (list) | Home > APN > Manage APNs |
| Breadcrumb (detail) | Home > APN > Manage APNs > {apnId} |
| Page H1 | APNs |

---

## Permission Level: `capabilityApnGet`

> Explored: 2026-07-10 with `statususer` having **only** `capabilityApnGet` enabled (flat permissions disabled in DB).

---

### List Page — Toolbar

| Control | Visible | Enabled | Notes |
|---|---|---|---|
| Search bar | yes | yes | Placeholder: "Search APN by name..." — filters by APN `name` field |
| Add filter | yes | yes | Opens filter slide-over panel |
| Clear all | yes | yes | Clears active filter selections |
| Configure visible columns | yes | yes | Opens column preset modal (grid icon button, `aria-label="Configure visible columns"`) |
| **Add APN** | **no** | — | Absent entirely — requires `capabilityApnCreate` |

---

### List Page — Grid

**Columns** (7 total):

| Column | Sortable | Cell behaviour |
|---|---|---|
| APN ID | yes | `<a>` link → navigates to `/apn/manage-apns/{apnId}` |
| Title | yes | plain text |
| APN Name | yes | plain text |
| APN Reference | yes | plain text |
| MNO | yes | `<a>` link → navigates to MNO detail page |
| Status | yes | status badge (colour-coded) |
| Actions | — | `button[aria-label="Actions"]` — **disabled** (`disabled=true`, `opacity: 0.5`, `pointer-events: none`) — no dropdown opens |

- No checkbox column — no bulk row selection.
- APN Reference column may be empty for some records (field is optional).

---

### List Page — Pagination

| Control | State on page 1 |
|---|---|
| Page size button (`50`) | enabled |
| First page | disabled |
| Previous page | disabled |
| Page 1 (current) | `aria-current="page"` |
| Page 2–5 | enabled |
| Next page | enabled |
| Last page | enabled |

- **Server-side pagination** — NOT an all-records-in-one-load.
- Default page size: 50. API param: `pageToken=0&pageSize=50&getPageCount=true`.
- Test data: 9 pages (~450 APNs).

---

### List Page — Status Values

`setup · requested · active · deleted`

---

### List Page — Filter Panel

Triggered by "Add filter". Slides in from the right (`data-slot="sheet-content"`).

**Panel layout:**

| Section | Field | Type | Placeholder / Options |
|---|---|---|---|
| (header) | Search filters | text | "Search filters…" — searches within the filter field list |
| Primary Filters | STATUS | multi-select dropdown (Radix menu) | Options: `active · deleted · requested · setup`; has "Select all / Clear all" toggle |
| Primary Filters | APN REF | text input | "Filter by APN Ref..." |
| Primary Filters | TITLE | text input | "Filter by Title..." |
| Primary Filters | NAME | text input | "Filter by Name..." |
| Primary Filters | APN ID | text input | "Filter by APN ID..." |
| Secondary Filters | MNO | combobox dropdown | "Select item..." — populated with MNO titles |

Both "Primary Filters" and "Secondary Filters" are collapsible accordion sections.

**Footer buttons:** Reset · Apply · Close

---

### List Page — Column Preset (Search Results View)

Opened via the Configure visible columns icon button. Renders as a `[role="dialog"]` modal.

| Element | Detail |
|---|---|
| Dialog title | "Search Results View" |
| Saved presets | "Default View" — with "Load & Apply" and "Delete" buttons |
| Output Columns | Select All / Deselect All; checkboxes: APN ID · Title · APN Name · APN Reference · MNO · Status |
| Footer | Cancel · Apply · Save · Close |

---

### Detail Page — Layout

URL: `/apn/manage-apns/{apnId}`

#### Header card

| Element | With `capabilityApnGet` |
|---|---|
| APN ID | visible (read-only) |
| APN Title | visible (read-only) |
| Status badge | visible — colour-coded (e.g. `requested` = amber/orange badge) |
| Change Status button | **absent** — not rendered |

#### Standard Fields card

| Element | With `capabilityApnGet` |
|---|---|
| Edit button | **absent** — not rendered |
| Name | visible (read-only) |
| Title | visible (read-only) |
| MNO ID | visible as "MNO Title (mnoId)" (read-only) |
| APN Ref | visible (read-only) |

#### Attributes card

| Element | With `capabilityApnGet` |
|---|---|
| Edit button | **absent** — not rendered |
| DEFINED ATTRIBUTES | visible — lists active attribute key/value pairs, or "This item has no defined attributes" if none |

Attribute keys in test data: `alias`, `maxSessionTime`, `usernameOverwrite`, and free-text custom keys.

#### Related IP Pools section (collapsible accordion)

| Element | With `capabilityApnGet` |
|---|---|
| Section header | visible — "Related IP Pools" + collapse toggle (chevron) |
| Link IP Pool button | **absent** — not rendered |
| Grid: IP Pool ID | visible — sortable, `<a>` link to IP Pool detail page |
| Grid: IP Pool Title | visible — sortable, plain text |
| Grid: Actions column | **absent** — no delete/unlink icon |

Section is **collapsed by default**; user must click the header to expand.

---

### Detail Page — All Visible Buttons Summary (Get-only)

| Button | Present | Enabled |
|---|---|---|
| Change Status | no | — |
| Edit (Standard Fields) | no | — |
| Edit (Attributes) | no | — |
| Link IP Pool | no | — |
| Related IP Pools accordion toggle | yes | yes |

**The detail page is fully read-only with `capabilityApnGet`.**

---

### API Endpoints

All calls use `Bearer` token from Cognito in `Authorization` header.

| Method | Endpoint | Triggered by | Response shape |
|---|---|---|---|
| GET | `https://mno.api.qan.eseye.io/v2/apn?pageToken={n}&pageSize=50&getPageCount=true&enrich=title` | list page load | `{ pageToken, nextPageToken, requestedPageSize, itemCount, pageCount, item[] }` |
| GET | `https://mno.api.qan.eseye.io/v2/apn/{apnId}?enrich=title` | detail page load | single APN object |
| GET | `https://mno.api.qan.eseye.io/v2/apn/{apnId}/attribute?status=active` | detail page load | active attributes for the APN |
| GET | `https://common.api.qan.eseye.io/v2/apn/definition?enrich=title` | list + detail load | field validation rules + attribute definitions |
| GET | `https://meta.api.qan.eseye.io/v2/apn/option?option=status` | list page load | status enum values |
| GET | `https://common.api.qan.eseye.io/v2/statusTransition?resourceName=apn&status=active&pageSize=200` | list page load | all valid status transitions |
| GET | `https://common.api.qan.eseye.io/v2/resource?name=apn` | detail page load | resource metadata |
| GET | `https://common.api.qan.eseye.io/v2/resource?resourceId=89` | detail page load | resource config |
| GET | `https://common.api.qan.eseye.io/v2/resourceRelationship?destinationResourceId=5&relationship=configuration` | detail page load | relationship config |

#### APN list item shape

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

`ipPool` and `attribute` are optional arrays — absent when empty.

---

### Field Definitions (from `GET /v2/apn/definition`)

| Attribute | Type | Regex | Max length | Flags |
|---|---|---|---|---|
| apnId | integer | `^\d{1,21}$` | — | mandatory, unique; write: forbidden |
| name | string | `^[^\n]{1,128}$` | 128 | mandatory |
| title | string | `^\S{1,32}$` (no spaces allowed) | 32 | mandatory, unique |
| mnoId | integer | `^\d{1,21}$` | — | mandatory, resource ref (mno.mnoId) |
| apnRef | string | `^\d{0,10}$` | 10 | optional |
| status | string | `^(?:setup\|requested\|active\|deleted)$` | 9 | mandatory, resource ref; write: forbidden |

**Standard attribute definitions** (`attributeDefinition` array):

| Attribute | Type | Max length |
|---|---|---|
| alias | string | 32 |
| maxSessionTime | string | 32 |
| usernameOverwrite | string | 32 |

Custom attribute keys (free-text) are also supported.

---

### Status Transition Matrix (from `GET /v2/statusTransition`)

| From | To | Required permission |
|---|---|---|
| setup | setup | apnUpdate or apnCreate |
| setup | requested | apnUpdate |
| setup | active | apnApprover or apnAdmin |
| setup | deleted | apnCreate or apnUpdate |
| requested | setup | apnUpdate |
| requested | requested | apnUpdate |
| requested | active | apnApprover or apnAdmin |
| requested | deleted | apnUpdate |
| active | setup | apnAdmin |
| active | requested | apnAdmin |
| active | active | apnAdmin |
| active | deleted | apnAdmin |
| deleted | setup | apnUpdate |
| deleted | requested | apnUpdate |
| deleted | active | apnApprover or apnAdmin |
| deleted | deleted | apnUpdate |

---

### Key Behavioural Rules — `capabilityApnGet`

1. **No Create** — "Add APN" button does not appear in the toolbar.
2. **Actions button disabled** — The per-row Actions button (`button[aria-label="Actions"]`) is rendered with `disabled=true`, `opacity: 0.5`, `pointer-events: none`. No dropdown opens. This is the correct Get-only state.
3. **Detail page is read-only** — Change Status, Edit (Standard Fields), Edit (Attributes), Link IP Pool buttons are all **absent** (not rendered, not just greyed out).
4. **Related IP Pools grid read-only** — Accordion section is present and expandable, but has no Actions column and no Link IP Pool button.
5. **MNO cell navigates away** — Clicking the MNO value in the grid navigates to the MNO detail page.
6. **APN ID cell navigates to detail** — Clicking the APN ID navigates to `/apn/manage-apns/{apnId}`.
7. **Pagination is required** — Large datasets span multiple pages. Tests must pass `pageToken` to navigate pages.

---

## Permission Level: `capabilityApnUpdate`

> Explored: 2026-07-10 with `statususer` having `capabilityApnGet` + `capabilityApnUpdate` enabled.
> All observations below are **additive** — everything from the Get-only section still applies.

---

### List Page — Actions Dropdown (Update adds)

The per-row `button[aria-label="Actions"]` is now **enabled** for `setup`, `requested`, and `deleted` statuses. It remains **disabled** (opacity 0.5) for `active` status.

| Row status | Button state | Dropdown options |
|---|---|---|
| setup | enabled | Delete · Request |
| requested | enabled | Delete · Set Up |
| deleted | enabled | Request · Set Up |
| active | **disabled** | — |

Option label mapping to status transitions:
- **Delete** → sets status to `deleted`
- **Request** → sets status to `requested`
- **Set Up** → sets status to `setup`
- **Approve** → NOT shown (requires `capabilityApnApprover`)

---

### Detail Page — Changes with `capabilityApnUpdate`

#### Header card — Change Status button

The "Change Status" button **appears only when `apnUpdate` has valid transitions for the current status**.

| APN status | Change Status button | Options shown |
|---|---|---|
| setup | visible | Set to Deleted · Set to Requested |
| requested | visible | Set to Deleted · Set to Setup |
| deleted | visible | Set to Requested · Set to Setup |
| active | **absent** | — (apnUpdate has no transitions from active) |

"Set to Deleted" option is styled in **red** (destructive colour). All other options use default text colour.

#### Standard Fields card — Edit button

**Edit button now visible.** Opens the **"Edit APN" modal**:

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | text input | yes (*) | Pre-populated with current value |
| Title | text input | yes (*) | Pre-populated with current value |
| MNO | combobox (searchable) | yes (*) | Pre-populated; has ✕ clear + ▼ expand |
| APN Ref | text input | no | Pre-populated with current value |

Modal footer: **Cancel** · **Submit**

#### Attributes card — Edit button

**Edit button now visible.** Opens the **"Edit APN Attributes" modal**:

| Section | Control | Options |
|---|---|---|
| Defined Attributes | "Select attribute" dropdown | Alias (alias) · Max Session Time (maxSessionTime) · Username Overwrite (usernameOverwrite) |
| Custom Attributes | "+ Add custom attribute" button | Opens free-text key + value inputs |

Modal footer: **Cancel** · **Submit**

When an APN has existing attributes, the Attributes card read-view shows them as labelled key/value pairs (e.g. Username Overwrite, Alias, Max Session Time with their current values).

#### Related IP Pools section — Changes with Update

| Element | With `capabilityApnUpdate` |
|---|---|
| Link IP Pool button | **visible** — navy "+ Link IP Pool" button in section header |
| Actions column | **visible** — trash/delete icon per row |
| IP Pool ID | link (unchanged) |
| IP Pool Title | plain text (unchanged) |

**Link IP Pool dialog** (opened via "+ Link IP Pool" button):
- Title: "Link IP Pool"
- Field: IP Pool — searchable combobox ("Search IP Pools...") with dropdown arrow
- Footer: **Add** button (no Cancel — use × close icon)

---

### Detail Page — All Visible Buttons Summary (Get + Update)

| Button | Present for active APN | Present for setup/requested/deleted APN |
|---|---|---|
| Change Status | no | yes |
| Edit (Standard Fields) | yes | yes |
| Edit (Attributes) | yes | yes |
| Link IP Pool | yes | yes |
| Related IP Pools accordion toggle | yes | yes |
| Delete icon in IP Pools grid | yes (per row) | yes (per row) |

---

### Additional API Endpoints (observed with `capabilityApnUpdate`)

| Method | Endpoint | Triggered by |
|---|---|---|
| GET | `https://common.api.qan.eseye.io/v2/ipPool/definition?enrich=title&status=active` | Opening "Link IP Pool" dialog |

**Mutation endpoints** (inferred from REST pattern — fire on form Submit/confirm):

| Method | Endpoint | Operation |
|---|---|---|
| PUT/PATCH | `https://mno.api.qan.eseye.io/v2/apn/{apnId}` | Edit Standard Fields (name, title, mnoId, apnRef) |
| PUT/PATCH | `https://mno.api.qan.eseye.io/v2/apn/{apnId}` | Change Status (status field update) |
| PUT/PATCH | `https://mno.api.qan.eseye.io/v2/apn/{apnId}/attribute` | Edit Attributes (add/update defined or custom attributes) |
| POST | `https://mno.api.qan.eseye.io/v2/apn/{apnId}/ipPool` | Link an IP Pool |
| DELETE | `https://mno.api.qan.eseye.io/v2/apn/{apnId}/ipPool/{ipPoolId}` | Unlink/delete an IP Pool |

---

### Key Behavioural Rules — `capabilityApnUpdate`

1. **`active` rows remain locked** — the Actions dropdown stays disabled on the list page; Change Status is absent on the detail page. Only `apnAdmin` can transition from `active`.
2. **Change Status visibility is status-dependent** — the button only renders when `apnUpdate` has at least one valid transition from the current status.
3. **Dropdown labels differ between list and detail** — list page uses "Delete"/"Request"/"Set Up"; detail page Change Status uses "Set to Deleted"/"Set to Requested"/"Set to Setup".
4. **"Set to Deleted" is styled destructive (red)** on the Change Status dropdown.
5. **Edit buttons always present regardless of APN status** — editing standard fields and attributes is always allowed for any non-active status, and even for active APNs (Edit is shown for active too).
6. **Link IP Pool and unlink are available for all APN statuses** (not status-restricted at UI level with Update permission).
7. **A Configuration must be mapped to the APN before IP Pools can be linked** — the APN object must have a Configuration associated with it as a prerequisite for the "Link IP Pool" action on the detail page. Without a mapped Configuration, IP Pool linking is blocked.

---

## Permission Level: `capabilityApnCreate`

> Explored: 2026-07-10 with `statususer` having `capabilityApnGet` + `capabilityApnUpdate` + `capabilityApnCreate` enabled.
> All observations below are **additive** — everything from Get and Update sections still applies.

---

### List Page — Toolbar (Create adds)

| Control | Visible | Enabled | Notes |
|---|---|---|---|
| **Create APN** | **yes** | **yes** | `+ Create APN` button — dark/primary style, top-right of toolbar. Absent without this permission. |

---

### Create APN Modal

Clicking "+ Create APN" opens a `[role="dialog"]` modal.

**Modal title:** "Create APN"

**Form layout — 2-column grid, 2 rows:**

| Position | Field | Type | Required | Tooltip text |
|---|---|---|---|---|
| Row 1 Left | MNO | searchable combobox | yes (*) | "MNO Id" |
| Row 1 Right | APN Ref | text input | no | "External APN Reference" |
| Row 2 Left | Title | text input | yes (*) | "APN title" |
| Row 2 Right | Name | text input | yes (*) | "APN name" |

**MNO combobox behaviour:**
- Placeholder text: "Select item..."
- Searchable: yes — search input appears at top of dropdown ("Search...")
- Populated by: `GET https://mno.api.qan.eseye.io/v2/mno?status=active&pageSize=50` (active MNOs only)
- When value is selected: ✕ clear button appears inside the combobox control
- Test data contains 15 MNO options: edstitle, xxxxx, demomno09, Atestcreate, AtitleXDAAAA, TestMNO-12, newmnofortest, newmno12389, mnodemo23454, DEMO286372684, mnodemo123, mno123456, trfd, MNOfortesting, newtitlemno

**Submit button state:**
- **Disabled** when form is first opened (all fields empty)
- **Enabled** only when all three required fields (MNO + Title + Name) have values
- APN Ref is optional — Submit enables without it

**Footer buttons:**

| Button | Always enabled | Notes |
|---|---|---|
| Cancel | yes | Closes modal, discards input |
| Submit | no | Enabled only when required fields filled |
| Close (×) | yes | Top-right icon, same as Cancel |

---

### List Page — Actions Column (no change from Update)

Actions button enabled/disabled state is unchanged with Create permission:
- `setup`, `requested`, `deleted` → enabled
- `active` → disabled

No new dropdown options appear — the status transitions that `apnCreate` permits (`setup→setup`, `setup→deleted`) are already covered by `apnUpdate`.

---

### Detail Page — No Changes with Create

Create permission adds nothing to the detail page. All buttons present/absent follow the same rules as `capabilityApnUpdate`.

---

### Additional API Endpoints (observed with `capabilityApnCreate`)

| Method | Endpoint | Triggered by |
|---|---|---|
| GET | `https://mno.api.qan.eseye.io/v2/mno?status=active&pageSize=50` | Opening "Create APN" modal — populates MNO combobox |

**Mutation endpoint** (inferred from REST pattern — fires on form Submit):

| Method | Endpoint | Request body fields |
|---|---|---|
| POST | `https://mno.api.qan.eseye.io/v2/apn` | `{ mnoId, title, name, apnRef? }` |

---

### Key Behavioural Rules — `capabilityApnCreate`

1. **"+ Create APN" button only appears with this permission** — it is fully absent with Get or Get+Update only.
2. **MNO dropdown only shows active MNOs** — inactive/deleted MNOs are excluded from the create form.
3. **Submit stays disabled until MNO + Title + Name are all filled** — APN Ref is optional and does not block submit.
4. **No new detail-page elements** — Create is a list-level action only; existing record pages are unchanged.
5. **Status transition overlap with Update** — `apnCreate` permits `setup→setup` and `setup→deleted`, but these are already available via `apnUpdate`. No visible UI difference in the Actions dropdown when both are active.

---


## Permission Level: `capabilityApnApprover`

> Explored: 2026-07-10 with `statususer` having `capabilityApnGet` + `capabilityApnUpdate` + `capabilityApnCreate` + `capabilityApnApprover` enabled.
> All observations below are **additive** — everything from Get, Update, and Create sections still applies.

---

### List Page — Actions Dropdown Changes (Approver adds "Approve")

Approver adds an **"Approve"** menu item to the Actions dropdown for `setup`, `requested`, and `deleted` APNs. The `active` Actions button remains disabled (unchanged).

| Status | Without Approver (Update only) | With Approver (additive) |
|---|---|---|
| `setup` | Delete (red) · Request | Delete (red) · **Approve** · Request |
| `requested` | Delete (red) · Set Up | Delete (red) · **Approve** · Set Up |
| `deleted` | Request · Set Up | **Approve** · Request · Set Up |
| `active` | (button disabled) | (button disabled — no change) |

**"Approve" item styling:** `data-variant: default` — standard black text (not destructive/red).

**"Approve" item position:**
- `setup` → second (between Delete and Request)
- `requested` → second (between Delete and Set Up)
- `deleted` → first

---

### Detail Page — Change Status Dropdown Changes (Approver adds "Set to Active")

On the detail page, the "Change Status" dropdown gains a **"Set to Active"** option for `setup`, `requested`, and `deleted` APNs.

| Status | Without Approver | With Approver |
|---|---|---|
| `setup` | Set to Deleted (red) · Set to Requested | Set to Deleted (red) · **Set to Active** · Set to Requested |
| `requested` | Set to Deleted (red) · Set to Setup | Set to Deleted (red) · **Set to Active** · Set to Setup |
| `deleted` | Set to Requested · Set to Setup | **Set to Active** · Set to Requested · Set to Setup |
| `active` | Change Status button absent | Change Status button absent (no change) |

**"Set to Active" styling:** standard black — not destructive.

**Note on naming:** "Approve" (list Actions dropdown) and "Set to Active" (detail page Change Status) are the same transition — both move the APN to `active` status. The label differs between the two surfaces.

---

### Toolbar — No Change

No new toolbar buttons with Approver. "+ Create APN" remains the only toolbar action (from Create permission).

---

### Key Behavioural Rules — `capabilityApnApprover`

1. **"Approve" / "Set to Active" is the approval action** — transitions an APN from `setup`, `requested`, or `deleted` → `active`.
2. **`active` APNs remain fully locked** — Actions button disabled in list; Change Status absent on detail page. No transitions out of `active` are available to Approver (or any other non-admin permission).
3. **Naming differs by surface** — the list dropdown calls it "Approve"; the detail page calls it "Set to Active". Both perform the same state change.
4. **"Set to Active" is always black (non-destructive)** — approval is a positive action; only destructive transitions (Delete, Set to Deleted) use red styling.
5. **Approver unlocks `deleted → active`** — not just `requested → active`. All three non-active statuses can be directly approved to active.
6. **Approver is additive to Update** — the Delete and status-change options from Update remain present; Approve/Set to Active appears alongside them.

---

## Permission Level: `capabilityApnAdmin`

> Explored: 2026-07-10 with `statususer` having `capabilityApnGet` + `capabilityApnUpdate` + `capabilityApnCreate` + `capabilityApnApprover` + `capabilityApnAdmin` enabled.
> All observations below are **additive** — everything from Get, Update, Create, and Approver sections still applies.
> Note: There is no `capabilityApnDelete` permission for APN. The full permission set is: Get · Update · Create · Approver · Admin.

---

### List Page — Actions Column (Admin unlocks `active`)

Admin's sole change to the list page: the **`active` APN Actions button is now enabled** (was `disabled=true` for all previous permission levels).

| Status | Before Admin | With Admin |
|---|---|---|
| `setup` | enabled (Delete · Approve · Request) | enabled — **no change** |
| `requested` | enabled (Delete · Approve · Set Up) | enabled — **no change** |
| `deleted` | enabled (Approve · Request · Set Up) | enabled — **no change** |
| `active` | **disabled** | **enabled → Delete (red) · Request · Set Up** |

**`active` Actions dropdown options:**

| Option | Style | Transition |
|---|---|---|
| Delete | red (destructive) | `active → deleted` |
| Request | black (default) | `active → requested` |
| Set Up | black (default) | `active → setup` |

---

### Detail Page — `active` APN Changes with Admin

Previously `active` APN detail pages showed only Edit + Edit (Attributes). Admin adds **"Change Status"** to the header card.

**`active` APN detail page buttons (with Admin):**

| Button | Location | Present | Notes |
|---|---|---|---|
| Change Status | header card (top-right) | **yes — new** | Absent in all prior permission levels |
| Edit (Standard Fields) | Standard Fields card | yes | Unchanged |
| Edit (Attributes) | Attributes card | yes | Unchanged |
| Link IP Pool | Related IP Pools section | yes | Unchanged |

**Change Status dropdown for `active` APNs:**

| Option | Style | Transition |
|---|---|---|
| Set to Deleted | red (destructive) | `active → deleted` |
| Set to Requested | black (default) | `active → requested` |
| Set to Setup | black (default) | `active → setup` |

---

### Detail Page — Other Statuses (no change from Approver)

`setup`, `requested`, and `deleted` detail pages are unchanged by Admin. Their Change Status options remain as documented in the Approver section.

---

### Toolbar — No Change

No new toolbar buttons. "+ Create APN" remains the only toolbar action.

---

### Key Behavioural Rules — `capabilityApnAdmin`

1. **Admin's sole UI addition is unlocking `active` APNs** — both in the list Actions column (button enables) and on the detail page (Change Status appears).
2. **`active` → any status is the Admin-exclusive path** — no other permission level permits transitions out of `active`.
3. **"Delete" for active APNs is red/destructive** — consistent with all other Delete actions across the feature.
4. **"Set to Deleted" on detail page matches "Delete" in list dropdown** — same transition, different surface label (same pattern as Approve / Set to Active).
5. **All prior permissions remain in effect** — Admin does not replace or suppress any options from Update, Create, or Approver; it only adds the `active → *` transitions.

---

## Business Logic & Cross-Cutting Behaviour

> These sections apply across all permission levels. Live-verified on 2026-07-10 with `statususer` having all APN permissions active.

---

### Status Transition Confirmation Dialog, Toast Messages, and Form Unsaved Changes Popup

These three behaviours are identical for APN as for every other module — generic dialog anatomy, confirm-label mapping, toast format, and popup anatomy/behaviour are documented once in `QA_MASTER_CONTEXT.md` §5.3 (Status Change Confirmation Dialog), §5.4 (Status Transition Toast Messages), and §6.9 (Cancel / Unsaved Changes Popup). Load that file for the exact wording and validation rules; do not restate them here.

> APN-specific note (live-verified 2026-07-10): `{fromStatus}`/`{toStatus}` render as lowercase (`"requested"`, `"setup"`, `"active"`, `"deleted"`); clicking the dialog backdrop does NOT dismiss it.

---

### Create / Edit Form Field Validation

**Field dependency — Name and APN Ref:**

The **Name** and **APN Ref** fields cannot be validated for format until an MNO is selected, because uniqueness is scoped to the selected `mnoId`. If Name or APN Ref is modified before the MNO combobox has a value, the inline error reads:

> `MNO ID must be filled in first`

**Title field format validation:**

The Title field is validated independently of MNO selection. If the entered value does not match the required pattern, the inline error shows the raw regex:

> `^\S{1,32}$`

This means: 1–32 non-whitespace characters. A title containing spaces fails this validation.

**Field uniqueness rules (per QA_PIPELINE specification — exact error messages not yet live-verified):**

| Field | Uniqueness scope |
|---|---|
| `name` | Must be unique within the selected `mnoId` |
| `apnRef` | Must be unique within the selected `mnoId` |
| `title` | Must be globally unique across all APNs |

**Dropdown constraints (live-verified):**

- MNO combobox: shows only `status=active` MNOs. API: `GET https://mno.api.qan.eseye.io/v2/mno?status=active&pageSize=50`
- IP Pool combobox (Link IP Pool dialog): shows only `status=active` IP Pools. API: `GET https://common.api.qan.eseye.io/v2/ipPool/definition?enrich=title&status=active`
- **DB cross-verification rule:** options shown in both dropdowns must match only `active` records in the database — tests must query the DB directly to confirm no inactive/deleted MNO or IPPool records appear as selectable options.
- Submit button remains disabled until MNO, Title, and Name are all filled.

---

### Status Transition Preconditions

These preconditions are documented in the QA_PIPELINE specification. The exact error message text and presentation (toast vs. inline banner) have **not yet been live-verified** against the UI — treat these as expected business rules to test against.

| Transition attempted | Blocking condition | Expected result |
|---|---|---|
| `requested → active` (Approve) | Any mandatory APN field is NULL in the database | Error response — transition blocked |
| Any state → `deleted` | An active ProviderTariff references this APN | Error response — transition blocked |
| Any state → `deleted` | An active Package references this APN | Error response — transition blocked |
| Any state → `deleted` | An active IPPool is mapped to this APN | Error response — transition blocked |

When a precondition blocks a transition, the confirmation dialog will have been submitted but the UI is expected to surface an error (likely a toast or inline message). The exact error text needs live verification with appropriately seeded test data.
