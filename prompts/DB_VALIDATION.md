# DB VALIDATION — ONCILLA SCHEMA REFERENCE

> Use this file when writing and executing Playwright test scripts (Phase 2 onwards).
> The Planner agent (Phase 1) does not need this — it discovers structure live from the UI.
> Reference: `utils/dbUtils.js` for the connection helper, `.env` for credentials.

---

## DB Connection

```js
// CommonJS — matches project package.json "type": "commonjs"
const { createDbConnection } = require('./utils/dbUtils');
const db = await createDbConnection();
// ... run queries ...
await db.end(); // always close after use
```

`.env` keys: `QA_DB_HOST`, `QA_DB_USER`, `QA_DB_PASSWORD`, `QA_DB_NAME=oncilla`

---

## Verified Schema — Column Names

### `oncilla.user`
| Column | Type | Notes |
|---|---|---|
| `userId` | VARCHAR | Primary key |
| `portfolioId` | VARCHAR | Linked portfolio |
| `username` | VARCHAR | Match against CONFIG USERNAME |
| `status` | VARCHAR | `'active'` \| `'inactive'` \| `'suspended'` |
| `systemSuspend` | ENUM | `'yes'` \| `'no'` |
| `adminSuspend` | ENUM | `'yes'` \| `'no'` |
| `customerSuspend` | ENUM | `'yes'` \| `'no'` |
| `firstName`, `lastName`, `emailAddress` | VARCHAR | — |
| `modifiedUserId`, `modifiedDate` | — | Audit fields |

### `oncilla.userPermission`
| Column | Type | Notes |
|---|---|---|
| `userPermissionId` | INT | Primary key |
| `title` | VARCHAR | Capability e.g. `capabilityDataCentreGet` |
| `userId` | VARCHAR | FK to `oncilla.user` |
| `portfolioId` | VARCHAR | FK to portfolio |
| `status` | VARCHAR | `'active'` \| `'inactive'` \| `'deleted'` — **use `status`, NOT `state`** |
| `permissionId` | INT | FK to permission definition |
| `inService`, `outofService`, `createdDate`, `modifiedDate` | DATETIME | — |

### `oncilla.{module}Definition` (e.g. `oncilla.dataCentreDefinition`)
| Column | Type | Notes |
|---|---|---|
| `attribute` | VARCHAR | Field name in DB and form (e.g. `name`, `title`) |
| `title` | VARCHAR | Display label shown in UI |
| `Description` | VARCHAR | Tooltip / helper text |
| `flag` | VARCHAR | Comma-separated: `'mandatory'`, `'unique'`, `'unique,mandatory'` |
| `validationId` | INT | FK to `oncilla.validation` (NULL = no regex) |
| `displaySequence` | INT | Field order — lower = first; `0` = PK/auto-generated |
| `readSphereId`, `writeSphereId` | INT | Permission sphere mappings |
| `status` | VARCHAR | `'active'` \| `'inactive'` |

**Parsing `flag`:**
- `'mandatory'` → required field, show `*` in form, submit blocked if empty
- `'unique'` → must be unique across records
- `'unique,mandatory'` → both
- empty / NULL → optional, no uniqueness constraint

### `oncilla.validation`
| Column | Type | Notes |
|---|---|---|
| `validationId` | INT | Primary key — FK from `{module}Definition.validationId` |
| `title` | VARCHAR | Field name this applies to |
| `description` | VARCHAR | User-facing error/help message shown in UI |
| `regex` | VARCHAR | Validation regex pattern |
| `dataType` | VARCHAR | `'string'` \| `'integer'` \| `'decimal'` |
| `length` | INT | Maximum character length |
| `status` | VARCHAR | `'active'` \| `'inactive'` |

**Known validation rules (confirmed from live DB):**

| validationId | Field | Regex | Max Length | UI Error Message |
|---|---|---|---|---|
| 10 | title | `^\S{1,32}$` | 32 | Please enter a title with 1-32 characters. Spaces are not allowed. |
| 11 | name | `^[^\n]{1,128}$` | 128 | Please enter 1-128 characters. Newlines are not allowed. |
| 12 | description | `^.{0,255}$` | 255 | Please enter up to 255 characters. |

### `oncilla.resourceRelationship`
| Column | Type | Notes |
|---|---|---|
| `sourceResourceName` | VARCHAR | Parent entity type — e.g. `'dataCentre'`, `'ipPool'` |
| `sourceResourceId` | VARCHAR | Primary key of the parent record |
| `destinationResourceName` | VARCHAR | Child entity type — e.g. `'ipPool'`, `'subnet'` |
| `destinationResourceId` | VARCHAR | Primary key of the child record |
| `status` | VARCHAR | `'active'` \| `'inactive'` |

