# DATA CENTRE — Complete Test Coverage

| Field            | Value                                                              |
|------------------|--------------------------------------------------------------------|
| Feature          | Data Centre                                                        |
| Document Version | 1.0                                                                |
| Coverage Date    | 2026-07-29                                                         |
| Prepared By      | Playwright MCP QA Automation Agent                                 |
| Environment      | https://portal-host.int.aws.eseye.io/auth                         |
| Test User        | OGlobalUser / Password#1                                           |
| DB Schema        | oncilla                                                            |
| Source           | Live UI exploration via Playwright MCP browser automation — 5-tier progressive permission baseline |

---

## 1. Feature Overview

The Data Centre module is accessible via the left navigation under **Network Management → Data Centres**. It allows management of data centre records with full CRUD lifecycle including status transitions (Setup → Requested → Active → Deleted) and an Attributes section for both defined and custom attributes.

- **List Page URL:** `/network-management/data-centres`
- **Detail Page URL:** `/network-management/data-centres/{dataCentreId}`
- **Module Type:** Attribute-eligible

---

## 2. Environment Details

- **API Base URL:** `https://portal-host.int.aws.eseye.io`
- **DB Schema:** `oncilla`
- **Auth Provider:** Session-based login at `/auth`

### APIs Captured (live observation)

| Method | Endpoint |
|--------|----------|
| GET | `/api/permissions` |
| GET | `/api/catalog/userMe/execute` |
| GET | `/api/catalog/objectDefinitions/execute?objectName=dataCentre&status=active` |
| GET | `/api/catalog/dataCentre/execute?pageSize=50&enrich=title&getPageCount=true` |
| GET | `/api/catalog/genericOption/execute?resourceName=dataCentre&option=status` |
| GET | `/api/catalog/statusTransition/execute?resourceName=dataCentre&status=active&pageSize=200` |
| GET | `/api/catalog/dataCentreById/execute?dataCentreId={id}&enrich=title` |
| GET | `/api/catalog/dataCentreAttribute/execute?dataCentreId={id}` |

---

## 3. Test Coverage Summary

| Section | VIEW TCs | FILTER TCs | CREATE TCs | UPDATE TCs | ATTRIBUTE TCs | STATUS TRANSITION TCs | Total |
|---------|----------|------------|------------|------------|---------------|-----------------------|-------|
| Data Centre | 13 | 10 | 12 | 24 | 8 | 32 | 99 |

> **VIEW change note (2026-08-25):** Requirement change — **Deleted records are excluded from the default list** and appear only after applying the Status = Deleted filter. Added S1.13 (IssueId 99); updated the Deleted→* status-transition TCs (S6.5, S6.6, S6.11, S6.22, S6.23, S6.27) to filter Deleted records into view first. Verified live on Integration.

> **UPDATE count note:** Original 10 UPDATE TCs (S4.1–S4.10) + 14 Related IP Pool / Related Portal TCs (S4.11–S4.24) added 2026-08-25 from live UI exploration of the detail-page Add/Remove IP Pool and Add/Remove Portal flows (verified end-to-end on DataCentre 92 as OGlobalUser).

---

## 4. Module Discovery Report

```
MODULE NAME        : Data Centre
CAPABILITY PREFIX  : capabilityDataCentre (Get/Create/Update/Approver/Admin)
MODULE PLURAL      : Data Centres
MENU PATH          : Network Management → Data Centres
PRIMARY KEY FIELD  : dataCentreId (displayed as "Data Centre Id" in grid; hyperlink to detail page)
FOREIGN KEY FIELDS : Country Code → links to Country data (ID - Code format, e.g. "250 - XK")
TEXT FIELDS        : Name — mandatory
                     Title — mandatory, max 8 chars, no spaces (regex: ^[^\s]{1,8}$)
                     Data Centre Ref — optional
                     Subdomain — optional (unique per DataCentre)
DROPDOWN FIELDS    : Country Code Id → countryCode API endpoint (mandatory, format: "ID - Code")
TABLE HEADERS      : Data Centre Id, Name, Title, Data Centre Ref, Subdomain, Country Code, Status, Actions
FILTER FIELDS      : Status, Subdomain, Data Centre Ref, Title, Name, Data Centre Id, Country Code
STATUS VALUES      : Setup, Requested, Active, Deleted
CRUD AVAILABLE     : Create / Read / Update / Delete (via status transitions)
ATTRIBUTE SECTION  : yes

APIs CAPTURED      :
  GET /api/permissions
  GET /api/catalog/userMe/execute
  GET /api/catalog/objectDefinitions/execute?objectName=dataCentre&status=active
  GET /api/catalog/dataCentre/execute?pageSize=50&enrich=title&getPageCount=true
  GET /api/catalog/genericOption/execute?resourceName=dataCentre&option=status
  GET /api/catalog/statusTransition/execute?resourceName=dataCentre&status=active&pageSize=200
  GET /api/catalog/dataCentreById/execute?dataCentreId={id}&enrich=title
  GET /api/catalog/dataCentreAttribute/execute?dataCentreId={id}

TRANSITION PRECONDITIONS :
  Any state → Active | All mandatory fields (Name, Title, Country Code) must NOT be NULL | Error toast/banner if mandatory fields incomplete
  Any state → Deleted | No active IPPools linked via oncilla.resourceRelationship | Error toast/banner if active IPPool dependency exists
```

