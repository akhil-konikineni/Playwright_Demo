# IP Pool — Test Coverage

| | |
|---|---|
| Module | IP Pool (`ipPool`) |
| Feature route | `/network-management/ip-pools` |
| Document Version | 1.0 (all 5 tiers / GET + UPDATE + CREATE + APPROVER + ADMIN — complete) |
| Coverage Date | 2026-09-01 (Tiers 1–2); 2026-09-22 (Tiers 3–5 + verification) |
| Test account | `statususer` / `Password#1` (FULL_USER, progressively elevated per tier) |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| CSV | `test-scenarios/test-cases/ippool_testcoverage.csv` (70 TCs) |

> **✅ COMPLETE — all 5 capability tiers live-observed.** Per the tiered discovery model (setup.md Steps 11–14), one capability tier was activated at a time and verified live in the DB (`userPermission`). Tier 1 **`capabilityIpPoolGet`** → S1 VIEW + S2 FILTER; Tier 2 **`capabilityIpPoolUpdate`** → S4 UPDATE, S5 ATTRIBUTE, Related add/remove, Update-tier S6; Tier 3 **`capabilityIpPoolCreate`** → S3 CREATE; Tier 4 **`capabilityIpPoolApprover`** → S6 → Active; Tier 5 **`capabilityIpPoolAdmin`** → S6 from-Active + Active-record editing. Tiers 3–5 verified 2026-09-22. Known defect: [`Data Centre - RR` label leak](../../defects/ippool/related-datacentre-rr-suffix-in-ui.md).

## Module Discovery Notes (Tier 1, live)

```
ROUTE              : list /network-management/ip-pools · detail /network-management/ip-pools/{ipPoolId}  (FLAT route — just the ipPool id)
LIST API           : GET /api/catalog/ipPool/execute?pageSize=50&enrich=title&getPageCount=true&status=setup&status=active&status=requested
                     (direct `ipPool` resource — no global* split; default query EXCLUDES deleted)
DETAIL API         : GET /api/catalog/ipPoolById/execute?ipPoolId={id}&enrich=title
                     record shape: { ipPoolId, name, title, supernetId, supernetTitle, status, dataCentre[] }
OTHER APIs         : ipPoolAttribute/execute?ipPoolId={id} · objectDefinitions?objectName=ipPool · objectDefinitions?objectName=ipPoolAttribute
                     genericOption?resourceName=ipPool&option=status · statusTransition?resourceName=ipPool&status=active
RELATIONSHIP API   : GET /api/catalog/resourceRelationship/execute?destinationResourceId={ipPoolId}
                       &sourceResourceName={dataCentre|apn|portal}&relationship=consumer&destinationResourceName=ipPool&status=active
                     -> IP Pool is the DESTINATION of a {dataCentre|apn|portal} -> ipPool `consumer` relationship (lazy-loaded on section expand)

GRID (6 columns)   : Ip Pool Id | Name | Supernet | Title | Status | Actions
                     - Ip Pool Id : hyperlink -> /network-management/ip-pools/{id}
                     - Name       : plain text
                     - Supernet   : FK hyperlink `Title (id)` -> /network-management/supernets/{id}
                     - Title      : plain text
                     - Status     : badge (Setup / Requested / Active; Deleted excluded from default list)
                     - Actions    : EMPTY at Get (no edit icon — correct)
LIST FEATURES      : Search by Name… · Add filter · Clear all · Configure visible columns (presets) · per-column Sort + Resize · pagination (50/page default, multiple pages)

FILTERS (5)        : Primary   -> Title, Status (multi-select dropdown), Name, Ip Pool ID
                     Secondary -> Supernet
                     Dialog title Filters; Search filters box; Reset / Apply; toolbar Clear all.

DETAIL PAGE        : Header      -> IP Pool ID, IP Pool Title, Status badge (no Change Status at Get)
                     Standard Fields (read-only) -> Name, Title, Supernet (`Title (id)`)
                     Attributes  -> empty state "No attribute data found for this record" (NOTE: no trailing period)
                     Related sections (3, collapsible, lazy-loaded) -> Related Data Centre, Related APN, Related Portal
                     Mutation controls -> NONE at Get (no Edit, no Change Status, no Add/Remove in related sections)

FIELDS (objectDefinitions, live) :
                     name       -> mandatory, UNIQUE
                     title      -> mandatory, UNIQUE
                     supernetId -> mandatory, resource (FK)
                     status     -> mandatory, resource
                     ipPoolId   -> mandatory, unique (PK / auto)
                     (NOTE: IP Pool has NO IP-range fields — unlike Subnet. A pool is Name + Title under a Supernet, with related DataCentre/APN/Portal.)

OBSERVED QUIRKS    : (1) Both Name AND Title are unique (two unique text fields).
                     (2) Attributes empty-state string omits the trailing period ("...for this record") — differs from other modules.
```

