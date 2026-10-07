/**
 * Xray Cloud results reporter for Playwright.
 *
 * Wiring: added to `reporter: [...]` in playwright.config.js. It is OPT-IN —
 * it does nothing unless `XRAY_REPORT=true` is set, so normal local runs never
 * touch Jira. (CI sets the flag.)
 *
 * What it does, once per Playwright run (in onEnd, after ALL retries):
 *   1. Reads every executed test's FINAL outcome (retry-pass counts as PASSED).
 *   2. Reads each test's Jira Test Case key from its Playwright tag `@NUI-1234`.
 *   3. Groups tests by spec file = "feature". One STE per feature.
 *   4. find-or-create the feature's STE (deterministic summary, dated), then
 *      import/execution to associate the tests and (over)write their results,
 *      ATTACHING each test's evidence (screenshot / video / trace) + a comment.
 *
 * Result model (Playwright outcome -> Xray status):
 *   expected / flaky -> PASSED   (flaky = failed then passed on retry)
 *   unexpected       -> FAILED
 *   skipped          -> TODO
 *
 * Evidence: the FINAL attempt's attachments are uploaded as Xray test-run
 * evidence (base64). Files larger than XRAY_MAX_EVIDENCE_MB (default 10) are
 * skipped with a LOUD warning so QA knows to open the local HTML/Ortoni report.
 *
 * Failures talking to Xray are caught and logged — they never fail the test run.
 * No secret/token is ever logged.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const {
  loadJiraEnv, authenticate, findTestExecutionBySummary, createTestExecution, importExecution,
} = require('./xray-client');

const OUTCOME_TO_STATUS = {
  expected: 'PASSED',
  flaky: 'PASSED',
  unexpected: 'FAILED',
  skipped: 'TODO',
};

const EXT_BY_TYPE = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'video/webm': 'webm', 'video/mp4': 'mp4',
  'application/zip': 'zip', 'text/plain': 'txt', 'application/json': 'json',
};

// "billing-transactions.spec.js" -> "Billing Transactions"
function featureFromFile(file) {
  return path
    .basename(file)
    .replace(/\.spec\.(js|ts|mjs|cjs)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function jiraKeyFromTags(tags) {
  // Playwright stores tags WITH the leading '@', e.g. ['@NUI-7838', '@View'].
  for (const t of tags || []) {
    const m = /^@?([A-Z][A-Z0-9]+-\d+)$/.exec(t.trim());
    if (m) return m[1];
  }
  return null;
}

// Build Xray evidence[] from a test result's attachments (final attempt).
// Returns { evidence, skipped: [{filename, mb}] }.
function buildEvidence(result, maxBytes) {
  const evidence = [];
  const skipped = [];
  if (!result || !result.attachments) return { evidence, skipped };
  const seen = new Set();
  for (const att of result.attachments) {
    let buf = null;
    try {
      if (att.body && Buffer.isBuffer(att.body)) buf = att.body;
      else if (att.path && fs.existsSync(att.path)) buf = fs.readFileSync(att.path);
    } catch { /* unreadable attachment — skip silently */ }
    if (!buf || !buf.length) continue;

    let filename = att.path
      ? path.basename(att.path)
      : `${String(att.name || 'evidence').replace(/[^\w.-]+/g, '_')}.${EXT_BY_TYPE[att.contentType] || 'bin'}`;
    // De-dupe identical filenames within one test run.
    if (seen.has(filename)) {
      const dot = filename.lastIndexOf('.');
      filename = dot > 0 ? `${filename.slice(0, dot)}-${seen.size}${filename.slice(dot)}` : `${filename}-${seen.size}`;
    }
    seen.add(filename);

    if (buf.length > maxBytes) { skipped.push({ filename, mb: buf.length / 1048576 }); continue; }
    evidence.push({
      data: buf.toString('base64'),
      filename,
      contentType: att.contentType || 'application/octet-stream',
    });
  }
  return { evidence, skipped };
}

