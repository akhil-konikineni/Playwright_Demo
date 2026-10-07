// MySQL helper for the `oncilla` schema (CommonJS — package.json "type":"commonjs").
// Reads connection config from the central ENV resolver, never process.env directly.
const mysql = require('mysql2/promise');
const { ENV } = require('../../config/env');

async function createConnection() {
  return mysql.createConnection(ENV.db);
}

// Opens a connection, runs fn(db), then always closes it.
async function withDb(fn) {
  const db = await createConnection();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

// Count non-deleted records for a module table (e.g. 'dataCentre').
async function getActiveCount(table) {
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM ?? WHERE status <> 'deleted'`,
      [table]
    );
    return Number(rows[0].n);
  });
}

// Current status of a capability for a username (null if the row is absent).
async function getCapabilityStatus(username, capability) {
  return withDb(async (db) => {
    const [rows] = await db.query(
      `SELECT up.status FROM userPermission up
         JOIN user u ON up.userId = u.userId
        WHERE u.username = ? AND up.title = ?`,
      [username, capability]
    );
    return rows[0] ? rows[0].status : null;
  });
}

module.exports = { createConnection, withDb, getActiveCount, getCapabilityStatus };