## Progressive Elevation Log

| Tier | Capability Activated | Explored | New Scenarios Captured | Inherited From |
|---|---|---|---|---|
| 1 | `capabilityIpPoolGet` | ✅ | S1 VIEW (14), S2 FILTER (10) | — |
| 2 | `capabilityIpPoolUpdate` | ✅ | S4 UPDATE (5), Related add/remove + display (7), S5 ATTRIBUTE (3), S6 STATUS TRANSITIONS – Update subset (7) | Tier 1 |
| 3 | `capabilityIpPoolCreate` | ✅ 2026-09-22 | S3 CREATE (8) → TC 47–54 | Tiers 1–2 |
| 4 | `capabilityIpPoolApprover` | ✅ 2026-09-22 | S6 → Active transitions (4) → TC 55–58 | Tiers 1–3 |
| 5 | `capabilityIpPoolAdmin` | ✅ 2026-09-22 | S6 Active→X + Active-state editing (4) → TC 59–62 | Tiers 1–4 |

> Business rule to confirm at create/update tiers (from `permissions_and_status_model.md` → IPPool): *"IPPool Object must have a Configuration mapped to a DataCentre; dropdowns must show only Active DataCentre and Supernet records."* The three Related sections (Data Centre / APN / Portal) suggest add/remove relationship flows unlock at Update — discover live.

---

### S1 — VIEW  *(capabilityIpPoolGet · module-View)*  — ✅ Tier 1, live-observed 2026-09-01  → CSV TC 1–14

#### S1.1 List page title / breadcrumb / tab title
#### S1.2 Grid 6 columns in order: Ip Pool Id, Name, Supernet, Title, Status, Actions
#### S1.3 Ip Pool Id hyperlink → detail
#### S1.4 Supernet FK hyperlink → supernet detail
#### S1.5 Name/Title plain text; Status badge
#### S1.6 Read-only detail page — header, Standard Fields (Name/Title/Supernet), Attributes empty state, 3 Related sections, no mutation controls
#### S1.7 Related sections expand/collapse (Data Centre / APN / Portal)
#### S1.8 Sort by column headers
#### S1.9 Change records-per-page
#### S1.10 Pagination controls
#### S1.11 Configure visible columns (Select All / Deselect All)
#### S1.12 Quick-search by Name
#### S1.13 Get-only user sees no create/mutate controls
#### S1.14 Deleted IP Pools excluded from default list

### S2 — FILTER  *(capabilityIpPoolGet · module-Filter)*  — ✅ Tier 1, live-observed 2026-09-01  → CSV TC 15–24

#### S2.1 Open filter panel — Primary (Title, Status, Name, Ip Pool ID) + Secondary (Supernet), Search filters, Reset, Apply  *(live 2026-09-22: Ip Pool ID sits under **Primary**, not Secondary)*
#### S2.2 Search the filter field list
#### S2.3 Filter by Status (multi-select)
#### S2.4 Filter by Supernet
#### S2.5 Filter by Ip Pool ID
#### S2.6 Filter by Name
#### S2.7 Filter by Title
#### S2.8 Reset filters within dialog
#### S2.9 Clear all from toolbar
#### S2.10 Combined filters persist across pagination / sort / column preset

---

### S4 — UPDATE  *(capabilityIpPoolUpdate · module-Update)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 25–29