---

## 5. Discovered Grid Structure

| Column # | Header | Format / Notes |
|----------|--------|----------------|
| 1 | Data Centre Id | Integer; hyperlink to `/network-management/data-centres/{id}`; primary key |
| 2 | Name | Text string |
| 3 | Title | Text string; max 8 chars, no spaces |
| 4 | Data Centre Ref | Text string; optional |
| 5 | Subdomain | Text string; optional |
| 6 | Country Code | Text; format "CountryName (ID)" e.g. "Test (260)" |
| 7 | Status | Status badge; values: Setup / Requested / Active / Deleted |
| 8 | Actions | Edit (pencil) icon button; visibility/enabled state depends on record status and user permission |

---

## 6. Discovered Form Fields (Create / Edit)

| Field | Type | Mandatory | Max Length / Regex | Source (if dropdown) |
|-------|------|-----------|-------------------|----------------------|
| Name | Text input | Yes (*) | No observed max | — |
| Title | Text input | Yes (*) | Max 8 chars, no spaces — msg: "Please enter 1 to 8 characters. Spaces are not allowed." | — |
| Data Centre Ref | Text input | No | No observed constraint | — |
| Subdomain | Text input | No | Unique per DataCentre | — |
| Country Code Id | Dropdown/Combobox | Yes (*) | — | countryCode API; format: "ID - Code" e.g. "250 - XK" |

**Form behaviour:**
- Create dialog title: "Create Data Centre" / Edit dialog title: "Edit Data Centre"
- Submit DISABLED when any mandatory field empty; ENABLED once all mandatory fields filled
- Cancel button → "Unsaved Changes" popup if form modified
- "Unsaved Changes" popup: title "Unsaved Changes", message "You have unsaved changes. Are you sure you want to leave?", buttons: **Stay** / **Discard**

---

## 7. Discovered Filter Fields

| Filter Field | Type | Values / Source |
|--------------|------|-----------------|
| Status | Dropdown (multi-select) | Setup, Requested, Active, Deleted |
| Data Centre Id | Text input | Free text search |
| Name | Text input | Free text search |
| Title | Text input | Free text search |
| Data Centre Ref | Text input | Free text search |
| Subdomain | Text input | Free text search |
| Country Code | Dropdown | Country list from API |

---

## 8. Test Scenarios (for Generator Agent)

### S1 — VIEW

#### S1.1. Verify Data Centre list page loads with correct title and breadcrumb
**Steps:**
1. Log in as OGlobalUser → home page displayed
2. Click Network Management → Data Centres → list page at `/network-management/data-centres`
3. Verify page heading h1 text = "Data Centres"
4. Verify breadcrumb: Home > Network Management > Data Centres
5. Verify browser tab title contains "Network Management | Portal"

**API:** `GET /api/catalog/dataCentre/execute?pageSize=50&enrich=title&getPageCount=true` → 200 OK

#### S1.2. Verify Data Centre grid renders all 8 column headers in correct order
**Steps:**
1. Navigate to Data Centres list page
2. Verify grid has exactly 8 column headers: Data Centre Id | Name | Title | Data Centre Ref | Subdomain | Country Code | Status | Actions
3. Verify headers are visible and in stated order

#### S1.3. Verify Data Centre Id column renders as hyperlinks navigating to detail page
**Steps:**
1. Navigate to Data Centres list page
2. Verify each row's Data Centre Id cell contains an `<a>` hyperlink
3. Click one hyperlink → navigates to `/network-management/data-centres/{id}`
4. Verify detail page heading shows correct Data Centre Id and Title

**API:** `GET /api/catalog/dataCentreById/execute?dataCentreId={id}&enrich=title` → 200 OK

#### S1.4. Verify detail page shows all Standard Fields and related sections
**Steps:**
1. Navigate to Data Centres list page, click any record's ID hyperlink
2. Verify section "Standard Fields" with fields: Subdomain, Data Centre Ref, Title, Name, Country Code
3. Verify "Attributes" section present (shows "No attribute data found" when empty)
4. Verify "Related IP Pool" section with "Add IP Pool" button
5. Verify "Related Portal" section with "Add Portal" button

#### S1.5. Verify column sort (ascending/descending) on sortable columns
**Steps:**
1. Navigate to Data Centres list page
2. Click "Name" column header → list re-orders ascending
3. Click again → list re-orders descending
4. Repeat for Title, Data Centre Ref, Subdomain, Country Code, Status

#### S1.6. Verify column preset: select columns via preset panel then confirm with OK
**Steps:**
1. Navigate to Data Centres list page
2. Click the column settings / preset button in the grid toolbar
3. Verify column selection panel opens with all columns as checkboxes
4. Uncheck "Subdomain" and "Data Centre Ref"
5. Click OK
6. Verify grid refreshes showing only selected columns
7. Verify Subdomain and Data Centre Ref are no longer visible in the grid

