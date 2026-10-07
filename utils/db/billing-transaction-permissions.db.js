// Billing Transaction permission elevation helpers (oncilla.userPermission).
//
// The QAN Billing Transactions UI gates its status-change controls on the
// `capability*` permission rows (NOT the legacy `billingTransaction*` rows), and the
// app resolves permissions by `permissionId` (userPermission.title is varchar(32) and
// cosmetic). The shared `statususer` account holds only the GET tier at baseline; the
// higher capability rows pre-exist as status='deleted'. These helpers flip a tier on
// for a status-transition test run, then restore the account to baseline.
//
// Live-verified 2026-10-05 (see test-scenarios/test-plans/billing_transactions_statustransition_testcoverage.md §3A).
// Permissions load at LOGIN, so grant the tier BEFORE logging in, and restore after.
//
// Tiers are cumulative/additive (Approver includes Update; Admin includes both) to
// mirror the real RBAC model.
const { withDb } = require('./db-client');
const { ENV } = require('../../config/env');

// permissionId -> { title (<=32 chars, matches existing convention), name }
const PERMS = Object.freeze({
  6538: { title: 'capabilityBillingTransUpdate', name: 'Capability Update Billing Transaction' },
  6540: { title: 'capabilityBillingTransApprover', name: 'Capability Approver Billing Transaction' },
  6541: { title: 'capabilityBillingTransAdmin', name: 'Capability Admin Billing Transaction' },
  3550: { title: 'billingTransactionApprover', name: 'Approve Billing Transaction' },
  3553: { title: 'billingTransactionAdmin', name: 'Admin Billing Transaction' },
});

// Capability rows pre-exist (toggle active<->deleted); legacy rows may be absent (insert/delete).
const CAP_IDS = [6538, 6540, 6541];
const LEGACY_IDS = [3550, 3553];

// permissionIds that must be ACTIVE at each tier (cumulative).
const TIERS = Object.freeze({
  Update: [6538],
  Approver: [6538, 6540, 3550],
  Admin: [6538, 6540, 6541, 3550, 3553],
});

// Resolve the user's id + a template (portfolioId, modifiedUserId) from their
// existing capabilityBillingTransactionGet row — used to clone INSERTed legacy rows.
async function resolveUserTemplate(db, username) {
  const [rows] = await db.query(
    `SELECT up.userId, up.portfolioId, up.modifiedUserId
       FROM userPermission up JOIN user u ON u.userId = up.userId
      WHERE u.username = ? AND up.title = 'capabilityBillingTransactionGet'
      LIMIT 1`,
    [username]
  );
  if (!rows[0]) throw new Error(`No capabilityBillingTransactionGet row for user "${username}" — cannot resolve template.`);
  return rows[0];
}

async function activate(db, tpl, permissionId) {
  const [ex] = await db.query(
    `SELECT userPermissionId FROM userPermission WHERE userId = ? AND permissionId = ?`,
    [tpl.userId, permissionId]
  );
  if (ex[0]) {
    await db.query(
      `UPDATE userPermission SET status='active', outOfService=NULL, modifiedDate=NOW() WHERE userPermissionId = ?`,
      [ex[0].userPermissionId]
    );
  } else {
    const p = PERMS[permissionId];
    await db.query(
      `INSERT INTO userPermission (name,title,permissionId,userId,portfolioId,status,inService,createdDate,modifiedUserId,modifiedDate)
       VALUES (?,?,?,?,?,'active',NOW(),NOW(),?,NOW())`,
      [p.name, p.title, permissionId, tpl.userId, tpl.portfolioId, tpl.modifiedUserId]
    );
  }
}

// Elevate `username` (default: active env user) to a tier: 'Update' | 'Approver' | 'Admin'.
async function grantTier(tier, username = ENV.credentials.username) {
  const ids = TIERS[tier];
  if (!ids) throw new Error(`Unknown tier "${tier}". Expected one of: ${Object.keys(TIERS).join(', ')}.`);
  return withDb(async (db) => {
    const tpl = await resolveUserTemplate(db, username);
    for (const id of ids) await activate(db, tpl, id);
  });
}

// Restore `username` to the GET-only baseline: capability rows -> 'deleted',
// inserted legacy rows removed. Idempotent — safe to call unconditionally in teardown.
async function restoreBaseline(username = ENV.credentials.username) {
  return withDb(async (db) => {
    const tpl = await resolveUserTemplate(db, username);
    await db.query(
      `UPDATE userPermission SET status='deleted', outOfService=NOW(), modifiedDate=NOW()
        WHERE userId = ? AND permissionId IN (${CAP_IDS.map(() => '?').join(',')})`,
      [tpl.userId, ...CAP_IDS]
    );
    await db.query(
      `DELETE FROM userPermission WHERE userId = ? AND permissionId IN (${LEGACY_IDS.map(() => '?').join(',')})`,
      [tpl.userId, ...LEGACY_IDS]
    );
  });
}

module.exports = { grantTier, restoreBaseline, TIERS };