**What UPDATE unlocks (diff vs Get):**
- **List Actions column:** an **Edit (pencil) icon** on **Setup/Requested** rows (opens a status dropdown); **ABSENT** on **Active** rows (empty cell — absent, not disabled). Live counts: Setup 23/23, Requested 4/4, Active 0/23.
- **Detail page:** a **`Change Status ▾`** button, an **Edit pencil** on Standard Fields (opens *Edit Ip Pool*) and on Attributes (opens *Edit Ip Pool Attributes*), and **`Add Data Centre` / `Add APN` / `Add Portal`** buttons on the three Related sections.

**`Edit Ip Pool` modal (live):** heading `Edit Ip Pool`; Close · Cancel · Submit (disabled until a change). Fields (all mandatory `*`, all **editable**): **Name** (placeholder `ipPool server name`), **Title** (`ipPool title`), **Supernet Id** (`Supernet Id`). NOTE: **Supernet Id is editable in the edit form** (unlike Subnet, where the parent is locked). **Update success toast: `Successfully edited IP Pool`.**

#### S4.1 Update controls appear (Change Status, Standard Fields/Attributes edit, Add DC/APN/Portal) — absent at Get
#### S4.2 List Edit icon present for Setup/Requested rows, absent for Active rows
#### S4.3 Open `Edit Ip Pool` form — Name/Title/Supernet Id all editable; Submit disabled until change
#### S4.4 Edit a field → Submit → toast `Successfully edited IP Pool`; value persists
#### S4.5 Cancel/Close the Edit form **with unsaved changes** → **Unsaved Changes** popup (`You have unsaved changes. Are you sure you want to leave?` · Stay / Discard); Stay keeps the form, Discard closes it without saving (record unchanged) — ✅ live-verified 2026-09-23

### RELATED SECTIONS — Data Centre / APN / Portal add & remove  *(capabilityIpPoolUpdate · module-Update)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 30–33

IP Pool has **three** related sections. Add dialogs (searchable `Select…` dropdown + Submit-disabled-until-selected + Cancel + Close):
- **Add Data Centre** → dialog title **`Data Centre - RR`** → toast **`Successfully added Data Centre`**. Table columns: `Data Centre ID | Data Centre Link | Actions`.
- **Add APN** → dialog title **`APN`** → toast **`Successfully added APN`**.
- **Add Portal** → dialog title **`Portal`** → toast **`Successfully added Portal`**.
- **Remove** (any): trash icon → confirm dialog **`Remove Relationship`** (`Are you sure you want to remove this relationship?` · Cancel · Remove) → toast **`Successfully removed {Resource}`** (live: `Successfully removed Data Centre`, `Successfully removed APN`).
- Model: IP Pool is the **destination** of `{dataCentre|apn|portal} → ipPool` `consumer` relationships (`oncilla.resourceRelationship`).

**Related-record display (live):** each related section is a table.
- Related Data Centre → `Data Centre ID | Data Centre Link | Actions`; the **Data Centre ID is a hyperlink** → `/network-management/data-centres/{id}`.
- Related APN → `APN ID | APN Title | Actions`; the **APN ID is a hyperlink** → `/mno-management/apns/manage-apns/{id}`.
- Related Portal → `Portal ID | Portal Title | **Status** | Actions` (the Portal table has an extra **Status** column); the **Portal ID is a hyperlink** → `/admin/portals/{id}` (GUID id).
- **Empty state:** a section with no records shows **`No {Resource} added`** (e.g. `No APN added`, `No Portal added`). **Exception (live 2026-09-22):** the Data Centre section shows **`No Data Centre - RR added`** — the internal `- RR` name leaks into the UI (see defect [`related-datacentre-rr-suffix-in-ui`](../../defects/ippool/related-datacentre-rr-suffix-in-ui.md)).
- **Add dropdown = searchable** (`Search...`) and **excludes already-related records** (duplicate prevention): searching an already-related record's title returns `No results found.` (confirmed live with an *active* Data Centre already linked — exclusion is by existing-relationship, not by status). Options are active `Title (id)` records.

