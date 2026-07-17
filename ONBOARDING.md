# Claude Code Best Practices — RTK + Headroom + Prompting

Field guide covering everything the team has learned running Claude Code with RTK (token optimization), Headroom (context compression), structured prompting, and MCP browser-testing agents. 22 practices across 6 areas.

**Stats:** RTK + Headroom combined can save up to 90% of tokens on a session. Two independent optimization layers (RTK for shell commands, Headroom for LLM context). Three MCP agents in the QA pipeline (planner, generator, healer). 5+ reusable context files eliminate repeated prompt work.

---

## 1. Token Optimization

### P01 — Use RTK for every shell command
RTK (Rust Token Killer) is installed as a `PreToolUse` hook in Claude's `settings.json`. Every Bash command is automatically rewritten to `rtk <command>` before execution — no manual action needed.

```
# git status → rtk git status (filtered output)
# npm install → rtk npm install (stripped noise)

rtk gain              # tokens saved this session
rtk gain --history    # per-command breakdown
rtk discover          # missed opportunities
```
**Why it matters:** terminal output like `npm install` or `git log` is extremely verbose. RTK strips boilerplate before it enters Claude's context — 60–90% savings on dev operations.

### P02 — RTK hook must be registered in settings.json
RTK only saves tokens if wired up as a Claude Code hook. Without this, RTK is installed but inert.

```json
// ~/.claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "rtk hook claude" }]
    }]
  }
}
```
If `rtk gain` shows 0 savings after a session of commands, check this config first — the hook may not be registered.

### P03 — Always start the Headroom proxy before Claude
Headroom is **not** a background service — it must be started manually each session, before launching Claude Code. This is the most common mistake and the root cause of most `Connection Refused` errors.

```
# Terminal 1 — keep open
headroom proxy

# Terminal 2 — working terminal
$env:ANTHROPIC_BASE_URL = "http://localhost:8787"
claude

# Or one-liner:
headroom wrap claude
```
**Quick check:** `curl http://localhost:8787/health` — JSON response means it's running; "Connection Refused" means it's not started.

### P04 — Set ANTHROPIC_BASE_URL permanently
Setting the env var in a terminal only applies to that session. Add it to your PowerShell profile so you only need to start the proxy, not re-set the variable every time.

```
notepad $PROFILE
# add:
$env:ANTHROPIC_BASE_URL = "http://localhost:8787"

# verify after restarting terminal:
echo $env:ANTHROPIC_BASE_URL
```
Without this, Claude Code sends context directly to Anthropic uncompressed — `rtk gain` looks normal, but Headroom stats show zero.

### P05 — Regularly verify token savings are actually happening
Both tools can silently do nothing (missing hook config, wrong env var, stopped proxy). Check savings at the start of important sessions.

```
# RTK
rtk gain
rtk gain --history
rtk discover

# Headroom
curl http://localhost:8787/stats   # tokens_before, tokens_after, tokens_saved_total
curl http://localhost:8787/health  # proxy status/version
```
Typical: 60–90% RTK savings on dev commands, 50–90% Headroom savings on context, 0% if either tool is misconfigured.

---

## 2. Prompt Engineering

### P06 — Frame Claude in a specific expert role
Open prompts by assigning explicit expert personas — this sets the behavioral baseline for the whole session.

```
Act as a Senior QA Automation Architect,
Senior Manual Exploratory Tester,
AI Validation Engineer,
MCP Browser Interaction Agent,
API Validation Engineer, and
DB Validation Specialist.
```
**Rule:** the role frame goes at the very top, before any instructions — every subsequent instruction is interpreted through that lens.

### P07 — Use numbered, hierarchical rule sections
Numbered markdown sections (1. Objectives, 2. Context, 3. Login Rules…) improve Claude's ability to refer back to specific rules and reduce contradictory behavior.

**Do:**
- `## 3. Login and Authentication Flow`
- `### Mandatory authentication rules`
- `- Never guess the login sequence`
- `- Never skip auth checks`

**Avoid:**
- A wall of plain paragraphs
- Mixed instructions in one block
- Unstated constraints buried in prose
- Repeating the same rule differently

### P08 — Compress prompts without losing behavior
Use a refactoring instruction to shrink a large prompt file's token footprint while keeping every rule intact.

```
Treat this as a refactoring exercise, not a
rewrite. Remove duplicated instructions, merge
overlapping sections, compress verbose wording.
Before returning: verify no rule was removed,
no capability lost, no workflow changed.
```
**When to do it:** once a prompt file grows beyond ~200 lines through iterative additions — duplicated rules cost tokens twice for no benefit.

### P09 — Write "Never do X" alongside "Always do Y"
Positive rules work better paired with explicit negative rules.

```
# Positive:
You must click every reachable menu.

# Negative:
You must not skip sections.
You must not ignore disabled fields.
You must not stop after happy-path.
You must not assume workflow functionality without evidence.
```
Negative rules stop Claude from taking shortcuts that look reasonable but break intent — especially in exploratory testing where "close enough" isn't acceptable.

---

## 3. Context Management

### P10 — Store reusable context in .md files
Instead of re-pasting instructions every session, store them in `.md` files Claude can read directly.

```
Master.md        ← Role + full QA methodology
QA_PIPELINE.md   ← Per-module pipeline config
DB_VALIDATION.md ← SQL queries for DB checks
Business Rules/  ← Feature-specific logic
.env             ← Credentials + URLs
```
**Pattern:** separate "what Claude should know" (Master.md) from "what to do today" (QA_PIPELINE config block) — only the config block changes between sessions.

### P11 — Separate methodology from session config
QA_PIPELINE.md has a single `CONFIG` block at the top — the only part that changes between sessions.

