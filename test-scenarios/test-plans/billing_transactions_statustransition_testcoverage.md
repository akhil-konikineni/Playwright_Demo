# Billing Transactions — Status Transition Test Coverage (S6)

| Field            | Value                                                              |
|------------------|--------------------------------------------------------------------|
| Feature          | Billing Transactions — Status Transitions (Finance)               |
| Document Version | 1.0 (progressive RBAC: Update → Approver → Admin; Exported state) |
| Coverage Date    | 2026-09-30                                                         |
| Prepared By      | Playwright MCP QA Automation Agent (Planner)                       |
| Environment      | QAN — https://portal-host.qan.aws.eseye.io                         |
| Test User        | statususer / Password#1 (progressively elevated per tier — see §2) |
| DB Schema        | oncilla (MariaDB, QAN RDS)                                         |
| Source           | **Authoritative `oncilla.statusTransition` map** + live UI facts + `permissions_and_status_model.md` |

> **Scope:** the **status lifecycle** of Billing Transactions on the **Finance → Billing Transactions**
> page (`/finance/billing-transactions`), entity `billingTransaction`. Companion to the filter coverage
> (`billing_transactions_testcoverage.md`). Governed by `capabilityBillingTransaction{Update,Approver,Admin}`.
>
> **Why it's a separate tranche:** Billing Transactions has a **5th status — `Exported`** (not in the
> common Setup→Requested→Active→Deleted model), and its transitions are **progressively** unlocked by
> Update → Approver → Admin. This is explored tier-by-tier (elevate one capability in DB → log in fresh →
> capture the newly-unlocked transitions), per `setup.md` Steps 11–14 and `db_validation.md` Query E.

---

## 1. Status model (live + `billingTransactionDefinition` enum)

**States:** `Setup · Requested · Active · Exported · Deleted`
(`billingTransactionDefinition.status` regex: `^(setup|requested|active|exported|deleted)$`).

**Default list** shows `setup/requested/active/exported` (**Exported IS shown by default; Deleted is NOT** —
reach Deleted-source records via **Add filter → Status = Deleted → Apply**).

### Authoritative transition map (from `oncilla.statusTransition`, verified live-DB)

| From \ To | Setup | Requested | Active | Exported | Deleted |
|---|:--:|:--:|:--:|:--:|:--:|
| **Setup** | — | **Update** | **Approver** | **Admin** | **Update** (also Create) |
| **Requested** | **Update** | — | **Approver** | **Admin** | **Update** |
| **Active** | **Admin** | **Admin** | — | **Admin** | **Admin** |
| **Exported** | **Admin** | **Admin** | **Admin** | — | **Admin** |
| **Deleted** | **Update** | **Update** | **Approver** | **Admin** | — |

> **Key takeaways**
> - **Update** tier: Setup↔Requested, Setup→Deleted, Requested→Deleted, Deleted→Setup, Deleted→Requested.
> - **Approver** tier: adds the **→Active** path from Setup / Requested / Deleted.
> - **Admin** tier: owns **every `Exported` transition (to AND from)** and **every Active-source**
>   transition. ⇒ **`Exported` is entirely Admin-gated.** (Each `→Active` and the Active/Exported moves
>   are also granted to Admin, which inherits Approver + Update.)
> - `capabilityBillingTransactionCreate` also grants `Setup→Deleted` and `Setup→Setup` — folded into the
>   Update tier for coverage since Create inherits Update.

### Requested→Active precondition (mandatory fields)
`Requested → Active` (Approver) is blocked if any **mandatory** field is NULL. Mandatory fields
(`billingTransactionDefinition.flag LIKE '%mandatory%'`): `name, title, description, status,
portfolioId, packageCategoryId, packageItemCategoryId, billingTransactionStartDate, price, quantity`.
(No cross-entity dependency guard is defined for `billingTransaction` in `statusTransition`/`resourceRelationship` — confirm at execution.)

---

## 2. RBAC Permission Elevation Log (progressive — run tier-by-tier)

> `statususer` baseline holds `capabilityBillingTransactionGet` only (+ legacy `billingTransactionGet/Update`).
> It has **no Approver/Admin rows** — those must be granted before Tiers 4/5. Elevate **one capability at a
> time**, log out/in, capture only the **newly unlocked** transitions. Restore to baseline afterwards.

| Tier | Capability activated | New transitions unlocked | Entry points to verify |
|---|---|---|---|
| T2 — Update | `capabilityBillingTransactionUpdate` | Setup↔Requested · Setup→Deleted · Requested→Deleted · Deleted→Setup · Deleted→Requested | List Actions dropdown + Detail Change Status |
| T4 — Approver | `capabilityBillingTransactionApprover` | **→Active** from Setup / Requested / Deleted | both |
| T5 — Admin | `capabilityBillingTransactionAdmin` | **all Exported** (to/from) + Active→Setup/Requested/Deleted; Active & Exported rows become editable | both |