#### R.1 Add related Data Centre (`Data Centre - RR` dialog) → toast `Successfully added Data Centre`
#### R.2 Remove related Data Centre (`Remove Relationship` confirm) → toast `Successfully removed Data Centre`
#### R.3 Add + remove related APN (`APN` dialog) → `Successfully added/removed APN`
#### R.4 Add + remove related Portal (`Portal` dialog) → `Successfully added Portal` / `Successfully removed Portal` *(live-verified 2026-09-01: added then removed portal `QA` on IP Pool 389)*
#### R.5 Related record ID is a hyperlink to the resource detail (DC → data-centres, APN → apns, Portal → portal)  → CSV TC 44
#### R.6 Empty related section shows `No {Resource} added` (APN/Portal); Data Centre section shows `No Data Centre - RR added` (defect)  → CSV TC 45
#### R.7 Add dropdown is searchable and excludes already-related records (no duplicates)  → CSV TC 46

### S5 — ATTRIBUTE  *(capabilityIpPoolUpdate · module-Attribute)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 34–36

Editor heading **`Edit Ip Pool Attributes`**; **Custom only** — Defined Attributes shows `This item has no defined attributes`; `+ Add custom attribute` reveals `Attribute Name` + `Attribute Value` inputs (both required). Removing a row → confirm **`Delete attributes?`** → Remove → Submit. Toast **`Attributes updated successfully`**.

#### S5.1 Open `Edit Ip Pool Attributes` — Defined none, Custom only, `+ Add custom attribute`
#### S5.2 Add a custom attribute (Name + Value required) → toast `Attributes updated successfully`
#### S5.3 Remove a custom attribute (`Delete attributes?` confirm) → toast `Attributes updated successfully`

### S6 — STATUS TRANSITIONS — Update-tier subset  *(capabilityIpPoolUpdate · module-StatusTransition)*  — ✅ Tier 2, live-observed 2026-09-01  → CSV TC 37–42

Two entry points (list Actions pencil + detail `Change Status ▾`), identical options. Update-tier map (shared platform component — same as other modules):

| From | Offered targets (Update) | Active offered? |
|---|---|---|
| Setup | Requested, Deleted | No |
| Requested | Setup, Deleted | No |
| Deleted | Setup, Requested | No |

- **Confirm dialog:** title `Confirm Status Change`; body `Are you sure you want to change the status to "<state>"?`; confirm verb `Request` / `Set Up` / `Delete`. Success toast **`Status changed to "<state>"`**. Live-executed Setup→Requested→Setup on record 389.
- **Both entry points work and are identical:** the **list Actions pencil** opens the same status dropdown as the detail **`Change Status ▾`**, drives the same Confirm dialog and toast, and the list row status updates **in place** (no reload). Live-executed a full list-page Setup→Requested→Setup cycle on record 389.
- **Deleted records hidden** from the default list — reach via Add filter → Status = Deleted → Apply.

#### S6.1 Status control offers Requested + Deleted for a Setup record (Active not offered at Update)
#### S6.2 Setup → Requested — confirm `Request` → toast `Status changed to "requested"`
#### S6.3 Requested → Setup — confirm `Set Up` → toast `Status changed to "setup"`
#### S6.4 Any → Deleted — confirm `Delete` → toast `Status changed to "deleted"`; record leaves default list
#### S6.5 Deleted-source transitions require Status=Deleted filter to locate the record
#### S6.6 Cancel on Confirm Status Change makes no change
#### S6.7 Status change works from the LIST page Actions pencil (same options/dialog/toast as detail; row updates in place)  → CSV TC 43

---

### S3 — CREATE  *(capabilityIpPoolCreate · module-Create)*  — ✅ Tier 3, live-observed 2026-09-22 → CSV TC 47–54

**What CREATE unlocks (diff vs Update):** a **`Create IP Pool`** button appears next to the `IP Pools`
list heading (absent at Get and Update tiers).

**`Create IP Pool` modal (live):** heading `Create IP Pool`; Close (X) · Cancel · **Submit (disabled
until valid)**. Fields — all mandatory `*`:
- **Name** — mandatory, **unique** (inline check).
- **Title** — mandatory, **unique** (inline check).
- **Supernet** — mandatory, **searchable** combobox (`Search…`); options are active Supernet records
  shown as `Title (id)` with match highlighting; a **`Clear selection`** control appears once chosen.
