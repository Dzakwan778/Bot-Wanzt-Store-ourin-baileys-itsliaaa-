import fs from 'node:fs';
import path from 'node:path';

const RUN_DIR = '/root/security-audit-skill/wanzt-bot/run-1';
const ARTIFACT_REL = 'agents/verifier-local/artifacts/local-poc-results.json';
const poc = JSON.parse(fs.readFileSync(path.join(RUN_DIR, ARTIFACT_REL), 'utf8'));

function assertNoDashes(str, label) {
  if (/[\u2013\u2014]/.test(str)) {
    throw new Error(`Forbidden en/em dash found in ${label}`);
  }
}

const findings = [
  // 1. apartment unauthenticated read endpoints
  {
    verdict: 'confirmed',
    fingerprint: 'auth.apartment-unauthenticated-read-endpoints',
    title: 'Unauthenticated Read Endpoints on Legacy /api/apartment/* Router',
    description:
      'Legacy apartment management GET endpoints (/stats, /tenants, /current-lease, /tenants/:id) omit requireMasterAdminAuth, exposing tenant records and operational statistics without authentication. In addition, requireMasterAdminAuth accepts bearer tokens via the URL query string (?token=).',
    root_cause:
      'apartmentRoutes.ts only applies requireMasterAdminAuth to mutating routes (POST/PUT/DELETE) and leaves read routes unprotected; requireMasterAdminAuth also falls back to req.query.token.',
    intended_behavior:
      'All Master Admin apartment endpoints exposing tenant lists, status, or statistics must require a valid Master Admin Authorization Bearer header, and tokens must never be accepted in URL query parameters.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 136,
        scope: 'createServerApp',
        description: 'Mounts apartmentRouter at /api/apartment with no authentication middleware.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/apartmentRoutes.ts',
        line: 27,
        scope: 'requireMasterAdminAuth',
        description: 'Defines token middleware accepting req.query.token, but omits it from GET routes.',
      },
      {
        kind: 'sink',
        file: 'backend/routes/apartmentRoutes.ts',
        line: 123,
        scope: 'GET /api/apartment/tenants',
        description: 'Returns full legacy apartment tenant records from getAllTenants() without authentication.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/apartmentRoutes.ts',
        line: 110,
        description: 'GET /api/apartment/stats has no requireMasterAdminAuth middleware.',
      },
      {
        file: 'backend/routes/apartmentRoutes.ts',
        line: 123,
        description: 'GET /api/apartment/tenants has no requireMasterAdminAuth middleware.',
      },
      {
        file: 'backend/routes/apartmentRoutes.ts',
        line: 153,
        description: 'GET /api/apartment/tenants/:id exposes per-unit records without auth.',
      },
      {
        file: 'backend/routes/apartmentRoutes.ts',
        line: 27,
        description: 'requireMasterAdminAuth falls back to req.query.token.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'None required for GET /stats, /tenants, /current-lease, and /tenants/:id.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated HTTP client requesting legacy apartment management endpoints.',
      payloads: [
        'GET /api/apartment/stats',
        'GET /api/apartment/tenants',
        'GET /api/apartment/current-lease',
      ],
      instructions: [
        'Start serverApp inside the isolated sandbox with scratch SQLite databases.',
        'Send unauthenticated GET requests to /api/apartment/stats, /api/apartment/tenants, and /api/apartment/current-lease.',
        'Inspect HTTP status codes and JSON payload fields.',
      ],
      observed_result: `Sandbox CHK_03 returned HTTP ${poc.checks.CHK_03_apartment_unauth_reads.statsHttpStatus} (success=${poc.checks.CHK_03_apartment_unauth_reads.statsSuccess}) on /stats, HTTP ${poc.checks.CHK_03_apartment_unauth_reads.tenantsHttpStatus} (tenantsCount=${poc.checks.CHK_03_apartment_unauth_reads.tenantsCount}) on /tenants, and HTTP ${poc.checks.CHK_03_apartment_unauth_reads.currentLeaseHttpStatus} on /current-lease.`,
    },
    remediation: {
      strategy:
        'Decommission legacy /api/apartment/* routes or enforce requireMasterAdminAuth across all read and write handlers, and remove req.query.token fallback.',
      code_changes: [
        {
          file_name: 'backend/routes/apartmentRoutes.ts',
          fixed_code:
            "const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-master-token'] as string);\n// Apply requireMasterAdminAuth to /stats, /tenants, /current-lease, and /tenants/:id.",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Directly reachable over HTTP without credentials.',
      },
      impact: {
        score: 'medium',
        reason: 'Exposes legacy apartment tenant records, counts, and lease expiry dates.',
      },
      overall_severity: 'medium',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and sandboxed HTTP execution.',
    },
  },

  // 2. bot control and key leak
  {
    verdict: 'confirmed',
    fingerprint: 'auth.unauthenticated-bot-control-and-key-leak',
    title: 'Unauthenticated Bot Control, Config Tampering, and API Key Disclosure (/api/bot/*)',
    description:
      'The /api/bot router enforces no authentication or tenant session verification. Any anonymous client can call GET /api/bot/status to retrieve sensitive tenant secrets (xavieraApiKey, lunasQrisApiKey, lunasQrisSecretKey, pairingCode) and call POST /save-config, /start, /stop, /reset, or /groups/* to reconfigure or disrupt any tenant bot.',
    root_cause:
      'Neither backend/app.ts nor backend/routes/botRoutes.ts attaches an authentication middleware validating the caller session against the active tenant.',
    intended_behavior:
      'All /api/bot/* endpoints must require a valid authenticated tenant or impersonation session, bind exclusively to the session tenantId, and redact write-only secret keys from status responses.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 126,
        scope: 'createServerApp',
        description: 'Mounts botRouter at /api/bot without authentication middleware.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/botRoutes.ts',
        line: 12,
        scope: 'GET /api/bot/status',
        description: 'Reads unauthenticated AsyncLocalStorage tenantId via getActiveTenantId().',
      },
      {
        kind: 'sink',
        file: 'backend/botManager.ts',
        line: 129,
        scope: 'BotManager.getStatus',
        description: 'Returns full this.config object including xavieraApiKey and LunasQRIS secrets to caller.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/botRoutes.ts',
        line: 11,
        description: 'GET /api/bot/status returns botManager.getStatus() without session check.',
      },
      {
        file: 'backend/routes/botRoutes.ts',
        line: 118,
        description: 'POST /api/bot/save-config writes arbitrary config fields for any active tenant.',
      },
      {
        file: 'backend/botManager.ts',
        line: 129,
        description: 'getStatus() serializes plaintext API keys and secret keys in config.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'No authentication required; target tenant selected via ?tenant= or X-Tenant-Id.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated remote HTTP client targeting a known or guessed tenantId.',
      payloads: [
        'GET /api/bot/status?tenant=<victimTenantId>',
        'POST /api/bot/save-config?tenant=<victimTenantId> with custom gateway keys/URLs',
      ],
      instructions: [
        'Create a dummy victim tenant with dummy xavieraApiKey and lunasQrisApiKey values.',
        'Issue an unauthenticated GET /api/bot/status?tenant=<victimTenantId> request in the sandbox.',
        'Verify that plaintext API keys are returned in the JSON response.',
      ],
      observed_result: `Sandbox CHK_01 leaked xavieraApiKey="${poc.checks.CHK_01_multi_tenant_auth_and_isolation.unauthLeakedXavieraKey}" and lunasQrisApiKey="${poc.checks.CHK_01_multi_tenant_auth_and_isolation.unauthLeakedLunasKey}" to an unauthenticated GET /api/bot/status request.`,
    },
    remediation: {
      strategy:
        'Enforce requireTenantAuth middleware on /api/bot/*, reject tenant overrides via query/header/body, and mask secret keys in GET /api/bot/status responses.',
      code_changes: [
        {
          file_name: 'backend/routes/botRoutes.ts',
          fixed_code:
            'botRouter.use(requireTenantAuth);\n// In getStatus response, mask xavieraApiKey, lunasQrisApiKey, and lunasQrisSecretKey to boolean flags or redacted strings.',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Zero authentication on publicly mounted Express router.',
      },
      impact: {
        score: 'critical',
        reason: 'Discloses payment and supplier API keys and allows full control of tenant bot behavior and connectivity.',
      },
      overall_severity: 'critical',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by direct source inspection and sandboxed request verification.',
    },
  },

  // 3. telegram config leak and write
  {
    verdict: 'confirmed',
    fingerprint: 'auth.unauthenticated-telegram-config-leak-and-write',
    title: 'Unauthenticated Telegram Bot Token Disclosure and Overwrite (/api/bot/telegram/*)',
    description:
      'Endpoints GET /api/bot/telegram/config, POST /api/bot/telegram/config, and POST /api/bot/telegram/test lack authentication middleware. Unauthenticated callers can read any tenant botToken and chatId, overwrite notification destinations, or trigger test messages.',
    root_cause:
      'telegramRouter relies solely on getActiveTenantId() from unauthenticated tenant middleware without verifying a login session.',
    intended_behavior:
      'Telegram configuration and test endpoints must require an authenticated tenant session and never return raw botToken strings in API responses.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 129,
        scope: 'createServerApp',
        description: 'Mounts telegramRouter at /api/bot/telegram without authentication.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/telegramRoutes.ts',
        line: 15,
        scope: 'GET /api/bot/telegram/config',
        description: 'Resolves tenantId from unauthenticated context and queries telegram_config.',
      },
      {
        kind: 'sink',
        file: 'backend/services/telegramService.ts',
        line: 39,
        scope: 'getTelegramConfig',
        description: 'Returns plaintext botToken and chatId in HTTP JSON response.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/telegramRoutes.ts',
        line: 13,
        description: 'GET /config returns full TelegramConfig including botToken.',
      },
      {
        file: 'backend/routes/telegramRoutes.ts',
        line: 27,
        description: 'POST /config overwrites botToken, chatId, and notifEnabled unauthenticated.',
      },
      {
        file: 'backend/routes/telegramRoutes.ts',
        line: 49,
        description: 'POST /test sends arbitrary Telegram test API requests unauthenticated.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'No credentials required; caller passes ?tenant= or X-Tenant-Id.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated remote HTTP client.',
      payloads: [
        'GET /api/bot/telegram/config?tenant=<victimTenantId>',
        'POST /api/bot/telegram/config?tenant=<victimTenantId>',
      ],
      instructions: [
        'Seed a dummy victim tenant Telegram botToken and chatId.',
        'Issue an unauthenticated GET /api/bot/telegram/config?tenant=<victimTenantId>.',
      ],
      observed_result: `Sandbox CHK_02 returned HTTP 200 with plaintext botToken="${poc.checks.CHK_02_unauth_profile_and_telegram.unauthTelegramLeakedToken}" and chatId="${poc.checks.CHK_02_unauth_profile_and_telegram.unauthTelegramLeakedChatId}".`,
    },
    remediation: {
      strategy:
        'Protect telegramRouter with requireTenantAuth and mask botToken on GET responses (e.g., return hasBotToken boolean and masked preview only).',
      code_changes: [
        {
          file_name: 'backend/routes/telegramRoutes.ts',
          fixed_code: 'telegramRouter.use(requireTenantAuth);',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Endpoint is publicly accessible without authentication.',
      },
      impact: {
        score: 'high',
        reason: 'Exposes Telegram Bot API credentials and permits silent redirection of sale notifications.',
      },
      overall_severity: 'high',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and sandbox HTTP reproduction.',
    },
  },

  // 4. operational routers unauthenticated
  {
    verdict: 'confirmed',
    fingerprint: 'auth.unauthenticated-tenant-operational-apis',
    title: 'Missing Authentication Across Operational Tenant APIs (/api/pricing, /promos, /transactions, /media, /redeem-token)',
    description:
      'All tenant business APIs (/api/pricing, /api/promos, /api/transactions, /api/media, /api/bot/templates, /api/bot/redeem-token) lack authentication checks. Anonymous callers can read transactions, delete records, create/disable promo codes, alter selling markups, upload/delete media, and redeem vouchers for arbitrary tenants.',
    root_cause:
      'backend/app.ts mounts operational routers without a tenant authentication middleware, and tenantTokenRoutes.ts additionally accepts req.body.tenantId.',
    intended_behavior:
      'All tenant management and financial/configuration routes must require a valid Bearer session token bound strictly to session.tenantId.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 130,
        scope: 'createServerApp',
        description: 'Mounts pricing, promos, transactions, media, and tenantToken routers without authentication.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/tenantTokenRoutes.ts',
        line: 10,
        scope: 'POST /api/bot/redeem-token',
        description: 'Also accepts req.body.tenantId fallback instead of a verified session.',
      },
      {
        kind: 'sink',
        file: 'backend/routes/pricingRoutes.ts',
        line: 52,
        scope: 'POST /api/pricing',
        description: 'Persists attacker-supplied markup pricing into victim tenant SQLite DB.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/pricingRoutes.ts',
        line: 39,
        description: 'POST /api/pricing mutates tenant selling markup without auth.',
      },
      {
        file: 'backend/routes/promoRoutes.ts',
        line: 47,
        description: 'POST /api/promos creates or edits promo discounts unauthenticated.',
      },
      {
        file: 'backend/routes/transactionRoutes.ts',
        line: 14,
        description: 'GET/DELETE /api/transactions exposes and deletes buyer transaction logs unauthenticated.',
      },
      {
        file: 'backend/routes/mediaRoutes.ts',
        line: 23,
        description: 'POST /upload and DELETE /:filename allow unauthenticated media modification.',
      },
      {
        file: 'backend/routes/tenantTokenRoutes.ts',
        line: 7,
        description: 'POST /api/bot/redeem-token accepts unauthenticated tenantId.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'No authentication token required on any listed route.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated HTTP client targeting any tenant.',
      payloads: [
        'POST /api/pricing?tenant=<victimTenantId> {"mode":"rp","value":1}',
      ],
      instructions: [
        'Send unauthenticated POST /api/pricing?tenant=<victimTenantId> with mode "rp" and value 1.',
        'Verify HTTP 200 response and updated markup value in sandbox.',
      ],
      observed_result: `Sandbox CHK_01 mutated victim tenant pricing markup unauthenticated (success=${poc.checks.CHK_01_multi_tenant_auth_and_isolation.unauthPricingMutationSuccess}, value=${poc.checks.CHK_01_multi_tenant_auth_and_isolation.unauthPricingUpdatedValue}).`,
    },
    remediation: {
      strategy:
        'Enforce requireTenantAuth on pricingRouter, promoRouter, transactionRouter, mediaRouter, tenantTemplateRouter, and tenantTokenRouter, and derive tenantId exclusively from verified session state.',
      code_changes: [
        {
          file_name: 'backend/routes/tenantTokenRoutes.ts',
          fixed_code: 'const tenantId = req.authenticatedSession.tenantId;',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Directly accessible over HTTP with zero credentials.',
      },
      impact: {
        score: 'critical',
        reason: 'Allows anonymous tampering with product selling prices, promo codes, transaction history, and tenant media.',
      },
      overall_severity: 'critical',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed across router source files and sandbox HTTP mutation check.',
    },
  },

  // 5. unauthenticated username and store takeover
  {
    verdict: 'confirmed',
    fingerprint: 'auth.unauthenticated-tenant-username-and-store-takeover',
    title: 'Unauthenticated Tenant Username Hijack and Store Info Overwrite via Fallback Context',
    description:
      'In backend/routes/authRoutes.ts, getAuthSessionFromReq() falls back to unauthenticated req.tenantId / cookies.tenant_id / X-Tenant-Id when no valid Bearer token is present, allowing unauthenticated requests to change any tenant login username via POST /api/auth/profile/update-username. POST /api/auth/store-setup likewise overwrites store metadata without authentication.',
    root_cause:
      'Lines 169-173 of backend/routes/authRoutes.ts fabricate an authenticated session object from unauthenticated request context, and POST /api/auth/store-setup does not enforce session authentication.',
    intended_behavior:
      'getAuthSessionFromReq must return null unless a valid cryptographic Bearer session or active impersonation token is verified, and store-setup must require authentication.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/routes/authRoutes.ts',
        line: 179,
        scope: 'POST /api/auth/profile/update-username',
        description: 'Calls getAuthSessionFromReq(req) to authenticate username change.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/authRoutes.ts',
        line: 169,
        scope: 'getAuthSessionFromReq',
        description: 'Falls back to unauthenticated req.tenantId / X-Tenant-Id and looks up tenant username.',
      },
      {
        kind: 'sink',
        file: 'backend/services/authManager.ts',
        line: 268,
        scope: 'updateTenantUsername',
        description: 'Updates master.db tenants.username and local SQLite auth.username without password or token verification.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/authRoutes.ts',
        line: 169,
        description: 'Fallback returns valid-looking session from headers/cookies/req.tenantId without a token.',
      },
      {
        file: 'backend/routes/authRoutes.ts',
        line: 110,
        description: 'POST /api/auth/store-setup saves storeName/ownerName/ownerNumber without requiring a session.',
      },
      {
        file: 'backend/services/authManager.ts',
        line: 268,
        description: 'UPDATE tenants SET username = ? WHERE tenant_id = ?.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Unauthenticated HTTP caller knowing or guessing a tenantId (or targeting default t_wanzt).',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated remote caller sending forged X-Tenant-Id header.',
      payloads: [
        'POST /api/auth/profile/update-username with X-Tenant-Id: <victimTenantId> and {"newUsername":"hijacked_victim_99"}',
        'POST /api/auth/store-setup with X-Tenant-Id: <victimTenantId>',
      ],
      instructions: [
        'Send unauthenticated POST /api/auth/profile/update-username with X-Tenant-Id pointing to dummy victim tenant.',
        'Send unauthenticated POST /api/auth/store-setup with X-Tenant-Id pointing to dummy victim tenant.',
      ],
      observed_result: `Sandbox CHK_02 succeeded unauthenticated: update-username returned success=${poc.checks.CHK_02_unauth_profile_and_telegram.unauthUpdateUsernameSuccess} (username="${poc.checks.CHK_02_unauth_profile_and_telegram.unauthUpdateUsernameNewName}"), and store-setup returned success=${poc.checks.CHK_02_unauth_profile_and_telegram.unauthStoreSetupSuccess} (storeName="${poc.checks.CHK_02_unauth_profile_and_telegram.unauthStoreSetupName}").`,
    },
    remediation: {
      strategy:
        'Remove lines 168-173 fallback from getAuthSessionFromReq so unauthenticated requests return null (401), and enforce authentication on /api/auth/store-setup and /api/auth/store-status.',
      code_changes: [
        {
          file_name: 'backend/routes/authRoutes.ts',
          fixed_code:
            'function getAuthSessionFromReq(req: Request) {\n  // Verify Bearer token against impersonationTokens or activeSessions only; otherwise return null.\n  return null;\n}',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Directly exploitable unauthenticated with a single HTTP request.',
      },
      impact: {
        score: 'high',
        reason: 'Locks tenant owners out of their login username and overwrites store contact/owner information.',
      },
      overall_severity: 'high',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed in source code and reproduced in sandbox CHK_02.',
    },
  },

  // 6. XFF spoof admin lockout bypass
  {
    verdict: 'confirmed',
    fingerprint: 'auth.xff-spoof-admin-lockout-bypass',
    title: 'Master Admin Brute-Force Lockout Bypass via X-Forwarded-For Spoofing',
    description:
      'POST /api/admin/auth/login tracks failed login attempts by IP derived from normalizeClientIp(req.ip, req.headers["x-forwarded-for"]), which trusts the leftmost client-supplied X-Forwarded-For entry. Rotating X-Forwarded-For resets the 5-attempt / 15-minute lockout counter on every request.',
    root_cause:
      'adminSecurityUtils.ts:119-134 parses the first element of X-Forwarded-For without trusted proxy configuration or rightmost non-proxy extraction, while deploy-vps.sh Nginx uses $proxy_add_x_forwarded_for which preserves attacker-prepended entries.',
    intended_behavior:
      'Brute-force tracking must derive client IP from Express trusted proxy configuration (req.ip with explicit trust proxy hops) or the socket/X-Real-IP set by Nginx, plus per-username throttling.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'admin-backend/routes/authAdminRoutes.ts',
        line: 10,
        scope: 'POST /api/admin/auth/login',
        description: 'Extracts clientIp via normalizeClientIp(req.ip, req.headers["x-forwarded-for"]).',
      },
      {
        kind: 'propagation',
        file: 'admin-backend/utils/adminSecurityUtils.ts',
        line: 127,
        scope: 'normalizeClientIp',
        description: 'Selects leftmost comma-separated X-Forwarded-For value controllable by client.',
      },
      {
        kind: 'sink',
        file: 'admin-backend/services/adminAuthService.ts',
        line: 66,
        scope: 'AdminAuthService.login',
        description: 'Queries and increments admin_login_attempts keyed solely by spoofable clientIp.',
      },
    ],
    evidence: [
      {
        file: 'admin-backend/utils/adminSecurityUtils.ts',
        line: 123,
        description: 'Trusts first entry of xForwardedFor before reqIp.',
      },
      {
        file: 'admin-backend/services/adminAuthService.ts',
        line: 101,
        description: 'Locks out only per ip key in admin_login_attempts.',
      },
      {
        file: 'deploy-vps.sh',
        line: 133,
        description: 'Nginx appends to client-supplied header via $proxy_add_x_forwarded_for.',
      },
    ],
    conditions: [
      {
        kind: 'network_routing',
        description: 'Client sends arbitrary X-Forwarded-For header (direct or through Nginx $proxy_add_x_forwarded_for).',
      },
    ],
    execution: {
      attacker_perspective: 'Remote unauthenticated client testing Master Admin credentials.',
      payloads: [
        'POST /api/admin/auth/login with rotating X-Forwarded-For header values per batch of 4 attempts',
      ],
      instructions: [
        'Send 6 failed POST /api/admin/auth/login attempts with X-Forwarded-For: 198.51.100.1 to observe lockout (HTTP 429).',
        'Send a subsequent attempt with X-Forwarded-For: 198.51.100.2.',
      ],
      observed_result: `Sandbox CHK_06 recorded statuses ${JSON.stringify(poc.checks.CHK_06_xff_lockout_and_ratelimit_bypass.adminLoginSameIpStatuses)} for 198.51.100.1, then HTTP ${poc.checks.CHK_06_xff_lockout_and_ratelimit_bypass.adminLoginRotatedXffStatus} immediately on rotation to 198.51.100.2.`,
    },
    remediation: {
      strategy:
        'Configure app.set("trust proxy", 1) behind a single local reverse proxy, use req.ip (never parse leftmost X-Forwarded-For directly), and add per-username failed-attempt lockout.',
      code_changes: [
        {
          file_name: 'admin-backend/utils/adminSecurityUtils.ts',
          fixed_code:
            'export function normalizeClientIp(reqIp?: string): string {\n  return (reqIp && reqIp.trim()) || "unknown";\n}',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Trivial single-header bypass requiring no authentication.',
      },
      impact: {
        score: 'medium',
        reason: 'Neutralizes IP-based brute-force lockout protection on Master Admin login.',
      },
      overall_severity: 'medium',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source code and sandboxed HTTP verification.',
    },
  },

  // 7. Tenant middleware override & unbounded DB creation
  {
    verdict: 'confirmed',
    fingerprint: 'authz.tenant-middleware-override-and-unbounded-db',
    title: 'Cross-Tenant Session Override via X-Tenant-Id / Query Params and Unbounded Tenant DB Creation',
    description:
      'The global tenant middleware in backend/app.ts resolves tenantId from query param ?tenant=, Bearer token, X-Tenant-Id header, or tenant_id cookie, allowing X-Tenant-Id to overwrite a valid Bearer session (horizontal privilege escalation). Furthermore, it calls initTenantDb(tenantId) for any arbitrary string without verifying existence in master.db, and enforceRealtimeTenantExpiry() returns "active" for unknown tenant IDs.',
    root_cause:
      'backend/app.ts:62-113 prioritizes client-controlled X-Tenant-Id and ?tenant= over verified session identity and invokes initTenantDb() before validating tenant existence; tenantStatusService.ts:84-86 defaults missing tenants to "active".',
    intended_behavior:
      'Authenticated tenant requests must resolve tenantId exclusively from verified session tokens, reject unauthenticated tenant switching, and reject unknown tenant IDs instead of instantiating new SQLite files or defaulting to active.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 57,
        scope: 'tenantResolutionMiddleware',
        description: 'Inspects ?tenant=, X-Tenant-Id, and tenant_id cookie on all non-partner API requests.',
      },
      {
        kind: 'propagation',
        file: 'backend/app.ts',
        line: 94,
        scope: 'tenantResolutionMiddleware',
        description: 'Header X-Tenant-Id unconditionally overwrites tenantId resolved from Bearer token.',
      },
      {
        kind: 'sink',
        file: 'backend/database/tenantDbManager.ts',
        line: 477,
        scope: 'initTenantDb',
        description: 'Creates and caches a new SQLite file on disk for any arbitrary tenantId.',
      },
    ],
    evidence: [
      {
        file: 'backend/app.ts',
        line: 94,
        description: 'headerTenant overwrites Bearer session tenantId.',
      },
      {
        file: 'backend/app.ts',
        line: 110,
        description: 'initTenantDb(tenantId) executes on every request for unvalidated tenantId.',
      },
      {
        file: 'admin-backend/services/tenantStatusService.ts',
        line: 84,
        description: 'Returns "active" when tenantId is missing from master.db.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Any unauthenticated client or authenticated tenant user supplying X-Tenant-Id or ?tenant=.',
      },
    ],
    execution: {
      attacker_perspective: 'Authenticated tenant user (attacker_user_01) or unauthenticated client sending arbitrary tenant identifiers.',
      payloads: [
        'GET /api/bot/status with Authorization: Bearer <attackerToken> and X-Tenant-Id: <victimTenantId>',
        'GET /api/bot/status?tenant=ghost_unlisted_tenant_999',
      ],
      instructions: [
        'Authenticate as dummy attacker tenant and send GET /api/bot/status with X-Tenant-Id set to dummy victim tenant.',
        'Send GET /api/bot/status?tenant=ghost_unlisted_tenant_999 and check accountStatus and database/tenants/ directory.',
      ],
      observed_result: `Sandbox CHK_01 resolved attacker Bearer token to victim tenant "${poc.checks.CHK_01_multi_tenant_auth_and_isolation.bearerPlusHeaderOverrideResolvedTenant}", returned accountStatus="${poc.checks.CHK_01_multi_tenant_auth_and_isolation.ghostTenantAccountStatus}" for nonexistent tenant, and created database/tenants/ghost_unlisted_tenant_999.db on disk (ghostTenantDbCreatedOnDisk=${poc.checks.CHK_01_multi_tenant_auth_and_isolation.ghostTenantDbCreatedOnDisk}).`,
    },
    remediation: {
      strategy:
        'Derive tenantId exclusively from verified session tokens (or signed/lookup webhook/bot contexts), validate tenant existence in master.db before initTenantDb(), and fail closed when a tenant record does not exist.',
      code_changes: [
        {
          file_name: 'admin-backend/services/tenantStatusService.ts',
          fixed_code: "if (!row) {\n  return 'suspended';\n}",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Trivial via single header or query parameter on every request.',
      },
      impact: {
        score: 'critical',
        reason: 'Breaks multi-tenant isolation completely and enables unbounded SQLite file/handle exhaustion on disk.',
      },
      overall_severity: 'critical',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and sandbox execution in CHK_01.',
    },
  },

  // 8. CORS and VPS deployment script exposure
  {
    verdict: 'confirmed',
    fingerprint: 'config.wildcard-cors-and-vps-script-exposure',
    title: 'Wildcard CORS Policy and Overly Permissive VPS Deployment Script Configuration',
    description:
      'backend/app.ts applies wildcard app.use(cors()), allowing any external origin to issue cross-origin API requests and read responses (including leaked API keys on unauthenticated routes). Additionally, deploy-vps.sh sets chmod 755 on /root and recursively chmod -R 755 on the application directory (making SQLite databases and Baileys WhatsApp credentials world-readable to any local system user) and opens UFW port 5000/tcp directly.',
    root_cause:
      'backend/app.ts:41 uses default cors() without an origin allowlist; deploy-vps.sh:100-101 grants 755 permissions recursively over database/ and session folders and line 160 exposes backend port 5000 publicly.',
    intended_behavior:
      'CORS must restrict origins to configured dashboard domains, runtime database/session directories must restrict permissions to the service account (700/600), and backend port 5000 must bind only to 127.0.0.1 behind Nginx.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/app.ts',
        line: 41,
        scope: 'createServerApp',
        description: 'Registers app.use(cors()) allowing Access-Control-Allow-Origin: * for all routes.',
      },
      {
        kind: 'sink',
        file: 'deploy-vps.sh',
        line: 101,
        scope: 'VPS deployment setup',
        description: 'Sets chmod -R 755 "$APP_DIR" and ufw allow 5000/tcp (line 160).',
      },
    ],
    evidence: [
      {
        file: 'backend/app.ts',
        line: 41,
        description: 'Unrestricted cors() middleware enables cross-origin data reading by any website.',
      },
      {
        file: 'deploy-vps.sh',
        line: 100,
        description: 'chmod 755 /root && chmod -R 755 "$APP_DIR" exposes SQLite DBs and Baileys keys to local users.',
      },
      {
        file: 'deploy-vps.sh',
        line: 160,
        description: 'ufw allow 5000/tcp exposes backend directly bypassing Nginx proxy.',
      },
    ],
    conditions: [
      {
        kind: 'system_configuration',
        description: 'Wildcard CORS is active in all server builds; deployment script flaws affect VPS hosts provisioned with deploy-vps.sh.',
      },
    ],
    execution: {
      attacker_perspective: 'Untrusted third-party web origin or unprivileged local VPS user.',
      payloads: [
        'GET /api/health with Origin: https://untrusted.example',
      ],
      instructions: [
        'Send GET /api/health with Origin: https://untrusted.example to the sandbox Express app.',
        'Inspect the Access-Control-Allow-Origin response header and verify deploy-vps.sh permission commands.',
      ],
      observed_result: `Sandbox CHK_10 confirmed Access-Control-Allow-Origin: "${poc.checks.CHK_10_telegram_cors_react.corsOriginHeaderForUntrustedOrigin}" for Origin: https://untrusted.example; deploy-vps.sh lines 100-101 and 160 apply world-readable 755 permissions and UFW allow 5000/tcp.`,
    },
    remediation: {
      strategy:
        'Configure cors({ origin: allowedOrigins }) via environment configuration, restrict database/ and auth_info_baileys/ permissions to 700/600 under a dedicated non-root user, and remove ufw allow 5000/tcp while binding Node to 127.0.0.1.',
      code_changes: [
        {
          file_name: 'backend/app.ts',
          fixed_code:
            "const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);\napp.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Wildcard CORS is enabled unconditionally on all endpoints.',
      },
      impact: {
        score: 'medium',
        reason: 'Permits any malicious webpage to exfiltrate unauthenticated API responses from a victim browser or local network.',
      },
      overall_severity: 'medium',
    },
    confidence: {
      score: 'high',
      reason: 'CORS header verified in sandbox CHK_10 and script lines verified directly in deploy-vps.sh.',
    },
  },

  // 9. Weak cryptography and default seeded credentials
  {
    verdict: 'confirmed',
    fingerprint: 'crypto.weak-kdf-static-salt-and-default-creds',
    title: 'Weak Static-Salt 1000-Iteration PBKDF2, Default Seeded Credentials, Non-Constant-Time Hash Compare, and Math.random() Secrets',
    description:
      'admin-backend/database/masterSqlite.ts hashes Super Admin and tenant passwords using a hardcoded global static salt ("master_salt_wanzt_2026") and only 1,000 PBKDF2-HMAC-SHA256 iterations, and seeds hardcoded default accounts (wan_admin773, wanzt, admin, superadmin) directly on startup. Additionally, authManager.ts compares tenant password hashes with === instead of crypto.timingSafeEqual(), and tokenService.ts / generatorUtils.ts generate license vouchers and tenant passwords with non-cryptographic Math.random().',
    root_cause:
      'masterSqlite.ts:11-14 hardcodes static salt and 1,000 iterations; lines 246-280, authManager.ts:48-54, and apartmentManager.ts:45-52 seed default accounts; authManager.ts:117,346 uses ===; tokenService.ts:25 and generatorUtils.ts:22 use Math.random().',
    intended_behavior:
      'Use per-user CSPRNG salts with strong KDF parameters (>= 600,000 PBKDF2-SHA256 iterations or Argon2id/scrypt), eliminate hardcoded default passwords in source, use timingSafeEqual everywhere, and use crypto.randomBytes/randomInt for tokens and passwords.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'admin-backend/database/masterSqlite.ts',
        line: 246,
        scope: 'initMasterDatabase',
        description: 'Automatically seeds hardcoded super_admins and default tenants on initialization.',
      },
      {
        kind: 'propagation',
        file: 'admin-backend/database/masterSqlite.ts',
        line: 11,
        scope: 'hashPassword',
        description: 'Derives password hashes with static salt "master_salt_wanzt_2026" and 1,000 iterations.',
      },
      {
        kind: 'sink',
        file: 'backend/services/authManager.ts',
        line: 117,
        scope: 'verifyLogin',
        description: 'Compares static-salted master.db password hashes using non-constant-time ===.',
      },
    ],
    evidence: [
      {
        file: 'admin-backend/database/masterSqlite.ts',
        line: 12,
        description: 'Static salt "master_salt_wanzt_2026" and 1,000 PBKDF2 iterations.',
      },
      {
        file: 'admin-backend/database/masterSqlite.ts',
        line: 246,
        description: 'Hardcoded seeded super admin wan_admin773 and default tenant wanzt.',
      },
      {
        file: 'backend/services/authManager.ts',
        line: 48,
        description: 'Hardcoded seeded admin/admin123 account in tenant auth table.',
      },
      {
        file: 'backend/services/authManager.ts',
        line: 117,
        description: 'Non-constant-time === hash comparison in verifyLogin and updateTenantPassword (346).',
      },
      {
        file: 'admin-backend/services/tokenService.ts',
        line: 25,
        description: 'Math.random() used to generate 16-character voucher extension tokens.',
      },
      {
        file_name: undefined,
        file: 'admin-backend/utils/generatorUtils.ts',
        line: 22,
        description: 'Math.random() used in generateRandomPassword().',
      },
    ].map(({ file, line, description }) => ({ file, line, description })),
    conditions: [
      {
        kind: 'system_configuration',
        description: 'Active immediately upon database initialization in any unconfigured deployment.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated attacker testing seeded credentials or offline/timing cracker with DB read access.',
      payloads: [
        'POST /api/auth/login with seeded default admin credentials',
        'masterSqlite.hashPassword() identical output across invocations',
      ],
      instructions: [
        'Initialize master.db and tenant DB in isolated scratch workdir.',
        'Attempt login with seeded default admin credentials and verify identical hash output from masterSqlite.hashPassword().',
      ],
      observed_result: `Sandbox CHK_09 confirmed defaultSuperAdminSeeded=${poc.checks.CHK_09_crypto_sessions_cookies.defaultSuperAdminSeeded}, staticSaltIdenticalHash=${poc.checks.CHK_09_crypto_sessions_cookies.staticSaltIdenticalHash}, defaultAdminLoginSucceeded=${poc.checks.CHK_09_crypto_sessions_cookies.defaultAdminLoginSucceeded}, and generatedPasswordSample="${poc.checks.CHK_09_crypto_sessions_cookies.generatedPasswordSample}".`,
    },
    remediation: {
      strategy:
        'Generate per-account random 16-byte salts with scrypt/Argon2id (or >= 600k PBKDF2-SHA256 iterations), require env-provided bootstrap credentials or one-time setup token, compare hashes using crypto.timingSafeEqual, and replace Math.random() with crypto.randomInt().',
      code_changes: [
        {
          file_name: 'admin-backend/utils/generatorUtils.ts',
          fixed_code:
            "import crypto from 'crypto';\nexport function generateRandomPassword(): string {\n  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';\n  let gen = '';\n  for (let i = 0; i < 16; i++) {\n    gen += chars.charAt(crypto.randomInt(chars.length));\n  }\n  return gen;\n}",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Default credentials are hardcoded in repository source and automatically provisioned on boot.',
      },
      impact: {
        score: 'critical',
        reason: 'Allows immediate unauthorized Super Admin or tenant dashboard login when defaults remain unchanged, and permits rapid offline/rainbow cracking of master.db hashes.',
      },
      overall_severity: 'critical',
    },
    confidence: {
      score: 'high',
      reason: 'Directly observed in source and verified in sandbox CHK_09.',
    },
  },

  // 10. needs_validation: VPS TLS & port 5000 runtime state
  {
    verdict: 'needs_validation',
    fingerprint: 'deploy.vps-tls-and-port5000-exposure',
    title: 'Unverified Production VPS HTTPS/TLS Configuration and External Reachability of Backend Port 5000',
    description:
      'deploy-vps.sh configures Nginx exclusively on HTTP port 80 (line 107), prints certbot --nginx only as an optional manual command (line 191), and enables UFW port 5000/tcp directly (line 160). Whether TLS certificates are active on the production VPS and whether an external cloud firewall blocks port 5000 cannot be determined from repository source alone.',
    claimed_root_cause:
      'deploy-vps.sh omits automated TLS enforcement and opens firewall port 5000/tcp directly, creating plaintext transport and reverse-proxy bypass risks unless manually remediated on the live host.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'deploy-vps.sh',
        line: 107,
        scope: 'Nginx site configuration',
        description: 'Configures listen 80 only without SSL/TLS redirect or HSTS.',
      },
      {
        kind: 'sink',
        file: 'deploy-vps.sh',
        line: 160,
        scope: 'UFW firewall configuration',
        description: 'Executes ufw allow 5000/tcp exposing Node.js Express directly.',
      },
    ],
    evidence: [
      {
        file: 'deploy-vps.sh',
        line: 107,
        description: 'Nginx server block listens on port 80 only.',
      },
      {
        file: 'deploy-vps.sh',
        line: 160,
        description: 'ufw allow 5000/tcp opens backend port externally.',
      },
      {
        file: 'deploy-vps.sh',
        line: 191,
        description: 'Certbot SSL issuance is left as a manual operator instruction.',
      },
    ],
    blockers: [
      'Live VPS Nginx config (/etc/nginx/sites-enabled/*), Certbot certificate state, UFW rules, and cloud security group rules are outside the local repository and isolated sandbox.',
    ],
    validation_plan: {
      deployment:
        'Owner should inspect the live VPS by running "ss -tulnp | grep 5000", "ufw status verbose", and inspecting /etc/nginx/sites-enabled/bot-whatsapp for TLS server blocks and HTTPS redirects, plus verifying cloud firewall rules block external TCP/5000.',
    },
  },

  // 11. Telegram HTML injection
  {
    verdict: 'confirmed',
    fingerprint: 'injection.telegram-html-markup-interpolation',
    title: 'Unescaped HTML Markup Injection in Telegram Notification Payloads',
    description:
      'telegramService.ts constructs Telegram Bot API payloads with parse_mode: "HTML" while directly interpolating untrusted or tenant-controlled strings (storeName, productName, variantName, reason, adminMessage) without HTML-escaping &, <, and >. Attackers or malicious tenants can inject arbitrary <a href="..."> links or HTML formatting into admin/owner Telegram notifications.',
    root_cause:
      'Lines 197-202, 268-278, 307-316, and 349-354 of backend/services/telegramService.ts interpolate template variables into HTML strings without an escapeHtml helper.',
    intended_behavior:
      'All dynamic variables interpolated into parse_mode: "HTML" Telegram messages must escape &, <, >, and " characters prior to serialization.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/services/telegramService.ts',
        line: 247,
        scope: 'notifyTransactionPaid',
        description: 'Receives storeName, productName, and variantName without HTML sanitization.',
      },
      {
        kind: 'propagation',
        file: 'backend/services/telegramService.ts',
        line: 268,
        scope: 'notifyTransactionPaid',
        description: 'Interpolates raw productName and storeName directly into an HTML template string.',
      },
      {
        kind: 'sink',
        file: 'backend/services/telegramService.ts',
        line: 125,
        scope: 'sendTelegramMessage',
        description: 'Transmits unescaped text with parse_mode: "HTML" to Telegram Bot API.',
      },
    ],
    evidence: [
      {
        file: 'backend/services/telegramService.ts',
        line: 271,
        description: 'Unescaped orderData.productName interpolated into HTML message.',
      },
      {
        file: 'backend/services/telegramService.ts',
        line: 199,
        description: 'Unescaped storeName interpolated in testTelegramConnection.',
      },
      {
        file: 'backend/services/telegramService.ts',
        line: 351,
        description: 'Unescaped storeName and adminMessage in sendAdminMessageToTelegram.',
      },
    ],
    conditions: [
      {
        kind: 'user_interaction',
        description: 'Recipient clicks an injected Telegram <a href="..."> link in chat.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated API caller or malicious WhatsApp buyer injecting HTML tags into storeName/productName.',
      payloads: [
        'productName = \'Produk <a href="https://example.test">Link</a>\'',
      ],
      instructions: [
        'Invoke notifyTransactionPaid() in the sandbox with a fetch interceptor capturing the JSON payload intended for api.telegram.org.',
        'Inspect payload.parse_mode and payload.text.',
      ],
      observed_result: `Sandbox CHK_10 captured parse_mode="${poc.checks.CHK_10_telegram_cors_react.telegramParseMode}" and confirmed telegramContainsRawAnchorTag=${poc.checks.CHK_10_telegram_cors_react.telegramContainsRawAnchorTag}.`,
    },
    remediation: {
      strategy:
        'Add an escapeTelegramHtml() utility escaping &, <, and > and apply it to every dynamic variable interpolated into parse_mode: "HTML" messages.',
      code_changes: [
        {
          file_name: 'backend/services/telegramService.ts',
          fixed_code:
            "function escapeTelegramHtml(str: string): string {\n  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');\n}",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'medium',
        reason: 'Reachable via unauthenticated store-setup/order endpoints or supplier product names.',
      },
      impact: {
        score: 'low',
        reason: 'Permits HTML formatting/phishing link injection inside Telegram messages (Telegram strips scripts).',
      },
      overall_severity: 'low',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source code and local payload serialization test in CHK_10.',
    },
  },

  // 12. WhatsApp order_var client-controlled price tampering
  {
    verdict: 'confirmed',
    fingerprint: 'logic.whatsapp-order-var-price-tampering',
    title: 'Client-Controlled Price Tampering via WhatsApp order_var Interactive Button ID',
    description:
      'When sending product carousels, carouselMessage.ts encodes the selling price inside the quick-reply button ID (order_var:<product>|<variant>|<sellingPrice>). Upon receiving an incoming WhatsApp message, messageDispatcher.ts parses productName, variantName, and price directly from the user-controlled button ID without re-fetching authoritative catalog cost or server-side pricing rules, allowing a buyer to submit a forged button response (e.g., Rp 1) to generate a valid QRIS invoice for any product.',
    root_cause:
      'backend/handlers/messageDispatcher.ts:576-588 trusts client-supplied pPrice parsed from buttonIdOrText and propagates it directly to activeCheckoutSessions and executeLunasQrisInvoice.',
    intended_behavior:
      'The message dispatcher must treat interactive button IDs strictly as product/variant identifiers and recalculate authoritative selling price server-side from the Xaviera catalog and tenant pricing_config.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/handlers/messageDispatcher.ts',
        line: 576,
        scope: 'dispatchIncomingMessages',
        description: 'Parses selectedButtonId starting with order_var: from untrusted incoming WhatsApp message.',
      },
      {
        kind: 'propagation',
        file: 'backend/handlers/messageDispatcher.ts',
        line: 643,
        scope: 'dispatchIncomingMessages',
        description: 'Stores untrusted parsed price into activeCheckoutSessions.',
      },
      {
        kind: 'sink',
        file: 'backend/handlers/messageDispatcher.ts',
        line: 143,
        scope: 'executeLunasQrisInvoice',
        description: 'Forwards tampered amount to createLunasQrisTransaction() to issue a Rp 1 invoice.',
      },
    ],
    evidence: [
      {
        file: 'backend/messages/carouselMessage.ts',
        line: 150,
        description: 'Embeds sellingPrice into client-submittable quick_reply button id.',
      },
      {
        file: 'backend/handlers/messageDispatcher.ts',
        line: 583,
        description: 'Accepts arbitrary numeric pPrice directly from buyer message without catalog re-verification.',
      },
      {
        file: 'backend/handlers/messageDispatcher.ts',
        line: 146,
        description: 'Passes effectiveAmount directly into LunasQRIS invoice creation.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Any WhatsApp buyer able to send a custom buttonsResponseMessage or interactiveResponseMessage payload.',
      },
    ],
    execution: {
      attacker_perspective: 'Malicious WhatsApp buyer crafting a modified interactive button response ID.',
      payloads: [
        'buttonsResponseMessage.selectedButtonId = "order_var:Netflix%20Premium|1%20Bulan%20Private|1"',
        'buttonsResponseMessage.selectedButtonId = "checkout_direct"',
      ],
      instructions: [
        'Invoke dispatchIncomingMessages() in the sandbox with a dummy buyer message containing order_var:Netflix%20Premium|1%20Bulan%20Private|1.',
        'Follow up with checkout_direct and inspect the request body sent to the loopback LunasQRIS server.',
      ],
      observed_result: `Sandbox CHK_05 recorded sessionPriceParsedFromButton=${poc.checks.CHK_05_order_var_price_tampering.sessionPriceParsedFromButton} and invoiceAmountSentToGateway=${poc.checks.CHK_05_order_var_price_tampering.invoiceAmountSentToGateway} (Order ${poc.checks.CHK_05_order_var_price_tampering.invoiceOrderId}).`,
    },
    remediation: {
      strategy:
        'Look up authoritative base cost from getProductVariants(productName, config) and compute sellingPrice via calculateSellingPriceForVariant() on the server inside order_var handling; reject unknown products/variants.',
      code_changes: [
        {
          file_name: 'backend/handlers/messageDispatcher.ts',
          fixed_code:
            "const variants = await getProductVariants(productName, config);\nconst matched = variants.find((v) => v.variant === variantName);\nif (!matched || matched.price <= 0) continue;\nconst calc = calculateSellingPriceForVariant(`${productName}|${variantName}`, matched.price, productName, variantName);\nprice = calc.sellingPrice;",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'medium',
        reason: 'Requires crafting a WhatsApp protobuf interactive response via modified client or Baileys.',
      },
      impact: {
        score: 'critical',
        reason: 'Allows purchasing any catalog item at an attacker-chosen price as low as Rp 1.',
      },
      overall_severity: 'high',
    },
    confidence: {
      score: 'high',
      reason: 'Full path from button parsing to loopback payment gateway invoice confirmed in CHK_05.',
    },
  },

  // 13. promo quota race condition
  {
    verdict: 'confirmed',
    fingerprint: 'race.promo-quota-toctou-oversubscription',
    title: 'Promo Code Quota Check-Then-Act Race Allows Quota Oversubscription',
    description:
      'validateAndApplyPromo() checks promo.usedCount >= promo.quota when the buyer submits a promo code, without reserving quota or running an atomic update. The counter increment (UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?) happens asynchronously later inside the onPaid callback, allowing multiple concurrent checkouts to pass validation for a single-use quota and exceed promo.quota.',
    root_cause:
      'Separation between quota check (sqlite.ts:1151) and unconditional post-payment increment (messageDispatcher.ts:215) with no atomic reservation or WHERE used_count < quota constraint.',
    intended_behavior:
      'Promo quota must be reserved atomically inside a SQLite transaction (UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND (quota IS NULL OR used_count < quota)) and released if checkout expires/cancels.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/handlers/messageDispatcher.ts',
        line: 1138,
        scope: 'dispatchIncomingMessages',
        description: 'Calls validateAndApplyPromo() before payment without reserving quota.',
      },
      {
        kind: 'propagation',
        file: 'backend/database/sqlite.ts',
        line: 1151,
        scope: 'validateAndApplyPromo',
        description: 'Reads promo.usedCount >= promo.quota non-atomically without incrementing or locking.',
      },
      {
        kind: 'sink',
        file: 'backend/handlers/messageDispatcher.ts',
        line: 215,
        scope: 'onPaid',
        description: 'Unconditionally executes UPDATE promo_codes SET used_count = used_count + 1 without quota check.',
      },
    ],
    evidence: [
      {
        file: 'backend/database/sqlite.ts',
        line: 1151,
        description: 'Non-atomic usedCount >= quota check.',
      },
      {
        file: 'backend/handlers/messageDispatcher.ts',
        line: 215,
        description: 'Post-payment increment lacks WHERE used_count < quota guard.',
      },
    ],
    conditions: [
      {
        kind: 'timing_dependency',
        description: 'Two or more buyers apply the same promo code before the first order completes payment.',
      },
    ],
    execution: {
      attacker_perspective: 'Concurrent WhatsApp buyers or parallel sessions redeeming a quota=1 promo code.',
      payloads: [
        'Two concurrent validateAndApplyPromo({ code: "RACEONE" }) calls against quota=1',
      ],
      instructions: [
        'Create dummy promo code RACEONE with quota = 1 in sandbox SQLite DB.',
        'Invoke validateAndApplyPromo() twice before payment completes and run the post-payment increment.',
      ],
      observed_result: `Sandbox CHK_08 confirmed both validations returned isValid=${poc.checks.CHK_08_promo_quota_oversubscription.firstValidationIsValid}/${poc.checks.CHK_08_promo_quota_oversubscription.secondValidationIsValid} for configuredQuota=${poc.checks.CHK_08_promo_quota_oversubscription.configuredQuota}, leaving finalUsedCount=${poc.checks.CHK_08_promo_quota_oversubscription.finalUsedCountExceedingQuota}.`,
    },
    remediation: {
      strategy:
        'Atomically reserve promo usage inside a SQLite transaction at invoice creation using a conditional UPDATE (WHERE quota IS NULL OR used_count < quota) checking changes === 1, and decrement on invoice expiry/cancellation.',
      code_changes: [
        {
          file_name: 'backend/database/sqlite.ts',
          fixed_code:
            "const res = db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND is_active = 1 AND (quota IS NULL OR used_count < quota)').run(promo.id);\nif (res.changes === 0) return { isValid: false, errorMessage: 'Kuota promo habis' };",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'medium',
        reason: 'Occurs naturally whenever concurrent buyers check out with a limited-quota promo.',
      },
      impact: {
        score: 'medium',
        reason: 'Allows coupon discount budget to be exceeded beyond configured quota.',
      },
      overall_severity: 'medium',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and sandbox CHK_08 quota oversubscription check.',
    },
  },

  // 14. Partner API XFF rate-limit bypass
  {
    verdict: 'confirmed',
    fingerprint: 'ratelimit.xff-spoof-partner-api-bypass',
    title: 'Partner API Invalid-Key Rate Limiter Bypass via X-Forwarded-For Spoofing',
    description:
      'authenticatePartnerApi() in admin-backend/routes/partnerPublicRoutes.ts derives clientIp from the leftmost entry of X-Forwarded-For (getClientIp), and tracks failed API key attempts per invalid_ip:${clientIp}. Attackers can rotate X-Forwarded-For headers on every request to bypass the 60 req/min rate limit.',
    root_cause:
      'partnerPublicRoutes.ts:26-32 splits req.headers["x-forwarded-for"] and trusts index 0 regardless of proxy trust boundaries.',
    intended_behavior:
      'Rate limiters must use a verified reverse-proxy IP (Express trust proxy + req.ip) and enforce global failed-auth throttling.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'admin-backend/routes/partnerPublicRoutes.ts',
        line: 39,
        scope: 'authenticatePartnerApi',
        description: 'Calls getClientIp(req) before verifying Partner API key.',
      },
      {
        kind: 'propagation',
        file: 'admin-backend/routes/partnerPublicRoutes.ts',
        line: 29,
        scope: 'getClientIp',
        description: 'Extracts leftmost comma-separated X-Forwarded-For value controlled by caller.',
      },
      {
        kind: 'sink',
        file: 'admin-backend/routes/partnerPublicRoutes.ts',
        line: 66,
        scope: 'authenticatePartnerApi',
        description: 'Applies partnerRateLimiter.check(`invalid_ip:${clientIp}`), resetting quota per spoofed header.',
      },
    ],
    evidence: [
      {
        file: 'admin-backend/routes/partnerPublicRoutes.ts',
        line: 26,
        description: 'getClientIp returns first entry of X-Forwarded-For without trusted proxy check.',
      },
      {
        file: 'admin-backend/routes/partnerPublicRoutes.ts',
        line: 66,
        description: 'Rate limiter bucket uses spoofable clientIp.',
      },
    ],
    conditions: [
      {
        kind: 'network_routing',
        description: 'Caller supplies varying X-Forwarded-For headers.',
      },
    ],
    execution: {
      attacker_perspective: 'Unauthenticated caller sending invalid API keys to /api/v1/partner/*.',
      payloads: [
        '61x POST /api/v1/partner/tokens/create with X-Forwarded-For: 198.51.100.50, then 1x with 198.51.100.51',
      ],
      instructions: [
        'Send 61 requests with invalid X-API-Key and X-Forwarded-For: 198.51.100.50 until HTTP 429 is returned.',
        'Send the next request with X-Forwarded-For: 198.51.100.51.',
      ],
      observed_result: `Sandbox CHK_06 received HTTP ${poc.checks.CHK_06_xff_lockout_and_ratelimit_bypass.partner61stSameIpStatus} on request 61 from 198.51.100.50, and immediate HTTP ${poc.checks.CHK_06_xff_lockout_and_ratelimit_bypass.partnerRotatedXffStatus} (INVALID_API_KEY) when rotating X-Forwarded-For to 198.51.100.51.`,
    },
    remediation: {
      strategy:
        'Use Express trusted proxy req.ip instead of parsing X-Forwarded-For manually and apply an auxiliary global invalid-key rate limit.',
      code_changes: [
        {
          file_name: 'admin-backend/routes/partnerPublicRoutes.ts',
          fixed_code: "function getClientIp(req: Request): string {\n  return req.ip || req.socket?.remoteAddress || 'unknown';\n}",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Trivial header modification on unauthenticated endpoint.',
      },
      impact: {
        score: 'low',
        reason: 'Defeats IP-based rate limiting on Partner API key verification (though keys are 256-bit SHA-256 hashed).',
      },
      overall_severity: 'low',
    },
    confidence: {
      score: 'high',
      reason: 'Verified in source and reproduced in sandbox CHK_06.',
    },
  },

  // 15. Impersonation not revoked & URL token exposure
  {
    verdict: 'confirmed',
    fingerprint: 'session.impersonation-not-revoked-and-url-token',
    title: 'Impersonation Tokens Survive Master Admin Logout/Password Change and Are Exposed in URLs',
    description:
      'POST /api/admin/tenants/:id/impersonate returns a redirectUrl embedding the 10-minute impersonation token in the URL query string (?impersonate=), exposing it in browser history and server/proxy logs. Furthermore, AdminAuthService.logout() and AdminAuthService.changePassword() never invalidate outstanding impersonationTokens.',
    root_cause:
      'impersonateRoutes.ts:20 embeds impToken in URL query; adminAuthService.ts:15 stores impersonationTokens without creator adminId binding and lines 196-243 do not clear them on logout or password change.',
    intended_behavior:
      'Bind impersonation tokens to creator admin session/id, invalidate them when the admin logs out or changes password, and exchange via one-time POST/hash-fragment or HttpOnly cookie instead of URL query string.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'admin-backend/routes/impersonateRoutes.ts',
        line: 15,
        scope: 'POST /api/admin/tenants/:id/impersonate',
        description: 'Creates impToken via AdminAuthService.createImpersonationToken and places it in redirectUrl query.',
      },
      {
        kind: 'propagation',
        file: 'admin-backend/services/adminAuthService.ts',
        line: 201,
        scope: 'AdminAuthService.logout',
        description: 'Deletes only admin_sessions row while leaving impersonationTokens Map intact.',
      },
      {
        kind: 'sink',
        file: 'backend/routes/authRoutes.ts',
        line: 58,
        scope: 'GET /api/auth/session',
        description: 'Continues to accept impToken until 10-minute expiresAt elapsed.',
      },
    ],
    evidence: [
      {
        file: 'admin-backend/routes/impersonateRoutes.ts',
        line: 20,
        description: 'Embeds ?impersonate=<token> in redirectUrl.',
      },
      {
        file: 'frontend/src/hooks/useAuth.ts',
        line: 16,
        description: 'Reads impersonate token from window.location.search.',
      },
      {
        file: 'admin-backend/services/adminAuthService.ts',
        line: 196,
        description: 'logout() and changePassword() (206) omit impersonationTokens cleanup.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Master Admin creates an impersonation token before logging out or changing password, or URL logs/history are observed.',
      },
    ],
    execution: {
      attacker_perspective: 'Holder of a leaked impersonation URL/token after Master Admin session termination.',
      payloads: [
        'AdminAuthService.logout() after createImpersonationToken()',
      ],
      instructions: [
        'Log in as Master Admin, create an impersonation token for a dummy tenant, then call AdminAuthService.logout().',
        'Verify whether impersonationTokens.has(impToken) remains true.',
      ],
      observed_result: `Sandbox CHK_09 confirmed impersonationTokenValidAfterAdminLogout=${poc.checks.CHK_09_crypto_sessions_cookies.impersonationTokenValidAfterAdminLogout} after Master Admin logout.`,
    },
    remediation: {
      strategy:
        'Associate impersonationTokens with creatorAdminId/sessionToken, purge matching entries on logout and password change, make impersonation codes single-use exchange tokens, and avoid long-lived tokens in URL query parameters.',
      code_changes: [
        {
          file_name: 'admin-backend/services/adminAuthService.ts',
          fixed_code:
            'impersonationTokens.set(impToken, { tenantId, adminId, expiresAt: Date.now() + 2 * 60 * 1000 });\n// In logout() and changePassword(), delete all entries matching adminId.',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'low',
        reason: 'Requires Master Admin impersonation within a 10-minute window plus token leakage or admin compromise.',
      },
      impact: {
        score: 'medium',
        reason: 'Extends unauthorized tenant dashboard access beyond Master Admin logout or password rotation.',
      },
      overall_severity: 'low',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed in source and sandbox CHK_09.',
    },
  },

  // 16. Session non-revocation & weak cookie flags
  {
    verdict: 'confirmed',
    fingerprint: 'session.no-revocation-on-pw-change-and-weak-cookies',
    title: 'Tenant Sessions Not Revoked on Password Change and Auth Cookies Lack HttpOnly/SameSite/Secure',
    description:
      'updateTenantPassword() in backend/services/authManager.ts updates password hashes without invalidating existing sessions in activeSessions, allowing stolen tokens to stay valid up to 7 days after password rotation. Additionally, backend/routes/authRoutes.ts sets tenant_id and auth_token cookies with httpOnly: false and omits SameSite and Secure flags.',
    root_cause:
      'authManager.ts:307-405 never iterates/deletes activeSessions entries for tenantId on password update; authRoutes.ts:39-40,64,75 sets httpOnly: false without sameSite/secure.',
    intended_behavior:
      'Password changes must revoke existing tenant sessions (except optionally the current caller token), and authentication cookies must set httpOnly: true, sameSite: "lax" (or "strict"), and secure: true over HTTPS.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/routes/authRoutes.ts',
        line: 39,
        scope: 'POST /api/auth/login',
        description: 'Issues session token and sets cookies with httpOnly: false and no SameSite/Secure.',
      },
      {
        kind: 'propagation',
        file: 'backend/services/authManager.ts',
        line: 373,
        scope: 'updateTenantPassword',
        description: 'Updates password hashes in master.db and tenant DB without clearing activeSessions.',
      },
      {
        kind: 'sink',
        file: 'backend/services/authManager.ts',
        line: 183,
        scope: 'getSession',
        description: 'Returns old activeSessions entry as valid after password change.',
      },
    ],
    evidence: [
      {
        file: 'backend/services/authManager.ts',
        line: 397,
        description: 'Returns success from updateTenantPassword without touching activeSessions.',
      },
      {
        file: 'backend/routes/authRoutes.ts',
        line: 39,
        description: 'Sets tenant_id and auth_token cookies with httpOnly: false and no SameSite/Secure.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Prior session token remains valid across password change; cookies exposed to JS via httpOnly: false.',
      },
    ],
    execution: {
      attacker_perspective: 'Holder of a previously captured tenant session token or script reading document.cookie.',
      payloads: [
        'POST /api/auth/login -> Set-Cookie headers',
        'updateTenantPassword() followed by getSession(oldToken)',
      ],
      instructions: [
        'Create a dummy victim session, invoke updateTenantPassword() with valid old and new passwords, and query getSession(oldToken).',
        'Issue POST /api/auth/login and inspect Set-Cookie response headers.',
      ],
      observed_result: `Sandbox CHK_09 confirmed oldTenantSessionStillValidAfterPwChange=${poc.checks.CHK_09_crypto_sessions_cookies.oldTenantSessionStillValidAfterPwChange} and Set-Cookie=${JSON.stringify(poc.checks.CHK_09_crypto_sessions_cookies.setCookieHeaders)} (missing HttpOnly, SameSite, Secure).`,
    },
    remediation: {
      strategy:
        'Delete all activeSessions entries matching tenantId upon updateTenantPassword() (and on tenant suspension/expiry), and switch auth cookies to httpOnly: true, sameSite: "lax", secure: isHttps.',
      code_changes: [
        {
          file_name: 'backend/services/authManager.ts',
          fixed_code:
            'for (const [tok, sess] of activeSessions.entries()) {\n  if (sess.tenantId === tenantId) activeSessions.delete(tok);\n}',
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'medium',
        reason: 'Applies to every tenant password change and login response.',
      },
      impact: {
        score: 'medium',
        reason: 'Old compromised tokens remain valid for up to 7 days after password rotation, and cookies are readable by client scripts.',
      },
      overall_severity: 'medium',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and sandbox CHK_09.',
    },
  },

  // 17. SSRF & merchant key exfil via LunasQRIS/Xaviera proxy routes
  {
    verdict: 'confirmed',
    fingerprint: 'ssrf.payment-and-supplier-proxy-key-exfil',
    title: 'Server-Side Request Forgery (SSRF) and Merchant API Key Exfiltration in LunasQRIS & Xaviera Proxies',
    description:
      'LunasQRIS proxy routes (/api/lunasqris/balance, /transaction/status, /transaction/create) accept arbitrary baseurl/baseUrl values from request query/body and attach merchant credentials (X-API-Key and Authorization: Bearer) directly into outbound server-side fetch() calls without protocol, loopback, or private-IP filtering. Xaviera routes (/api/xaviera/profile, /products, /smm, /games) similarly fetch botManager.config.xavieraBaseUrl (writable unauthenticated via /api/bot/save-config) with Authorization: Bearer.',
    root_cause:
      'lunasQrisRoutes.ts:16,29,87 forwards caller-controlled baseurl/baseUrl into lunasQrisService.ts fetch() calls; xavieraRoutes.ts:8 fetches unvalidated botManager.config.xavieraBaseUrl with Authorization: Bearer.',
    intended_behavior:
      'Restrict outbound gateway and supplier base URLs to HTTPS only, enforce a strict hostname allowlist or DNS-resolved public-IP check blocking loopback/link-local/RFC1918 ranges, and require authentication before proxying requests.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/routes/lunasQrisRoutes.ts',
        line: 16,
        scope: 'GET /api/lunasqris/balance',
        description: 'Reads unvalidated req.query.baseurl and forwards it to getLunasQrisBalance.',
      },
      {
        kind: 'propagation',
        file: 'backend/services/lunasQrisService.ts',
        line: 66,
        scope: 'getLunasQrisBalance',
        description: 'Normalizes trailing slashes only without scheme or IP validation.',
      },
      {
        kind: 'sink',
        file: 'backend/services/lunasQrisService.ts',
        line: 73,
        scope: 'getLunasQrisBalance',
        description: 'Executes fetch(url) sending X-API-Key and Authorization: Bearer to attacker-specified host.',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/lunasQrisRoutes.ts',
        line: 16,
        description: 'Accepts req.query.baseurl on /balance and /transaction/status (29) and req.body.baseUrl on /transaction/create (87).',
      },
      {
        file: 'backend/services/lunasQrisService.ts',
        line: 73,
        description: 'Sends X-API-Key and Authorization Bearer to constructed URL without allowlist.',
      },
      {
        file: 'backend/routes/xavieraRoutes.ts',
        line: 20,
        description: 'Fetches config.xavieraBaseUrl with Authorization: Bearer apiKey.',
      },
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Unauthenticated HTTP caller passing baseurl query/body param or updating xavieraBaseUrl via /api/bot/save-config.',
      },
    ],
    execution: {
      attacker_perspective: 'Remote unauthenticated caller directing outbound server HTTP requests to internal services or a collector.',
      payloads: [
        'GET /api/lunasqris/balance?apikey=DUMMY_MERCHANT_SECRET&baseurl=http://127.0.0.1:<loopbackPort>',
        'GET /api/xaviera/profile?tenant=<victimTenantId> after xavieraBaseUrl=http://127.0.0.1:<loopbackPort>',
      ],
      instructions: [
        'Start an isolated loopback HTTP listener inside the sandbox.',
        'Call GET /api/lunasqris/balance?baseurl=http://127.0.0.1:<port> and GET /api/xaviera/profile?tenant=<victimTenantId>.',
        'Inspect requests received by the loopback listener.',
      ],
      observed_result: `Sandbox CHK_07 captured outbound GET ${poc.checks.CHK_07_ssrf_and_key_exfil.lunasQrisTargetPath} with X-API-Key="${poc.checks.CHK_07_ssrf_and_key_exfil.lunasQrisExfiltratedApiKeyHeader}" and GET ${poc.checks.CHK_07_ssrf_and_key_exfil.xavieraTargetPath} with Authorization="${poc.checks.CHK_07_ssrf_and_key_exfil.xavieraExfiltratedBearerHeader}".`,
    },
    remediation: {
      strategy:
        'Remove per-request baseurl overrides, enforce HTTPS-only public host validation (rejecting 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, and IPv6 local ranges after DNS resolution, with redirect: "error"), and require tenant auth.',
      code_changes: [
        {
          file_name: 'backend/routes/lunasQrisRoutes.ts',
          fixed_code:
            "// Enforce auth middleware and use only validated HTTPS tenant configuration (remove req.query.baseurl / req.body.baseUrl overrides).",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Directly triggerable via unauthenticated GET/POST query/body parameters.',
      },
      impact: {
        score: 'high',
        reason: 'Enables internal network/loopback probing (SSRF) and exfiltration of tenant LunasQRIS and Xaviera API keys.',
      },
      overall_severity: 'high',
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source inspection and loopback HTTP capture in sandbox CHK_07.',
    },
  },

  // 18. webhook fail-open, replay, and missing amount verification
  {
    verdict: 'confirmed',
    fingerprint: 'webhook.lunasqris-failopen-replay-and-amount-bypass',
    title: 'LunasQRIS Webhook Fail-Open When Secret Empty, Missing Replay Window, and Missing Amount Verification',
    description:
      'POST /api/lunasqris/webhook bypasses HMAC-SHA256 verification entirely whenever a tenant has not configured lunasQrisSecretKey (fail-open). Even when a secret is configured, verifyLunasQrisSignature() does not validate freshness of x-callback-timestamp (allowing infinite replay), and the handler updates SQLite transactions to paid without verifying that paid amount matches the stored order nominal/total.',
    root_cause:
      'lunasQrisRoutes.ts:49 checks `if (secretKey)` instead of rejecting empty secrets; lunasQrisService.ts:286-301 never checks timestamp age; lunasQrisRoutes.ts:67-74 ignores payload amount.',
    intended_behavior:
      'Reject webhook callbacks (401/503) if lunasQrisSecretKey is unconfigured, reject timestamps outside a short replay window (e.g., +/- 300s) with idempotent status guards, and verify payload amount/total_amount matches the stored pending order total.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/routes/lunasQrisRoutes.ts',
        line: 40,
        scope: 'POST /api/lunasqris/webhook',
        description: 'Receives unauthenticated webhook callback for resolved tenant.',
      },
      {
        kind: 'propagation',
        file: 'backend/routes/lunasQrisRoutes.ts',
        line: 49,
        scope: 'POST /api/lunasqris/webhook',
        description: 'Skips signature verification if secretKey is empty; calls verifyLunasQrisSignature otherwise without timestamp age or amount check.',
      },
      {
        kind: 'sink',
        file: 'backend/routes/lunasQrisRoutes.ts',
        line: 70,
        scope: 'POST /api/lunasqris/webhook',
        description: 'Marks local transaction paid via updateTransactionStatus().',
      },
    ],
    evidence: [
      {
        file: 'backend/routes/lunasqrisRoutes.ts',
        line: 49,
        description: 'if (secretKey) skips verification when secret is empty.',
      },
      {
        file: 'backend/services/lunasQrisService.ts',
        line: 292,
        description: 'verifyLunasQrisSignature checks string truthiness only, not timestamp freshness.',
      },
      {
        file: 'backend/routes/lunasqrisRoutes.ts',
        line: 70,
        description: 'Calls updateTransactionStatus without comparing data.total_amount against DB total.',
      },
    ],
    conditions: [
      {
        kind: 'system_configuration',
        description: 'Any unconfigured lunasQrisSecretKey enables immediate unsigned spoofing; configured keys remain vulnerable to stale replay or mismatched amounts.',
      },
    ],
    execution: {
      attacker_perspective: 'Remote unauthenticated HTTP caller sending forged or replayed callback payloads.',
      payloads: [
        'POST /api/lunasqris/webhook?tenant=<victimTenantId> {"event":"transaction.paid","data":{"order_id":"ORD-WH-OPEN","status":"paid"}}',
        'POST /api/lunasqris/webhook with X-Callback-Timestamp: 1000000000 and amount: 1 for a 100000 order',
      ],
      instructions: [
        'Seed two pending dummy transactions (ORD-WH-OPEN with empty secretKey, ORD-WH-REPLAY with secretKey configured).',
        'Send unsigned callback for ORD-WH-OPEN and stale-timestamp/amount=1 HMAC-signed callback for ORD-WH-REPLAY.',
      ],
      observed_result: `Sandbox CHK_04 returned HTTP ${poc.checks.CHK_04_lunasqris_webhook.failOpenHttpStatus} and marked ORD-WH-OPEN "${poc.checks.CHK_04_lunasqris_webhook.failOpenOrderStatus}"; for ORD-WH-REPLAY with stale timestamp 1000000000 and amount=1, returned HTTP ${poc.checks.CHK_04_lunasqris_webhook.staleTsAndMismatchAmountHttpStatus} and marked order "${poc.checks.CHK_04_lunasqris_webhook.staleTsAndMismatchAmountOrderStatus}".`,
    },
    remediation: {
      strategy:
        'Fail closed (return 401/503) if lunasQrisSecretKey is empty, enforce timestamp age <= 300 seconds in verifyLunasQrisSignature, enforce pending-only transitions, and verify paid amount matches stored order total.',
      code_changes: [
        {
          file_name: 'backend/routes/lunasQrisRoutes.ts',
          fixed_code:
            "if (!secretKey || !verifyLunasQrisSignature(rawBody, timestamp, signature, secretKey)) {\n  return res.status(401).json({ success: false, error: 'Invalid or unconfigured webhook signature' });\n}",
        },
      ],
    },
    severity: {
      likelihood: {
        score: 'high',
        reason: 'Any tenant without lunasQrisSecretKey allows unsigned payment spoofing via a single POST request.',
      },
      impact: {
        score: 'critical',
        reason: 'Enables marking unpaid or underpaid orders as paid without transferring funds.',
      },
      overall_severity: 'critical',
    },
    confidence: {
      score: 'high',
      reason: 'Both fail-open and stale-timestamp/amount bypass reproduced in sandbox CHK_04.',
    },
  },

  // 19. rejected: TabTransaksi javascript: URL XSS
  {
    verdict: 'rejected',
    fingerprint: 'xss.tabtransaksi-javascript-payment-url',
    title: 'Claimed Stored XSS via javascript: paymentUrl in TabTransaksi.tsx Anchor',
    description:
      'Candidate claimed that rendering <a href={trx.paymentUrl}> in frontend/src/components/tabs/TabTransaksi.tsx could allow stored javascript: URI XSS if a manipulated gateway response injected a javascript: payment_url.',
    claimed_root_cause:
      'lunasQrisService.ts stores d.payment_url unvalidated into SQLite transactions, and TabTransaksi.tsx passes trx.paymentUrl to <a href={trx.paymentUrl}> without scheme checking.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'backend/services/lunasQrisService.ts',
        line: 177,
        scope: 'createLunasQrisTransaction',
        description: 'Stores d.payment_url returned by payment gateway into SQLite.',
      },
      {
        kind: 'sink',
        file: 'frontend/src/components/tabs/TabTransaksi.tsx',
        line: 346,
        scope: 'TabTransaksi',
        description: 'Renders <a href={trx.paymentUrl} target="_blank" rel="noreferrer">.',
      },
    ],
    evidence: [
      {
        file: 'frontend/package.json',
        line: 18,
        description: 'Frontend uses react-dom ^19.0.1.',
      },
      {
        file: 'frontend/src/components/tabs/TabTransaksi.tsx',
        line: 346,
        description: 'Uses standard React JSX anchor href prop.',
      },
    ],
    reason:
      'Refuted by local verification against target React 19 (CHK_10): react-dom 19.0.1 automatically blocks javascript: URLs in <a href> during rendering, replacing the attribute value with "javascript:throw new Error(\'React has blocked a javascript: URL as a security precaution.\')". While explicit https: URL validation remains good defense-in-depth hardening, the claimed javascript: XSS execution is mitigated by React 19.',
  },
];