#### S1.7. Verify pagination controls present and functional
**Steps:**
1. Navigate to Data Centres list page
2. Verify pagination controls visible (next, previous, page size)
3. Change page size to 10 → grid refreshes with 10 records
4. Click Next → next set of records displayed
5. Click Previous → returns to previous page

#### S1.8. Verify module is visible in nav with capabilityDataCentreGet permission
**Steps:**
1. Log in as user with capabilityDataCentreGet=active
2. Expand Network Management in left sidebar
3. Verify "Data Centres" is visible and clickable

#### S1.9. Verify module is NOT visible in nav without capabilityDataCentreGet (negative)
**Steps:**
1. Log in as user with capabilityDataCentreGet=deleted
2. Expand Network Management in left sidebar
3. Verify "Data Centres" is NOT visible
4. Attempt direct URL `/network-management/data-centres` → verify 401/403 or redirect

#### S1.10. Verify Status column badge displays correct state labels
**Steps:**
1. Navigate to Data Centres list page
2. Verify Setup records show "Setup" badge
3. Verify Requested records show "Requested" badge
4. Verify Active records show "Active" badge
5. Filter Status = "Deleted" first (Deleted records are hidden from the default list), then verify Deleted records show the "Deleted" badge

#### S1.11. Verify Edit icon is disabled for Active records without Admin permission
**Steps:**
1. Log in with capabilityDataCentreUpdate=active, capabilityDataCentreAdmin=deleted
2. Navigate to Data Centres list page
3. Verify Edit icon IS visible for Setup/Requested/Deleted records (cursor=pointer)
4. Verify Edit icon for Active records is DISABLED (not clickable)

#### S1.12. Verify Edit icon is enabled for Active records WITH Admin permission
**Steps:**
1. Log in with capabilityDataCentreAdmin=active
2. Navigate to Data Centres list page
3. Verify Edit icon for Active records IS enabled (cursor=pointer)
4. Click Edit icon on Active record → status transition dropdown opens

#### S1.13. Verify Deleted records are excluded from the default list and appear only after filtering Status = Deleted
**Steps:**
1. Log in and navigate to the Data Centres list page
2. Verify the default grid shows only Setup, Requested, and Active records — NO record with Status = "Deleted" appears
3. Open Add filter → Primary Filters → Status, select "Deleted", click Apply
4. Verify the grid now shows the Deleted records (Status badge = "Deleted") that were hidden before
5. Clear all filters → verify the Deleted records are hidden again and the default list returns

---

### S2 — FILTER

#### S2.1. Verify filter panel opens and all 7 filter fields are present
**Steps:**
1. Navigate to Data Centres list page
2. Open filter panel
3. Verify 7 filter fields: Status (dropdown), Data Centre Id (text), Name (text), Title (text), Data Centre Ref (text), Subdomain (text), Country Code (dropdown)

#### S2.2. Verify filter by Status (single value — Active)
**Steps:**
1. Navigate to Data Centres list page
2. Open filter, select Status = "Active"
3. Apply filter
4. Verify all displayed records have Status = "Active"

#### S2.3. Verify filter by Status (multiple values — Setup + Requested)
**Steps:**
1. Open filter, select Status = "Setup" AND "Requested"
2. Apply filter
3. Verify only Setup and Requested records are shown

#### S2.4. Verify filter by Name (partial text search)
**Steps:**
1. Enter partial name in Name filter, apply
2. Verify all displayed records have Name containing the entered text

#### S2.5. Verify filter by Title (partial text search)
**Steps:**
1. Enter partial title in Title filter, apply
2. Verify only matching records shown

#### S2.6. Verify filter by Data Centre Ref
**Steps:**
1. Enter value in Data Centre Ref filter, apply
2. Verify only records with matching ref shown

#### S2.7. Verify filter by Subdomain
**Steps:**
1. Enter subdomain value in Subdomain filter, apply
2. Verify only records with matching subdomain shown

#### S2.8. Verify filter by Data Centre Id (exact match)
**Steps:**
1. Enter known Data Centre Id in filter, apply
2. Verify exactly that one record is shown

#### S2.9. Verify reset/clear all filters restores full list
**Steps:**
1. Apply Status=Active filter
2. Verify list is filtered
3. Click Reset/Clear all filters
4. Verify full unfiltered list is restored

#### S2.10. Verify combined multi-filter reduces result set correctly
**Steps:**
1. Apply Status=Active AND Country Code filter simultaneously
2. Verify only records matching both criteria are displayed
3. Verify record count is less than each filter applied individually

---

### S3 — CREATE

#### S3.1. Verify Create Data Centre button is visible with capabilityDataCentreCreate
**Steps:**
1. Log in with capabilityDataCentreCreate=active
2. Navigate to Data Centres list page
3. Verify "Create" button IS visible in list page toolbar

#### S3.2. Verify Create button NOT visible without capabilityDataCentreCreate (negative)
**Steps:**
1. Log in with capabilityDataCentreCreate=deleted
2. Navigate to Data Centres list page
3. Verify Create button is NOT visible

