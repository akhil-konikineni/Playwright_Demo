// Billing Transactions (Finance -> Billing Transactions) — Status Transition (S6) suite.
// spec source: test-scenarios/test-cases/billing_transactions_statustransition_testcoverage.csv
// plan (live results + API/DB context): test-scenarios/test-plans/billing_transactions_statustransition_testcoverage.md (§3A)
//
// Env: QAN — user `statususer`. Status controls are gated on the capability* tier, so each
// tier describe ELEVATES the account in the DB (beforeAll) and RESTORES baseline (afterAll)
// via utils/db/billing-transaction-permissions.db.js. Permissions load at login, so the
// grant runs before the per-test login (applyAuthHooks beforeEach).
//
// Record status is DATA, not permission: each test SEEDS its FROM state directly in the DB,
// drives the single UI transition under test, asserts the DB status oracle, then REVERTS the
// subject to `setup`. The disposable subjects live in the user's own portfolio (UI scope).
//
// Each test is tagged with its Xray IssueId (@NUI-7995..8050). Generated from the
// live-verified plan; a first live run (Generator/Healer) confirms/heals locators.
const { test, expect, applyAuthHooks } = require('../fixtures/test-fixtures');
const { ENV } = require('../config/env');
const { grantTier, restoreBaseline } = require('../utils/db/billing-transaction-permissions.db');
const {
  getDisposableIdsInUserPortfolio,
  getBillingTransactionStatus,
  setBillingTransactionStatus,
} = require('../utils/db/billing-transaction.db');

// ── helpers ────────────────────────────────────────────────────────────────────────
const USER = ENV.credentials.username;

// Resolve N disposable subjects, run the body, then ALWAYS revert them to `setup`.
async function withSubjects(count, body) {
  const ids = await getDisposableIdsInUserPortfolio(USER, count);
  expect(ids.length, `need ${count} disposable billing transaction(s) in the user portfolio`).toBeGreaterThanOrEqual(count);
  try {
    await body(ids);
  } finally {
    for (const id of ids) await setBillingTransactionStatus(id, 'setup').catch(() => {});
  }
}

// Grid row whose Billing Transaction Id cell equals `id`.
function rowById(page, list, id) {
  return list
    .rows()
    .filter({ has: page.getByRole('cell').filter({ hasText: new RegExp(`^${id}$`) }) })
    .first();
}

// Apply a Status filter (used to bring Deleted records into the grid).
async function filterByStatus(filterPanel, status) {
  await filterPanel.open();
  await filterPanel.selectStatus(status);
  await filterPanel.apply();
}

// Open a menu from a trigger, capture the offered options, close the menu.
async function readOptions(page, sc, trigger) {
  const opts = await sc.optionsFrom(trigger);
  await page.keyboard.press('Escape');
  return opts.map((s) => s.trim()).filter(Boolean).sort();
}

// The exact Summary string the CSV/Xray uses for a transition TC (deterministic).
function transitionSummary(tier, from, to, entry) {
  return `Given Integra exists when user login having CapabilityBillingTransaction${tier} Permission Then user can change status from ${from} to ${to} via ${entry} Page`;
}

// One transition test body: seed FROM -> drive UI transition -> assert DB oracle.
async function runTransition(ctx, { tier, from, to, entry }) {
  const {
    page,
    navigationPage: nav,
    billingTransactionsListPage: list,
    billingTransactionsDetailPage: detail,
    billingTransactionStatusControl: sc,
    billingTransactionsFilterPanel: filterPanel,
  } = ctx;

  await withSubjects(1, async ([id]) => {
    // SETUP — seed the FROM state as data.
    await setBillingTransactionStatus(id, from);

    if (entry === 'List') {
      await nav.goToBillingTransactions();
      if (from === 'Deleted') await filterByStatus(filterPanel, 'Deleted');
      const row = rowById(page, list, id);
      await expect(row).toBeVisible({ timeout: 30000 });
      await sc.transition(sc.listTrigger(row), to);
    } else {
      await detail.open(id);
      await expect(sc.detailTrigger).toBeVisible({ timeout: 30000 });
      await sc.transition(sc.detailTrigger, to);
    }

    // DB oracle — the transition persisted.
    await expect.poll(() => getBillingTransactionStatus(id), { timeout: 15000 }).toBe(to.toLowerCase());
  });
}