// Sort findings lexicographically using standard < / > comparison
findings.sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));
assertNoDashes(JSON.stringify(findings), 'findings.json');
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify(findings, null, 2));

// Build updated coverage-ledger.json from existing planned ledger
const ledger = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'coverage-ledger.json'), 'utf8'));

const unitUpdates = {
  'admin-backend/database/masterSqlite.ts#cryptoAndSeededCredentials': {
    status: 'candidate',
    reviewed_paths: [
      'admin-backend/database/masterSqlite.ts',
      'backend/services/authManager.ts',
      'backend/services/apartmentManager.ts',
      'admin-backend/services/tokenService.ts',
      'admin-backend/utils/generatorUtils.ts',
    ],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: [
          'admin-backend/database/masterSqlite.ts',
          'backend/services/authManager.ts',
          'backend/services/apartmentManager.ts',
          'admin-backend/services/tokenService.ts',
          'admin-backend/utils/generatorUtils.ts',
        ],
        invariant: 'Verify KDF strength, salt randomness, seeded credentials, comparison timing safety, and token PRNG.',
        method: 'source',
        result: 'Identified static salt, 1000-iteration PBKDF2, hardcoded default credentials, === comparisons, and Math.random() token/password generators.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['admin-backend/database/masterSqlite.ts', 'backend/services/authManager.ts', 'admin-backend/utils/generatorUtils.ts'],
        invariant: 'Confirm default credential seeding, static-salt deterministic hashing, and default login reachability.',
        method: 'local',
        result: 'Sandbox CHK_09 confirmed wan_admin773 seeded, identical static-salt hashes, and HTTP 200 login with admin/admin123.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['crypto.weak-kdf-static-salt-and-default-creds'],
    unresolved: [],
  },
  'admin-backend/routes/adminRoutes.ts#authenticatedAdminSuite': {
    status: 'covered',
    reviewed_paths: [
      'admin-backend/routes/adminRoutes.ts',
      'admin-backend/routes/broadcastRoutes.ts',
      'admin-backend/routes/expiryRoutes.ts',
      'admin-backend/routes/masterSettingsRoutes.ts',
      'admin-backend/routes/messageRoutes.ts',
      'admin-backend/routes/telegramAdminRoutes.ts',
      'admin-backend/routes/templateRoutes.ts',
    ],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: [
          'admin-backend/routes/adminRoutes.ts',
          'admin-backend/routes/broadcastRoutes.ts',
          'admin-backend/routes/expiryRoutes.ts',
          'admin-backend/routes/masterSettingsRoutes.ts',
          'admin-backend/routes/messageRoutes.ts',
          'admin-backend/routes/telegramAdminRoutes.ts',
          'admin-backend/routes/templateRoutes.ts',
        ],
        invariant: 'All non-/auth Master Admin routes under /api/admin/* require valid admin_sessions bearer authentication.',
        method: 'source',
        result: 'Verified adminRoutes.ts:42 applies requireMasterAdminAuth before mounting all management sub-routers; redundant activeAdminTokens Set noted as hardening.',
        artifact: null,
      },
    ],
    result_fingerprints: [],
    unresolved: [],
  },
  'admin-backend/routes/authAdminRoutes.ts#POST /api/admin/auth/login': {
    status: 'candidate',
    reviewed_paths: [
      'admin-backend/routes/authAdminRoutes.ts',
      'admin-backend/utils/adminSecurityUtils.ts',
      'admin-backend/services/adminAuthService.ts',
    ],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['admin-backend/routes/authAdminRoutes.ts', 'admin-backend/utils/adminSecurityUtils.ts', 'admin-backend/services/adminAuthService.ts'],
        invariant: 'Master Admin login brute-force lockout cannot be reset via client-controlled headers.',
        method: 'source',
        result: 'Found normalizeClientIp trusts leftmost X-Forwarded-For entry.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['admin-backend/routes/authAdminRoutes.ts', 'admin-backend/utils/adminSecurityUtils.ts', 'admin-backend/services/adminAuthService.ts'],
        invariant: 'Verify 429 lockout resets when rotating X-Forwarded-For.',
        method: 'local',
        result: 'Sandbox CHK_06 confirmed 429 on 5th attempt from 198.51.100.1 followed immediately by 401 when rotating header to 198.51.100.2.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.xff-spoof-admin-lockout-bypass'],
    unresolved: [],
  },
  'admin-backend/routes/impersonateRoutes.ts#impersonationLifecycle': {
    status: 'candidate',
    reviewed_paths: [
      'admin-backend/routes/impersonateRoutes.ts',
      'admin-backend/services/adminAuthService.ts',
      'frontend/src/hooks/useAuth.ts',
      'backend/routes/authRoutes.ts',
    ],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['admin-backend/routes/impersonateRoutes.ts', 'admin-backend/services/adminAuthService.ts', 'frontend/src/hooks/useAuth.ts', 'backend/routes/authRoutes.ts'],
        invariant: 'Impersonation tokens must be revoked on admin logout/password change and avoided in URL query strings.',
        method: 'source',
        result: 'Observed redirectUrl query parameter token exposure and no cleanup in logout/changePassword.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['admin-backend/services/adminAuthService.ts'],
        invariant: 'Confirm impersonationTokens map entry persists after AdminAuthService.logout().',
        method: 'local',
        result: 'Sandbox CHK_09 confirmed impersonationTokenValidAfterAdminLogout=true.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['session.impersonation-not-revoked-and-url-token'],
    unresolved: [],
  },
  'admin-backend/routes/partnerPublicRoutes.ts#/api/v1/partner/*': {
    status: 'candidate',
    reviewed_paths: ['admin-backend/routes/partnerPublicRoutes.ts', 'admin-backend/services/partnerApiService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['admin-backend/routes/partnerPublicRoutes.ts', 'admin-backend/services/partnerApiService.ts'],
        invariant: 'Partner API invalid-key rate limiter must not be bypassable by client-supplied headers.',
        method: 'source',
        result: 'Observed getClientIp splits leftmost X-Forwarded-For.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['admin-backend/routes/partnerPublicRoutes.ts'],
        invariant: 'Confirm 61st invalid attempt triggers 429 and rotating X-Forwarded-For resets to 401.',
        method: 'local',
        result: 'Sandbox CHK_06 confirmed 429 on 61st request and immediate 401 upon rotating X-Forwarded-For.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['ratelimit.xff-spoof-partner-api-bypass'],
    unresolved: [],
  },
  'backend/app.ts#tenantResolutionMiddleware': {
    status: 'candidate',
    reviewed_paths: ['backend/app.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/services/tenantStatusService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/app.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/services/tenantStatusService.ts'],
        invariant: 'Tenant context cannot be overridden by client headers/queries over authenticated sessions, and nonexistent tenants must not create DBs or default active.',
        method: 'source',
        result: 'Found X-Tenant-Id override, unconditional initTenantDb(), and active default in enforceRealtimeTenantExpiry.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/app.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/services/tenantStatusService.ts'],
        invariant: 'Verify X-Tenant-Id overrides Bearer token and ?tenant= creates ghost SQLite file with status active.',
        method: 'local',
        result: 'Sandbox CHK_01 confirmed cross-tenant resolution override and creation of ghost_unlisted_tenant_999.db with accountStatus="active".',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['authz.tenant-middleware-override-and-unbounded-db'],
    unresolved: [],
  },
  'backend/database/sqlite.ts#sqliteParameterizedQueries': {
    status: 'covered',
    reviewed_paths: ['backend/database/sqlite.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/database/masterSqlite.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/database/sqlite.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/database/masterSqlite.ts'],
        invariant: 'User inputs in SQLite queries must use parameterized bindings.',
        method: 'source',
        result: 'Verified all user-supplied inputs bind via ? placeholders; pragma/column interpolations use internal constants only.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/database/sqlite.ts'],
        invariant: 'Confirm SQL metacharacter input in getPromoCodeByCode executes safely as literal string.',
        method: 'local',
        result: 'Sandbox CHK_11 returned null without SQL errors on "\' OR \'1\'=\'1".',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: [],
    unresolved: [],
  },
  'backend/handlers/hideTagHandler.ts#handleHideTagCommand': {
    status: 'covered',
    reviewed_paths: ['backend/handlers/hideTagHandler.ts', 'backend/handlers/hideTagUtils.ts', 'backend/handlers/dmFilterUtils.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/handlers/hideTagHandler.ts', 'backend/handlers/hideTagUtils.ts', 'backend/handlers/dmFilterUtils.ts'],
        invariant: 'Only group admins/superadmins can trigger hide-tag broadcast commands.',
        method: 'source',
        result: 'Verified isGroupParticipantAdmin enforces admin/superadmin across PN and LID JIDs.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/handlers/hideTagUtils.ts'],
        invariant: 'Confirm non-admin participant returns false and admin returns true.',
        method: 'local',
        result: 'Sandbox CHK_11 confirmed hideTagNonAdminAllowed=false and hideTagAdminAllowed=true.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: [],
    unresolved: [],
  },
  'backend/handlers/messageDispatcher.ts#orderVarCheckout': {
    status: 'candidate',
    reviewed_paths: ['backend/handlers/messageDispatcher.ts', 'backend/messages/carouselMessage.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/handlers/messageDispatcher.ts', 'backend/messages/carouselMessage.ts'],
        invariant: 'Checkout invoice amount must be recomputed server-side from catalog/pricing rather than parsed from interactive button ID.',
        method: 'source',
        result: 'Identified order_var button ID price parsed directly without catalog re-verification.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/handlers/messageDispatcher.ts'],
        invariant: 'Verify forged order_var price=1 generates a Rp 1 LunasQRIS invoice.',
        method: 'local',
        result: 'Sandbox CHK_05 confirmed invoiceAmountSentToGateway=1 for forged order_var button payload.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['logic.whatsapp-order-var-price-tampering'],
    unresolved: [],
  },
  'backend/handlers/messageDispatcher.ts#validateAndApplyPromo': {
    status: 'candidate',
    reviewed_paths: ['backend/handlers/messageDispatcher.ts', 'backend/database/sqlite.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/handlers/messageDispatcher.ts', 'backend/database/sqlite.ts'],
        invariant: 'Promo quota enforcement must prevent concurrent checkouts from exceeding promo.quota.',
        method: 'source',
        result: 'Found TOCTOU gap between validateAndApplyPromo check and async post-payment used_count increment.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/handlers/messageDispatcher.ts', 'backend/database/sqlite.ts'],
        invariant: 'Confirm two pre-payment validations against quota=1 succeed and yield usedCount=2.',
        method: 'local',
        result: 'Sandbox CHK_08 confirmed configuredQuota=1, both validations true, and finalUsedCountExceedingQuota=2.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['race.promo-quota-toctou-oversubscription'],
    unresolved: [],
  },
  'backend/routes/apartmentRoutes.ts#/api/apartment/*': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/apartmentRoutes.ts', 'backend/services/apartmentManager.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/apartmentRoutes.ts', 'backend/services/apartmentManager.ts'],
        invariant: 'All apartment admin endpoints must require authenticated Master Admin headers.',
        method: 'source',
        result: 'Found GET /stats, /tenants, /current-lease, and /tenants/:id lack requireMasterAdminAuth, and middleware accepts ?token=.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/apartmentRoutes.ts'],
        invariant: 'Confirm unauthenticated GET requests return HTTP 200.',
        method: 'local',
        result: 'Sandbox CHK_03 confirmed HTTP 200 on /stats, /tenants, and /current-lease without credentials.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.apartment-unauthenticated-read-endpoints'],
    unresolved: [],
  },
  'backend/routes/authRoutes.ts#POST /api/auth/profile/update-username': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/authRoutes.ts', 'backend/services/authManager.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/authRoutes.ts', 'backend/services/authManager.ts'],
        invariant: 'Profile and store setup updates must require verified Bearer authentication.',
        method: 'source',
        result: 'Found fallback in getAuthSessionFromReq and missing auth check on store-setup.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/authRoutes.ts', 'backend/services/authManager.ts'],
        invariant: 'Confirm unauthenticated POST /update-username and /store-setup mutate victim tenant.',
        method: 'local',
        result: 'Sandbox CHK_02 confirmed unauthenticated username hijack ("hijacked_victim_99") and store info overwrite.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.unauthenticated-tenant-username-and-store-takeover'],
    unresolved: [],
  },
  'backend/routes/botRoutes.ts#GET /api/bot/status': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/botRoutes.ts', 'backend/botManager.ts', 'backend/app.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/botRoutes.ts', 'backend/botManager.ts', 'backend/app.ts'],
        invariant: 'Bot control and configuration routes require tenant authentication and secret redaction.',
        method: 'source',
        result: 'Found /api/bot/* lacks auth middleware and serializes plaintext gateway/supplier API keys.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/botRoutes.ts', 'backend/botManager.ts'],
        invariant: 'Confirm unauthenticated GET /api/bot/status leaks API keys.',
        method: 'local',
        result: 'Sandbox CHK_01 confirmed plaintext xavieraApiKey and lunasQrisApiKey disclosure.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.unauthenticated-bot-control-and-key-leak'],
    unresolved: [],
  },
  'backend/routes/lunasQrisRoutes.ts#POST /api/lunasqris/webhook': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts'],
        invariant: 'Payment webhook must fail closed if secret missing, reject stale timestamps, and validate paid amount.',
        method: 'source',
        result: 'Identified fail-open branch when secretKey is empty, no timestamp age check, and no amount match check.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts'],
        invariant: 'Confirm unsigned empty-secret webhook and stale/amount=1 signed webhook both mark orders paid.',
        method: 'local',
        result: 'Sandbox CHK_04 confirmed both ORD-WH-OPEN and ORD-WH-REPLAY transitioned to paid.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['webhook.lunasqris-failopen-replay-and-amount-bypass'],
    unresolved: [],
  },
  'backend/routes/lunasQrisRoutes.ts#proxyLunasQrisAndXaviera': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts', 'backend/routes/xavieraRoutes.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts', 'backend/routes/xavieraRoutes.ts'],
        invariant: 'Outbound HTTP proxies must restrict base URLs to HTTPS public allowlisted hosts.',
        method: 'source',
        result: 'Observed unvalidated baseurl/baseUrl params and xavieraBaseUrl passed to fetch() with merchant keys.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/routes/xavieraRoutes.ts'],
        invariant: 'Confirm loopback SSRF requests transmit X-API-Key and Authorization Bearer headers.',
        method: 'local',
        result: 'Sandbox CHK_07 captured secret headers transmitted to http://127.0.0.1 loopback server.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['ssrf.payment-and-supplier-proxy-key-exfil'],
    unresolved: [],
  },
  'backend/routes/pricingRoutes.ts#tenantOperationalRouters': {
    status: 'candidate',
    reviewed_paths: [
      'backend/routes/pricingRoutes.ts',
      'backend/routes/promoRoutes.ts',
      'backend/routes/transactionRoutes.ts',
      'backend/routes/mediaRoutes.ts',
      'backend/routes/tenantTokenRoutes.ts',
      'backend/routes/tenantTemplateRoutes.ts',
    ],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: [
          'backend/routes/pricingRoutes.ts',
          'backend/routes/promoRoutes.ts',
          'backend/routes/transactionRoutes.ts',
          'backend/routes/mediaRoutes.ts',
          'backend/routes/tenantTokenRoutes.ts',
          'backend/routes/tenantTemplateRoutes.ts',
        ],
        invariant: 'Tenant operational routes require authentication and cannot trust body tenantId.',
        method: 'source',
        result: 'Confirmed complete absence of session middleware across all six routers.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/pricingRoutes.ts'],
        invariant: 'Confirm unauthenticated POST /api/pricing mutates tenant pricing.',
        method: 'local',
        result: 'Sandbox CHK_01 confirmed unauthenticated pricing mutation succeeded (value=1).',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.unauthenticated-tenant-operational-apis'],
    unresolved: [],
  },
  'backend/routes/telegramRoutes.ts#/api/bot/telegram/*': {
    status: 'candidate',
    reviewed_paths: ['backend/routes/telegramRoutes.ts', 'backend/services/telegramService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/routes/telegramRoutes.ts', 'backend/services/telegramService.ts'],
        invariant: 'Telegram config endpoints require authentication and mask botToken.',
        method: 'source',
        result: 'Confirmed GET/POST /config and POST /test have no authentication.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/routes/telegramRoutes.ts'],
        invariant: 'Confirm unauthenticated GET /api/bot/telegram/config leaks botToken and chatId.',
        method: 'local',
        result: 'Sandbox CHK_02 leaked plaintext botToken and chatId.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['auth.unauthenticated-telegram-config-leak-and-write'],
    unresolved: [],
  },
  'backend/services/authManager.ts#sessionAndCookieLifecycle': {
    status: 'candidate',
    reviewed_paths: ['backend/services/authManager.ts', 'backend/routes/authRoutes.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/services/authManager.ts', 'backend/routes/authRoutes.ts'],
        invariant: 'Sessions must be revoked on password change and auth cookies must set HttpOnly, SameSite, and Secure.',
        method: 'source',
        result: 'Found no activeSessions deletion in updateTenantPassword and httpOnly: false cookies.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/services/authManager.ts', 'backend/routes/authRoutes.ts'],
        invariant: 'Confirm old session survives password change and Set-Cookie omits HttpOnly/SameSite/Secure.',
        method: 'local',
        result: 'Sandbox CHK_09 confirmed oldTenantSessionStillValidAfterPwChange=true and weak Set-Cookie headers.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['session.no-revocation-on-pw-change-and-weak-cookies'],
    unresolved: [],
  },
  'backend/services/mediaManager.ts#uploadAndServeMedia': {
    status: 'covered',
    reviewed_paths: ['backend/services/mediaManager.ts', 'backend/routes/mediaRoutes.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/services/mediaManager.ts', 'backend/routes/mediaRoutes.ts'],
        invariant: 'Media filenames and tenant directories must block path traversal.',
        method: 'source',
        result: 'Verified path.basename, extension allowlist, and regex tenant sanitization prevent directory escape.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/services/mediaManager.ts'],
        invariant: 'Confirm ../../etc/passwd traversal returns null.',
        method: 'local',
        result: 'Sandbox CHK_11 confirmed getPicturePath returned null.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: [],
    unresolved: [],
  },
  'backend/services/telegramService.ts#sendTelegramMessage': {
    status: 'candidate',
    reviewed_paths: ['backend/services/telegramService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['backend/services/telegramService.ts'],
        invariant: 'Dynamic fields interpolated into parse_mode: HTML Telegram payloads must be HTML-escaped.',
        method: 'source',
        result: 'Found raw interpolation of storeName, productName, variantName, reason, and adminMessage.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/services/telegramService.ts'],
        invariant: 'Confirm unescaped <a> tag survives into parse_mode HTML Telegram request body.',
        method: 'local',
        result: 'Sandbox CHK_10 confirmed telegramContainsRawAnchorTag=true with parse_mode="HTML".',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['injection.telegram-html-markup-interpolation'],
    unresolved: [],
  },
  'deploy-vps.sh#productionIngressAndPermissions': {
    status: 'candidate',
    reviewed_paths: ['deploy-vps.sh', 'backend/app.ts', 'ecosystem.config.cjs', 'server.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['deploy-vps.sh', 'backend/app.ts', 'ecosystem.config.cjs', 'server.ts'],
        invariant: 'CORS, file permissions, firewall rules, and TLS ingress must enforce least privilege.',
        method: 'source',
        result: 'Confirmed wildcard cors(), chmod 755 /root + chmod -R 755 APP_DIR, ufw allow 5000/tcp, and HTTP-only Nginx config (TLS unverified on live host).',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['backend/app.ts'],
        invariant: 'Verify untrusted Origin receives wildcard Access-Control-Allow-Origin.',
        method: 'local',
        result: 'Sandbox CHK_10 confirmed Access-Control-Allow-Origin: * for untrusted origin.',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['config.wildcard-cors-and-vps-script-exposure', 'deploy.vps-tls-and-port5000-exposure'],
    unresolved: ['Live VPS TLS certificate status and external cloud firewall reachability of TCP/5000 require owner verification.'],
  },
  'frontend/src/components/tabs/TabTransaksi.tsx#paymentUrlRender': {
    status: 'candidate',
    reviewed_paths: ['frontend/src/components/tabs/TabTransaksi.tsx', 'frontend/package.json', 'backend/services/lunasQrisService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-audit',
        reviewed_paths: ['frontend/src/components/tabs/TabTransaksi.tsx', 'frontend/package.json', 'backend/services/lunasQrisService.ts'],
        invariant: 'Verify whether React renders raw javascript: URIs in <a href={trx.paymentUrl}>.',
        method: 'source',
        result: 'Observed unvalidated href binding; noted frontend uses React 19.0.1.',
        artifact: null,
      },
      {
        agent_id: 'verifier-local',
        reviewed_paths: ['frontend/src/components/tabs/TabTransaksi.tsx', 'frontend/package.json'],
        invariant: 'Test React 19 renderToStaticMarkup behavior for javascript: href.',
        method: 'local',
        result: 'Sandbox CHK_10 confirmed React 19 blocks javascript: href natively at render time (candidate rejected).',
        artifact: ARTIFACT_REL,
      },
    ],
    result_fingerprints: ['xss.tabtransaksi-javascript-payment-url'],
    unresolved: [],
  },
};