#### S3.3. Verify Create form opens with correct fields and mandatory markers
**Steps:**
1. Click "Create" button
2. Verify dialog title = "Create Data Centre"
3. Verify fields: Name* (mandatory), Title* (mandatory), Data Centre Ref (optional), Subdomain (optional), Country Code Id* (mandatory dropdown)
4. Verify mandatory fields marked with *
5. Verify Submit DISABLED when all mandatory fields empty

#### S3.4. Verify Submit enables only when all mandatory fields (Name, Title, Country Code) are filled
**Steps:**
1. Fill only Name → Submit still DISABLED
2. Fill Name + Title → Submit still DISABLED
3. Fill Name + Title + Country Code Id → Submit ENABLED

#### S3.5. Verify Title field validation: max 8 chars, no spaces
**Steps:**
1. Open Create dialog
2. Enter title with >8 characters → validation message shown: "Please enter 1 to 8 characters. Spaces are not allowed."
3. Enter title with a space character → same validation message
4. Enter valid title (1–8 chars, no spaces) → validation clears

#### S3.6. Verify successful creation: success toast and new record in list
**Steps:**
1. Open Create dialog
2. Fill Name="Auto_Test_{Date.now()}", Title="AT{ts}", Country Code="first valid"
3. Click Submit
4. Verify success toast appears
5. Verify new record in list with Status = "Setup"

#### S3.7. Verify Cancel with modified form shows Unsaved Changes popup
**Steps:**
1. Open Create dialog, enter a Name value
2. Click Cancel
3. Verify "Unsaved Changes" popup: title "Unsaved Changes", message "You have unsaved changes. Are you sure you want to leave?", buttons: Stay / Discard

#### S3.8. Verify Discard closes form without saving record
**Steps:**
1. Open Create dialog, enter Name="TestDiscard"
2. Click Cancel → popup → click Discard
3. Verify dialog closed, no new record with Name="TestDiscard" in list

#### S3.9. Verify Stay in popup returns to form with values intact
**Steps:**
1. Open Create dialog, enter Name="TestStay"
2. Click Cancel → popup → click Stay
3. Verify dialog still open, Name="TestStay" still present

#### S3.10. Verify Cancel without changes closes form immediately (no popup)
**Steps:**
1. Open Create dialog (do not enter any values)
2. Click Cancel
3. Verify dialog closes with no popup

#### S3.11. Verify Country Code dropdown shows entries in "ID - Code" format (searchable)
**Steps:**
1. Open Create dialog, click Country Code Id dropdown
2. Verify entries in "ID - Code" format e.g. "250 - XK"
3. Verify dropdown has search/filter capability

#### S3.12. Verify Subdomain uniqueness validation on Create
**Steps:**
1. Open Create dialog
2. Enter Subdomain value that already exists in another Data Centre
3. Fill mandatory fields and Submit
4. Verify error toast/banner indicating subdomain already in use
5. Verify no new duplicate record created

---

### S4 — UPDATE

#### S4.1. Verify Edit icon visible in Actions for Setup/Requested/Deleted records (Update permission)
**Steps:**
1. Log in with capabilityDataCentreUpdate=active
2. Navigate to Data Centres list page
3. Verify Edit icon IS visible in Actions column for Setup, Requested, and Deleted records

#### S4.2. Verify Edit icon NOT visible without Update permission (negative)
**Steps:**
1. Log in with capabilityDataCentreUpdate=deleted, capabilityDataCentreCreate=deleted
2. Navigate to Data Centres list page
3. Verify Edit icon NOT visible in any row's Actions column

#### S4.3. Verify Edit form on detail page pre-populated with current values
**Steps:**
1. Navigate to a Setup/Requested/Deleted record's detail page
2. Click edit pencil on Standard Fields section
3. Verify dialog = "Edit Data Centre"
4. Verify all fields pre-populated: Name, Title, Data Centre Ref, Subdomain, Country Code

#### S4.4. Verify Update Submit DISABLED when no changes made, ENABLED after change
**Steps:**
1. Open Edit dialog for any record
2. Verify Submit is DISABLED initially
3. Modify Name → Submit becomes ENABLED

#### S4.5. Verify successful update: success toast and updated values in list
**Steps:**
1. Open Edit dialog, change Name to "Updated_{Date.now()}"
2. Click Submit
3. Verify success toast
4. Navigate to list → record shows updated Name

#### S4.6. Verify Cancel with unsaved changes shows Unsaved Changes popup in Edit form
**Steps:**
1. Open Edit dialog, modify Name
2. Click Cancel
3. Verify "Unsaved Changes" popup appears with Stay / Discard buttons

#### S4.7. Verify mandatory fields remain marked * in Edit form
**Steps:**
1. Open Edit dialog
2. Verify Name*, Title*, Country Code Id* are marked *
3. Clear Name → Submit DISABLED
4. Re-enter Name → Submit ENABLED

#### S4.8. Verify Edit icon on list page opens status transition dropdown (not edit form)
**Steps:**
1. Navigate to list (Update only, no Admin)
2. Click Edit icon on a Setup record
3. Verify a status dropdown opens (NOT a form/dialog)
4. Verify dropdown options: Requested, Deleted

