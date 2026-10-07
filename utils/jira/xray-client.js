/**
 * Reusable Xray Cloud client — results reporting (Test Execution / STE).
 *
 * Mirrors the auth + request + GraphQL style already used by `xray-import.js`,
 * but adds the pieces needed to report Playwright results back to Xray:
 *   - findTestExecutionBySummary()  -> locate an existing STE to reuse/override
 *   - importExecution()             -> create-or-update an STE + its test runs
 *
 * Credentials come from the SAME gitignored `.env.jira` the importer uses:
 *   XRAY_CLIENT_ID, XRAY_CLIENT_SECRET   -> Xray Cloud API key
 *   JIRA_PROJECT_KEY (e.g. NUI)          -> project the STE is created under
 *
 * Nothing here ever logs a token or secret.
 */
'use strict';
const fs = require('fs');
const https = require('https');
const path = require('path');

const XRAY_BASE = 'https://xray.cloud.getxray.app';

// ---- env (same lightweight parser as xray-import.js, kept consistent) ----
function loadJiraEnv(p = path.resolve(process.cwd(), '.env.jira')) {
  const o = {};
  if (!fs.existsSync(p)) return o;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    o[m[1]] = v;
  }
  return o;
}

// ---- HTTP helper (same shape as xray-import.js) ----
function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = https.request(
      {
        hostname: u.hostname, path: u.pathname + u.search, method,
        headers: { ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      },
      res => { let d = ''; res.on('data', c => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: d })); }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function authenticate(clientId, clientSecret) {
  const r = await request('POST', `${XRAY_BASE}/api/v2/authenticate`,
    { 'Content-Type': 'application/json', Accept: 'application/json' },
    { client_id: clientId, client_secret: clientSecret });
  if (r.status !== 200) throw new Error(`Xray auth failed (${r.status}): ${r.body.slice(0, 200)}`);
  return JSON.parse(r.body); // body is a JSON-quoted JWT string
}

async function graphql(token, query, variables) {
  const r = await request('POST', `${XRAY_BASE}/api/v2/graphql`,
    { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    { query, variables });
  let j;
  try { j = JSON.parse(r.body); } catch { throw new Error(`GraphQL non-JSON (${r.status}): ${r.body.slice(0, 200)}`); }
  if (j.errors && j.errors.length) throw new Error(`GraphQL error: ${JSON.stringify(j.errors)}`);
  return j.data;
}

const GET_TEST_EXECUTIONS = `query($jql:String!,$limit:Int!){
  getTestExecutions(jql:$jql, limit:$limit){
    results { issueId jira(fields:["key","summary"]) }
  }
}`;

/**
 * Find an existing Test Execution whose summary EXACTLY matches `summary`.
 *
 * Uses an EXACT-PHRASE JQL text search — `summary ~ "\"<phrase>\""` — not a
 * bare-token search. The bare-token form breaks on numeric tokens: a dated
 * summary like "... | 2026-10-01" tokenises to `2026 10 01`, which `~` fails to
 * match, so same-day re-runs would wrongly create DUPLICATE STEs. The quoted
 * phrase matches reliably; we still exact-match in code as a final guard.
 * Returns the STE issue key (e.g. "NUI-7900") or null.
 */
async function findTestExecutionBySummary(token, projectKey, summary) {
  const phrase = summary.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const jql = `project = "${projectKey}" AND issuetype = "Test Execution" AND summary ~ "\\"${phrase}\\"" ORDER BY created DESC`;
  const data = await graphql(token, GET_TEST_EXECUTIONS, { jql, limit: 50 });
  const results = (data.getTestExecutions && data.getTestExecutions.results) || [];
  const hit = results.find(r => r.jira && r.jira.summary === summary);
  return hit ? hit.jira.key : null;
}

const CREATE_TEST_EXECUTION = `mutation($jira:JSON!){
  createTestExecution(jira:$jira){
    testExecution{ issueId jira(fields:["key"]) }
    warnings
  }
}`;

/**
 * Create an EMPTY Test Execution issue via GraphQL.
 *
 * Done via GraphQL (not the REST import) because project NUI makes the Jira
 * `Component` field mandatory on create, which the REST import/execution `info`
 * block cannot set. Results are written separately via importExecution() with
 * the returned key (the update path imposes no Component requirement).
 *
 * Returns { key, id }.
 */
async function createTestExecution(token, { summary, description, projectKey, component }) {
  const jira = {
    fields: {
      summary,
      description: description || 'Automated Playwright execution.',
      project: { key: projectKey },
      ...(component ? { components: [{ name: component }] } : {}),
    },
  };
  const d = await graphql(token, CREATE_TEST_EXECUTION, { jira });
  const te = d.createTestExecution.testExecution;
  return { key: te.jira.key, id: te.issueId };
}

/**
 * Update a Test Execution and its test runs in one call.
 *
 * payload = {
 *   testExecutionKey?: "NUI-123",   // present -> UPDATE/override that STE
 *   summary, description, projectKey, startDate, finishDate,
 *   tests: [{ testKey, status, comment? }]
 * }
 *
 * Returns { key, id, created } where `created` is true when a brand-new STE was made.
 */
async function importExecution(token, payload) {
  const body = {
    ...(payload.testExecutionKey ? { testExecutionKey: payload.testExecutionKey } : {}),
    info: {
      summary: payload.summary,
      description: payload.description || 'Automated Playwright execution.',
      project: payload.projectKey,
      ...(payload.startDate ? { startDate: payload.startDate } : {}),
      ...(payload.finishDate ? { finishDate: payload.finishDate } : {}),
    },
    tests: payload.tests,
  };
  const r = await request('POST', `${XRAY_BASE}/api/v2/import/execution`,
    { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`import/execution failed (${r.status}): ${r.body.slice(0, 300)}`);
  }
  let j;
  try { j = JSON.parse(r.body); } catch { throw new Error(`import/execution non-JSON (${r.status}): ${r.body.slice(0, 200)}`); }
  // Response shape: { id, key, self }
  return { key: j.key, id: j.id, created: !payload.testExecutionKey };
}

module.exports = {
  XRAY_BASE,
  loadJiraEnv,
  authenticate,
  graphql,
  findTestExecutionBySummary,
  createTestExecution,
  importExecution,
};
