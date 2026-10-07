# Defect — Editing a Subnet is blocked when its Allocation Strategy is inactive

| Field | Value |
|---|---|
| Module | Subnet |
| Area | Edit Subnet (Standard Fields) — `capabilitySubnetUpdate` |
| Severity | High — affected subnets become **un-editable** (even for unrelated changes) |
| Type | Data-integrity + form-validation gap; raw FK-validation error surfaced to UI |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| Test account | `statususer` / `Password#1` (needs the Update capability active) |
| Found | 2026-09-01 (Subnet Tier 2 exploration) |

---

## Summary
A Subnet stores a foreign key to an **Allocation Strategy**. If that Allocation Strategy is later **deactivated** (its status moved to anything other than `active`) while subnets still reference it, those subnets can **no longer be saved from the Edit form** — the Edit form pre-fills the now-inactive strategy as plain display text, re-submits it unchanged, and the backend rejects the write with:

> **`allocationStrategyId doesn't exist or not active.`**

This happens even when the user is only changing an unrelated field (e.g. the Name).

---

## Preconditions
- User is logged in with the **Update** (or higher) Subnet capability.
- A subnet exists whose **Allocation Strategy references a non-active value**.
  - At the time of discovery, allocation strategy **`unique (1)`** is in status `setup` (not active), and many subnets reference it.
  - **A known reproducible record:** Subnet **`91575`** ("SubnetByIdFixtureStatus", Supernet `14519`) — URL `…/network-management/subnets/14519/91575`.
  - If that record has since been fixed, find another with this DB query (run against `oncilla`):
    ```sql
    SELECT s.subnetId, s.supernetId, s.title, a.title AS allocStrategy, a.status
    FROM oncilla.subnet s
    JOIN oncilla.allocationStrategy a ON a.allocationStrategyId = s.allocationStrategyId
    WHERE a.status <> 'active' AND s.status IN ('setup','requested','deleted')
    LIMIT 20;
    ```

## Steps to reproduce (manual)
1. Log in to the portal as `statususer`.
2. Go to **Network Management → Subnets**.
3. Open a subnet whose **Allocation Strategy** column shows a non-active value such as **`unique (1)`** (e.g. open `…/subnets/14519/91575`). Wait for the detail page to finish loading (it is slow — several seconds on "Loading...").
4. In the **Standard Fields** section, click the **Edit (pencil)** icon to open the **Edit Subnet** form.
5. Observe the **Allocation Strategy** field shows the current value (e.g. `unique (1)`) as text — **but it is not a selectable option** if you open the dropdown (the dropdown lists only *active* strategies).
6. Change any editable field — e.g. append a character to **Name** — so **Submit** becomes enabled.
7. Click **Submit** without touching the Allocation Strategy field.

## Expected result
Either the change saves (the unchanged Allocation Strategy should not block an unrelated edit), **or** the form clearly flags the Allocation Strategy field inline and prevents submit with a user-friendly message.

## Actual result
- The save is rejected and an **error toast** appears:
  **`allocationStrategyId doesn't exist or not active.`**
- The record is **not** updated. The subnet is effectively **un-editable** until the user manually re-selects a different, **active** Allocation Strategy (which changes data the user may not have intended to change).

---

## Evidence (captured live)

**Form-load call 1 — the record** `GET /api/catalog/subnetById/execute?supernetId=13395&subnetId=13452&enrich=title` → **200**
```json
{ "subnetId":13452, "allocationStrategyId":1, "allocationStrategyTitle":"unique", "status":"setup", ... }
```
The form pre-fills `unique (1)` from this.

**Form-load call 2 — the dropdown options** `GET /api/catalog/allocationStrategy/execute?status=active&pageSize=50` → **200**
```
itemCount: 14  — ids present: 992,987,984,497,496,30,29,22,16,6,5,4,3,2
```
**id 1 ("unique") is absent** (the endpoint is hard-filtered to `status=active`). So the pre-filled value has no matching selectable option.

**Submit** `PATCH /api/catalog/subnetById/execute` → **400**
- Request body (note it re-sends the unchanged FK as `allocationStrategyId:"1"`):
  ```json
  {"subnetId":"13452","supernetId":"13395","netmaskBits":"31","allocationStrategyId":"1",
   "rangeTypeId":"1","maxIp":"249.237.123.53","minIp":"249.237.123.52",
   "title":"qw|%s_13459","name":"qw|%s "}
  ```
- Response body:
  ```json
  {"data":{"additionalDetails":{"error":"allocationStrategyId doesn't exist or not active."},
   "errorCode":6006,"errorTag":"bad_request","message":"Bad request"}}
  ```
- The endpoint requires permission `subnetUpdate` (the user has it) — so this is a **business-validation** rejection, not a permission issue.

**DB ground truth** (`oncilla.allocationStrategy`)
```
allocationStrategyId=1  title='unique'  status='setup'   (deactivated 2026-08-11)
allocationStrategyId=2  title='same'    status='active'
```
Only 14 of 36 allocation strategies are `active`; subnets created earlier still point at now-inactive ids.

---

## Root cause (two layers)
1. **Referential-integrity gap:** an Allocation Strategy was deactivated (`active` → `setup`) while subnets still referenced it; nothing migrated or blocked those subnets.
2. **Form/write gap:** the Edit form re-sends the unchanged FK, and the write endpoint re-validates it against active-only strategies. A record with a stale-but-unchanged FK cannot be saved even for edits that don't touch that field.

## Suggested fix (any of)
- Include the record's current Allocation Strategy in the edit dropdown even if inactive (flagged as inactive), so the value round-trips.
- Skip re-validation of an FK that was not changed in the request.
- Prevent deactivating an Allocation Strategy that is still referenced by non-deleted subnets (or cascade/migrate on deactivate).

## Notes
- The same mechanism could affect **any** subnet FK re-validated on write (e.g. `rangeTypeId`) — worth checking whether inactive Range Types cause the same failure.
