import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const validator = require('/app/applet/security-audit-skill-main/skills/security-audit/validate-coverage-ledger.cjs');

const OUT_DIR = '/root/security-audit-skill/wanzt-bot/run-1';

const runMetadata = {
  run_id: 'wanzt-bot-run-1',
  repo: 'wanzt-bot',
  target: '/app/applet',
  source_ref: 'unversioned-working-tree (NO_GIT)',
  profile: 'standard',
  scope_paths: [
    'server.ts',
    'package.json',
    'ecosystem.config.cjs',
    'deploy-vps.sh',
    'backend/',
    'admin-backend/',
    'frontend/src/',
    'admin-frontend/'
  ],
  budget: null,
  execution_policy: 'sandboxed-source-and-local-only',
  execution_mode: 'single-agent-sequential-emulation',
  execution_mode_note: 'Platform runtime executes within a single coding agent without nested sub-agent spawning; strict phase separation, deterministic ledger tracking, and fresh-eyes verification against raw source + isolated sandbox runs are enforced sequentially.',
  selected_companion_files: [
    'WEB-PROTOCOL-AND-AUTH.md',
    'CLIENT-SIDE.md',
    'DATA-ISOLATION-AND-LIFECYCLE.md',
    'PROTOCOLS-RPC-AND-MESSAGING.md',
    'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md',
    'CLOUD-AND-DEPLOYMENT.md'
  ],
  excluded_companion_files: [
    { file: 'MEMORY-SAFETY-AND-BINARY.md', reason: 'Pure TypeScript/Node.js and React SPA codebase with no custom C/C++/Rust-unsafe binary parsers.' },
    { file: 'AI-AND-LLM.md', reason: '@google/genai appears in package.json dependencies, but zero runtime LLM, RAG, MCP, or agent calls exist in server.ts, backend/, or admin-backend/.' },
    { file: 'SUPPLY-CHAIN-AND-RELEASE.md', reason: 'No CI/CD workflows, plugin installers, or automated release pipelines present in repository root.' },
    { file: 'DESKTOP-MOBILE-AND-LOCAL-IPC.md', reason: 'Web application + Node backend; no Electron, mobile WebView, or native local IPC server.' }
  ],
  prior_run_paths: [],
  shared_file_owners: {
    'run-metadata.json': 'parent',
    'architecture.md': 'parent',
    'coverage-ledger.json': 'parent',
    'findings.json': 'parent',
    'REPORT.md': 'parent',
    'FINDINGS-DETAIL.md': 'parent',
    'NEEDS-VALIDATION.md': 'parent'
  },
  run_status: 'in_progress'
};

fs.writeFileSync(path.join(OUT_DIR, 'run-metadata.json'), JSON.stringify(runMetadata, null, 2) + '\n');