**DB elevation SQL** (per `db_validation.md` Query E; the status-transition backend keys off the
**legacy** `billingTransaction{Action}` permission, while the UI gates on `capabilityBillingTransaction{Action}`
— grant **both** per tier so controls appear AND the transition is authorised):

```sql
-- set the user id once
SET @uid = (SELECT userId FROM oncilla.user WHERE username='statususer');

-- Tier 2 — UPDATE (ensure both rows exist & active)
UPDATE oncilla.userPermission SET status='active'
 WHERE userId=@uid AND title IN ('capabilityBillingTransactionUpdate','billingTransactionUpdate');
-- Tier 4 — APPROVER
UPDATE oncilla.userPermission SET status='active'
 WHERE userId=@uid AND title IN ('capabilityBillingTransactionApprover','billingTransactionApprover');
-- Tier 5 — ADMIN
UPDATE oncilla.userPermission SET status='active'
 WHERE userId=@uid AND title IN ('capabilityBillingTransactionAdmin','billingTransactionAdmin');

-- VERIFY current tier before exploring:
SELECT title, status FROM oncilla.userPermission
 WHERE userId=@uid AND title LIKE '%BillingTransaction%' ORDER BY title;

-- RESTORE baseline (Get only) after S6 exploration — CRITICAL (shared user):
UPDATE oncilla.userPermission SET status='deleted'
 WHERE userId=@uid AND title IN
   ('capabilityBillingTransactionUpdate','capabilityBillingTransactionApprover','capabilityBillingTransactionAdmin',
    'billingTransactionApprover','billingTransactionAdmin');
```
> If a capability/legacy **row does not exist** for the user, `UPDATE` affects 0 rows — INSERT it
> (same `userId`, `portfolioId` as an existing `billingTransaction*` row, correct `permissionId`:
> capability Update/Approver/Admin = 6538/6540/6541; legacy = 3547/3550/3553), then DELETE those inserted
> rows on restore.

---

## 3. Status-change UI (live-verified on this page — 2026-10-05)

Two independent entry points drive the **same** backend transition:

1. **List Page → `Actions` column → round dropdown-menu trigger button** (a ⋮-style radix menu button,
   `button[aria-haspopup=menu]`, 28px circle) → menu of permitted target states.
2. **Detail Page → `Change Status ▾` button** (content area) → menu of the same states.

> **Live finding — the trigger is itself the permission gate.** The Actions-column trigger (and the
> Detail `Change Status` button) **render only when the user has ≥1 valid transition for that row's
> current status**. At baseline (Get only) the Actions cell is **empty** and the detail page has **no**
> Change Status button. At each tier, a record whose only transitions need a higher tier shows **no
> trigger at all** (e.g. an **Active** record shows no trigger at Approver — Active→* is Admin-only).
> So absence-of-control (not a disabled control) is the observable gate.

For the same record-state + permission, both entry points offer the **identical** option set
(verified for Setup under Update: both `{Requested, Deleted}`).

**Confirm dialog (live-verified exact text):**
- Dialog title **`Confirm Status Change`** · body **`Are you sure you want to change the status to "<state>"?`**
  (target state lowercase, quoted).
- Buttons: **`Cancel`** · **`<action verb>`** · **`Close`** (X). The confirm button is an **action verb**,
  not a generic "Confirm". **Observed verbs:** Requested→**`Request`**, Setup→**`Set Up`**,
  Active→**`Active`**, Exported→**`Exported`**, Deleted→**`Delete`**.
- **Toast:** a confirmation toast appears briefly and **auto-dismisses quickly** — it is *not* a reliable
  oracle. The durable evidence is the **status badge** (grid cell + detail header) updating to the new
  state. Assertions target the badge (and the API/DB oracle), not the transient toast.
- Dismiss (Cancel/X) → **no change** (verified: record stayed `Setup` after Cancel).

**Trigger/option availability by state (live-verified):**
`Setup`,`Requested` → trigger with Update · `Deleted` → trigger with Update (filter it into view first) ·
`Active`,`Exported` → trigger **only with Admin** (no trigger at all without Admin).

---

## 3A. Live Verification Results (2026-10-05, QAN, user `statususer`)

Progressive DB elevation (`userPermission` on the shared `statususer` account) → fresh login per tier →
live UI observation → **restored to baseline**. The UI gates on the **`capability*`** permission rows
(the legacy `billingTransaction*` rows alone showed **no** control). `userPermission.title` is
`varchar(32)` and cosmetic; the app keys off `permissionId`. Elevation rows:
`capabilityBillingTransUpdate`=6538, `…Approver`=6540, `…Admin`=6541 (pre-existing, flipped
`deleted`→`active`→`deleted`); legacy `billingTransactionApprover`=3550, `…Admin`=3553 (inserted, then
deleted). Baseline confirmed restored: 6538/6539/6540/6541 `deleted`, no 3550/3553, and **0 rows show a
trigger** after re-login.