#### S4.9. Verify Edit icon for Active record is DISABLED without Admin (negative)
**Steps:**
1. Log in with Update=active, Admin=deleted
2. Find Active record in list
3. Verify Edit icon is disabled (greyed out, not clickable)
4. Verify clicking it does NOT open any dropdown

#### S4.10. Verify Edit icon for Active record IS enabled with Admin — opens transition dropdown
**Steps:**
1. Log in with capabilityDataCentreAdmin=active
2. Find Active record in list
3. Verify Edit icon IS clickable (cursor=pointer)
4. Click → dropdown opens with options: Setup, Requested, Deleted

> **Source:** Add + remove flows verified live on 2026-08-25 as OGlobalUser against DataCentre Id 92 (Setup), which initially had **no IP Pools and no Portals mapped** ("No IP Pool added" / "No Portal added"). Both add and remove operations succeeded for this user.

#### Related IP Pool (Detail Page — Update Permission)

#### S4.11. Verify "Add IP Pool" button is visible on the Related IP Pool section for non-Active records
**Steps:**
1. Log in with capabilityDataCentreUpdate=active
2. Navigate to a Setup/Requested/Deleted record's detail page
3. Scroll to the "Related IP Pool" section
4. Verify the section header shows an "Add IP Pool" button
5. Expand the section → for a record with no pools mapped, verify the empty state "No IP Pool added"; for a record with pools, verify the table columns: IP Pool ID, IP Pool Title, Actions (remove icon per row)
6. Verify each IP Pool ID cell is a hyperlink to `/network-management/ip-pools/{id}`

#### S4.12. Verify Add IP Pool dialog opens with searchable dropdown and disabled Submit
**Steps:**
1. On a non-Active record's detail page, click "Add IP Pool"
2. Verify a dialog titled "IP Pool" opens
3. Verify it contains a searchable combobox with placeholder "Select…"
4. Verify a "Cancel" button and a "Close" (X) button are present
5. Verify the "Submit" button is DISABLED while no pool is selected
6. Click Cancel (or Close X) → verify the dialog closes with no pool linked

#### S4.13. Verify IP Pool dropdown lists active pools in "Title (ID)" format and is searchable
**Steps:**
1. Open the Add IP Pool dialog, click the "Select…" combobox
2. Verify a "Suggestions" listbox opens
3. Verify options are in "Title (ID)" format, e.g. "qatest (115)"
4. Type a partial title → verify the list filters to matching pools

**API:** `GET /api/catalog/ipPool/execute?pageSize=50&enrich=title&status=active` → 200 OK

#### S4.14. Verify selecting an IP Pool shows read-only preview and enables Submit; Clear selection resets
**Steps:**
1. Open the Add IP Pool dialog and select a pool from the dropdown
2. Verify a read-only preview panel appears: Ip Pool Id, Name, Title, Supernet Id, Status, Supernet Title
3. Verify "Submit" becomes ENABLED
4. Click "Clear selection" → verify the selection and preview clear and Submit becomes DISABLED again

#### S4.15. Verify successful Add IP Pool: success toast and new row in Related IP Pool table
**Steps:**
1. On a non-Active record with no IP Pool mapped, open the Add IP Pool dialog and select an IP Pool not already linked
2. Click Submit
3. Verify the success toast "Successfully added IP Pool" appears
4. Verify the Related IP Pool table now shows the newly linked pool as a new row: IP Pool ID (hyperlink to `/network-management/ip-pools/{id}`), IP Pool Title, Actions (remove)

**API:** `GET /api/catalog/resourceRelationship/execute?sourceResourceId={id}&destinationResourceName=ipPool&relationship=consumer&sourceResourceName=dataCentre&status=active&pageSize=200` reflects the new link
> Verified live on DataCentre 92: linked "qatest (115)" → toast "Successfully added IP Pool", row "115 / qatest" added.

#### S4.16. Verify the user can remove a linked IP Pool via the Actions remove control with confirmation
**Steps:**
1. On a non-Active record that has a linked IP Pool, expand the Related IP Pool section
2. Click the remove (trash) icon in the row's Actions cell
3. Verify a confirmation alert-dialog "Remove Relationship" opens with the message "Are you sure you want to remove this relationship?" and Cancel / Remove buttons
4. Click Cancel → verify the dialog closes and the IP Pool row is still present
5. Click the remove icon again and click Remove
6. Verify the success toast "Successfully removed IP Pool" appears and the row is gone (section returns to "No IP Pool added" when it was the only pool)

#### S4.17. Verify Related IP Pool section is read-only (no Add, no row Actions) for Active records without Admin (negative)
**Steps:**
1. Log in with capabilityDataCentreUpdate=active, capabilityDataCentreAdmin=deleted
2. Navigate to an Active record's detail page
3. Expand the "Related IP Pool" section
4. Verify NO "Add IP Pool" button is present
5. Verify the table shows only IP Pool ID and IP Pool Title columns (no Actions/remove column)

#### Related Portal (Detail Page — Update Permission)