// The fixtures a transition test needs, collected into the ctx object runTransition expects.
// spec.fixme (string reason) quarantines the test against a logged defect.
function register(tier, summary, tags, spec) {
  const runner = spec.fixme ? test.fixme : test;
  runner(summary, { tag: tags }, async ({
    page,
    navigationPage,
    billingTransactionsListPage,
    billingTransactionsDetailPage,
    billingTransactionStatusControl,
    billingTransactionsFilterPanel,
  }) => {
    await runTransition(
      {
        page,
        navigationPage,
        billingTransactionsListPage,
        billingTransactionsDetailPage,
        billingTransactionStatusControl,
        billingTransactionsFilterPanel,
      },
      spec
    );
  });
}

// Register a batch of transition tests inside the current (tier) describe.
function registerTransitions(tier, rows) {
  for (const r of rows) {
    const tags = [`@NUI-${r.nui}`, '@StatusTransition', `@${tier}`, `@${r.entry}`];
    if (r.sanity) tags.push('@Sanity');
    register(tier, transitionSummary(tier, r.from, r.to, r.entry), tags, {
      tier,
      from: r.from,
      to: r.to,
      entry: r.entry,
      fixme: r.fixme,
    });
  }
}

// ── suite ────────────────────────────────────────────────────────────────────────
test.describe('Billing Transactions — Status Transition', () => {
  applyAuthHooks(test);

  // Safety net: never leave the shared account elevated, whatever happens above.
  test.afterAll(async () => {
    await restoreBaseline();
  });

  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('S6 — Baseline (Get) · no status control', () => {
    test.beforeAll(async () => { await restoreBaseline(); });

    // TC4 — NUI-7998
    test('Given Integra exists when user login without having CapabilityBillingTransactionUpdate Permission Then no status transition control is available',
      { tag: ['@NUI-7998', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsDetailPage: detail, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'setup');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, id))).toHaveCount(0);
          await detail.open(id);
          await expect(sc.detailTrigger).toHaveCount(0);
        });
      });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('S6 — UPDATE tier (capabilityBillingTransactionUpdate)', () => {
    test.beforeAll(async () => { await grantTier('Update'); });
    test.afterAll(async () => { await restoreBaseline(); });

    // TC1 — NUI-7995
    test('Given Integra exists when user login having CapabilityBillingTransactionUpdate Permission Then Setup and Requested records show an Actions menu trigger',
      { tag: ['@NUI-7995', '@StatusTransition', '@Sanity'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(2, async ([a, b]) => {
          await setBillingTransactionStatus(a, 'setup');
          await setBillingTransactionStatus(b, 'requested');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, a))).toBeVisible();
          await expect(sc.listTrigger(rowById(page, list, b))).toBeVisible();
        });
      });

    // TC2 — NUI-7996
    test('Given Integra exists when user login having CapabilityBillingTransactionUpdate Permission Then a Deleted record shows an Actions menu trigger after filtering Status Deleted',
      { tag: ['@NUI-7996', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsFilterPanel: filterPanel, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'deleted');
          await navigationPage.goToBillingTransactions();
          await filterByStatus(filterPanel, 'Deleted');
          await expect(sc.listTrigger(rowById(page, list, id))).toBeVisible({ timeout: 30000 });
        });
      });

    // TC5–TC10 (List) + TC11–TC16 (Detail) — Update transitions.
    registerTransitions('Update', [
      { nui: '7999', from: 'Setup', to: 'Requested', entry: 'List', sanity: true },
      { nui: '8000', from: 'Setup', to: 'Deleted', entry: 'List', sanity: true },
      { nui: '8001', from: 'Requested', to: 'Setup', entry: 'List' },
      { nui: '8002', from: 'Requested', to: 'Deleted', entry: 'List' },
      { nui: '8003', from: 'Deleted', to: 'Setup', entry: 'List' },
      { nui: '8004', from: 'Deleted', to: 'Requested', entry: 'List' },
      { nui: '8005', from: 'Setup', to: 'Requested', entry: 'Detail' },
      { nui: '8006', from: 'Setup', to: 'Deleted', entry: 'Detail' },
      { nui: '8007', from: 'Requested', to: 'Setup', entry: 'Detail' },
      { nui: '8008', from: 'Requested', to: 'Deleted', entry: 'Detail' },
      { nui: '8009', from: 'Deleted', to: 'Setup', entry: 'Detail' },
      { nui: '8010', from: 'Deleted', to: 'Requested', entry: 'Detail' },
    ]);

    // TC17 — NUI-8011
    test('Given Integra exists when user login having CapabilityBillingTransactionUpdate Permission Then the Active and Exported options are not offered without higher tiers',
      { tag: ['@NUI-8011', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'setup');
          await navigationPage.goToBillingTransactions();
          const opts = await readOptions(page, sc, sc.listTrigger(rowById(page, list, id)));
          expect(opts).not.toContain('Active');
          expect(opts).not.toContain('Exported');
          expect(opts).toEqual(['Deleted', 'Requested']);
        });
      });

    // TC26 — NUI-8020
    test('Given Integra exists when user login without having CapabilityBillingTransactionApprover Permission Then the Active option is absent from every menu',
      { tag: ['@NUI-8020', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(2, async ([a, b]) => {
          await setBillingTransactionStatus(a, 'setup');
          await setBillingTransactionStatus(b, 'requested');
          await navigationPage.goToBillingTransactions();
          for (const id of [a, b]) {
            const opts = await readOptions(page, sc, sc.listTrigger(rowById(page, list, id)));
            expect(opts).not.toContain('Active');
          }
        });
      });

    // TC45 — NUI-8039
    test('Given Integra exists when user login having CapabilityBillingTransactionUpdate Permission Then dismissing the Confirm Status Change dialog makes no change',
      { tag: ['@NUI-8039', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'setup');
          await navigationPage.goToBillingTransactions();
          await sc.dismiss(sc.listTrigger(rowById(page, list, id)), 'Requested');
          expect(await getBillingTransactionStatus(id)).toBe('setup');
        });
      });

    // TC46 — NUI-8040
    test('Given Integra exists when user login having CapabilityBillingTransactionUpdate Permission Then the List Page and Detail Page offer identical options for a Setup record',
      { tag: ['@NUI-8040', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsDetailPage: detail, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'setup');
          await navigationPage.goToBillingTransactions();
          const listOpts = await readOptions(page, sc, sc.listTrigger(rowById(page, list, id)));
          await detail.open(id);
          const detailOpts = await readOptions(page, sc, sc.detailTrigger);
          expect(listOpts).toEqual(detailOpts);
          expect(listOpts).toEqual(['Deleted', 'Requested']);
        });
      });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('S6 — APPROVER tier (capabilityBillingTransactionApprover)', () => {
    test.beforeAll(async () => { await grantTier('Approver'); });
    test.afterAll(async () => { await restoreBaseline(); });

    // TC3 — NUI-7997
    test('Given Integra exists when user login without having CapabilityBillingTransactionAdmin Permission Then Active and Exported records show no Actions menu trigger',
      { tag: ['@NUI-7997', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(2, async ([a, b]) => {
          await setBillingTransactionStatus(a, 'active');
          await setBillingTransactionStatus(b, 'exported');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, a))).toHaveCount(0);
          await expect(sc.listTrigger(rowById(page, list, b))).toHaveCount(0);
        });
      });

    // TC18–TC20 (List) + TC21–TC23 (Detail) — Approver →Active transitions.
    registerTransitions('Approver', [
      { nui: '8012', from: 'Setup', to: 'Active', entry: 'List', sanity: true },
      { nui: '8013', from: 'Requested', to: 'Active', entry: 'List', sanity: true },
      { nui: '8014', from: 'Deleted', to: 'Active', entry: 'List' },
      // DEFECT: detail Change Status menu omits capability-gated options (Active missing).
      // See defects/billing-transactions/detail-change-status-missing-capability-options.md
      { nui: '8015', from: 'Setup', to: 'Active', entry: 'Detail', fixme: 'detail menu omits Active (parity defect)' },
      { nui: '8016', from: 'Requested', to: 'Active', entry: 'Detail', fixme: 'detail menu omits Active (parity defect)' },
      { nui: '8017', from: 'Deleted', to: 'Active', entry: 'Detail', fixme: 'detail menu omits Active (parity defect)' },
    ]);

    // TC24 — NUI-8018 — mandatory-field block (not live-reproduced; needs a NULL-seeded record).
    test.fixme('Given Integra exists when user login having CapabilityBillingTransactionApprover Permission Then Requested to Active is blocked when a mandatory field is NULL',
      { tag: ['@NUI-8018', '@StatusTransition'] },
      async () => {
        // The block is app-side and was NOT reproduced live (plan §3A): the activated record
        // had all mandatory fields populated. Reproducing it needs a subject seeded with a
        // NULL mandatory field (name/title/portfolioId/packageCategoryId/... ), which the UI
        // cannot create. Pending a dedicated NULL-mandatory fixture.
      });

    // TC25 — NUI-8019 — Requested->Active succeeds when mandatory fields populated.
    register('Approver',
      'Given Integra exists when user login having CapabilityBillingTransactionApprover Permission Then Requested to Active succeeds when all mandatory fields are populated',
      ['@NUI-8019', '@StatusTransition', '@Sanity'],
      { tier: 'Approver', from: 'Requested', to: 'Active', entry: 'List' });

    // TC42 — NUI-8036
    test('Given Integra exists when user login without having CapabilityBillingTransactionAdmin Permission Then the Exported option is absent from every menu',
      { tag: ['@NUI-8036', '@StatusTransition', '@Sanity'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(2, async ([a, b]) => {
          await setBillingTransactionStatus(a, 'setup');
          await setBillingTransactionStatus(b, 'requested');
          await navigationPage.goToBillingTransactions();
          for (const id of [a, b]) {
            const opts = await readOptions(page, sc, sc.listTrigger(rowById(page, list, id)));
            expect(opts).not.toContain('Exported');
          }
        });
      });

    // TC43 — NUI-8037
    test('Given Integra exists when user login without having CapabilityBillingTransactionAdmin Permission Then Active and Exported records cannot be transitioned',
      { tag: ['@NUI-8037', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(2, async ([a, b]) => {
          await setBillingTransactionStatus(a, 'active');
          await setBillingTransactionStatus(b, 'exported');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, a))).toHaveCount(0);
          await expect(sc.listTrigger(rowById(page, list, b))).toHaveCount(0);
        });
      });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('S6 — ADMIN tier (capabilityBillingTransactionAdmin)', () => {
    test.beforeAll(async () => { await grantTier('Admin'); });
    test.afterAll(async () => { await restoreBaseline(); });

    // TC27–TC30, TC33–TC39 (List) + TC31,TC32,TC48–TC56 (Detail) — Admin transitions (incl. Exported).
    registerTransitions('Admin', [
      { nui: '8021', from: 'Setup', to: 'Exported', entry: 'List', sanity: true },
      { nui: '8022', from: 'Requested', to: 'Exported', entry: 'List' },
      { nui: '8023', from: 'Active', to: 'Exported', entry: 'List', sanity: true },
      { nui: '8024', from: 'Deleted', to: 'Exported', entry: 'List' },
      { nui: '8027', from: 'Active', to: 'Setup', entry: 'List' },
      { nui: '8028', from: 'Active', to: 'Requested', entry: 'List' },
      { nui: '8029', from: 'Active', to: 'Deleted', entry: 'List' },
      { nui: '8030', from: 'Exported', to: 'Setup', entry: 'List' },
      { nui: '8031', from: 'Exported', to: 'Requested', entry: 'List' },
      { nui: '8032', from: 'Exported', to: 'Active', entry: 'List' },
      { nui: '8033', from: 'Exported', to: 'Deleted', entry: 'List' },
      { nui: '8025', from: 'Setup', to: 'Exported', entry: 'Detail' },
      // DEFECT: detail page does not render the Change Status button for Active/Exported
      // records (button-not-visible). See defects/billing-transactions/detail-change-status-missing-capability-options.md
      { nui: '8026', from: 'Active', to: 'Exported', entry: 'Detail', fixme: 'detail Change Status button absent for Active record' },
      { nui: '8042', from: 'Requested', to: 'Exported', entry: 'Detail' },
      { nui: '8043', from: 'Deleted', to: 'Exported', entry: 'Detail', fixme: 'detail Change Status button unreliable (failed 3/3 even with retries)' },
      { nui: '8044', from: 'Active', to: 'Setup', entry: 'Detail' },
      { nui: '8045', from: 'Active', to: 'Requested', entry: 'Detail' },
      { nui: '8046', from: 'Active', to: 'Deleted', entry: 'Detail' },
      { nui: '8047', from: 'Exported', to: 'Setup', entry: 'Detail', fixme: 'detail Change Status button absent for Exported record' },
      { nui: '8048', from: 'Exported', to: 'Requested', entry: 'Detail', fixme: 'detail Change Status button absent for Exported record' },
      { nui: '8049', from: 'Exported', to: 'Active', entry: 'Detail', fixme: 'detail Change Status button absent for Exported record' },
      { nui: '8050', from: 'Exported', to: 'Deleted', entry: 'Detail', fixme: 'detail Change Status button absent for Exported record' },
    ]);

    // TC40 — NUI-8034 — DEFECT: detail Change Status button absent for Active records.
    // See defects/billing-transactions/detail-change-status-missing-capability-options.md
    test.fixme('Given Integra exists when user login having CapabilityBillingTransactionAdmin Permission Then the Actions menu and Change Status are available for Active records',
      { tag: ['@NUI-8034', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsDetailPage: detail, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'active');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, id))).toBeVisible();
          await detail.open(id);
          await expect(sc.detailTrigger).toBeVisible();
        });
      });

    // TC41 — NUI-8035 — DEFECT: detail Change Status button absent for Exported records.
    // See defects/billing-transactions/detail-change-status-missing-capability-options.md
    test.fixme('Given Integra exists when user login having CapabilityBillingTransactionAdmin Permission Then the Actions menu and Change Status are available for Exported records',
      { tag: ['@NUI-8035', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsDetailPage: detail, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'exported');
          await navigationPage.goToBillingTransactions();
          await expect(sc.listTrigger(rowById(page, list, id))).toBeVisible();
          await detail.open(id);
          await expect(sc.detailTrigger).toBeVisible();
        });
      });

    // TC44 — NUI-8038
    test('Given Integra exists when user login having CapabilityBillingTransactionAdmin Permission Then the Confirm Status Change dialog shows the correct text for Exported',
      { tag: ['@NUI-8038', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'setup');
          await navigationPage.goToBillingTransactions();
          const trigger = sc.listTrigger(rowById(page, list, id));
          await trigger.click();
          await sc.menu.waitFor({ state: 'visible' });
          await sc.menuItem('Exported').click();
          await expect(sc.dialog).toContainText('Confirm Status Change');
          await expect(sc.dialog).toContainText('change the status to "exported"');
          await expect(sc.confirmButton('Exported')).toBeVisible();
          await sc.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
          expect(await getBillingTransactionStatus(id)).toBe('setup');
        });
      });

    // TC47 — NUI-8041
    test('Given Integra exists when user login having CapabilityBillingTransactionAdmin Permission Then the List Page and Detail Page offer identical options for an Active record',
      { tag: ['@NUI-8041', '@StatusTransition'] },
      async ({ page, navigationPage, billingTransactionsListPage: list, billingTransactionsDetailPage: detail, billingTransactionStatusControl: sc }) => {
        await withSubjects(1, async ([id]) => {
          await setBillingTransactionStatus(id, 'active');
          await navigationPage.goToBillingTransactions();
          const listOpts = await readOptions(page, sc, sc.listTrigger(rowById(page, list, id)));
          await detail.open(id);
          const detailOpts = await readOptions(page, sc, sc.detailTrigger);
          expect(listOpts).toEqual(detailOpts);
          expect(listOpts).toEqual(['Deleted', 'Exported', 'Requested', 'Setup']);
        });
      });
  });
});