**Used for:** generic cross-entity dependency checks (e.g. DataCentre→IPPool, IPPool→Subnet).

**Known `resourceRelationship` patterns used in precondition checks:**

| Source | Destination | Used to block |
|---|---|---|
| `dataCentre` | `ipPool` | DataCentre →Deleted when active IPPools exist |
| `ipPool` | `apn` | IPPool →Deleted when active APNs exist |
| `ipPool` | `subnet` | IPPool →Deleted when active Subnets exist |

```sql
-- DataCentre: check active IPPools before →Deleted
SELECT * FROM oncilla.ipPool WHERE ipPoolId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName='dataCentre' AND destinationResourceName='ipPool'
    AND sourceResourceId='{dataCentreId}' AND status='active'
);

-- IPPool: check active APNs before →Deleted
SELECT * FROM oncilla.apn WHERE apnId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName='ipPool' AND destinationResourceName='apn'
    AND sourceResourceId='{ipPoolId}' AND status='active'
);

-- IPPool: check active Subnets before →Deleted
SELECT * FROM oncilla.subnet WHERE subnetId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName='ipPool' AND destinationResourceName='subnet'
    AND sourceResourceId='{ipPoolId}' AND status='active'
);

-- IPPool: COMBINED — check both APNs + Subnets in one query
SELECT COUNT(*) AS activeDependencies
FROM oncilla.resourceRelationship
WHERE sourceResourceName = 'ipPool'
  AND sourceResourceId   = '{ipPoolId}'
  AND destinationResourceName IN ('apn', 'subnet')
  AND status = 'active';
-- Must return 0 for →Deleted transition to succeed
```

---

## Query A — Resolve Test User

```sql
SELECT userId, portfolioId, username, status,
       systemSuspend, adminSuspend, customerSuspend
FROM oncilla.user
WHERE username = '{USERNAME}';
```
> `status` must be `'active'` and all suspend flags `'no'` — otherwise the user cannot log in.

---

## Query B — Resolve Active Permissions for a Module

```sql
SELECT userPermissionId, title, status, portfolioId
FROM oncilla.userPermission
WHERE userId    = '{USER_ID}'
  AND title     LIKE '%capability{Module}%'
  AND status    = 'active';
```

> **Live result for `statususer` / DataCentre:** Only `capabilityDataCentreGet` is active.
> Create button NOT visible · Edit icon NOT visible · Status change NOT available.

---

## Permission Deactivation Queries (Negative TC — Option B)

Use these when temporarily removing a capability from `FULL_USER` to execute a negative TC. Always restore after the TC completes.

```sql
-- Deactivate capability before negative TC
UPDATE oncilla.userPermission
SET status = 'deleted'
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title = 'capability{Module}{Action}';

-- Restore capability after negative TC
UPDATE oncilla.userPermission
SET status = 'active'
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title = 'capability{Module}{Action}';
```

> Use `status = 'deleted'` for deactivation — not `'inactive'`. This keeps it distinguishable from system-managed inactive states and is consistent with the platform's status model.

---

## Query C — Full Field Definitions (Definition + Validation JOIN)

One query returns every form field with label, flags, regex, max length, and error message:

```sql
SELECT
  d.attribute        AS fieldName,
  d.title            AS displayLabel,
  d.Description      AS tooltip,
  d.flag             AS fieldFlags,
  d.displaySequence  AS fieldOrder,
  v.description      AS validationMessage,
  v.regex,
  v.dataType,
  v.length           AS maxLength
FROM oncilla.{module}Definition d
LEFT JOIN oncilla.validation v ON d.validationId = v.validationId
WHERE d.status = 'active'
ORDER BY d.displaySequence;
```

| Result column | Use in scripts |
|---|---|
| `fieldName` | Locator target and DB column name |
| `displayLabel` | `expect(label).toHaveText(displayLabel)` |
| `tooltip` | `expect(tooltip).toHaveText(tooltip)` |
| `fieldFlags` contains `mandatory` | Assert submit blocked when empty |
| `fieldFlags` contains `unique` | Assert duplicate error shown |
| `fieldOrder = 0` | PK — shown in grid, NOT in create form |
| `validationMessage` | Exact text to assert on invalid input |
| `regex` | Use to generate failing inputs in negative TCs |
| `maxLength` | Boundary test: `maxLength` chars passes, `maxLength+1` fails |

---

## Query D — Cross-Verification Queries