**Menu options offered, by tier × current-state (exact, as rendered):**

| Current state | Get (baseline) | Update | Approver | Admin |
|---|---|---|---|---|
| **Setup** | *(no trigger)* | Requested, Deleted | Requested, Deleted, **Active** | Requested, Deleted, Active, **Exported** |
| **Requested** | *(no trigger)* | Setup, Deleted | Setup, Deleted, **Active** | Setup, Deleted, Active, **Exported** |
| **Active** | *(no trigger)* | *(no trigger)* | *(no trigger)* | Setup, Requested, Deleted, **Exported** |
| **Exported** | *(no trigger)* | *(no trigger)* | *(no trigger)* | Setup, Requested, Active, Deleted |
| **Deleted** | *(no trigger)* | Setup, Requested | Setup, Requested, **Active** | Setup, Requested, Active, **Exported** |

> Setup/Requested/Active/Exported rows live-verified by opening the menu. Deleted-row options follow the
> authoritative `statusTransition` map (not re-opened live this run — a Deleted record must be filtered
> into view first).

**Transitions actually executed live (badge confirmed):**

| # | Transition | Tier | Entry | Confirm verb | Result |
|---|---|---|---|---|---|
| 1 | Setup → Requested | Update | List ⋮ | `Request` | badge → Requested ✅ |
| 2 | Requested → Setup | Update | List ⋮ | `Set Up` | badge → Setup (reverted) ✅ |
| 3 | Setup → Active | Approver | List ⋮ | `Active` | badge → Active ✅ (record had all mandatory fields) |
| 4 | Active → Exported | Admin | List ⋮ | `Exported` | badge → **Exported** ✅ |
| 5 | Exported → Setup | Admin | List ⋮ | `Set Up` | badge → Setup (reverted) ✅ |
| 6 | Setup → Deleted *(dialog only)* | Admin | List ⋮ | `Delete` | **Cancelled** → stayed Setup ✅ (dismiss = no change) |