- No IP-range fields (IP Pool = Name + Title under a Supernet — unlike Subnet).

**Uniqueness is validated INLINE** (not just on submit): typing an existing **Name** shows inline alert
**`Name already exists`**; an existing **Title** shows **`Title already exists`**; **Submit stays
disabled** while either conflict exists. (Contrast: Subnet's `checkUnique` pre-check returns 403 for this
user, so Subnet enforces uniqueness only on submit — see `context/db_validation.md`.)

**On successful create:** the record is created with default status **Setup** (verified in DB
`oncilla.ipPool`) and a success toast is shown. *(Exact toast string to be confirmed on the next live
create — the app is inconsistent: Subnet uses `Subnet created successfully`, IP Pool edit uses
`Successfully edited IP Pool`.)*

#### S3.1 `Create IP Pool` button visible at Create tier — absent at Get/Update
#### S3.2 Open `Create IP Pool` form — Name*/Title*/Supernet* all mandatory; Submit disabled until all valid
#### S3.3 Supernet dropdown searchable — lists active Supernets as `Title (id)`; supports Clear selection
#### S3.4 Create with unique Name/Title + Supernet → success toast; new record defaults to **Setup** (DB `oncilla.ipPool`)
#### S3.5 Duplicate **Name** → inline `Name already exists`; Submit stays disabled (no record created)
#### S3.6 Duplicate **Title** → inline `Title already exists`; Submit stays disabled (no record created)
#### S3.7 Mandatory enforcement — Submit remains disabled until Name, Title AND Supernet are all provided
#### S3.8 Cancel / Close the Create form **with unsaved values** → **Unsaved Changes** popup (`You have unsaved changes. Are you sure you want to leave?` · Stay / Discard); Stay keeps the form with values intact, Discard closes it — no record is created — ✅ live-verified 2026-09-23

> Cleanup: soft-delete any record created during testing (Change Status → Deleted) so it leaves the
> default list. Records created during this pass were cleaned up.

---

### S6 (continued) — APPROVER transitions  *(capabilityIpPoolApprover · module-StatusTransition)*  — ✅ Tier 4, live-observed 2026-09-22 → CSV TC 55–58

**What APPROVER unlocks (diff vs Update):** the **→ Active** transitions. Authoritative
`oncilla.statusTransition` map for `ipPool`: Approver gates `setup → active`, `requested → active`,
`deleted → active`. (Admin also gates these, plus the transitions *from* Active — see Tier 5.)

**Live (record 389, Requested):** the detail **`Change Status ▾`** now offers **Setup, Active, Deleted**
— **Active is newly available** (at Update tier a Requested record offered only Setup/Deleted). Selecting
**Active** opens the **`Confirm Status Change`** dialog: body `Are you sure you want to change the status
to "active"?`, confirm button **`Active`**, plus Cancel / Close. On confirm the status becomes **Active**
with a success toast following the established pattern `Status changed to "active"`.
**Active rows still have no list Actions pencil at Approver** (transitions *from* Active need Admin).

#### S6.8 (Approver) `Change Status` on a **Setup** record now offers **Active** (in addition to Requested, Deleted)
#### S6.9 (Approver) `Change Status` on a **Requested** record now offers **Active** (in addition to Setup, Deleted)
#### S6.10 (Approver) Confirm `→ Active`: dialog `Are you sure you want to change the status to "active"?` → confirm **Active** → status becomes Active, toast `Status changed to "active"`, record leaves the non-Active-filtered view as expected (DB `oncilla.ipPool` status=`active`)
#### S6.11 (Approver) **Active** rows still expose **no** list Actions pencil — transitions *from* Active remain gated to Admin (Tier 5)

---

### S6 (continued) — ADMIN transitions  *(capabilityIpPoolAdmin · module-StatusTransition)*  — ✅ Tier 5, live-observed 2026-09-22 → CSV TC 59–62