const architectureMd = `# Architecture Summary: Wanzt Bot Multi-Tenant Store & Master Admin

## 1. Product, Principals, and Protected Resources
Wanzt Bot is a multi-tenant WhatsApp/Telegram digital-store automation platform backed by per-tenant SQLite stores (\`database/tenants/<id>.db\`) and a shared master control database (\`database/master.db\`).
- **Principals**:
  1. **Unauthenticated HTTP callers**: Public internet/local callers reaching Express APIs on port 3000/5000.
  2. **WhatsApp / Telegram end-customers**: Untrusted chat users sending interactive messages, button IDs, and promo codes over WhatsApp (\`@itsliaaa/baileys\`).
  3. **Payment Gateway / External Callback Senders**: Callers targeting \`POST /api/lunasqris/webhook\`.
  4. **Collaborator Partners**: External API consumers authenticating with bearer/header keys at \`/api/v1/partner/*\`.
  5. **Store Tenants (Operators)**: Store owners logging into \`frontend\` (\`/\`) to configure WhatsApp Baileys sessions, Xaviera/LunasQRIS API keys, pricing margins, promos, and Telegram credentials.
  6. **Master Super Admins**: Platform administrators logging into \`admin-frontend\` (\`/admin/\`) to create/suspend/delete tenants, issue voucher tokens, impersonate tenants, manage broadcasts, and create partner keys.
- **Protected Resources**: Tenant credentials (\`xavieraApiKey\`, \`lunasQrisApiKey\`, \`lunasQrisSecretKey\`, Telegram \`botToken\`/\`chatId\`), Baileys Signal keys (\`auth_info_baileys/tenant_*\`), transaction/promo integrity, \`master.db\` super-admin/partner tables, and server network egress.

## 2. Tech Stack, Entry Modes, and Build/Test Limits
- **Stack**: TypeScript, Node.js (v22), Express 5, \`better-sqlite3\`, \`@itsliaaa/baileys\`, React 19 + Vite, PM2 (\`ecosystem.config.cjs\`), Nginx/UFW deployment script (\`deploy-vps.sh\`).
- **Modes**: Integrated fullstack dev/prod (\`server.ts\`, port 3000) serving tenant SPA + \`/admin/\` SPA; split backend (\`backend/server.ts\`, port 5000) + Nginx static/proxy (\`deploy-vps.sh\`).
- **Offline Verification**: \`npm run lint\` runs offline, and Express routes / pure services / SQLite managers run cleanly inside \`unshare -r -n -m\` with read-only \`/tmp/sbox_ro\` and scratch \`cwd\` using dummy tenants and isolated loopback mocks. External endpoints (\`lunasqris.com\`, \`xavierastore.com\`, \`api.telegram.org\`, WhatsApp servers) and live VPS deployment posture (HTTPS, cloud firewall, host nginx) are strictly offline/unobservable.

## 3. Entry Surfaces and Critical Source-to-Sink Paths
- **Global Tenant Resolution (\`backend/app.ts:57-117\`)**: Extracts \`tenantId\` from query (\`?impersonate=\`, \`?tenant=\`), Bearer token, \`X-Tenant-Id\` (which overwrites prior Bearer resolution), or \`tenant_id\` cookie, calls \`initTenantDb(tenantId)\` (creating \`database/tenants/<id>.db\`), and executes request inside \`tenantContextStorage\`.
- **Tenant REST Routers (\`backend/app.ts:125-136\`)**: \`/api/auth\`, \`/api/bot\`, \`/api/bot/telegram\`, \`/api/pricing\`, \`/api/promos\`, \`/api/xaviera\`, \`/api/lunasqris\`, \`/api/transactions\`, \`/api/media\`, \`/api/apartment\`. Most routes lack authentication middleware entirely.
- **WhatsApp Message Pipeline (\`backend/handlers/messageDispatcher.ts\`)**: Parses incoming Baileys interactive payloads (\`order_var:product|variant|price\`), creates LunasQRIS invoices, polls status, and triggers Telegram HTML notifications (\`backend/services/telegramService.ts\`).
- **Master Admin Router (\`admin-backend/routes/adminRoutes.ts\`)**: \`/api/admin/auth/*\` handles login/lockout/password change via \`normalizeClientIp\`; remaining \`/api/admin/*\` routes enforce \`requireMasterAdminAuth\`.
- **Partner API (\`admin-backend/routes/partnerPublicRoutes.ts\`)**: Authenticates SHA-256 hashed keys on \`/api/v1/partner/*\` with IP rate limiting.

## 4. Trust Boundaries and Controls
- **Tenant vs. Unauthenticated / Cross-Tenant**: Currently unauthenticated across \`/api/bot\`, \`/api/pricing\`, \`/api/promos\`, \`/api/transactions\`, \`/api/xaviera\`, \`/api/lunasqris\`, \`/api/media\`, \`/api/bot/telegram\`, and \`GET /api/apartment/*\`; \`getAuthSessionFromReq\` falls back to unauthenticated \`X-Tenant-Id\`/\`tenant_id\`; \`TenantStatusService.enforceRealtimeTenantExpiry\` defaults unknown tenants to \`active\`.
- **Master Admin Boundary**: Enforced by \`requireMasterAdminAuth\` backed by SQLite \`admin_sessions\`, though login lockout trusts spoofable \`X-Forwarded-For\` and \`hashPassword\` uses a static salt with 1,000 PBKDF2 iterations.
- **Webhook Integrity**: \`POST /api/lunasqris/webhook\` checks HMAC-SHA256 only when \`lunasQrisSecretKey\` is non-empty, omitting timestamp replay window and paid-amount checks.
- **SQL & Media Path Controls**: \`better-sqlite3\` uses parameterized queries; \`mediaManager.ts\` normalizes tenant IDs and applies \`path.basename\`.

## 5. Companion Selection Summary
- **WEB-PROTOCOL-AND-AUTH.md**: HTTP header IP trust (\`X-Forwarded-For\`), browser cookie/token storage, API key rate limits, session revocation.
- **CLIENT-SIDE.md**: Frontend URL scheme rendering (\`paymentUrl\`), \`localStorage\` token handling.
- **DATA-ISOLATION-AND-LIFECYCLE.md**: Multi-tenant isolation middleware, session/impersonation revocation on logout and password change.
- **PROTOCOLS-RPC-AND-MESSAGING.md**: Webhook HMAC verification/replay, interactive WhatsApp message framing, group admin checks.
- **RESOURCE-EXHAUSTION-AND-AVAILABILITY.md**: Unauthenticated tenant DB/directory creation, promo quota concurrency.
- **CLOUD-AND-DEPLOYMENT.md**: Wildcard CORS, \`deploy-vps.sh\` file permissions (\`chmod -R 755\`), exposed port 5000, missing TLS proxy config.
- **Excluded**: \`MEMORY-SAFETY-AND-BINARY.md\`, \`AI-AND-LLM.md\`, \`SUPPLY-CHAIN-AND-RELEASE.md\`, \`DESKTOP-MOBILE-AND-LOCAL-IPC.md\`.
`;