for (const unit of ledger) {
  const key = `${unit.canonical_refs.surface}::${unit.canonical_refs.boundary}`;
  const upd = unitUpdates[unit.canonical_refs.surface];
  if (!upd) throw new Error(`Missing unit update for ${unit.canonical_refs.surface} (${key})`);
  unit.status = upd.status;
  unit.agent_id = 'verifier-local';
  unit.reviewed_paths = upd.reviewed_paths;
  unit.local_checks = upd.local_checks;
  unit.result_fingerprints = upd.result_fingerprints;
  unit.unresolved = upd.unresolved;
}

const ledgerStr = JSON.stringify(ledger, null, 2);
assertNoDashes(ledgerStr, 'coverage-ledger.json');
fs.writeFileSync(path.join(RUN_DIR, 'coverage-ledger.json'), ledgerStr);

const meta = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'run-metadata.json'), 'utf8'));
meta.run_status = 'complete';
meta.completed_at = new Date().toISOString();
meta.summary = {
  coverage_units: ledger.length,
  covered_units: ledger.filter((u) => u.status === 'covered').length,
  candidate_units: ledger.filter((u) => u.status === 'candidate').length,
  findings_total: findings.length,
  confirmed: findings.filter((f) => f.verdict === 'confirmed').length,
  needs_validation: findings.filter((f) => f.verdict === 'needs_validation').length,
  rejected: findings.filter((f) => f.verdict === 'rejected').length,
};
fs.writeFileSync(path.join(RUN_DIR, 'run-metadata.json'), JSON.stringify(meta, null, 2));
console.log('UPDATED_METADATA:', JSON.stringify(meta.summary));
