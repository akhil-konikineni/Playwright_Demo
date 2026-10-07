// Sequential SIM Assignment range → DB status checker (read-only).
//
// Regenerates the exact ICCID sequence the SIM Assignment UI produces for a given
// First ICCID + count (increment the base, RE-COMPUTE the Luhn check digit each step),
// then looks each ICCID up in `icc` and reports its status.
//
// Why not a plain SQL range: every ICCID carries its own Luhn check digit, so the
// generated values are NOT a contiguous numeric range — they must be generated the
// same way the UI does before they can be matched in the DB.
//
// Usage:  TEST_ENV=INTEGRATION node utils/db/seqcheck.js <firstIccId> <count>
// Example: TEST_ENV=INTEGRATION node utils/db/seqcheck.js 89011703278149842794 6
//
// NUI-2615 note: the Validate step treats a SIM as "Success" purely on EXISTENCE
// (+ checksum + same-ICC-type). Lifecycle status (active/available/deleted/inactive)
// does NOT change the Success/Error outcome — only a missing ICCID (NOT FOUND) errors.
const mysql = require('mysql2/promise');
const { ENV } = require('../../config/env');

// Luhn check digit for a numeric payload string (rightmost payload digit is doubled).
function luhnCheckDigit(payload) {
  let sum = 0, dbl = true;
  for (let i = payload.length - 1; i >= 0; i--) {
    let d = payload.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10;
}

// Generate `count` sequential ICCIDs starting from `first` (matches the UI generator).
function generateRange(first, count) {
  const baseLen = first.length - 1;            // strip the existing check digit
  const base = BigInt(first.slice(0, baseLen));
  const out = [];
  for (let i = 0; i < count; i++) {
    const b = (base + BigInt(i)).toString().padStart(baseLen, '0');
    out.push(b + luhnCheckDigit(b));
  }
  return out;
}

async function main() {
  const first = process.argv[2];
  const count = parseInt(process.argv[3], 10);
  if (!first || !Number.isInteger(count) || count < 1) {
    console.error('usage: TEST_ENV=INTEGRATION node utils/db/seqcheck.js <firstIccId> <count>');
    process.exit(1);
  }
  const list = generateRange(first, count);

  const conn = await mysql.createConnection(ENV.db);
  try {
    const [rows] = await conn.query(
      'SELECT i.iccId, i.status, t.title AS iccType FROM icc i ' +
      'JOIN iccType t ON i.iccTypeId = t.iccTypeId WHERE i.iccId IN (?)',
      [list]
    );
    const byId = new Map(rows.map((r) => [r.iccId, r]));
    const tally = {};
    console.log('idx | generatedIccId       | status      | iccType');
    list.forEach((icc, i) => {
      const r = byId.get(icc);
      const status = r ? r.status : 'NOT FOUND';
      tally[status] = (tally[status] || 0) + 1;
      console.log(
        String(i + 1).padStart(3) + ' | ' + icc + ' | ' +
        status.padEnd(11) + ' | ' + (r ? r.iccType : '-')
      );
    });
    const existing = list.length - (tally['NOT FOUND'] || 0);
    console.log('\nStatus tally: ' + JSON.stringify(tally));
    console.log('UI prediction: ' + existing + ' Success / ' + (tally['NOT FOUND'] || 0) +
      ' Error  (Validate = existence only; status is ignored)');
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error('ERR', e.message); process.exit(3); });

module.exports = { luhnCheckDigit, generateRange };