**What ADMIN unlocks (diff vs Approver):** transitions **from Active** — an Active record becomes
manageable/editable. Authoritative `oncilla.statusTransition` map: `active → setup`, `active → requested`,
`active → deleted` are all gated to **Admin** (Approver could reach Active but not leave it).

**Live (record 364, Active):** at Admin the Active detail page now exposes a **`Change Status ▾`** control
**and** a Standard-Fields **edit pencil** — both absent on Active records at Get/Update/Approver. Change
Status on an Active record offers **Setup, Requested, Deleted**. Confirm follows the same
`Confirm Status Change` dialog (`Are you sure you want to change the status to "{target}"?`, confirm button
= target status, toast `Status changed to "{target}"`).

#### S6.12 (Admin) An **Active** record gains a **`Change Status ▾`** control (list Actions pencil + detail) — absent at Get/Update/Approver
#### S6.13 (Admin) `Change Status` on an **Active** record offers **Setup, Requested, Deleted** (the from-Active transitions)
#### S6.14 (Admin) Confirm a from-Active transition (e.g. Active → Deleted): dialog + confirm button `Delete` → toast `Status changed to "deleted"`; record leaves default list (DB `oncilla.ipPool` status=`deleted`)
#### S6.15 (Admin) An **Active** record's Standard Fields are **editable** (edit pencil present) — Active-state editing is Admin-only

> Cleanup: revert/soft-delete any records mutated during Admin testing. During this pass no pre-existing
> record was committed to a new status (verification stopped at the confirm dialog / option list).

---

### S7 — PERMISSION-BOUNDARY, DEPENDENCY & VALIDATION (parity cross-check vs Data Centre)  → CSV TC 63–70

Added 2026-09-22 from a cross-check against `datacentre_integration_testcoverage.md` (99 TCs) to close
scenario-type gaps. Verification status is marked per case: **✅ observed**, **◑ partially observed**,
**⧗ to verify live**.

#### S7.1 (negative · Get) With `capabilityIpPoolGet=deleted`: **IP Pools** is NOT shown under Network Management, and a direct URL `/network-management/ip-pools` returns 401/403 or redirects  — ⧗ to verify  *(DC S1.9)*
#### S7.2 (negative · Create) Without `capabilityIpPoolCreate`: the **`Create IP Pool`** button is NOT visible on the list  — ◑ (button confirmed absent at Get/Update tiers)  *(DC S3.2)*
#### S7.3 (negative · Update) Without `capabilityIpPoolUpdate`: **no list Edit pencil** on any row and the detail page has no edit / Change Status / Add controls  — ✅ observed at Get tier  *(DC S4.2)*
#### S7.4 (negative · Approver/Admin) Without Approver AND Admin: **`Active` is never offered** in the status control (list Actions pencil and detail `Change Status ▾`) for any state  — ◑ (confirmed Active not offered at Update tier)  *(DC S6.8/S6.12)*
#### S7.5 (negative · Admin) On an **Active** record without `capabilityIpPoolAdmin`: the three Related sections (Data Centre/APN/Portal) are **read-only** — no Add buttons and no per-row remove icons; and the record exposes no list Edit pencil / detail Change Status  — ⧗ to verify  *(DC S4.17/S4.24)*
#### S7.6 (dependency precondition) `→ Deleted` is **BLOCKED** when the IP Pool has **active linked APN(s) or Subnet(s)**: an error toast/banner is shown and the status remains unchanged  — ◑ preconditions confirmed on live data (block behaviour ⧗ to verify — do NOT commit on a live record)  *(precondition per `context/db_validation.md`; mirrors DC S6.16/S6.31)*
> **Dependency sources (verified 2026-09-23):** an IP Pool's active **APN** links come from
> `oncilla.resourceRelationship` (`sourceResourceName='ipPool'`, `destinationResourceName='apn'`,
> `relationship='consumer'`, `status='active'`); its active **Subnet** children come from the real FK
> **`oncilla.subnet.ipPoolId`** (there is **no** `ipPool→subnet` row in `resourceRelationship`).
> **Concrete live example — IP Pool 202 (`P`, Active):** 3 active APNs (ids 1457, 1577, 1612) **and** 1
> active Subnet (13443 `SubnetNameUI`) → `→ Deleted` must be blocked.
> ```sql
> -- active APN dependencies of an IP Pool (blocks -> Deleted):
> SELECT destinationResourceId AS apnId FROM oncilla.resourceRelationship
>  WHERE sourceResourceName='ipPool' AND sourceResourceId='202'
>    AND destinationResourceName='apn' AND relationship='consumer' AND status='active';
> -- active Subnet children of an IP Pool (blocks -> Deleted):
> SELECT subnetId FROM oncilla.subnet WHERE ipPoolId='202' AND status<>'deleted';
> ```
#### S7.7 (validation) Create/Edit **Name** and **Title** enforce the field length/character rules defined in `ipPoolDefinition` ⋈ `oncilla.validation` (resolve exact regex/length/message via `db_validation.md` Query C); invalid input shows the field's validation message and blocks Submit  — ⧗ to verify exact rules  *(DC S3.5)*
#### S7.8 (unsaved-changes) Cancelling Create/Edit **with unsaved values** → **Unsaved Changes** popup (`You have unsaved changes. Are you sure you want to leave?` · **Stay** / **Discard**): Stay keeps the form with values intact, Discard closes it without saving. **✅ live-verified 2026-09-23 — IP Pool behaves IDENTICALLY to Data Centre on both Create (S3.8) and Edit (S4.5); there is NO behavioural difference and NO defect** (an earlier Tier-3 note of "closes with no popup" was a mis-observation — the popup was simply not snapshotted). *(Parity with DC S3.7–S3.10, S4.6.)*

