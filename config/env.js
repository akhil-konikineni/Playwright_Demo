// Central environment resolver — the ONLY place the framework reads process.env.
//
// Picks the active environment from TEST_ENV (default QAN, case-insensitive),
// loads the matching `.env.<env>` file, maps its `<ENV>_*` variables onto one
// stable ENV interface, and freezes it. Every other module imports ENV from here,
// so tests / POMs / utils never know which environment is active — the only thing
// that changes between QAN / Integration / Stage / Prod is TEST_ENV.
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const SUPPORTED = ['QAN', 'INTEGRATION', 'STAGE', 'PROD'];

// Root .env is optional and holds only the TEST_ENV selector. Load it first; a
// TEST_ENV already present in the real process environment (shell/CI) takes priority.
dotenv.config();

const active = String(process.env.TEST_ENV || 'QAN').trim().toUpperCase();
if (!SUPPORTED.includes(active)) {
  throw new Error(
    `Unsupported TEST_ENV="${process.env.TEST_ENV}". Supported values: ${SUPPORTED.join(', ')}.`
  );
}

// Load the environment-specific secrets file (.env.qan / .env.integration / ...).
const envFile = `.env.${active.toLowerCase()}`;
const envPath = path.resolve(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Reads a `<ACTIVE>_<suffix>` variable (e.g. active=QAN, suffix=DB_HOST -> QAN_DB_HOST).
const raw = (suffix) => process.env[`${active}_${suffix}`];

const ENV = Object.freeze({
  name: active, //  e.g. 'QAN'
  file: envFile, //  e.g. '.env.qan'
  // Application origin, used as Playwright `baseURL`; login derives the /auth path from it.
  baseURL: raw('URL'),
  credentials: Object.freeze({
    username: raw('USERNAME'),
    password: raw('PASSWORD'),
  }),
  db: Object.freeze({
    host: raw('DB_HOST'),
    user: raw('DB_USER'),
    password: raw('DB_PASSWORD'),
    database: raw('DB_NAME'),
  }),
});

// The `<ENV>_*` suffixes every environment must define.
const REQUIRED = ['URL', 'USERNAME', 'PASSWORD', 'DB_NAME', 'DB_HOST', 'DB_USER', 'DB_PASSWORD'];

// Validates the ACTIVE environment's configuration. Reports the env + file and the
// exact missing keys — and never prints secret values.
function assertEnv() {
  const missing = REQUIRED.filter((s) => !process.env[`${active}_${s}`]).map((s) => `${active}_${s}`);
  if (missing.length) {
    throw new Error(
      `Active environment: ${active}\n` +
        `Configuration file: ${envFile}\n\n` +
        `Missing required configuration:\n` +
        missing.map((k) => `- ${k}`).join('\n')
    );
  }
}

module.exports = { ENV, assertEnv, SUPPORTED };