#### S4.18. Verify "Add Portal" button is visible on the Related Portal section for non-Active records
**Steps:**
1. Log in with capabilityDataCentreUpdate=active
2. Navigate to a Setup/Requested/Deleted record's detail page
3. Scroll to the "Related Portal" section
4. Verify the section header shows an "Add Portal" button
5. Verify the empty state shows "No Portal added" when no portal is linked

#### S4.19. Verify Add Portal dialog opens with searchable dropdown and disabled Submit
**Steps:**
1. On a non-Active record's detail page, click "Add Portal"
2. Verify a dialog titled "Portal" opens
3. Verify it contains a searchable combobox with placeholder "Select…"
4. Verify a "Cancel" button and a "Close" (X) button are present
5. Verify the "Submit" button is DISABLED while no portal is selected
6. Click Cancel (or Close X) → verify the dialog closes with no portal linked

#### S4.20. Verify Portal dropdown lists portals in "Name (portalId)" format and is searchable
**Steps:**
1. Open the Add Portal dialog, click the "Select…" combobox
2. Verify a "Suggestions" listbox opens
3. Verify options are in "Name (portalId)" format, portalId being a GUID e.g. "Eseye (6b57a762151042aa00574948f67d63cc)"
4. Type a partial name → verify the list filters to matching portals

#### S4.21. Verify selecting a Portal shows read-only preview and enables Submit; Clear selection resets
**Steps:**
1. Open the Add Portal dialog and select a portal from the dropdown
2. Verify a read-only preview panel appears: Portal Id, Name, Title, Portfolio Id, Default Host, Status, Portfolio Title
3. Verify "Submit" becomes ENABLED
4. Click "Clear selection" → verify the selection and preview clear and Submit becomes DISABLED again

#### S4.22. Verify successful Add Portal: success toast and new row in Related Portal table
**Steps:**
1. On a non-Active record with no Portal mapped, open the Add Portal dialog and select a Portal not already linked
2. Click Submit
3. Verify the success toast "Successfully added Portal" appears
4. Verify the Related Portal table now shows the newly linked portal as a new row: Portal ID (plain-text GUID, not a hyperlink), Portal Title, Actions (remove)
> Verified live on DataCentre 92: linked "Eseye (6b57a762…)" → toast "Successfully added Portal", row "6b57a762… / Eseye" added.

#### S4.23. Verify the user can remove a linked Portal via the Actions remove control with confirmation
**Steps:**
1. On a non-Active record that has a linked Portal, expand the Related Portal section
2. Click the remove (trash) icon in the row's Actions cell
3. Verify a confirmation alert-dialog "Remove Relationship" opens with the message "Are you sure you want to remove this relationship?" and Cancel / Remove buttons
4. Click Cancel → verify the dialog closes and the Portal row is still present
5. Click the remove icon again and click Remove
6. Verify the success toast "Successfully removed Portal" appears and the row is gone (section returns to "No Portal added" when it was the only portal)

#### S4.24. Verify Related Portal section is read-only (no Add Portal button) for Active records without Admin (negative)
**Steps:**
1. Log in with capabilityDataCentreUpdate=active, capabilityDataCentreAdmin=deleted
2. Navigate to an Active record's detail page
3. Expand the "Related Portal" section
4. Verify NO "Add Portal" button is present

---

### S5 — ATTRIBUTE

#### S5.1. Verify Attributes section present on detail page with edit pencil
**Steps:**
1. Navigate to any Data Centre detail page
2. Scroll to "Attributes" section
3. Verify "Attributes" heading visible
4. Verify edit pencil icon present on Attributes section header
5. Verify empty state shows: "No attribute data found for this record."

#### S5.2. Verify Edit Attributes dialog opens with Defined and Custom sections
**Steps:**
1. Click edit pencil on Attributes section
2. Verify dialog title = "Edit Data Centre Attributes"
3. Verify "Defined Attributes" section with "Select attribute ▾" dropdown
4. Verify "Custom Attributes" section with "+ Add custom attribute" button
5. Verify Submit DISABLED initially

#### S5.3. Verify Select attribute dropdown lists all defined attributes with search
**Steps:**
1. Open Edit Attributes dialog, click "Select attribute ▾"
2. Verify search textbox present
3. Verify listed defined attributes (Moloch URL, Caligare URL, Radius DB, Site Name, County Or State, Town Or City)
4. Verify each has a checkbox (multi-select)

#### S5.4. Verify selecting defined attribute shows value input and enables Submit after entry
**Steps:**
1. Open Edit Attributes dialog, select "Site Name"
2. Verify "Site Name" text input row appears with "Enter Site Name" placeholder
3. Verify "Remove" button present next to row
4. Verify Submit DISABLED with no value
5. Enter value in Site Name input → Submit ENABLED

#### S5.5. Verify successful Save of defined attribute: success toast and attribute appears on detail page
**Steps:**
1. Open Edit Attributes dialog (record with no attributes)
2. Select "Site Name", enter "TestSite_{Date.now()}"
3. Click Submit
4. Verify success toast
5. Verify Attributes section now shows "Site Name" with entered value