fs.writeFileSync(path.join(OUT_DIR, 'architecture.md'), architectureMd);

const rawUnits = [
  {
    canonical_refs: {
      surface: 'backend/app.ts#tenantResolutionMiddleware',
      boundary: 'backend/database/tenantDbManager.ts#initTenantDb',
      subsystem: 'backend',
      attack_class: 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes'
    },
    surface: 'Tenant identification middleware across /api/*',
    boundary: 'Header/query/cookie tenant selector vs. authenticated session and per-tenant SQLite files',
    subsystem: 'backend',
    attack_class: 'Tenant and object-isolation attack classes',
    starting_paths: ['backend/app.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/services/tenantStatusService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'AI-AND-LLM.md#Context and memory poisoning', reason: 'No LLM or AI context processing on backend routes.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/authRoutes.ts#POST /api/auth/profile/update-username',
      boundary: 'backend/routes/authRoutes.ts#getAuthSessionFromReq',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'Tenant auth profile and store-setup endpoints (/api/auth/store-setup, /profile/update-username, /profile/update-password)',
    boundary: 'getAuthSessionFromReq Bearer verification vs. unauthenticated tenantId fallback',
    subsystem: 'backend',
    attack_class: 'Access control',
    starting_paths: ['backend/routes/authRoutes.ts', 'backend/services/authManager.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes', reason: 'No OAuth/OIDC/SAML federation exists.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/botRoutes.ts#GET /api/bot/status',
      boundary: 'backend/app.ts#tenantResolutionMiddleware',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'Tenant bot control and configuration API (/api/bot/status, /start, /stop, /reset, /save-config, /groups/*)',
    boundary: 'Direct Express router exposure without session middleware',
    subsystem: 'backend',
    attack_class: 'Access control',
    starting_paths: ['backend/routes/botRoutes.ts', 'backend/botManager.ts', 'admin-backend/services/tenantStatusService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#DOM and object-state attack classes', reason: 'Server-side API authorization boundary.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/telegramRoutes.ts#/api/bot/telegram/*',
      boundary: 'backend/app.ts#tenantResolutionMiddleware',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'Tenant Telegram configuration and test endpoints (/api/bot/telegram/config, /test)',
    boundary: 'Unauthenticated router reading/writing telegram_config table with plaintext botToken/chatId',
    subsystem: 'backend',
    attack_class: 'Access control',
    starting_paths: ['backend/routes/telegramRoutes.ts', 'backend/services/telegramService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes', reason: 'Authorization absence precedes HTTP cache/framing details.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/pricingRoutes.ts#tenantOperationalRouters',
      boundary: 'backend/app.ts#tenantResolutionMiddleware',
      subsystem: 'backend',
      attack_class: 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes'
    },
    surface: 'Tenant pricing, promo, transaction, voucher redeem, media, and template routes',
    boundary: 'Router access without authentication plus req.body.tenantId fallback on voucher redemption',
    subsystem: 'backend',
    attack_class: 'Tenant and object-isolation attack classes',
    starting_paths: [
      'backend/routes/pricingRoutes.ts',
      'backend/routes/promoRoutes.ts',
      'backend/routes/transactionRoutes.ts',
      'backend/routes/tenantTokenRoutes.ts',
      'backend/routes/tenantTemplateRoutes.ts',
      'backend/routes/mediaRoutes.ts'
    ],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#IPC identity', reason: 'HTTP REST endpoints only.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/apartmentRoutes.ts#/api/apartment/*',
      boundary: 'backend/routes/apartmentRoutes.ts#requireMasterAdminAuth',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'Legacy apartment management endpoints (/api/apartment/*)',
    boundary: 'requireMasterAdminAuth applied on mutating methods vs. omitted on GET /stats, /tenants, /current-lease, /tenants/:id',
    subsystem: 'backend',
    attack_class: 'Access control',
    starting_paths: ['backend/routes/apartmentRoutes.ts', 'backend/services/apartmentManager.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes', reason: 'Standard Express JSON HTTP routes.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/lunasQrisRoutes.ts#POST /api/lunasqris/webhook',
      boundary: 'backend/services/lunasQrisService.ts#verifyLunasQrisSignature',
      subsystem: 'backend',
      attack_class: 'PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes'
    },
    surface: 'LunasQRIS payment callback webhook (POST /api/lunasqris/webhook)',
    boundary: 'Optional HMAC-SHA256 verification and transaction status mutation',
    subsystem: 'backend',
    attack_class: 'Replay, ordering, and transaction attack classes',
    starting_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts', 'backend/services/transactionManager.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Business logic',
    selected_companion_blocks: [
      'PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'PROTOCOLS-RPC-AND-MESSAGING.md#Broker and queue isolation attack classes', reason: 'HTTP webhook endpoint rather than external broker/queue.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/routes/lunasQrisRoutes.ts#proxyLunasQrisAndXaviera',
      boundary: 'backend/services/lunasQrisService.ts#fetch',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Resource and file handling'
    },
    surface: 'Outbound HTTP proxy routes for LunasQRIS and Xaviera (/api/lunasqris/*, /api/xaviera/*)',
    boundary: 'Server-side fetch with stored merchant Bearer/X-API-Key headers to caller-configurable baseUrl',
    subsystem: 'backend',
    attack_class: 'Resource and file handling',
    starting_paths: ['backend/routes/lunasQrisRoutes.ts', 'backend/services/lunasQrisService.ts', 'backend/routes/xavieraRoutes.ts', 'backend/services/xavieraService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Resource and file handling',
    selected_companion_blocks: [
      'CLOUD-AND-DEPLOYMENT.md#Core discipline',
      'CLOUD-AND-DEPLOYMENT.md#Ingress, network, and control-plane attack classes',
      'CLOUD-AND-DEPLOYMENT.md#Universal moves',
      'CLOUD-AND-DEPLOYMENT.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#Cross-origin messaging and network attack classes', reason: 'Server-side outbound fetch SSRF boundary.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/handlers/messageDispatcher.ts#orderVarCheckout',
      boundary: 'backend/messages/carouselMessage.ts#order_var',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Business logic'
    },
    surface: 'WhatsApp interactive order button parsing and LunasQRIS invoice creation',
    boundary: 'Untrusted incoming WA button/message ID payload vs. server-side product pricing catalog',
    subsystem: 'backend',
    attack_class: 'Business logic',
    starting_paths: ['backend/handlers/messageDispatcher.ts', 'backend/messages/carouselMessage.ts', 'backend/services/xavieraService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Business logic',
    selected_companion_blocks: [
      'PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes', reason: 'WhatsApp messaging protocol handler, not HTTP cookies.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/handlers/messageDispatcher.ts#validateAndApplyPromo',
      boundary: 'backend/database/sqlite.ts#promo_codes',
      subsystem: 'backend',
      attack_class: 'PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes'
    },
    surface: 'Promo code quota validation and post-payment counter increment',
    boundary: 'Pre-checkout quota check vs. asynchronous post-payment SQLite increment',
    subsystem: 'backend',
    attack_class: 'Replay, ordering, and transaction attack classes',
    starting_paths: ['backend/handlers/messageDispatcher.ts', 'backend/database/sqlite.ts', 'backend/routes/promoRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Business logic',
    selected_companion_blocks: [
      'PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#DOM and object-state attack classes', reason: 'Server-side SQLite state race.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/handlers/hideTagHandler.ts#handleHideTagCommand',
      boundary: 'backend/handlers/hideTagUtils.ts#isGroupParticipantAdmin',
      subsystem: 'backend',
      attack_class: 'PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes'
    },
    surface: 'WhatsApp group admin hide-tag command and DM filter',
    boundary: 'Baileys group metadata participant role matching and JID normalization',
    subsystem: 'backend',
    attack_class: 'RPC identity and authorization attack classes',
    starting_paths: ['backend/handlers/hideTagHandler.ts', 'backend/handlers/hideTagUtils.ts', 'backend/handlers/dmFilterUtils.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline',
      'PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes', reason: 'WhatsApp JID command dispatcher.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/services/telegramService.ts#sendTelegramMessage',
      boundary: 'backend/services/telegramService.ts#parseModeHtml',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Injection'
    },
    surface: 'Telegram Bot HTML message formatting for notifications and test/admin messages',
    boundary: 'Tenant/order field interpolation into Telegram Bot API parse_mode=HTML strings',
    subsystem: 'backend',
    attack_class: 'Injection',
    starting_paths: ['backend/services/telegramService.ts', 'backend/services/transactionManager.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Injection',
    selected_companion_blocks: [],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#DOM and object-state attack classes', reason: 'Telegram server-side HTML subset parser, not browser DOM.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/database/sqlite.ts#sqliteParameterizedQueries',
      boundary: 'better-sqlite3#prepare',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Injection'
    },
    surface: 'SQLite query construction across tenant DB, legacy DB, and master DB',
    boundary: 'SQL statement preparation vs. HTTP/WA/admin string inputs',
    subsystem: 'backend',
    attack_class: 'Injection',
    starting_paths: ['backend/database/sqlite.ts', 'backend/database/tenantDbManager.ts', 'admin-backend/database/masterSqlite.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Injection',
    selected_companion_blocks: [],
    excluded_blocks: [
      { block: 'CLOUD-AND-DEPLOYMENT.md#Workload identity and IAM attack classes', reason: 'Local embedded SQLite queries.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/services/mediaManager.ts#uploadAndServeMedia',
      boundary: 'backend/services/mediaManager.ts#pathBasenameAndTenantSanitization',
      subsystem: 'backend',
      attack_class: 'ATTACK-CLASSES.md#Resource and file handling'
    },
    surface: 'Tenant media upload, retrieval, and deletion (/api/media/*)',
    boundary: 'tenantId regex sanitization and path.basename filename resolution',
    subsystem: 'backend',
    attack_class: 'Resource and file handling',
    starting_paths: ['backend/services/mediaManager.ts', 'backend/routes/mediaRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Resource and file handling',
    selected_companion_blocks: [],
    excluded_blocks: [
      { block: 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes', reason: 'Cross-tenant auth on /api/media covered in tenantOperationalRouters unit.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'admin-backend/routes/authAdminRoutes.ts#POST /api/admin/auth/login',
      boundary: 'admin-backend/utils/adminSecurityUtils.ts#normalizeClientIp',
      subsystem: 'admin-backend',
      attack_class: 'WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes'
    },
    surface: 'Master Admin login brute-force lockout (POST /api/admin/auth/login)',
    boundary: 'normalizeClientIp trusting leftmost X-Forwarded-For vs. IP lockout table admin_login_attempts',
    subsystem: 'admin-backend',
    attack_class: 'HTTP framing and cache attack classes',
    starting_paths: ['admin-backend/routes/authAdminRoutes.ts', 'admin-backend/utils/adminSecurityUtils.ts', 'admin-backend/services/adminAuthService.ts', 'deploy-vps.sh'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#Service-worker and browser-storage attack classes', reason: 'Server-side IP rate-limit key derivation.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'admin-backend/routes/adminRoutes.ts#authenticatedAdminSuite',
      boundary: 'admin-backend/routes/adminRoutes.ts#requireMasterAdminAuth',
      subsystem: 'admin-backend',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'Authenticated Master Admin management endpoints (/api/admin/*)',
    boundary: 'requireMasterAdminAuth bearer verification backed by master.db admin_sessions',
    subsystem: 'admin-backend',
    attack_class: 'Access control',
    starting_paths: [
      'admin-backend/routes/adminRoutes.ts',
      'admin-backend/routes/broadcastRoutes.ts',
      'admin-backend/routes/expiryRoutes.ts',
      'admin-backend/routes/masterSettingsRoutes.ts',
      'admin-backend/routes/messageRoutes.ts',
      'admin-backend/routes/telegramAdminRoutes.ts',
      'admin-backend/routes/templateRoutes.ts'
    ],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes', reason: 'No federated SSO.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'admin-backend/routes/impersonateRoutes.ts#impersonationLifecycle',
      boundary: 'admin-backend/services/adminAuthService.ts#impersonationTokens',
      subsystem: 'admin-backend',
      attack_class: 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes'
    },
    surface: 'Master Admin tenant impersonation token generation, consumption, and revocation',
    boundary: 'In-memory impersonationTokens lifecycle vs. admin logout, password change, and URL query transport',
    subsystem: 'admin-backend',
    attack_class: 'Deletion, revocation, and lifecycle attack classes',
    starting_paths: ['admin-backend/routes/impersonateRoutes.ts', 'admin-backend/services/adminAuthService.ts', 'backend/routes/authRoutes.ts', 'frontend/src/hooks/useAuth.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries',
    selected_companion_blocks: [
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes', reason: 'Token revocation lifecycle focus.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'admin-backend/database/masterSqlite.ts#cryptoAndSeededCredentials',
      boundary: 'admin-backend/database/masterSqlite.ts#hashPassword',
      subsystem: 'admin-backend',
      attack_class: 'ATTACK-CLASSES.md#Cryptography and secrets'
    },
    surface: 'Password hashing, seeded default accounts, constant-time checks, and token/password PRNG',
    boundary: 'PBKDF2 parameters, hardcoded defaults, === hash compare, and Math.random() token generators',
    subsystem: 'admin-backend',
    attack_class: 'Cryptography and secrets',
    starting_paths: ['admin-backend/database/masterSqlite.ts', 'backend/services/authManager.ts', 'backend/database/sqlite.ts', 'admin-backend/services/tokenService.ts', 'admin-backend/utils/generatorUtils.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Cryptography and secrets',
    selected_companion_blocks: [],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#DOM and object-state attack classes', reason: 'Server-side cryptographic primitives.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'admin-backend/routes/partnerPublicRoutes.ts#/api/v1/partner/*',
      boundary: 'admin-backend/routes/partnerPublicRoutes.ts#authenticatePartnerApi',
      subsystem: 'admin-backend',
      attack_class: 'WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes'
    },
    surface: 'Public Partner REST API (/api/v1/partner/tenants/create, /tokens/create)',
    boundary: 'SHA-256 partner key verification vs. IP-based invalid-attempt rate limiter',
    subsystem: 'admin-backend',
    attack_class: 'API-key and mTLS attack classes',
    starting_paths: ['admin-backend/routes/partnerPublicRoutes.ts', 'admin-backend/services/partnerApiService.ts', 'admin-backend/services/partnerApiUtils.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes', reason: 'Stateless API-key endpoints.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'backend/services/authManager.ts#sessionAndCookieLifecycle',
      boundary: 'backend/routes/authRoutes.ts#sessionCookiesAndRevocation',
      subsystem: 'backend',
      attack_class: 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes'
    },
    surface: 'Tenant session revocation on password change/suspension and auth cookie attributes',
    boundary: 'activeSessions invalidation and res.cookie flags (httpOnly, sameSite, secure)',
    subsystem: 'backend',
    attack_class: 'Browser-session attack classes',
    starting_paths: ['backend/services/authManager.ts', 'backend/routes/authRoutes.ts', 'admin-backend/services/tenantStatusService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Obvious things',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes',
      'WEB-PROTOCOL-AND-AUTH.md#Universal moves',
      'WEB-PROTOCOL-AND-AUTH.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes', reason: 'HTTP cookie and session lifecycle.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'frontend/src/components/tabs/TabTransaksi.tsx#paymentUrlRender',
      boundary: 'frontend/src/hooks/useAuth.ts#browserTokenAndHref',
      subsystem: 'frontend',
      attack_class: 'CLIENT-SIDE.md#DOM and object-state attack classes'
    },
    surface: 'Tenant & Admin React SPAs (paymentUrl anchor href and localStorage session storage)',
    boundary: 'Unsanitized external paymentUrl rendered into <a href> and bearer tokens in localStorage',
    subsystem: 'frontend',
    attack_class: 'DOM and object-state attack classes',
    starting_paths: ['frontend/src/components/tabs/TabTransaksi.tsx', 'frontend/src/hooks/useAuth.ts', 'frontend/src/main.tsx', 'admin-frontend/src/utils/adminAuth.ts', 'admin-frontend/src/App.tsx'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Injection',
    selected_companion_blocks: [
      'CLIENT-SIDE.md#Core discipline',
      'CLIENT-SIDE.md#DOM and object-state attack classes',
      'CLIENT-SIDE.md#Service-worker and browser-storage attack classes',
      'CLIENT-SIDE.md#Universal moves',
      'CLIENT-SIDE.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLIENT-SIDE.md#Cross-origin messaging and network attack classes', reason: 'No window.postMessage handlers found in frontend or admin-frontend.' }
    ]
  },
  {
    canonical_refs: {
      surface: 'deploy-vps.sh#productionIngressAndPermissions',
      boundary: 'backend/app.ts#corsAndVpsDeployment',
      subsystem: 'root',
      attack_class: 'CLOUD-AND-DEPLOYMENT.md#Configuration and secret lifecycle attack classes'
    },
    surface: 'CORS configuration, VPS deployment permissions, firewall rules, and HTTP-only Nginx config',
    boundary: 'deploy-vps.sh host permissions (chmod 755), exposed port 5000, HTTP port 80, and wildcard cors()',
    subsystem: 'root',
    attack_class: 'Configuration and secret lifecycle attack classes',
    starting_paths: ['deploy-vps.sh', 'backend/app.ts', 'server.ts', 'ecosystem.config.cjs'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Obvious things',
    selected_companion_blocks: [
      'CLOUD-AND-DEPLOYMENT.md#Core discipline',
      'CLOUD-AND-DEPLOYMENT.md#Ingress, network, and control-plane attack classes',
      'CLOUD-AND-DEPLOYMENT.md#Configuration and secret lifecycle attack classes',
      'CLOUD-AND-DEPLOYMENT.md#Universal moves',
      'CLOUD-AND-DEPLOYMENT.md#Validation rules'
    ],
    excluded_blocks: [
      { block: 'CLOUD-AND-DEPLOYMENT.md#Container and orchestration attack classes', reason: 'PM2 + systemd bare VPS deployment; no Kubernetes/Docker manifests in repo.' }
    ]
  }
];

const ledger = rawUnits.map((u) => ({
  coverage_id: validator.canonicalCoverageId(u.canonical_refs),
  ...u,
  prior_status: 'none',
  attempts: [],
  wave: 1,
  status: 'planned',
  agent_id: null,
  reviewed_paths: [],
  local_checks: [],
  result_fingerprints: [],
  unresolved: []
}));

ledger.sort((a, b) => (a.coverage_id < b.coverage_id ? -1 : a.coverage_id > b.coverage_id ? 1 : 0));

fs.writeFileSync(path.join(OUT_DIR, 'coverage-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
console.log('Generated Phase 1 files. Ledger units:', ledger.length);
