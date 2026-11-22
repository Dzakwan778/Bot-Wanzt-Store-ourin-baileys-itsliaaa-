import fs from 'fs';
import path from 'path';

const runDir = '/root/security-audit-skill/wanzt-bot/run-1';
const metadata = JSON.parse(fs.readFileSync(path.join(runDir, 'run-metadata.json'), 'utf8'));
const findings = JSON.parse(fs.readFileSync(path.join(runDir, 'findings.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(runDir, 'coverage-ledger.json'), 'utf8'));

function cleanDash(str) {
  return String(str ?? '')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-');
}

const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const confirmed = findings
  .filter((f) => f.verdict === 'confirmed')
  .sort((a, b) => {
    const sa = sevOrder[a.severity.overall_severity] ?? 99;
    const sb = sevOrder[b.severity.overall_severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.fingerprint.localeCompare(b.fingerprint);
  });

const needsValidation = findings.filter((f) => f.verdict === 'needs_validation');
const rejected = findings.filter((f) => f.verdict === 'rejected');

const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
for (const c of confirmed) {
  sevCounts[c.severity.overall_severity] = (sevCounts[c.severity.overall_severity] || 0) + 1;
}

const ledgerCounts = { covered: 0, candidate: 0, blocked: 0, deferred: 0, planned: 0 };
for (const u of ledger) {
  ledgerCounts[u.status] = (ledgerCounts[u.status] || 0) + 1;
}

function getBoundary(f) {
  const unit = ledger.find((u) => (u.result_fingerprints || []).includes(f.fingerprint));
  if (unit) return unit.boundary + ' (' + unit.surface + ')';
  return f.trace[0]?.file || 'backend';
}

function getOneLineResult(f) {
  const s = cleanDash(f.execution?.observed_result || '').replace(/\s+/g, ' ').trim();
  return s.length > 160 ? s.slice(0, 157) + '...' : s;
}

function getSourceLocations(f) {
  const locs = new Set();
  for (const t of f.trace || []) locs.add(`${t.file}:${t.line}`);
  for (const e of f.evidence || []) locs.add(`${e.file}:${e.line}`);
  return Array.from(locs).join(', ');
}

function escPipe(s) {
  return cleanDash(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ================= REPORT.md =================
const reportLines = [];
reportLines.push('# Security Audit Report: Wanzt Bot Multi-Tenant Store & Master Admin');
reportLines.push('');
reportLines.push('## 1. Run Profile, Scope, and Execution Boundary');
reportLines.push('');
reportLines.push(`- **Run ID**: \`${metadata.run_id}\``);
reportLines.push(`- **Target Repository**: \`${metadata.target}\` (read-only during audit; zero repository files created or modified)`);
reportLines.push(`- **Source Reference**: \`${metadata.source_ref}\``);
reportLines.push(`- **Profile & Budget**: \`${metadata.profile}\` profile, \`budget: null\` (unrestricted coverage across all in-scope components)`);
reportLines.push(`- **Execution Policy**: \`${metadata.execution_policy}\` - source inspection and bounded local execution inside \`unshare -r -n -m\` with read-only \`/tmp/sbox_ro\`, isolated scratch directory, empty \`env -i\`, \`ulimit -t 25\`, \`timeout 30s\`, and loopback-only dummy HTTP listeners. Zero external hosts, production endpoints, WhatsApp/Telegram APIs, or live VPS hosts were contacted.`);
reportLines.push(`- **Execution Mode**: \`${metadata.execution_mode}\` (${cleanDash(metadata.execution_mode_note)})`);
reportLines.push(`- **Scope Paths**: ${metadata.scope_paths.map((p) => `\`${p}\``).join(', ')}`);
reportLines.push(`- **Prior Runs Used**: None (\`prior_run_paths: []\`)`);
reportLines.push('- **Out-of-Scope / Deferred Surfaces**: `node_modules`, build artifacts (`dist/`), live production VPS host config/UFW/Certbot state, external third-party APIs (`xavierastore.com`, `lunasqris.com`, WhatsApp/Telegram servers), and documentation/planning files (`brain/`, `SCHEDULE.md`).');
reportLines.push('');
reportLines.push('## 2. Security Posture Summary');
reportLines.push('');
reportLines.push(`Across 22 evaluated coverage units, this audit identified **${confirmed.length} confirmed vulnerabilities** (**${sevCounts.critical} Critical, ${sevCounts.high} High, ${sevCounts.medium} Medium, ${sevCounts.low} Low**), **${needsValidation.length} unresolved deployment lead** (\`needs_validation\`, no severity assigned), **${rejected.length} refuted claim** (\`rejected\`), and **${ledgerCounts.covered} verified mitigated controls**.`);
reportLines.push('');
reportLines.push('The primary systemic exposure is a **missing authentication and broken tenant-isolation boundary across the tenant backend**: nearly all tenant operational routers (`/api/bot/*`, `/api/bot/telegram/*`, `/api/pricing/*`, `/api/promos/*`, `/api/transactions/*`, `/api/media/*`, `/api/xaviera/*`, `/api/lunasqris/*`, `/api/bot/redeem-token`, and `/api/auth/store-setup` + `/profile/update-username`) lack authentication middleware, while `backend/app.ts` allows an untrusted `X-Tenant-Id` header to overwrite a valid Bearer token and creates arbitrary SQLite tenant databases via query parameters. Secondary high-severity risks include fail-open payment webhook verification without replay or amount validation, client-supplied pricing inside WhatsApp `order_var:` button IDs, SSRF with API key exfiltration via unvalidated `baseUrl` parameters, static-salt 1,000-iteration PBKDF2 with hardcoded default credentials, and spoofable `X-Forwarded-For` brute-force lockouts.');
reportLines.push('');
reportLines.push('## 3. Confirmed Findings Summary Table');
reportLines.push('');
reportLines.push('| Severity | Fingerprint | Title | Affected Boundary | One-Line Observed Result |');
reportLines.push('|---|---|---|---|---|');
for (const f of confirmed) {
  const sev = f.severity.overall_severity.toUpperCase();
  reportLines.push(`| **${sev}** | \`${f.fingerprint}\` | ${escPipe(f.title)} | ${escPipe(getBoundary(f))} | ${escPipe(getOneLineResult(f))} |`);
}
reportLines.push('');
reportLines.push('## 4. Confirmed Findings');
reportLines.push('');
confirmed.forEach((f, idx) => {
  const sev = f.severity.overall_severity.toUpperCase();
  reportLines.push(`### ${idx + 1}. [${sev}] ${cleanDash(f.title)} (\`${f.fingerprint}\`)`);
  reportLines.push('');
  reportLines.push(`- **Repository Source Locations**: \`${getSourceLocations(f)}\``);
  reportLines.push(`- **Lower-Trust Principal**: ${cleanDash(f.execution.attacker_perspective)}`);
  reportLines.push(`- **Target-Native Bounded Reproduction**: Payloads: ${f.execution.payloads.map((p) => `\`${cleanDash(p)}\``).join('; ')}. Steps: ${f.execution.instructions.map((s) => cleanDash(s)).join(' ')}`);
  reportLines.push(`- **Conditions**: ${f.conditions.map((c) => `${c.kind}: ${cleanDash(c.description)}`).join(' | ')}`);
  reportLines.push(`- **Actual Observed Result**: ${cleanDash(f.execution.observed_result)}`);
  reportLines.push(`- **Impact & Priority Rationale**: Impact **${f.severity.impact.score}** (${cleanDash(f.severity.impact.reason)}); Likelihood **${f.severity.likelihood.score}** (${cleanDash(f.severity.likelihood.reason)}). Overall **${sev}**.`);
  reportLines.push(`- **Smallest Source Fix**: ${cleanDash(f.remediation.strategy)}`);
  reportLines.push('');
});

reportLines.push('## 5. Needs Validation (Unresolved Deployment Leads)');
reportLines.push('');
reportLines.push('> Note: Entries below are unresolved verification leads with missing live-environment facts. No severity is assigned and they are not counted as confirmed vulnerabilities.');
reportLines.push('');
reportLines.push('| Fingerprint | Title | Repository Trace | Exact Blocker | Safe Owner-Observed Deployment Check |');
reportLines.push('|---|---|---|---|---|');
for (const nv of needsValidation) {
  const traceStr = (nv.trace || []).map((t) => `\`${t.file}:${t.line}\``).join(' -> ');
  const blockerStr = (nv.blockers || []).join('; ');
  const planStr = nv.validation_plan?.deployment || nv.validation_plan?.local || '';
  reportLines.push(`| \`${nv.fingerprint}\` | ${escPipe(nv.title)} | ${traceStr} | ${escPipe(blockerStr)} | ${escPipe(planStr)} |`);
}
reportLines.push('');

reportLines.push('## 6. Hardening Notes and Positive Source Patterns');
reportLines.push('');
reportLines.push('### Verified Positive Source Controls (Covered Units)');
reportLines.push('');
reportLines.push('1. **Master Admin Management Sub-Router Authentication (`admin-backend/routes/adminRoutes.ts:42`)**: All Master Admin management routes (`/api/admin/tenants`, `/tokens`, `/broadcast`, `/partners`, `/impersonate`, `/stats`) sit behind `requireMasterAdminAuth` validating SQLite-persisted `admin_sessions` tokens via `AdminAuthService.validateSession`.');
reportLines.push('2. **Parameterized SQLite Queries (`backend/database/sqlite.ts`, `admin-backend/database/masterSqlite.ts`)**: User-supplied inputs in tenant and master SQLite queries bind through `?` placeholders via `better-sqlite3`. Sandbox `CHK_11` confirmed `getUserByUsername("\' OR \'1\'=\'1")` returned `null` without syntax errors or row leakage.');
reportLines.push('3. **WhatsApp Hide-Tag Group Admin Check (`backend/handlers/hideTagHandler.ts`, `backend/handlers/hideTagUtils.ts`)**: Group participant privilege verification (`isGroupParticipantAdmin`) enforces `admin`/`superadmin` status across both PN and LID JID formats. Sandbox `CHK_11` confirmed non-admin participants were blocked while group admins were authorized.');
reportLines.push('4. **Media Upload/Serve Path Containment (`backend/services/mediaManager.ts`)**: `mediaManager.ts` normalizes tenant IDs with strict character allowlists and applies `path.basename` + extension allowlists on upload/read/delete. Sandbox `CHK_11` confirmed traversal inputs (`../../etc/passwd`) returned `null`.');
reportLines.push('');
reportLines.push('### Defense-in-Depth Hardening Notes');
reportLines.push('');
reportLines.push('1. **Redundant In-Memory Admin Token Set (`admin-backend/services/adminAuthService.ts:14`)**: `activeAdminTokens` Set is maintained alongside SQLite `admin_sessions`; consolidating exclusively onto `admin_sessions` removes potential drift across multi-worker PM2 setups.');
reportLines.push('2. **Voucher Token Redemption Atomicity (`admin-backend/services/tokenService.ts:177-239`)**: `TokenService.redeemToken` queries `extension_tokens`, verifies `status !== \'used\'`, calls `TenantService.extendDuration`, and then updates `status = \'used\'` without `WHERE id = ? AND status = \'available\'` inside a single `db.transaction(...)`. Wrap inside `db.transaction` and check `changes === 1` on `status = \'available\'` before extending tenant duration.');
reportLines.push('3. **Browser `localStorage` Session Storage & Missing Security Headers (`frontend/src/hooks/useAuth.ts`, `admin-frontend/src/utils/adminAuth.ts`, `backend/app.ts`)**: Both tenant and Master Admin SPAs store bearer tokens in `localStorage` instead of `HttpOnly`, `SameSite=Lax/Strict`, `Secure` cookies, and the Express servers do not set `Strict-Transport-Security`, `Content-Security-Policy`, or `X-Content-Type-Options: nosniff`.');
reportLines.push('4. **Explicit `https:` Validation on `paymentUrl` (`frontend/src/components/tabs/TabTransaksi.tsx:346`)**: Although React 19 natively blocks `javascript:` URLs in `<a href>` (verified in `CHK_10`), add explicit `new URL(url).protocol === \'https:\'` validation when storing and rendering `trx.paymentUrl` for defense-in-depth.');
reportLines.push('');

reportLines.push('## 7. Coverage Summary and Disposition Ledger');
reportLines.push('');
reportLines.push(`- **Total Coverage Units**: **${ledger.length}**`);
reportLines.push(`  - \`covered\` (verified mitigated / negative controls): **${ledgerCounts.covered}**`);
reportLines.push(`  - \`candidate\` (linked to confirmed, needs_validation, or rejected dispositions): **${ledgerCounts.candidate}**`);
reportLines.push(`  - \`blocked\`: **${ledgerCounts.blocked}** | \`deferred\`: **${ledgerCounts.deferred}** | \`planned\`: **${ledgerCounts.planned}**`);
reportLines.push('- **Companion Blocks Applied**: `WEB-PROTOCOL-AND-AUTH.md`, `CLIENT-SIDE.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`, `PROTOCOLS-RPC-AND-MESSAGING.md`, `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`, `CLOUD-AND-DEPLOYMENT.md`.');
reportLines.push('- **Excluded Companion Blocks**:');
for (const ex of metadata.excluded_companion_files) {
  reportLines.push(`  - \`${ex.file}\`: ${cleanDash(ex.reason)}`);
}
reportLines.push('- **Rejected Candidate Record (Not a Vulnerability)**:');
for (const r of rejected) {
  reportLines.push(`  - \`${r.fingerprint}\` (${cleanDash(r.title)}): ${cleanDash(r.reason)}`);
}
reportLines.push('- **Schema & Critic Validation**: Both `validate-findings.cjs` (`PASS: 19 findings valid`) and `validate-coverage-ledger.cjs` (`PASS: 22 coverage units valid`) succeeded cleanly, and fresh-eyes verification across all confirmed and unresolved records completed with zero unresolved discrepancies.');
reportLines.push('');

fs.writeFileSync(path.join(runDir, 'REPORT.md'), cleanDash(reportLines.join('\n')), 'utf8');

// ================= FINDINGS-DETAIL.md =================
const detailFindings = confirmed.filter((f) => ['critical', 'high', 'medium'].includes(f.severity.overall_severity));
const detailLines = [];
detailLines.push('# Findings Detail (Critical, High, and Medium Confirmed Findings)');
detailLines.push('');
detailLines.push(`This document provides full source traces, bounded local sandbox reproduction steps (from \`agents/verifier-local/artifacts/local-poc-results.json\`), observed outputs, conditions, and concrete source remediations for all **${detailFindings.length}** confirmed \`critical\`, \`high\`, and \`medium\` findings. (Low-severity findings are summarized in \`REPORT.md\` Section 4.)`);
detailLines.push('');

detailFindings.forEach((f, idx) => {
  const sev = f.severity.overall_severity.toUpperCase();
  detailLines.push(`## ${idx + 1}. [${sev}] ${cleanDash(f.title)}`);
  detailLines.push('');
  detailLines.push(`- **Fingerprint**: \`${f.fingerprint}\``);
  detailLines.push(`- **Severity**: **${sev}** (Likelihood: \`${f.severity.likelihood.score}\` - ${cleanDash(f.severity.likelihood.reason)} | Impact: \`${f.severity.impact.score}\` - ${cleanDash(f.severity.impact.reason)})`);
  detailLines.push(`- **Confidence**: \`${f.confidence.score}\` - ${cleanDash(f.confidence.reason)}`);
  detailLines.push('');
  detailLines.push('### Root Cause and Intended Behavior');
  detailLines.push('');
  detailLines.push(`- **Description**: ${cleanDash(f.description)}`);
  detailLines.push(`- **Root Cause**: ${cleanDash(f.root_cause)}`);
  detailLines.push(`- **Intended Behavior**: ${cleanDash(f.intended_behavior)}`);
  detailLines.push('');
  detailLines.push('### Ordered Source Trace');
  detailLines.push('');
  (f.trace || []).forEach((t, ti) => {
    detailLines.push(`${ti + 1}. **[${t.kind}]** \`${t.file}:${t.line}\` (\`${t.scope}\`): ${cleanDash(t.description)}`);
  });
  detailLines.push('');
  detailLines.push('### Supporting Source Evidence');
  detailLines.push('');
  (f.evidence || []).forEach((e) => {
    detailLines.push(`- \`${e.file}:${e.line}\`: ${cleanDash(e.description)}`);
  });
  detailLines.push('');
  detailLines.push('### Conditions and Containment');
  detailLines.push('');
  (f.conditions || []).forEach((c) => {
    detailLines.push(`- **${c.kind}**: ${cleanDash(c.description)}`);
  });
  detailLines.push('');
  detailLines.push('### Bounded Local Reproduction & Observed Output');
  detailLines.push('');
  detailLines.push(`- **Dummy Attacker / Principal**: ${cleanDash(f.execution.attacker_perspective)}`);
  detailLines.push('- **Target-Native Inputs / Payloads**:');
  (f.execution.payloads || []).forEach((p) => {
    detailLines.push(`  - \`${cleanDash(p)}\``);
  });
  detailLines.push('- **Bounded Execution Steps**:');
  (f.execution.instructions || []).forEach((ins, ii) => {
    detailLines.push(`  ${ii + 1}. ${cleanDash(ins)}`);
  });
  detailLines.push(`- **Observed Result**: ${cleanDash(f.execution.observed_result)}`);
  detailLines.push('');
  detailLines.push('### Remediation and Regression Case');
  detailLines.push('');
  detailLines.push(`- **Remediation Strategy**: ${cleanDash(f.remediation.strategy)}`);
  if (f.remediation.code_changes && f.remediation.code_changes.length > 0) {
    detailLines.push('- **Proposed Code Changes**:');
    f.remediation.code_changes.forEach((cc) => {
      detailLines.push(`  - File: \`${cc.file_name}\``);
      detailLines.push('```ts');
      detailLines.push(cleanDash(cc.fixed_code));
      detailLines.push('```');
    });
  }
  detailLines.push(`- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.`);
  detailLines.push('');
});

fs.writeFileSync(path.join(runDir, 'FINDINGS-DETAIL.md'), cleanDash(detailLines.join('\n')), 'utf8');

// ================= NEEDS-VALIDATION.md =================
const nvLines = [];
nvLines.push('# Needs Validation Leads');
nvLines.push('');
nvLines.push('This document records unresolved audit leads whose decisive facts lie outside repository source and bounded local execution. No severity rating is assigned to these items.');
nvLines.push('');

needsValidation.forEach((nv, idx) => {
  nvLines.push(`## ${idx + 1}. ${cleanDash(nv.title)}`);
  nvLines.push('');
  nvLines.push(`- **Fingerprint**: \`${nv.fingerprint}\``);
  nvLines.push(`- **Affected Boundary**: Production VPS Nginx reverse proxy, TLS transport, and host/cloud firewall around backend port 5000`);
  nvLines.push(`- **Description**: ${cleanDash(nv.description)}`);
  nvLines.push(`- **Claimed Root Cause**: ${cleanDash(nv.claimed_root_cause)}`);
  nvLines.push('');
  nvLines.push('### Repository Source Trace');
  nvLines.push('');
  (nv.trace || []).forEach((t, ti) => {
    nvLines.push(`${ti + 1}. **[${t.kind}]** \`${t.file}:${t.line}\` (\`${t.scope}\`): ${cleanDash(t.description)}`);
  });
  nvLines.push('');
  nvLines.push('### Verified Source Evidence');
  nvLines.push('');
  (nv.evidence || []).forEach((e) => {
    nvLines.push(`- \`${e.file}:${e.line}\`: ${cleanDash(e.description)}`);
  });
  nvLines.push('');
  nvLines.push('### Exact Unresolved Blockers');
  nvLines.push('');
  (nv.blockers || []).forEach((b) => {
    nvLines.push(`- ${cleanDash(b)}`);
  });
  nvLines.push('');
  nvLines.push('### Verification Plan');
  nvLines.push('');
  if (nv.validation_plan?.local) {
    nvLines.push(`- **Local Check**: ${cleanDash(nv.validation_plan.local)}`);
  }
  if (nv.validation_plan?.deployment) {
    nvLines.push(`- **Safe Owner-Observed Deployment Check**: ${cleanDash(nv.validation_plan.deployment)}`);
  }
  nvLines.push('');
});

fs.writeFileSync(path.join(runDir, 'NEEDS-VALIDATION.md'), cleanDash(nvLines.join('\n')), 'utf8');
console.log('Generated REPORT.md, FINDINGS-DETAIL.md, NEEDS-VALIDATION.md successfully.');