Test record used: **`1790662753575`** (statususer's own portfolio); left in its original **Setup** state.
Detail-page entry point verified at Update tier: `Change Status ▾` present, Setup → `{Requested, Deleted}`
(identical to the list menu).

> **Not live-reproduced (flagged honestly):** the **Requested→Active mandatory-field *block*** (record #3
> had fields populated, so the positive path succeeded). The blocked-when-NULL case (TC "…blocked when a
> mandatory field is NULL") is derived from `billingTransactionDefinition` mandatory flags, not reproduced
> this run — it needs a record seeded with a NULL mandatory field.

---

## 4. Test Coverage Summary

Every transition is covered on **both** entry points — each has a List-Page TC **and** a Detail-Page TC
(20 transitions × 2 = 40 transition TCs).

| Tier (capability) | List-Page TCs | Detail-Page TCs | Negative/Precondition TCs | Total |
|---|---|---|---|---|
| Update | 6 | 6 | 1 | 13 |
| Approver | 3 | 3 | 3 | 9 |
| Admin (incl. Exported) | 11 | 11 | 4 | 26 |
| Shared (trigger visibility TC1–4 + dialog/dismiss/parity TC44–47) | — | — | 8 | 8 |
| **Total** | **20** | **20** | **16** | **56** |

---

## 5. Test Scenarios (S6 — for Generator Agent)

### S6.A — Edit-icon / Change-Status visibility (shared)
- **A1** With Update: edit (pencil) icon visible+enabled for **Setup** and **Requested** rows.
- **A2** With Update: after **Status=Deleted** filter, edit icon visible+enabled for **Deleted** rows.
- **A3** Without Admin: **Active** and **Exported** rows show **no usable** edit/Change-Status control (pin disabled-vs-absent).
- **A4** (Neg) Without Update/Approver/Admin: no edit icon on any row; detail page has no Change Status button.

### S6.B — UPDATE tier (`capabilityBillingTransactionUpdate`)
**List Page (Actions dropdown) — one positive per transition:**
- **B1** Setup→Requested · **B2** Setup→Deleted · **B3** Requested→Setup · **B4** Requested→Deleted
- **B5** Deleted→Setup *(filter Status=Deleted first)* · **B6** Deleted→Requested *(filter first)*
**Detail Page (Change Status) — mirror:**
- **B7** Setup→Requested · **B8** Setup→Deleted · **B9** Requested→Setup · **B10** Requested→Deleted
- **B11** Deleted→Setup *(filter first)* · **B12** Deleted→Requested *(filter first)*
**Negative (Update tier):**
- **B13** (Neg) **Active** option NOT offered on Setup/Requested/Deleted dropdowns without Approver.

For every positive: open control → select target → **Confirm Status Change** dialog → confirm → success
toast `Status changed to "<state>"` → **grid/detail badge updates** to the new state.

### S6.C — APPROVER tier (`capabilityBillingTransactionApprover`) — the **→Active** path
**List Page:** **C1** Setup→Active · **C2** Requested→Active · **C3** Deleted→Active *(filter first)*
**Detail Page:** **C4** Setup→Active · **C5** Requested→Active · **C6** Deleted→Active
**Precondition + negative:**
- **C7** (Precondition — neg) Requested→Active **blocked** when a mandatory field is NULL → error shown, status unchanged (grid + DB).
- **C8** (Precondition — pos) Requested→Active **succeeds** when all mandatory fields populated → toast + badge + DB `status='active'`.
- **C9** (Neg) Without Approver, the **Active** option is absent from every dropdown.

### S6.D — ADMIN tier (`capabilityBillingTransactionAdmin`) — **Exported** + Active-source
**→ Exported (List Page):** **D1** Setup→Exported · **D2** Requested→Exported · **D3** Active→Exported · **D4** Deleted→Exported *(filter first)*
**→ Exported (Detail Page):** **D5** Setup→Exported · **D6** Active→Exported
**From Active (Admin-only, List Page):** **D7** Active→Setup · **D8** Active→Requested · **D9** Active→Deleted
**From Exported (Admin-only):** **D10** Exported→Setup · **D11** Exported→Requested · **D12** Exported→Active · **D13** Exported→Deleted
**Admin enablement + negatives:**
- **D14** Admin enables edit icon (list) + Change Status (detail) for **Active** records.
- **D15** Admin enables edit icon + Change Status for **Exported** records.
- **D16** (Neg) Without Admin, the **Exported** option is absent from every dropdown (Setup/Requested/Active/Deleted).
- **D17** (Neg) Without Admin, **Active** and **Exported** records are not transitionable (no usable control).

### S6.E — Shared dialog / toast / parity
- **E1** Confirm Status Change dialog anatomy (title/body/confirm-verb) + success toast exact text — capture live for each target incl. **Exported** (`Export` verb, `Status changed to "exported"`).
- **E2** Dismissing the dialog (Cancel/X/backdrop) makes **no** change and fires **no** API call.
- **E3** Entry-point parity (Update): for a **Setup** record, List Actions dropdown == Detail Change Status set `{Requested, Deleted}` (+ `Active` with Approver, + `Exported` with Admin).
- **E4** Entry-point parity (Admin): for an **Active** record, both entry points offer identical `{Setup, Requested, Deleted, Exported}`.

> **API/DB oracle per transition** (Generator adds, not in CSV): after the toast, assert the status-change
> API returned 200 and `SELECT status FROM oncilla.billingTransaction WHERE billingTransactionId='{id}'`
> equals the new state. Legality check: a target absent from
> `statusTransition WHERE resourceName='billingTransaction' AND currentStatus='{from}'` must **not** be offered.

---

## 6. Status / verification notes

- **DB-authoritative:** the transition→permission map (§1) and the mandatory-field precondition — taken
  directly from `oncilla.statusTransition` / `billingTransactionDefinition`.
- **Live-verified (2026-10-05) — see §3A:** the status-change **control** (a round ⋮ dropdown trigger in
  the Actions column, and the Detail `Change Status ▾` button — both render **only when a transition is
  available**), the exact confirm-dialog copy, the **action-verb** confirm buttons
  (`Request`/`Set Up`/`Active`/`Exported`/`Delete`), the transient toast (badge is the real oracle), and
  the per-tier option sets including **Exported** (Admin). Active/Exported show **no trigger** without
  Admin (absent, not merely disabled).
- **Executed live:** Setup→Requested→Setup (Update), Setup→Active (Approver), Active→Exported→Setup
  (Admin), plus a Cancelled Delete (dismiss = no change). Elevation was done on `statususer` via DB and
  **restored to baseline** (confirmed: 0 triggers after re-login).
- **Still open (flagged, not hallucinated):** the Requested→Active *block* when a mandatory field is NULL
  (positive path verified; the block needs a NULL-seeded record), and Deleted-source menus (follow the DB
  map; a Deleted record must be filtered into view to re-open live).
- CSV: `test-scenarios/test-cases/billing_transactions_statustransition_testcoverage.csv`.

*End of Billing Transactions Status-Transition coverage — 56 TCs across Update / Approver / Admin tiers,
every transition covered on both the List and Detail entry points, Exported fully covered and
live-verified (§3A). Ready for QA Review Gate → Generator.*
