# Defect — Detail page "Change Status" control unreliable (absent for Active/Exported records)

| | |
|---|---|
| **Module** | Finance → Billing Transactions |
| **Area** | Status transition — Detail page `Change Status ▾` control |
| **Severity** | Medium (functional gap on the detail page; list page is a full workaround) |
| **Found** | 2026-10-06, QAN, user `statususer` (elevated per tier) |
| **Spec** | `tests/billing-transactions-status.spec.js` — affected detail tests are `test.fixme` |

## Summary

On the **Detail** page, the `Change Status ▾` button **fails to render for records whose
current status is `Active` or `Exported`**, so no status transition can be started from the
detail page for those records. The button also intermittently fails to appear for base-state
records (observed for Approver `→ Active` from Setup/Requested/Deleted). The **List** page's
Actions (⋮) menu works correctly for every state and permission.

## Live evidence

Full tier-by-tier run (2026-10-06), detail entry point:

| Detail transition | Source state | Result |
|---|---|---|
| Setup/Requested/Deleted → Exported | base | ✅ pass (button renders) |
| Active → Setup / Requested / Deleted | **Active** | ✅ pass (intermittent — button rendered this run) |
| Active → Exported | **Active** | ❌ `Change Status` button not visible |
| Exported → Setup / Requested / Active / Deleted | **Exported** | ❌ `Change Status` button not visible (4/4) |
| (Approver) Setup/Requested/Deleted → Active | base | ❌ button not visible / option absent (earlier run) |

Every failure's locator is identical: `getByRole('button', { name: 'Change Status' })` not
visible (30s). The **list** Actions (⋮) menu offered and performed all of these transitions
successfully in the same runs.

## Expected

Per the status model and list/detail parity (NUI-8040/8041), the detail `Change Status`
control must be present and offer the same permitted options as the list for **every** record
state, including `Active` and `Exported`.

## Actual

The detail `Change Status` button is absent for `Active`/`Exported` records (and flaky for some
base-state cases), blocking detail-page transitions from those states.

## Impact on automation

The shared `transition()` helper now fails fast (15s) instead of a 180s hang. Affected
detail-page tests are `test.fixme` referencing this defect; the **list** entry point covers the
same transitions and passes.

## Affected Xray tests (fixme)

- Approver detail → Active: **NUI-8015, NUI-8016, NUI-8017**
- Admin detail Active→Exported: **NUI-8026**
- Admin detail from Exported: **NUI-8047, NUI-8048, NUI-8049, NUI-8050**
- Admin detail Deleted→Exported: **NUI-8043** (flaky — failed 3/3 with retries in the combined run)
- Admin detail availability (Active / Exported): **NUI-8034, NUI-8035**

(Unrelated: **NUI-8018** is fixme for a separate reason — mandatory-field NULL block, not reproducible without a NULL-seeded record.)
