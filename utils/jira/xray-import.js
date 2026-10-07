/**
 * Xray Cloud test-case importer (reusable).
 *
 * Fixes the "Test Repository folder ... not found" failure at the root:
 * it CREATES the Test Repository folder dynamically, then creates every Test
 * (with manual steps) via the Xray Cloud GraphQL API and files it into that folder.
 *
 * Usage:
 *   node utils/jira/xray-import.js <csvPath> [--dry-run]
 *   # defaults to test-scenarios/test-cases/billing_transactions_testcoverage.csv
 *
 * Shared Xray plumbing (env loading, auth, GraphQL) lives in ./xray-client.js —
 * this file only owns the CSV parsing + test/folder creation specific to importing.
 *
 * IMPORTANT: this module only runs when invoked directly (`node xray-import.js`).
 * Requiring it does NOT trigger an import (see the `require.main === module` guard
 * at the bottom) — so other scripts can safely reuse its exported helpers.
 *
 * Credentials (in .env.jira, gitignored):
 *   XRAY_CLIENT_ID, XRAY_CLIENT_SECRET   -> Xray Cloud API key (Jira -> Apps -> Xray -> API Keys)
 *   JIRA_PROJECT_KEY (e.g. NUI), JIRA_PROJECT_ID (e.g. 10206)
 *
 * CSV shape (Xray manual-test layout): the FIRST row of each test carries the
 * test-level columns (IssueId, Summary, Description, Test Repository, labels, Component, ...);
 * the following rows have a blank IssueId and only Test Steps / Test Data / Expected Result
 * (each such row is an additional manual step).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadJiraEnv, authenticate, graphql } = require('./xray-client');

// ---- minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/newlines, "" escapes) ----
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQ = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ''));
}

// ---- group CSV rows into Xray tests ----
function buildTests(csvPath) {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const header = rows.shift();
  const idx = name => header.indexOf(name);
  const C = {
    id: idx('IssueId'), summary: idx('Summary'), description: idx('Description'),
    steps: idx('Test Steps'), data: idx('Test Data'), result: idx('Expected Result'),
    repo: idx('Test Repository'), labels: idx('labels'), component: idx('Component'),
  };
  const tests = [];
  let cur = null;
  for (const r of rows) {
    const get = j => (j >= 0 && r[j] != null ? r[j].trim() : '');
    if (get(C.id)) {
      cur = {
        summary: get(C.summary),
        description: get(C.description),
        repoFolder: get(C.repo),
        labels: get(C.labels).split(',').map(s => s.trim()).filter(Boolean),
        component: get(C.component),
        steps: [],
      };
      tests.push(cur);
    }
    if (!cur) continue;
    const action = get(C.steps);
    if (action) cur.steps.push({ action, data: get(C.data), result: get(C.result) });
  }
  return tests;
}

const CREATE_FOLDER = `mutation($projectId:String!,$path:String!){
  createFolder(projectId:$projectId, path:$path){ folder{ name path } warnings }
}`;

const CREATE_TEST = `mutation($jira:JSON!,$steps:[CreateStepInput]!,$folderPath:String){
  createTest(testType:{name:"Manual"}, steps:$steps, jira:$jira, folderPath:$folderPath){
    test{ issueId jira(fields:["key"]) }
    warnings
  }
}`;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvPath = path.resolve(args.find(a => !a.startsWith('--')) ||
    'test-scenarios/test-cases/billing_transactions_testcoverage.csv');
  const env = loadJiraEnv(path.resolve('.env.jira'));

  const tests = buildTests(csvPath);
  const folders = [...new Set(tests.map(t => t.repoFolder).filter(Boolean))];
  console.log(`Parsed ${tests.length} tests from ${path.basename(csvPath)}`);
  console.log(`Test Repository folder(s): ${folders.join(', ') || '(none)'}`);
  console.log(`Steps per test (first 3): ${tests.slice(0, 3).map(t => t.steps.length).join(', ')} ...`);
  console.log(`Total steps across all tests: ${tests.reduce((n, t) => n + t.steps.length, 0)}`);

  if (dryRun) {
    console.log('\n--dry-run: sample test #1:');
    console.log(JSON.stringify(tests[0], null, 2));
    return;
  }

  if (!env.XRAY_CLIENT_ID || !env.XRAY_CLIENT_SECRET) {
    console.error('\nMissing XRAY_CLIENT_ID / XRAY_CLIENT_SECRET in .env.jira.');
    console.error('Generate an Xray API key: Jira -> Apps -> Xray -> API Keys -> create for your account.');
    process.exit(2);
  }
  const projectId = env.JIRA_PROJECT_ID;
  const projectKey = env.JIRA_PROJECT_KEY;
  if (!projectId || !projectKey) { console.error('Missing JIRA_PROJECT_ID / JIRA_PROJECT_KEY in .env.jira.'); process.exit(2); }

  console.log('\nAuthenticating with Xray Cloud...');
  const token = await authenticate(env.XRAY_CLIENT_ID, env.XRAY_CLIENT_SECRET);
  console.log('Authenticated.');

  // 1) Create the Test Repository folder(s) up front (root-relative path).
  for (const f of folders) {
    const p = f.startsWith('/') ? f : `/${f}`;
    try {
      const d = await graphql(token, CREATE_FOLDER, { projectId, path: p });
      console.log(`Folder ensured: ${d.createFolder.folder.path}` +
        (d.createFolder.warnings?.length ? ` (warnings: ${d.createFolder.warnings.join('; ')})` : ''));
    } catch (e) {
      // Already-exists is fine; anything else re-thrown.
      if (/exists|duplicate/i.test(e.message)) console.log(`Folder already exists: ${p}`);
      else throw e;
    }
  }

  // 2) Create each Test with steps and file it into the folder.
  const created = [], failed = [];
  for (let n = 0; n < tests.length; n++) {
    const t = tests[n];
    const folderPath = t.repoFolder ? (t.repoFolder.startsWith('/') ? t.repoFolder : `/${t.repoFolder}`) : null;
    const jira = {
      fields: {
        summary: t.summary,
        description: t.description,
        project: { key: projectKey },
        ...(t.labels.length ? { labels: t.labels } : {}),
        ...(t.component ? { components: [{ name: t.component }] } : {}),
      },
    };
    try {
      const d = await graphql(token, CREATE_TEST, { jira, steps: t.steps, folderPath });
      const key = d.createTest.test.jira.key;
      created.push(key);
      console.log(`[${n + 1}/${tests.length}] created ${key}  (${t.steps.length} steps)  "${t.summary.slice(0, 60)}"`);
    } catch (e) {
      failed.push({ n: n + 1, summary: t.summary, error: e.message });
      console.error(`[${n + 1}/${tests.length}] FAILED: ${e.message}`);
    }
  }

  console.log(`\nDone. Created ${created.length}/${tests.length}. Failed ${failed.length}.`);
  if (created.length) console.log(`Keys: ${created.join(', ')}`);
  if (failed.length) { console.log('Failures:'); failed.forEach(f => console.log(`  #${f.n} ${f.summary} -> ${f.error}`)); process.exit(1); }
}

module.exports = { parseCsv, buildTests };

// Only run the importer when executed directly (`node utils/jira/xray-import.js`).
// Guards against the footgun where `require('./xray-import')` would re-run the
// whole import and create duplicate Test Cases.
if (require.main === module) {
  main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
}
