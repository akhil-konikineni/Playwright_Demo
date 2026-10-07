// Billing Transaction DB oracles against the `oncilla` schema.
// Generic connection/permission helpers live in db-client.js.
//
// NOTE on scope: the UI list is portfolio-subtree scoped to the logged-in user's
// sphere, so these whole-table counts are used as loose oracles (assert > 0 / the
// value exists), not exact UI==DB equality — matching the DataCentre DB helpers.
const { withDb } = require('./db-client');

// Count of records whose status is in the given (lower-cased) list.
async function getBillingTransactionCountByStatus(statuses) {
  return withDb(async (db) => {
    const placeholders = statuses.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM billingTransaction WHERE status IN (${placeholders})`,
      statuses
    );
    return Number(rows[0].n);
  });
}

// Count of records whose given text column contains `term` (case-insensitive).
async function getBillingTransactionCountByTextLike(column, term) {
  const allowed = ['name', 'title'];
  if (!allowed.includes(column)) throw new Error(`Unsupported column: ${column}`);
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM billingTransaction WHERE ?? LIKE ?`,
      [column, `%${term}%`]
    );
    return Number(rows[0].n);
  });
}

// The portfolio with the most billing transactions (for portfolio-filter tests).
// Returns { portfolioId, title, count } or null.
async function getTopPortfolio() {
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT bt.portfolioId AS portfolioId, pf.title AS title, COUNT(*) AS n
         FROM billingTransaction bt
         LEFT JOIN portfolio pf ON pf.portfolioId = bt.portfolioId
        WHERE bt.status <> 'deleted'
        GROUP BY bt.portfolioId, pf.title
        ORDER BY n DESC
        LIMIT 1`
    );
    return rows[0]
      ? { portfolioId: rows[0].portfolioId, title: rows[0].title, count: Number(rows[0].n) }
      : null;
  });
}

// A real, non-deleted billingTransactionId (appears in the default grid).
async function getSampleBillingTransactionId() {
  return withDb(async (db) => {
    const [rows] = await db.query(
      "SELECT billingTransactionId FROM billingTransaction WHERE status <> 'deleted' ORDER BY billingTransactionId DESC LIMIT 1"
    );
    return rows[0] ? rows[0].billingTransactionId : null;
  });
}

// Full record by primary key (null when absent).
async function getBillingTransactionById(id) {
  return withDb(async (db) => {
    const [rows] = await db.query(
      'SELECT * FROM billingTransaction WHERE billingTransactionId = ?',
      [id]
    );
    return rows[0] || null;
  });
}

// A known Name / Title fragment that exists in live data (for text-filter tests).
async function getSampleNameFragment() {
  return withDb(async (db) => {
    const [rows] = await db.query(
      "SELECT name FROM billingTransaction WHERE status <> 'deleted' AND name IS NOT NULL AND name <> '' ORDER BY billingTransactionId DESC LIMIT 1"
    );
    return rows[0] ? String(rows[0].name) : null;
  });
}

// ── Status-transition support (seed a precondition state / read / revert) ──────────
// Record status is DATA (not permission), so seeding it via DB keeps each UI test
// focused on the single transition under test and lets us restore the subject after.

// N disposable billingTransactionIds in the user's OWN portfolio (so they appear in the
// UI's portfolio-scoped grid), preferring records already in `setup`. Used as the
// mutable subjects of status-transition tests (each test reverts them to setup).
async function getDisposableIdsInUserPortfolio(username, n = 1) {
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT bt.billingTransactionId AS id
         FROM billingTransaction bt
         JOIN user u ON u.portfolioId = bt.portfolioId
        WHERE u.username = ?
        ORDER BY (bt.status = 'setup') DESC, bt.billingTransactionId DESC
        LIMIT ?`,
      [username, n]
    );
    return rows.map((r) => r.id);
  });
}

// Current status string of a record (null if absent).
async function getBillingTransactionStatus(id) {
  return withDb(async (db) => {
    const [rows] = await db.query(
      'SELECT status FROM billingTransaction WHERE billingTransactionId = ?',
      [id]
    );
    return rows[0] ? rows[0].status : null;
  });
}

// Set a record's status directly — seeding a precondition or reverting in cleanup.
async function setBillingTransactionStatus(id, status) {
  return withDb(async (db) => {
    await db.query(
      'UPDATE billingTransaction SET status = ? WHERE billingTransactionId = ?',
      [String(status).toLowerCase(), id]
    );
  });
}

module.exports = {
  getBillingTransactionCountByStatus,
  getBillingTransactionCountByTextLike,
  getTopPortfolio,
  getSampleBillingTransactionId,
  getBillingTransactionById,
  getSampleNameFragment,
  getDisposableIdsInUserPortfolio,
  getBillingTransactionStatus,
  setBillingTransactionStatus,
};