```
TARGET_MODULE  : Data Centre
APP_URL        : https://portal.qan...
FULL_USER      : statususer
FULL_PASSWORD  : Password#1
```
A new testing session takes one change (the module name), not a rewrite. Methodology stays consistent across all modules.

### P12 — Keep feature business rules in dedicated files
Complex business logic (billing transaction rules, status transitions) goes in its own file, not pasted into chat, so it's reusable across sessions:
- Status transition matrices (setup → requested → active → exported) as rules, not prose
- Billing validation logic (lock dates, invoiced fields) in its own file
- DB validation SQL queries separated into `DB_VALIDATION.md`
- Permission sets described once and referenced, not repeated per test case

---

## 4. MCP Integration & Tooling

### P13 — Use the right MCP agent for each phase
Three agents, three jobs, invoked in strict order:

1. **playwright-test-planner** — navigates the live app with `FULL_USER`, discovers all UI elements, saves the test plan to disk. Invoke first, before any test generation.
2. **playwright-test-generator** — reads the saved plan, executes each step in the browser, writes Playwright test files. Invoke after the planner completes.
3. **playwright-test-healer** — runs failing tests, reads error output, fixes locators/logic. Invoke only after tests have failed.

**Common mistakes to avoid:**
- Running the generator before the planner has saved the plan
- Using `RESTRICTED_USER` for Phase 1 — hidden elements won't be discovered
- Invoking the healer before running tests first
- Manually restarting MCP servers instead of checking if the proxy is up
- Skipping the planner and generating tests from memory

### P14 — Keep MCP server configs in .vscode/mcp.json
All MCP servers (playwright-test, headroom) are registered here — the single source of truth for what's available in the session.

```json
"headroom": {
  "type": "stdio",
  "command": "headroom",
  "args": ["mcp", "serve"],
  "env": { "HEADROOM_PROXY_URL": "http://127.0.0.1:8787" }
}
```
If a server shows "Disconnected," the proxy isn't running — start it, then reload the VSCode window (`Ctrl+Shift+P → Developer: Reload Window`).

### P15 — Phase 1 always runs with all permissions active
The planner must use an account with all capabilities active for the target module — missing permissions hide UI elements the planner can't then generate scenarios for.
- Confirm via DB query that all permissions are `active` before starting Phase 1
- Negative/permission tests use a `RESTRICTED_USER` (separate account or permissions temporarily deactivated in DB)
- Never use the restricted user for discovery — it will miss protected features
- Always enable all 5+ capabilities before running the planner on a new module

---

## 5. Session, Auth & Error Recovery

### P16 — Follow the same startup sequence every session
`Connection Refused` errors almost always trace back to a skipped or reordered startup step.

1. **Start Headroom proxy** — `headroom proxy` in a dedicated terminal; wait for "Uvicorn running"
2. **Confirm proxy health** — `curl http://localhost:8787/health`; don't proceed until it returns JSON
3. **Open working terminal** — confirm `$env:ANTHROPIC_BASE_URL` is set to the proxy URL
4. **Launch Claude Code** — `claude`; check `claude auth status` if needed

### P17 — Use a fast diagnostic sequence for API errors
When you see `Unable to connect to API`, run these in order and stop at the first failure — don't guess, reinstall, or restart VSCode first.

```
curl http://localhost:8787/health     # is the proxy running?
echo $env:ANTHROPIC_BASE_URL          # is the env var set?
claude auth status                    # is Claude authenticated?
curl -I https://api.anthropic.com     # can you reach Anthropic directly?
claude --debug "Hello"                # verbose output
```

### P18 — Know the difference between auth problems and proxy problems
Two different failures look similar but need different fixes.

**Proxy problem (Headroom):**
- Error appears immediately on any command
- `curl http://localhost:8787/health` fails
- Fix: start the proxy with `headroom proxy`

**Auth problem (Claude login):**
- Error persists even without the Headroom proxy
- `claude auth status` shows not logged in
- Fix: `claude auth logout` then `claude auth login`

**Historical pattern:** most "Connection Refused" errors were proxy problems, not auth problems — check the proxy first.

---

## 6. Workflow & Output Quality

### P19 — Use "continue" for stalled mid-stream responses
If Claude shows "Response stalled mid-stream," don't re-send the whole prompt — just reply `continue`. Claude holds conversation context and resumes exactly where it stopped.

If it stalls again on a very large task, scale down explicitly:
```
Ok let's keep it aside if it is too big.
Let's try it for one feature and see how it behaves.
```

### P20 — Scope large tasks to one feature at a time
Asking for test cases across an entire application at once causes stalls and incomplete/poor-quality output. Scope to one module per session via the `TARGET_MODULE` field in the CONFIG block:
```
TARGET_MODULE : ProviderTariff   ← one module
TARGET_MODULE : DataCentre
TARGET_MODULE : Transactions
TARGET_MODULE : IPPool
```
Methodology stays constant; only scope changes between sessions.

### P21 — Always generate unique test data values
Never reuse titles or names for create operations — avoids false failures from duplicate-entry errors and keeps test runs independent.

```
Auto_Test_<timestamp>
MCP_AI_<random>
QA_<feature>_<datetime>

// In Playwright tests:
const name = `TestDC_${Date.now()}`;
const ref  = `REF_${Math.random().toString(36).slice(2)}`;
```

### P22 — Always validate UI → API → DB, never just one layer
Every significant action is validated at three layers — validating only the UI catches roughly 40% of real bugs.

- **UI** — toast message, table refresh, field state (what the user sees)
- **API** — response status, schema, payload values (what the backend returned)
- **DB** — SQL query confirms the record exists, status updated, timestamps correct

`DB_VALIDATION.md` stores reusable SQL queries per module so three-layer validation doesn't require writing new queries every session.