function buildComment(entry) {
  const parts = [`Playwright: ${entry.outcomeLabel} (${entry.attempts} attempt${entry.attempts === 1 ? '' : 's'})`];
  if (entry.status === 'FAILED' && entry.result && entry.result.error && entry.result.error.message) {
    // Strip ANSI colour codes Playwright embeds in error messages.
    const msg = entry.result.error.message.replace(/\[[0-9;]*m/g, '').split('\n')[0].slice(0, 400);
    parts.push(`Error: ${msg}`);
  }
  return parts.join(' | ');
}

class XrayReporter {
  onBegin(config, suite) {
    this._enabled = process.env.XRAY_REPORT === 'true';
    this._suite = suite;
    this._startDate = new Date().toISOString();
    // Local calendar date (no time) for the STE summary, e.g. "2026-10-01".
    const d = new Date();
    this._runDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Collect per-feature groups of final results (incl. the final attempt object).
  _collect() {
    const groups = new Map(); // feature -> { feature, file, tests: Map<testKey, entry> }
    for (const test of this._suite.allTests()) {
      const key = jiraKeyFromTags(test.tags);
      if (!key) continue; // not mapped to a Jira Test Case — skip
      const results = test.results || [];
      const finalResult = results.length ? results[results.length - 1] : null;
      const entry = {
        status: OUTCOME_TO_STATUS[test.outcome()] || 'TODO',
        title: test.title,
        outcomeLabel: test.outcome(),
        attempts: results.length || 1,
        result: finalResult,
      };
      const file = test.location ? test.location.file : 'unknown.spec.js';
      const feature = featureFromFile(file);
      if (!groups.has(feature)) groups.set(feature, { feature, file, tests: new Map() });
      // Last write wins — collapses any duplicate testKey to one final result.
      groups.get(feature).tests.set(key, entry);
    }
    return groups;
  }

  async onEnd() {
    if (!this._enabled) return; // opt-in guard
    const finishDate = new Date().toISOString();

    const groups = this._collect();
    if (groups.size === 0) {
      console.log('[xray] XRAY_REPORT=true but no @<KEY>-tagged tests were executed — nothing to report.');
      return;
    }

    const env = loadJiraEnv();
    const projectKey = env.JIRA_PROJECT_KEY;
    if (!env.XRAY_CLIENT_ID || !env.XRAY_CLIENT_SECRET || !projectKey) {
      console.error('[xray] Missing XRAY_CLIENT_ID / XRAY_CLIENT_SECRET / JIRA_PROJECT_KEY in .env.jira — skipping Xray report.');
      return;
    }

    let token;
    try {
      token = await authenticate(env.XRAY_CLIENT_ID, env.XRAY_CLIENT_SECRET);
    } catch (e) {
      console.error(`[xray] Authentication failed — skipping Xray report. ${e.message}`);
      return;
    }

    const forcedKey = env.XRAY_TEST_EXECUTION_KEY || process.env.XRAY_TEST_EXECUTION_KEY || null;
    const component = env.XRAY_COMPONENT || process.env.XRAY_COMPONENT || 'UI';
    // Active target environment (QAN / INTEGRATION / STAGE / PROD) for the STE heading,
    // so the team knows which environment a run hit. Single source of truth = config/env.js.
    let envName = (process.env.TEST_ENV || 'QAN').trim().toUpperCase();
    try { envName = require('../../config/env').ENV.name || envName; } catch { /* use fallback */ }
    const attachEvidence = (env.XRAY_ATTACH_EVIDENCE || process.env.XRAY_ATTACH_EVIDENCE || 'true') !== 'false';
    const maxBytes = Math.max(1, Number(env.XRAY_MAX_EVIDENCE_MB || process.env.XRAY_MAX_EVIDENCE_MB || 10)) * 1048576;

    for (const group of groups.values()) {
      // STE summary: "<PROJECT> | <Feature> | <ENV> | <YYYY-MM-DD>" (date only, no time).
      // Env in the heading tells the team which environment the run hit (QAN/PROD/...).
      // One STE per feature+env+day: same-day re-runs on the same env reuse & override
      // that STE; a new env or a new day => a new STE.
      const summary = env.XRAY_STE_SUMMARY && groups.size === 1
        ? env.XRAY_STE_SUMMARY
        : `${projectKey} | ${group.feature} | ${envName} | ${this._runDate}`;
      const description =
        `Automated Playwright execution for "${group.feature}". ` +
        `Results reflect the final Playwright outcome after all configured retries.`;

      // Build the per-test payload, attaching evidence + comment.
      // Evidence is expected for EVERY test (screenshot + video captured for all).
      let attached = 0, skippedCount = 0, noEvidence = 0;
      const tests = [...group.tests.entries()].map(([testKey, entry]) => {
        const t = { testKey, status: entry.status, comment: buildComment(entry) };
        if (attachEvidence) {
          const { evidence, skipped } = buildEvidence(entry.result, maxBytes);
          if (evidence.length) { t.evidence = evidence; attached += evidence.length; }
          for (const s of skipped) {
            skippedCount++;
            console.warn(`[xray]    ! ${testKey}: evidence "${s.filename}" skipped (${s.mb.toFixed(1)}MB > ${(maxBytes / 1048576)}MB cap) — raise XRAY_MAX_EVIDENCE_MB; full evidence in local report`);
          }
          if (!evidence.length && !skipped.length) {
            noEvidence++;
            console.warn(`[xray]    ! ${testKey}: no evidence captured (expected screenshot+video) — check screenshot/video config`);
          }
        }
        return t;
      });

      try {
        // 1) Reuse an existing STE for this feature if one is already in Jira.
        let execKey = forcedKey || await findTestExecutionBySummary(token, projectKey, summary);
        let created = false;

        // 2) Otherwise create it (via GraphQL so the mandatory Component is set).
        //    Dates are applied in step 3 via import (Begin/End date fields).
        if (!execKey) {
          const ste = await createTestExecution(token, { summary, description, projectKey, component });
          execKey = ste.key;
          created = true;
        }

        // 3) Associate the tests + (over)write their FINAL results + evidence + dates.
        const res = await importExecution(token, {
          testExecutionKey: execKey,
          summary, description, projectKey,
          startDate: this._startDate,
          finishDate,
          tests,
        });

        const action = created ? `created STE ${res.key}` : `updated existing STE ${res.key}`;
        console.log(`[xray] ${action} for "${group.feature}" — ${tests.length} test case(s), ${attached} evidence file(s) attached:`);
        for (const t of tests) {
          const ev = t.evidence ? ` [+${t.evidence.length} evidence]` : '';
          console.log(`[xray]    ${t.testKey} -> ${t.status}${ev}`);
        }
        if (skippedCount) console.warn(`[xray] ${skippedCount} evidence file(s) skipped (over size cap) — full evidence in the local report.`);
        if (noEvidence) console.warn(`[xray] ${noEvidence} test(s) had no evidence attached — check screenshot/video capture.`);
      } catch (e) {
        console.error(`[xray] Failed to report "${group.feature}" to Xray: ${e.message}`);
      }
    }
  }
}

module.exports = XrayReporter;