```sql
-- Record count: UI vs DB
SELECT COUNT(*) FROM oncilla.{module} WHERE status != 'deleted';

-- Verify record created
SELECT * FROM oncilla.{module} WHERE {pk} = '{createdId}';

-- Verify field values after update
SELECT {field1}, {field2} FROM oncilla.{module} WHERE {pk} = '{id}';

-- Verify status after transition
SELECT status FROM oncilla.{module} WHERE {pk} = '{id}';

-- Verify permission active
SELECT status FROM oncilla.userPermission
WHERE userId = '{userId}' AND title = '{capability}';

-- Verify permission absent (negative)
SELECT COUNT(*) FROM oncilla.userPermission
WHERE userId = '{userId}' AND title = '{capability}' AND status = 'active';
-- Expected: 0

-- Verify dropdown source
SELECT {labelField} FROM oncilla.{sourceTable} WHERE status = 'active';
```

---

## Query E — Pre-Phase 1 Capability Check

Run these in your DB client before starting Phase 1 to verify `FULL_USER` has all capabilities active for `TARGET_MODULE`.

```sql
-- Check current capability state for FULL_USER on TARGET_MODULE
SELECT title, status
FROM oncilla.userPermission
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title LIKE '%capability{Module}%'
ORDER BY title;
-- Expected: 5 rows, all status = 'active'

-- Activate a missing or inactive capability
UPDATE oncilla.userPermission
SET status = 'active'
WHERE userId = (SELECT userId FROM oncilla.user WHERE username = '{FULL_USER}')
  AND title = 'capability{Module}{Action}';
```

---

## Query F — Precondition Verification Queries (Status Transitions)

Use these to verify preconditions before and after status transition TCs in S6.

### IPPool

```sql
-- Verify mandatory fields before Requested→Active
SELECT {mandatoryField1}, {mandatoryField2} FROM oncilla.ipPool WHERE ipPoolId = '{ipPoolId}';
-- All must be non-NULL for transition to succeed

-- Verify no active APN is linked to this IPPool before →Deleted
SELECT * FROM oncilla.apn WHERE apnId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName      = 'ipPool'
    AND destinationResourceName = 'apn'
    AND sourceResourceId        = '{ipPoolId}'
    AND status                  = 'active'
);
-- Must return 0 rows for transition to succeed

-- Verify no active Subnet is linked to this IPPool before →Deleted
SELECT * FROM oncilla.subnet WHERE subnetId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName      = 'ipPool'
    AND destinationResourceName = 'subnet'
    AND sourceResourceId        = '{ipPoolId}'
    AND status                  = 'active'
);
-- Must return 0 rows for transition to succeed

-- COMBINED: check both active APNs and Subnets in one query
SELECT COUNT(*) AS activeDependencies
FROM oncilla.resourceRelationship
WHERE sourceResourceName      = 'ipPool'
  AND sourceResourceId        = '{ipPoolId}'
  AND destinationResourceName IN ('apn', 'subnet')
  AND status                  = 'active';
-- Must return 0 for →Deleted transition to succeed
```

### DataCentre

```sql
-- Verify mandatory fields before Requested→Active
SELECT {mandatoryField1}, {mandatoryField2} FROM oncilla.dataCentre WHERE dataCentreId = '{dataCentreId}';
-- All must be non-NULL for transition to succeed

-- Verify no active IPPool is linked to this DataCentre before →Deleted
-- Uses resourceRelationship junction table — not a direct FK on ipPool
SELECT * FROM oncilla.ipPool WHERE ipPoolId IN (
  SELECT destinationResourceId FROM oncilla.resourceRelationship
  WHERE sourceResourceName      = 'dataCentre'
    AND destinationResourceName = 'ipPool'
    AND sourceResourceId        = '{dataCentreId}'
    AND status                  = 'active'
);
-- Must return 0 rows for transition to succeed
```

---

## DB Step Templates for Test Scripts

| Operation | DB assertion pattern |
|---|---|
| Create | `SELECT * FROM oncilla.{module} WHERE {pk}='{newId}'` → record exists, field values match |
| Update | `SELECT {editedFields} FROM oncilla.{module} WHERE {pk}='{id}'` → values match input |
| Status change | `SELECT status FROM oncilla.{module} WHERE {pk}='{id}'` → returns `'{newStatus}'` |
| Permission positive | `SELECT status FROM oncilla.userPermission WHERE userId='{userId}' AND title='{cap}'` → `'active'` |
| Permission negative | `SELECT COUNT(*) … AND status='active'` → `0` |
| Grid count | `SELECT COUNT(*) FROM oncilla.{module} WHERE status!='deleted'` → matches UI count |
| Dropdown values | `SELECT {labelField} FROM oncilla.{sourceTable} WHERE status='active'` → matches UI options |
| Form fields | `SELECT attribute, flag FROM oncilla.{module}Definition WHERE status='active'` → matches UI form |
| Regex validation | `SELECT regex, description FROM oncilla.validation v JOIN oncilla.{module}Definition d ON v.validationId=d.validationId WHERE d.attribute='{field}'` → regex and message match UI |