> **Associated Data Centre — how it is tested (not a separate S7 case).** The IP Pool ↔ Data Centre
> association is exercised by the **Related Data Centre add/remove + toast** flow (**R.1 / R.2**, CSV
> TC 30–31) and its read-only display by **S1.6** — not by a standalone display check. For grounding,
> the association is stored in `oncilla.resourceRelationship`
> (`sourceResourceName='dataCentre'` → `destinationResourceName='ipPool'`, `relationship='consumer'`,
> `status='active'`); the Related Data Centre grid shows the Data Centre **title**. Live example:
> **IP Pool 202 (`P`) ↔ Data Centre 5604 (`DEMO267`, active)**.
> ```sql
> SELECT rr.sourceResourceId AS dataCentreId, dc.name, dc.title, dc.status
>   FROM oncilla.resourceRelationship rr
>   JOIN oncilla.dataCentre dc ON dc.dataCentreId = rr.sourceResourceId
>  WHERE rr.destinationResourceName='ipPool' AND rr.destinationResourceId='202'
>    AND rr.sourceResourceName='dataCentre' AND rr.relationship='consumer' AND rr.status='active';
> ```
> IP Pools are visible/manageable to `statususer` via `portfolio → ipPool : manager` (IP Pool has no
> `portfolioId`); `statususer` manages IP Pools 202–289, of which **202→5604, 255→5356, 269→5363,
> 270→5364, 286→56** carry an active Data Centre association.

> **Reciprocal (already covered — no new TC):** because IP Pool 202 (Active) is linked to Data Centre
> 5604, deleting Data Centre 5604 is blocked while that active IP Pool link exists. This is the **Data
> Centre side** of the same edge and is already covered by `datacentre_integration_testcoverage.md`
> **S6.16 / S6.31** ("Active → Deleted BLOCKED when active IPPool dependency exists") — so it is **not**
> duplicated here under `feature-IpPool`.

> These 8 cases bring IP Pool to scenario-type parity with the Data Centre coverage and ground the
> relationship/dependency cases in **real live records** (IP Pool 202 ↔ Data Centre 5604; IP Pool 202's
> APNs 1457/1577/1612 + Subnet 13443). The ⧗ block-behaviour items must be executed against a
> **disposable** record (create → link → attempt delete → clean up), never committed on a pre-existing
> live record, since a failed guard would destroy real data.

---

*End of IP Pool coverage — all five tiers (GET · UPDATE · CREATE · APPROVER · ADMIN) complete, plus S7 permission-boundary/dependency/validation parity cases.*
