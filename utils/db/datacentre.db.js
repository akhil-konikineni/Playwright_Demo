// DataCentre-specific DB queries against the `oncilla` schema.
// Generic connection/permission helpers live in db-client.js.
const { withDb, getActiveCount } = require('./db-client');

// Count of non-deleted Data Centres (grid vs DB cross-check).
async function getActiveDataCentreCount() {
  return getActiveCount('dataCentre');
}

// Count of records whose status is in the given list (values are lower-cased in DB).
async function getDataCentreCountByStatus(statuses) {
  return withDb(async (db) => {
    const placeholders = statuses.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM dataCentre WHERE status IN (${placeholders})`,
      statuses
    );
    return Number(rows[0].n);
  });
}

// Count of records whose given text column contains `term` (case-insensitive —
// MySQL default collation). `column` is validated against a whitelist to keep the
// identifier safe (it can't be parameterized like a value).
async function getDataCentreCountByTextLike(column, term) {
  const allowed = ['name', 'title', 'dataCentreRef', 'subdomain'];
  if (!allowed.includes(column)) throw new Error(`Unsupported column: ${column}`);
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM dataCentre WHERE ?? LIKE ?`,
      [column, `%${term}%`]
    );
    return Number(rows[0].n);
  });
}

// The country with the most Active data centres, for the combined-filter test.
// Returns { id, title, activeCount } — title is the country code (e.g. 'AL'),
// so the dropdown option label is `${id} - ${title}`.
async function getTopActiveCountry() {
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT dc.countryCodeId AS id, cc.title AS title, COUNT(*) AS activeCount
         FROM dataCentre dc
         JOIN countryCode cc ON dc.countryCodeId = cc.countryCodeId
        WHERE dc.status = 'active'
        GROUP BY dc.countryCodeId, cc.title
        ORDER BY activeCount DESC
        LIMIT 1`
    );
    return rows[0]
      ? { id: rows[0].id, title: rows[0].title, activeCount: Number(rows[0].activeCount) }
      : null;
  });
}

// A real, non-deleted dataCentreId (so it appears in the default grid). Used by
// tests that need a live ID rather than a hard-coded one.
async function getSampleDataCentreId() {
  return withDb(async (db) => {
    const [rows] = await db.query(
      "SELECT dataCentreId FROM dataCentre WHERE status <> 'deleted' ORDER BY dataCentreId DESC LIMIT 1"
    );
    return rows[0] ? rows[0].dataCentreId : null;
  });
}

// Full record by primary key (null when absent).
async function getDataCentreById(id) {
  return withDb(async (db) => {
    const [rows] = await db.query('SELECT * FROM dataCentre WHERE dataCentreId = ?', [id]);
    return rows[0] || null;
  });
}

module.exports = {
  getActiveDataCentreCount,
  getDataCentreCountByStatus,
  getDataCentreCountByTextLike,
  getTopActiveCountry,
  getSampleDataCentreId,
  getDataCentreById,
};