#### S5.6. Verify adding custom attribute requires both Name and Value
**Steps:**
1. Open Edit Attributes dialog, click "+ Add custom attribute"
2. Verify "Attribute Name" and "Attribute Value" inputs appear plus remove button
3. Verify Submit DISABLED when both empty
4. Enter Attribute Name AND Attribute Value → Submit ENABLED

#### S5.7. Verify Remove button removes defined attribute row from dialog
**Steps:**
1. Open Edit Attributes dialog with a defined attribute row added
2. Click "Remove" button on the row
3. Verify row disappears
4. Submit
5. Verify success toast; attribute no longer shown on detail page

#### S5.8. Verify Cancel on Attributes dialog discards unsaved changes
**Steps:**
1. Open Edit Attributes dialog, select attribute and enter value
2. Click Cancel
3. Verify dialog closes
4. Verify no new attribute on Attributes section of detail page

---

### S6 — STATUS TRANSITIONS

> **Deleted records precondition (2026-08-25):** Deleted records are **hidden from the default list**. For every transition where the source state is **Deleted** (S6.5, S6.6, S6.11, S6.22, S6.23, S6.27), the record must first be brought into view via **Add filter → Status = Deleted → Apply** — from either entry point. Only then is its Edit icon (list) / Change Status button (detail) reachable. The transition options once reached are unchanged.

#### List Page Entry Point — Update Permission (no Approver/Admin)

#### S6.1. Verify Setup→Requested via List Page Actions dropdown (Update only)
**Steps:**
1. Log in with Update=active, Approver=deleted, Admin=deleted
2. Navigate to list, find Setup record, click Edit icon
3. Verify dropdown shows: Requested, Deleted (no Active)
4. Select Requested → confirm dialog
5. Verify success toast, record badge = "Requested"

#### S6.2. Verify Setup→Deleted via List Page Actions dropdown (Update only)
**Steps:**
1. Find Setup record, click Edit icon → dropdown: Requested, Deleted
2. Select Deleted → confirm → success toast, badge = "Deleted"

#### S6.3. Verify Requested→Setup via List Page Actions dropdown (Update only)
**Steps:**
1. Find Requested record, click Edit icon
2. Verify dropdown: Setup, Deleted (no Active)
3. Select Setup → confirm → success toast, badge = "Setup"

#### S6.4. Verify Requested→Deleted via List Page Actions dropdown (Update only)
**Steps:**
1. Find Requested record, click Edit icon
2. Select Deleted → confirm → success toast, badge = "Deleted"

#### S6.5. Verify Deleted→Setup via List Page Actions dropdown (Update only)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then find the now-visible Deleted record and click its Edit icon
2. Verify dropdown: Setup, Requested (no Active)
3. Select Setup → confirm → success toast, badge = "Setup"

#### S6.6. Verify Deleted→Requested via List Page Actions dropdown (Update only)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then find the now-visible Deleted record and click its Edit icon
2. Select Requested → confirm → success toast, badge = "Requested"

#### S6.7. Verify Active record Edit icon DISABLED without Admin (negative — List Page)
**Steps:**
1. Log in with Update=active, Admin=deleted
2. Find Active record in list
3. Verify Edit icon is disabled (not clickable)

#### S6.8. Verify "Active" option NOT in dropdown without Approver/Admin (negative — List Page)
**Steps:**
1. Log in with Update only (no Approver, no Admin)
2. Find Setup/Requested/Deleted record, click Edit icon
3. Verify "Active" is NOT present in dropdown

#### List Page Entry Point — Approver Permission

#### S6.9. Verify Setup→Active via List Page Actions dropdown (Approver)
**Steps:**
1. Log in with Approver=active (and Update)
2. Find Setup record, click Edit icon
3. Verify dropdown: Requested, Deleted, Active
4. Select Active → confirm → success toast, badge = "Active"

#### S6.10. Verify Requested→Active via List Page Actions dropdown (Approver)
**Steps:**
1. Find Requested record, click Edit icon
2. Verify Active option present
3. Select Active → confirm → success toast, badge = "Active"

#### S6.11. Verify Deleted→Active via List Page Actions dropdown (Approver)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then find the now-visible Deleted record and click its Edit icon
2. Select Active → confirm → success toast, badge = "Active"

#### S6.12. Verify Active option NOT in dropdown without Approver/Admin (negative)
**Steps:**
1. Log in without Approver and without Admin
2. Find any non-Active record, click Edit icon
3. Verify "Active" NOT present in dropdown

#### List Page Entry Point — Admin Permission

#### S6.13. Verify Active→Setup via List Page Actions dropdown (Admin)
**Steps:**
1. Log in with Admin=active
2. Find Active record, click Edit icon (now enabled)
3. Verify dropdown: Setup, Requested, Deleted
4. Select Setup → confirm → success toast, badge = "Setup"

#### S6.14. Verify Active→Requested via List Page Actions dropdown (Admin)
**Steps:**
1. Find Active record, click Edit icon
2. Select Requested → confirm → success toast, badge = "Requested"

#### S6.15. Verify Active→Deleted via List Page (no blocking dependency)
**Steps:**
1. Find Active record with no linked active IPPools
2. Click Edit icon → select Deleted → confirm
3. Verify success toast, badge = "Deleted"

