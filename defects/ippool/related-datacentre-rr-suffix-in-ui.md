# Defect — IP Pool "Related Data Centre" leaks internal name "Data Centre - RR" into user-facing UI

| Field | Value |
|---|---|
| Module | IP Pool |
| Area | Detail page → Related Data Centre section (empty state + Add dialog) |
| Severity | Low / Cosmetic — no functional impact; user-facing labelling inconsistency |
| Type | UI/labelling defect (internal resource name leaked to end user) |
| Environment | QAN — `https://portal-host.qan.aws.eseye.io` |
| Test account | `statususer` / `Password#1` (reproducible at Get tier; label is not permission-gated) |
| Found | 2026-09-22 (IP Pool Tier 1 verification) |

---

## Summary
On an IP Pool detail page, the **Related Data Centre** section exposes the internal resource name
**`Data Centre - RR`** (the "RR" = resourceRelationship, an internal junction — see
`context/kb/04_inferred_relationships.md`) in **user-facing text**, whereas the sibling Related APN
and Related Portal sections use clean names. The inconsistency appears in:

1. **Empty-state text:** the Data Centre section shows **`No Data Centre - RR added`**, while APN shows
   `No APN added` and Portal shows `No Portal added`.
2. **Add-dialog title:** clicking *Add Data Centre* opens a dialog titled **`Data Centre - RR`**, while
   *Add APN* → `APN` and *Add Portal* → `Portal` (documented in `ippool_testcoverage.md` §RELATED).

The user should never see the internal `- RR` suffix; it should read **`Data Centre`** to match the
section heading ("Related Data Centre") and the other two relationship sections.

## Preconditions
- Logged in as `statususer` (any tier — the label is visible at Get; the Add dialog needs Update).

## Steps to reproduce (manual)
1. Log in as `statususer`.
2. Go to **Network Management → IP Pools**.
3. Open any IP Pool detail page with no related Data Centre — e.g. **IP Pool 366 (`eg1`, Setup)**.
4. Expand **Related Data Centre**.
5. Observe the empty-state text.
6. (Update tier) Click **Add Data Centre** and observe the dialog title.

## Expected result
Consistent, clean labelling across all three relationship sections:
- Empty state: **`No Data Centre added`**
- Add dialog title: **`Data Centre`**

## Actual result
- Empty state: **`No Data Centre - RR added`**
- Add dialog title: **`Data Centre - RR`**
- APN and Portal sections are correct (`No APN added` / `No Portal added`; dialogs `APN` / `Portal`).

## Evidence (captured live, 2026-09-22, IP Pool 366, Get tier)
```
Related Data Centre  →  "No Data Centre - RR added"
Related APN          →  "No APN added"
Related Portal       →  "No Portal added"
```

## Suggested fix
Map the `Data Centre - RR` resource to a friendly display label (`Data Centre`) wherever it is rendered
— the relationship section's empty state and the Add-relationship dialog title — so it matches the
section heading and the APN/Portal sections.

## Notes
- Not a blocker for the IP Pool relationship flows (add/remove function correctly); purely a labelling
  polish issue. Captured during Tier-1 verification of the IP Pool coverage.
- Coverage impact: `ippool_testcoverage.md` §RELATED (R.6) and CSV **TC 45** describe the empty state as
  the generic `No {Resource} added`. For the Data Centre section the *actual* text is
  `No Data Centre - RR added` — the coverage's expected text should be corrected to match live (and this
  defect referenced), rather than asserting the idealised `No Data Centre added`.
