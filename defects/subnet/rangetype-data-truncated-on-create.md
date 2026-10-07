# Defect — Creating a Subnet with certain Range Types fails with a raw MySQL error

| Field | Value |
|---|---|
| Module | Subnet |
| Area | Create New Subnet — `capabilitySubnetCreate` |
| Severity | Medium/High — creation blocked for affected Range Types; **raw database error leaked to the UI** |
| Type | Backend data/column defect + error-handling defect (raw SQL error surfaced to end user) |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| Test account | `statususer` / `Password#1` (needs the Create capability active) |
| Found | 2026-09-01 (Subnet Tier 3 exploration) |

---

## Summary
When creating a Subnet and choosing certain **Range Type** values, the backend fails and the **raw MySQL error is shown to the user** in the toast:

> **`1265: 1265 (01000): Data truncated for column 'rangeType' at row 1`**

The same create succeeds if a different Range Type is chosen. This was reproduced with Range Type **`SSRTesting0 (35)`** (fails) vs **`external (27)`** (succeeds) — all other form values identical.

Two problems:
1. Some Range Types cannot be used to create a Subnet (backend column cannot hold the derived `rangeType` value).
2. A **raw database error string is surfaced verbatim** to the end user instead of a friendly validation message.

---

## Preconditions
- User logged in with the **Create** Subnet capability.
- A Supernet with free IP space (so the create is otherwise valid). Example used: **`test1234` (14501)**, applicable range `123.213.123.123 – 231.231.231.212`, with the free block around `177.222.177.167 / 177.222.177.168`.

## Steps to reproduce (manual)
1. Log in as `statususer`.
2. Go to **Network Management → Subnets**.
3. Click **Create Subnet** (top of the list) to open the **Create New Subnet** form.
4. In the **Supernet** field, use the dropdown's **Search…** box to find and select a Supernet with free space — e.g. type `test1234` and select **`test1234 (14501)`**. The other fields unlock and a helper shows the applicable IP range.
5. Fill in:
   - **Title:** a unique value, e.g. `SubT3DefectRT`
   - **Name:** e.g. `SubT3DefectRT`
   - **Min IP:** `177.222.177.167`
   - **Max IP:** `177.222.177.168`
   - **Allocation Strategy:** `same` (any active value)
   - **Range Type:** **`SSRTesting0 (35)`**  ← the trigger
6. Click **Submit**.

## Expected result
Either the Subnet is created, or — if that Range Type is genuinely invalid — a clear, user-friendly validation message is shown (e.g. "Selected Range Type is not valid"). No raw database error should ever reach the UI.

## Actual result
- Creation fails with the raw error toast:
  **`1265: 1265 (01000): Data truncated for column 'rangeType' at row 1`**
- No record is created.

## Contrast (positive control)
Repeat the exact steps but choose Range Type **`external (27)`** instead of `SSRTesting0 (35)` → creation **succeeds** with toast **`Subnet created successfully`** and the new record is created with default status **Setup**. (Clean up the created record afterwards via **Change Status → Deleted**.)

---

## Evidence (captured live)
- **Observable symptom (toast):** `1265: 1265 (01000): Data truncated for column 'rangeType' at row 1`
- **Create endpoint:** `POST /api/catalog/subnet/execute` (permission `subnetCreate`). Successful creates on this endpoint return `Subnet created successfully`; the failing Range Type returns an error at this call.
- MySQL error **1265 "Data truncated for column"** indicates the value the backend tries to write into a column named **`rangeType`** is too long / not permitted for that column's definition (e.g. an `ENUM` or a short `VARCHAR`). The value is evidently derived from the chosen Range Type record (id 35, `SSRTesting0`).
- **Not yet captured:** the exact HTTP status code and JSON body of the failing `POST` (only the toast text was recorded). Recommend capturing the response for the bug ticket — reproduce with dev-tools/Network open on step 6.

## Suggested fix
- Backend: widen/correct the `rangeType` column (or fix the mapping that derives it) so all active Range Types are storable; add a guard that validates the Range Type before the insert.
- Error handling: never surface raw SQL/driver errors to the UI — map them to a generic, user-facing validation message.

## Notes / open questions
- Determine **which** Range Types trigger this (is it length-based? a specific set?). `SSRTesting0` (11 chars) fails; `external` (8) works — but confirm whether it is length, a bad character, or a specific column mapping.
- Related create-form finding (not itself a defect, but relevant): the Title uniqueness pre-check `GET /api/catalog/checkUnique/execute?objectName=subnet&title=…` returns **403** for this user, so the form cannot pre-validate Title uniqueness — it is only enforced on submit.