#### S6.16. Verify Active→Deleted BLOCKED when active IPPool dependency exists (List Page — negative precondition)
**Steps:**
1. Find Active record with linked active IPPool(s)
2. Click Edit icon → select Deleted → confirm
3. Verify error toast/banner: active IPPool dependency blocks transition
4. Verify record status remains "Active" in grid

#### Details Page Entry Point — Update Permission

#### S6.17. Verify Change Status button visible on non-Active detail page (Update permission)
**Steps:**
1. Log in with Update=active, Admin=deleted
2. Navigate to Setup record detail page
3. Verify "Change Status ▾" button IS visible

#### S6.18. Verify Setup→Requested via Detail Page Change Status (Update)
**Steps:**
1. Navigate to Setup record detail page, click Change Status
2. Verify dropdown: Requested, Deleted (no Active)
3. Select Requested → confirm → success toast, detail page badge = "Requested"

#### S6.19. Verify Setup→Deleted via Detail Page Change Status (Update)
**Steps:**
1. Navigate to Setup record detail page, click Change Status
2. Select Deleted → confirm → success toast, badge = "Deleted"

#### S6.20. Verify Requested→Setup via Detail Page Change Status (Update)
**Steps:**
1. Navigate to Requested record detail page, click Change Status
2. Verify dropdown: Setup, Deleted
3. Select Setup → confirm → success toast, badge = "Setup"

#### S6.21. Verify Requested→Deleted via Detail Page Change Status (Update)
**Steps:**
1. Navigate to Requested record detail page, click Change Status
2. Select Deleted → confirm → success toast, badge = "Deleted"

#### S6.22. Verify Deleted→Setup via Detail Page Change Status (Update)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then click the now-visible Deleted record's Data Centre Id to open its detail page, and click Change Status
2. Verify dropdown: Setup, Requested
3. Select Setup → confirm → success toast, badge = "Setup"

#### S6.23. Verify Deleted→Requested via Detail Page Change Status (Update)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then click the now-visible Deleted record's Data Centre Id to open its detail page, and click Change Status
2. Select Requested → confirm → success toast, badge = "Requested"

#### S6.24. Verify Active record: Change Status button NOT visible without Admin (negative — Detail Page)
**Steps:**
1. Log in without Admin, navigate to Active record detail page
2. Verify "Change Status ▾" button NOT visible

#### Details Page Entry Point — Approver Permission

#### S6.25. Verify Setup→Active via Detail Page Change Status (Approver)
**Steps:**
1. Log in with Approver=active
2. Navigate to Setup record detail page, click Change Status
3. Verify dropdown: Requested, Active, Deleted
4. Select Active → confirm → success toast, badge = "Active"

#### S6.26. Verify Requested→Active via Detail Page Change Status (Approver)
**Steps:**
1. Navigate to Requested record detail page, click Change Status
2. Select Active → confirm → success toast, badge = "Active"

#### S6.27. Verify Deleted→Active via Detail Page Change Status (Approver)
**Steps:**
1. Open Add filter → Status = Deleted → Apply (Deleted records are hidden by default), then click the now-visible Deleted record's Data Centre Id to open its detail page, and click Change Status
2. Select Active → confirm → success toast, badge = "Active"

#### Details Page Entry Point — Admin Permission

#### S6.28. Verify Active record: Change Status button IS visible with Admin (Detail Page)
**Steps:**
1. Log in with Admin=active
2. Navigate to Active record detail page
3. Verify "Change Status ▾" button IS visible and clickable

#### S6.29. Verify Active→Setup via Detail Page Change Status (Admin)
**Steps:**
1. Navigate to Active record detail page, click Change Status
2. Verify dropdown: Setup, Requested, Deleted
3. Select Setup → confirm → success toast, badge = "Setup"

#### S6.30. Verify Active→Requested via Detail Page Change Status (Admin)
**Steps:**
1. Navigate to Active record detail page, click Change Status
2. Select Requested → confirm → success toast, badge = "Requested"

#### S6.31. Verify Active→Deleted BLOCKED by active IPPool dependency (Detail Page — negative precondition)
**Steps:**
1. Navigate to Active record detail page (with linked active IPPools)
2. Click Change Status → select Deleted → confirm
3. Verify error toast/banner: active IPPool dependency
4. Verify badge on detail page remains "Active"

#### S6.32. Verify List Page and Detail Page dropdowns show identical options (entry-point consistency)
**Steps:**
1. For each state (Setup/Requested/Deleted/Active), open List Page Edit icon dropdown — capture options
2. Navigate to same record's detail page, open Change Status dropdown — capture options
3. Verify both option sets are identical for same state + permission combination
4. If options differ → record as functional inconsistency/defect

---

> **STATUS TRANSITION OVERRIDE — DATA CENTRE**
> No override from common model. Standard 4 states (Setup, Requested, Active, Deleted) confirmed from live UI.
> STATES: Setup · Requested · Active · Deleted
> TRANSITIONS: Per Full Transition Map in permissions_and_status_model.md — no deviations observed.
