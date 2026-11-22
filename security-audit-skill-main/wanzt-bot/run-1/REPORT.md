# Security Audit Report: Wanzt Bot Multi-Tenant Store & Master Admin

## 1. Run Profile, Scope, and Execution Boundary

- **Run ID**: `wanzt-bot-run-1`
- **Target Repository**: `/app/applet` (read-only during audit; zero repository files created or modified)
- **Source Reference**: `unversioned-working-tree (NO_GIT)`
- **Profile & Budget**: `standard` profile, `budget: null` (unrestricted coverage across all in-scope components)
- **Execution Policy**: `sandboxed-source-and-local-only` - source inspection and bounded local execution inside `unshare -r -n -m` with read-only `/tmp/sbox_ro`, isolated scratch directory, empty `env -i`, `ulimit -t 25`, `timeout 30s`, and loopback-only dummy HTTP listeners. Zero external hosts, production endpoints, WhatsApp/Telegram APIs, or live VPS hosts were contacted.
- **Execution Mode**: `single-agent-sequential-emulation` (Platform runtime executes within a single coding agent without nested sub-agent spawning; strict phase separation, deterministic ledger tracking, and fresh-eyes verification against raw source + isolated sandbox runs are enforced sequentially.)
- **Scope Paths**: `server.ts`, `package.json`, `ecosystem.config.cjs`, `deploy-vps.sh`, `backend/`, `admin-backend/`, `frontend/src/`, `admin-frontend/`
- **Prior Runs Used**: None (`prior_run_paths: []`)
- **Out-of-Scope / Deferred Surfaces**: `node_modules`, build artifacts (`dist/`), live production VPS host config/UFW/Certbot state, external third-party APIs (`xavierastore.com`, `lunasqris.com`, WhatsApp/Telegram servers), and documentation/planning files (`brain/`, `SCHEDULE.md`).

## 2. Security Posture Summary

Across 22 evaluated coverage units, this audit identified **17 confirmed vulnerabilities** (**5 Critical, 4 High, 5 Medium, 3 Low**), **1 unresolved deployment lead** (`needs_validation`, no severity assigned), **1 refuted claim** (`rejected`), and **4 verified mitigated controls**.

The primary systemic exposure is a **missing authentication and broken tenant-isolation boundary across the tenant backend**: nearly all tenant operational routers (`/api/bot/*`, `/api/bot/telegram/*`, `/api/pricing/*`, `/api/promos/*`, `/api/transactions/*`, `/api/media/*`, `/api/xaviera/*`, `/api/lunasqris/*`, `/api/bot/redeem-token`, and `/api/auth/store-setup` + `/profile/update-username`) lack authentication middleware, while `backend/app.ts` allows an untrusted `X-Tenant-Id` header to overwrite a valid Bearer token and creates arbitrary SQLite tenant databases via query parameters. Secondary high-severity risks include fail-open payment webhook verification without replay or amount validation, client-supplied pricing inside WhatsApp `order_var:` button IDs, SSRF with API key exfiltration via unvalidated `baseUrl` parameters, static-salt 1,000-iteration PBKDF2 with hardcoded default credentials, and spoofable `X-Forwarded-For` brute-force lockouts.

## 3. Confirmed Findings Summary Table

| Severity | Fingerprint | Title | Affected Boundary | One-Line Observed Result |
|---|---|---|---|---|
| **CRITICAL** | `auth.unauthenticated-bot-control-and-key-leak` | Unauthenticated Bot Control, Config Tampering, and API Key Disclosure (/api/bot/*) | Direct Express router exposure without session middleware (Tenant bot control and configuration API (/api/bot/status, /start, /stop, /reset, /save-config, /groups/*)) | Sandbox CHK_01 leaked xavieraApiKey="DUMMY_XAVIERA_VICTIM_SECRET" and lunasQrisApiKey="DUMMY_LUNAS_VICTIM_SECRET" to an unauthenticated GET /api/bot/status r... |
| **CRITICAL** | `auth.unauthenticated-tenant-operational-apis` | Missing Authentication Across Operational Tenant APIs (/api/pricing, /promos, /transactions, /media, /redeem-token) | Router access without authentication plus req.body.tenantId fallback on voucher redemption (Tenant pricing, promo, transaction, voucher redeem, media, and template routes) | Sandbox CHK_01 mutated victim tenant pricing markup unauthenticated (success=true, value=1). |
| **CRITICAL** | `authz.tenant-middleware-override-and-unbounded-db` | Cross-Tenant Session Override via X-Tenant-Id / Query Params and Unbounded Tenant DB Creation | Header/query/cookie tenant selector vs. authenticated session and per-tenant SQLite files (Tenant identification middleware across /api/*) | Sandbox CHK_01 resolved attacker Bearer token to victim tenant "t_dummyvictimstore_6364", returned accountStatus="active" for nonexistent tenant, and created... |
| **CRITICAL** | `crypto.weak-kdf-static-salt-and-default-creds` | Weak Static-Salt 1000-Iteration PBKDF2, Default Seeded Credentials, Non-Constant-Time Hash Compare, and Math.random() Secrets | PBKDF2 parameters, hardcoded defaults, === hash compare, and Math.random() token generators (Password hashing, seeded default accounts, constant-time checks, and token/password PRNG) | Sandbox CHK_09 confirmed defaultSuperAdminSeeded=true, staticSaltIdenticalHash=true, defaultAdminLoginSucceeded=true, and generatedPasswordSample="pass_wq689z". |
| **CRITICAL** | `webhook.lunasqris-failopen-replay-and-amount-bypass` | LunasQRIS Webhook Fail-Open When Secret Empty, Missing Replay Window, and Missing Amount Verification | Optional HMAC-SHA256 verification and transaction status mutation (LunasQRIS payment callback webhook (POST /api/lunasqris/webhook)) | Sandbox CHK_04 returned HTTP 200 and marked ORD-WH-OPEN "paid"; for ORD-WH-REPLAY with stale timestamp 1000000000 and amount=1, returned HTTP 200 and marked ... |
| **HIGH** | `auth.unauthenticated-telegram-config-leak-and-write` | Unauthenticated Telegram Bot Token Disclosure and Overwrite (/api/bot/telegram/*) | Unauthenticated router reading/writing telegram_config table with plaintext botToken/chatId (Tenant Telegram configuration and test endpoints (/api/bot/telegram/config, /test)) | Sandbox CHK_02 returned HTTP 200 with plaintext botToken="123456:DUMMY_TG_TOKEN" and chatId="999888777". |
| **HIGH** | `auth.unauthenticated-tenant-username-and-store-takeover` | Unauthenticated Tenant Username Hijack and Store Info Overwrite via Fallback Context | getAuthSessionFromReq Bearer verification vs. unauthenticated tenantId fallback (Tenant auth profile and store-setup endpoints (/api/auth/store-setup, /profile/update-username, /profile/update-password)) | Sandbox CHK_02 succeeded unauthenticated: update-username returned success=true (username="hijacked_victim_99"), and store-setup returned success=true (store... |
| **HIGH** | `logic.whatsapp-order-var-price-tampering` | Client-Controlled Price Tampering via WhatsApp order_var Interactive Button ID | Untrusted incoming WA button/message ID payload vs. server-side product pricing catalog (WhatsApp interactive order button parsing and LunasQRIS invoice creation) | Sandbox CHK_05 recorded sessionPriceParsedFromButton=1 and invoiceAmountSentToGateway=1 (Order ORD-MWHNNKBV-1TVT). |
| **HIGH** | `ssrf.payment-and-supplier-proxy-key-exfil` | Server-Side Request Forgery (SSRF) and Merchant API Key Exfiltration in LunasQRIS & Xaviera Proxies | Server-side fetch with stored merchant Bearer/X-API-Key headers to caller-configurable baseUrl (Outbound HTTP proxy routes for LunasQRIS and Xaviera (/api/lunasqris/*, /api/xaviera/*)) | Sandbox CHK_07 captured outbound GET /api/v1/balance with X-API-Key="DUMMY_MERCHANT_SECRET" and GET /me with Authorization="Bearer DUMMY_XAVIERA_VICTIM_SECRET". |
| **MEDIUM** | `auth.apartment-unauthenticated-read-endpoints` | Unauthenticated Read Endpoints on Legacy /api/apartment/* Router | requireMasterAdminAuth applied on mutating methods vs. omitted on GET /stats, /tenants, /current-lease, /tenants/:id (Legacy apartment management endpoints (/api/apartment/*)) | Sandbox CHK_03 returned HTTP 200 (success=true) on /stats, HTTP 200 (tenantsCount=1) on /tenants, and HTTP 200 on /current-lease. |
| **MEDIUM** | `auth.xff-spoof-admin-lockout-bypass` | Master Admin Brute-Force Lockout Bypass via X-Forwarded-For Spoofing | normalizeClientIp trusting leftmost X-Forwarded-For vs. IP lockout table admin_login_attempts (Master Admin login brute-force lockout (POST /api/admin/auth/login)) | Sandbox CHK_06 recorded statuses [401,401,401,401,429,429] for 198.51.100.1, then HTTP 401 immediately on rotation to 198.51.100.2. |
| **MEDIUM** | `config.wildcard-cors-and-vps-script-exposure` | Wildcard CORS Policy and Overly Permissive VPS Deployment Script Configuration | deploy-vps.sh host permissions (chmod 755), exposed port 5000, HTTP port 80, and wildcard cors() (CORS configuration, VPS deployment permissions, firewall rules, and HTTP-only Nginx config) | Sandbox CHK_10 confirmed Access-Control-Allow-Origin: "*" for Origin: https://untrusted.example; deploy-vps.sh lines 100-101 and 160 apply world-readable 755... |
| **MEDIUM** | `race.promo-quota-toctou-oversubscription` | Promo Code Quota Check-Then-Act Race Allows Quota Oversubscription | Pre-checkout quota check vs. asynchronous post-payment SQLite increment (Promo code quota validation and post-payment counter increment) | Sandbox CHK_08 confirmed both validations returned isValid=true/true for configuredQuota=1, leaving finalUsedCount=2. |
| **MEDIUM** | `session.no-revocation-on-pw-change-and-weak-cookies` | Tenant Sessions Not Revoked on Password Change and Auth Cookies Lack HttpOnly/SameSite/Secure | activeSessions invalidation and res.cookie flags (httpOnly, sameSite, secure) (Tenant session revocation on password change/suspension and auth cookie attributes) | Sandbox CHK_09 confirmed oldTenantSessionStillValidAfterPwChange=true and Set-Cookie=["tenant_id=t_wanzt; Max-Age=604800; Path=/; Expires=Sun, 22 Nov 2026 09... |
| **LOW** | `injection.telegram-html-markup-interpolation` | Unescaped HTML Markup Injection in Telegram Notification Payloads | Tenant/order field interpolation into Telegram Bot API parse_mode=HTML strings (Telegram Bot HTML message formatting for notifications and test/admin messages) | Sandbox CHK_10 captured parse_mode="HTML" and confirmed telegramContainsRawAnchorTag=true. |
| **LOW** | `ratelimit.xff-spoof-partner-api-bypass` | Partner API Invalid-Key Rate Limiter Bypass via X-Forwarded-For Spoofing | SHA-256 partner key verification vs. IP-based invalid-attempt rate limiter (Public Partner REST API (/api/v1/partner/tenants/create, /tokens/create)) | Sandbox CHK_06 received HTTP 429 on request 61 from 198.51.100.50, and immediate HTTP 401 (INVALID_API_KEY) when rotating X-Forwarded-For to 198.51.100.51. |
| **LOW** | `session.impersonation-not-revoked-and-url-token` | Impersonation Tokens Survive Master Admin Logout/Password Change and Are Exposed in URLs | In-memory impersonationTokens lifecycle vs. admin logout, password change, and URL query transport (Master Admin tenant impersonation token generation, consumption, and revocation) | Sandbox CHK_09 confirmed impersonationTokenValidAfterAdminLogout=true after Master Admin logout. |

## 4. Confirmed Findings

### 1. [CRITICAL] Unauthenticated Bot Control, Config Tampering, and API Key Disclosure (/api/bot/*) (`auth.unauthenticated-bot-control-and-key-leak`)

- **Repository Source Locations**: `backend/app.ts:126, backend/routes/botRoutes.ts:12, backend/botManager.ts:129, backend/routes/botRoutes.ts:11, backend/routes/botRoutes.ts:118`
- **Lower-Trust Principal**: Unauthenticated remote HTTP client targeting a known or guessed tenantId.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/bot/status?tenant=<victimTenantId>`; `POST /api/bot/save-config?tenant=<victimTenantId> with custom gateway keys/URLs`. Steps: Create a dummy victim tenant with dummy xavieraApiKey and lunasQrisApiKey values. Issue an unauthenticated GET /api/bot/status?tenant=<victimTenantId> request in the sandbox. Verify that plaintext API keys are returned in the JSON response.
- **Conditions**: authentication_level: No authentication required; target tenant selected via ?tenant= or X-Tenant-Id.
- **Actual Observed Result**: Sandbox CHK_01 leaked xavieraApiKey="DUMMY_XAVIERA_VICTIM_SECRET" and lunasQrisApiKey="DUMMY_LUNAS_VICTIM_SECRET" to an unauthenticated GET /api/bot/status request.
- **Impact & Priority Rationale**: Impact **critical** (Discloses payment and supplier API keys and allows full control of tenant bot behavior and connectivity.); Likelihood **high** (Zero authentication on publicly mounted Express router.). Overall **CRITICAL**.
- **Smallest Source Fix**: Enforce requireTenantAuth middleware on /api/bot/*, reject tenant overrides via query/header/body, and mask secret keys in GET /api/bot/status responses.

### 2. [CRITICAL] Missing Authentication Across Operational Tenant APIs (/api/pricing, /promos, /transactions, /media, /redeem-token) (`auth.unauthenticated-tenant-operational-apis`)

- **Repository Source Locations**: `backend/app.ts:130, backend/routes/tenantTokenRoutes.ts:10, backend/routes/pricingRoutes.ts:52, backend/routes/pricingRoutes.ts:39, backend/routes/promoRoutes.ts:47, backend/routes/transactionRoutes.ts:14, backend/routes/mediaRoutes.ts:23, backend/routes/tenantTokenRoutes.ts:7`
- **Lower-Trust Principal**: Unauthenticated HTTP client targeting any tenant.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/pricing?tenant=<victimTenantId> {"mode":"rp","value":1}`. Steps: Send unauthenticated POST /api/pricing?tenant=<victimTenantId> with mode "rp" and value 1. Verify HTTP 200 response and updated markup value in sandbox.
- **Conditions**: authentication_level: No authentication token required on any listed route.
- **Actual Observed Result**: Sandbox CHK_01 mutated victim tenant pricing markup unauthenticated (success=true, value=1).
- **Impact & Priority Rationale**: Impact **critical** (Allows anonymous tampering with product selling prices, promo codes, transaction history, and tenant media.); Likelihood **high** (Directly accessible over HTTP with zero credentials.). Overall **CRITICAL**.
- **Smallest Source Fix**: Enforce requireTenantAuth on pricingRouter, promoRouter, transactionRouter, mediaRouter, tenantTemplateRouter, and tenantTokenRouter, and derive tenantId exclusively from verified session state.

### 3. [CRITICAL] Cross-Tenant Session Override via X-Tenant-Id / Query Params and Unbounded Tenant DB Creation (`authz.tenant-middleware-override-and-unbounded-db`)

- **Repository Source Locations**: `backend/app.ts:57, backend/app.ts:94, backend/database/tenantDbManager.ts:477, backend/app.ts:110, admin-backend/services/tenantStatusService.ts:84`
- **Lower-Trust Principal**: Authenticated tenant user (attacker_user_01) or unauthenticated client sending arbitrary tenant identifiers.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/bot/status with Authorization: Bearer <attackerToken> and X-Tenant-Id: <victimTenantId>`; `GET /api/bot/status?tenant=ghost_unlisted_tenant_999`. Steps: Authenticate as dummy attacker tenant and send GET /api/bot/status with X-Tenant-Id set to dummy victim tenant. Send GET /api/bot/status?tenant=ghost_unlisted_tenant_999 and check accountStatus and database/tenants/ directory.
- **Conditions**: authentication_level: Any unauthenticated client or authenticated tenant user supplying X-Tenant-Id or ?tenant=.
- **Actual Observed Result**: Sandbox CHK_01 resolved attacker Bearer token to victim tenant "t_dummyvictimstore_6364", returned accountStatus="active" for nonexistent tenant, and created database/tenants/ghost_unlisted_tenant_999.db on disk (ghostTenantDbCreatedOnDisk=true).
- **Impact & Priority Rationale**: Impact **critical** (Breaks multi-tenant isolation completely and enables unbounded SQLite file/handle exhaustion on disk.); Likelihood **high** (Trivial via single header or query parameter on every request.). Overall **CRITICAL**.
- **Smallest Source Fix**: Derive tenantId exclusively from verified session tokens (or signed/lookup webhook/bot contexts), validate tenant existence in master.db before initTenantDb(), and fail closed when a tenant record does not exist.

### 4. [CRITICAL] Weak Static-Salt 1000-Iteration PBKDF2, Default Seeded Credentials, Non-Constant-Time Hash Compare, and Math.random() Secrets (`crypto.weak-kdf-static-salt-and-default-creds`)

- **Repository Source Locations**: `admin-backend/database/masterSqlite.ts:246, admin-backend/database/masterSqlite.ts:11, backend/services/authManager.ts:117, admin-backend/database/masterSqlite.ts:12, backend/services/authManager.ts:48, admin-backend/services/tokenService.ts:25, admin-backend/utils/generatorUtils.ts:22`
- **Lower-Trust Principal**: Unauthenticated attacker testing seeded credentials or offline/timing cracker with DB read access.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/auth/login with seeded default admin credentials`; `masterSqlite.hashPassword() identical output across invocations`. Steps: Initialize master.db and tenant DB in isolated scratch workdir. Attempt login with seeded default admin credentials and verify identical hash output from masterSqlite.hashPassword().
- **Conditions**: system_configuration: Active immediately upon database initialization in any unconfigured deployment.
- **Actual Observed Result**: Sandbox CHK_09 confirmed defaultSuperAdminSeeded=true, staticSaltIdenticalHash=true, defaultAdminLoginSucceeded=true, and generatedPasswordSample="pass_wq689z".
- **Impact & Priority Rationale**: Impact **critical** (Allows immediate unauthorized Super Admin or tenant dashboard login when defaults remain unchanged, and permits rapid offline/rainbow cracking of master.db hashes.); Likelihood **high** (Default credentials are hardcoded in repository source and automatically provisioned on boot.). Overall **CRITICAL**.
- **Smallest Source Fix**: Generate per-account random 16-byte salts with scrypt/Argon2id (or >= 600k PBKDF2-SHA256 iterations), require env-provided bootstrap credentials or one-time setup token, compare hashes using crypto.timingSafeEqual, and replace Math.random() with crypto.randomInt().

### 5. [CRITICAL] LunasQRIS Webhook Fail-Open When Secret Empty, Missing Replay Window, and Missing Amount Verification (`webhook.lunasqris-failopen-replay-and-amount-bypass`)

- **Repository Source Locations**: `backend/routes/lunasQrisRoutes.ts:40, backend/routes/lunasQrisRoutes.ts:49, backend/routes/lunasQrisRoutes.ts:70, backend/routes/lunasqrisRoutes.ts:49, backend/services/lunasQrisService.ts:292, backend/routes/lunasqrisRoutes.ts:70`
- **Lower-Trust Principal**: Remote unauthenticated HTTP caller sending forged or replayed callback payloads.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/lunasqris/webhook?tenant=<victimTenantId> {"event":"transaction.paid","data":{"order_id":"ORD-WH-OPEN","status":"paid"}}`; `POST /api/lunasqris/webhook with X-Callback-Timestamp: 1000000000 and amount: 1 for a 100000 order`. Steps: Seed two pending dummy transactions (ORD-WH-OPEN with empty secretKey, ORD-WH-REPLAY with secretKey configured). Send unsigned callback for ORD-WH-OPEN and stale-timestamp/amount=1 HMAC-signed callback for ORD-WH-REPLAY.
- **Conditions**: system_configuration: Any unconfigured lunasQrisSecretKey enables immediate unsigned spoofing; configured keys remain vulnerable to stale replay or mismatched amounts.
- **Actual Observed Result**: Sandbox CHK_04 returned HTTP 200 and marked ORD-WH-OPEN "paid"; for ORD-WH-REPLAY with stale timestamp 1000000000 and amount=1, returned HTTP 200 and marked order "paid".
- **Impact & Priority Rationale**: Impact **critical** (Enables marking unpaid or underpaid orders as paid without transferring funds.); Likelihood **high** (Any tenant without lunasQrisSecretKey allows unsigned payment spoofing via a single POST request.). Overall **CRITICAL**.
- **Smallest Source Fix**: Fail closed (return 401/503) if lunasQrisSecretKey is empty, enforce timestamp age <= 300 seconds in verifyLunasQrisSignature, enforce pending-only transitions, and verify paid amount matches stored order total.

### 6. [HIGH] Unauthenticated Telegram Bot Token Disclosure and Overwrite (/api/bot/telegram/*) (`auth.unauthenticated-telegram-config-leak-and-write`)

- **Repository Source Locations**: `backend/app.ts:129, backend/routes/telegramRoutes.ts:15, backend/services/telegramService.ts:39, backend/routes/telegramRoutes.ts:13, backend/routes/telegramRoutes.ts:27, backend/routes/telegramRoutes.ts:49`
- **Lower-Trust Principal**: Unauthenticated remote HTTP client.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/bot/telegram/config?tenant=<victimTenantId>`; `POST /api/bot/telegram/config?tenant=<victimTenantId>`. Steps: Seed a dummy victim tenant Telegram botToken and chatId. Issue an unauthenticated GET /api/bot/telegram/config?tenant=<victimTenantId>.
- **Conditions**: authentication_level: No credentials required; caller passes ?tenant= or X-Tenant-Id.
- **Actual Observed Result**: Sandbox CHK_02 returned HTTP 200 with plaintext botToken="123456:DUMMY_TG_TOKEN" and chatId="999888777".
- **Impact & Priority Rationale**: Impact **high** (Exposes Telegram Bot API credentials and permits silent redirection of sale notifications.); Likelihood **high** (Endpoint is publicly accessible without authentication.). Overall **HIGH**.
- **Smallest Source Fix**: Protect telegramRouter with requireTenantAuth and mask botToken on GET responses (e.g., return hasBotToken boolean and masked preview only).

### 7. [HIGH] Unauthenticated Tenant Username Hijack and Store Info Overwrite via Fallback Context (`auth.unauthenticated-tenant-username-and-store-takeover`)

- **Repository Source Locations**: `backend/routes/authRoutes.ts:179, backend/routes/authRoutes.ts:169, backend/services/authManager.ts:268, backend/routes/authRoutes.ts:110`
- **Lower-Trust Principal**: Unauthenticated remote caller sending forged X-Tenant-Id header.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/auth/profile/update-username with X-Tenant-Id: <victimTenantId> and {"newUsername":"hijacked_victim_99"}`; `POST /api/auth/store-setup with X-Tenant-Id: <victimTenantId>`. Steps: Send unauthenticated POST /api/auth/profile/update-username with X-Tenant-Id pointing to dummy victim tenant. Send unauthenticated POST /api/auth/store-setup with X-Tenant-Id pointing to dummy victim tenant.
- **Conditions**: authentication_level: Unauthenticated HTTP caller knowing or guessing a tenantId (or targeting default t_wanzt).
- **Actual Observed Result**: Sandbox CHK_02 succeeded unauthenticated: update-username returned success=true (username="hijacked_victim_99"), and store-setup returned success=true (storeName="Overwritten Store").
- **Impact & Priority Rationale**: Impact **high** (Locks tenant owners out of their login username and overwrites store contact/owner information.); Likelihood **high** (Directly exploitable unauthenticated with a single HTTP request.). Overall **HIGH**.
- **Smallest Source Fix**: Remove lines 168-173 fallback from getAuthSessionFromReq so unauthenticated requests return null (401), and enforce authentication on /api/auth/store-setup and /api/auth/store-status.

### 8. [HIGH] Client-Controlled Price Tampering via WhatsApp order_var Interactive Button ID (`logic.whatsapp-order-var-price-tampering`)

- **Repository Source Locations**: `backend/handlers/messageDispatcher.ts:576, backend/handlers/messageDispatcher.ts:643, backend/handlers/messageDispatcher.ts:143, backend/messages/carouselMessage.ts:150, backend/handlers/messageDispatcher.ts:583, backend/handlers/messageDispatcher.ts:146`
- **Lower-Trust Principal**: Malicious WhatsApp buyer crafting a modified interactive button response ID.
- **Target-Native Bounded Reproduction**: Payloads: `buttonsResponseMessage.selectedButtonId = "order_var:Netflix%20Premium|1%20Bulan%20Private|1"`; `buttonsResponseMessage.selectedButtonId = "checkout_direct"`. Steps: Invoke dispatchIncomingMessages() in the sandbox with a dummy buyer message containing order_var:Netflix%20Premium|1%20Bulan%20Private|1. Follow up with checkout_direct and inspect the request body sent to the loopback LunasQRIS server.
- **Conditions**: authentication_level: Any WhatsApp buyer able to send a custom buttonsResponseMessage or interactiveResponseMessage payload.
- **Actual Observed Result**: Sandbox CHK_05 recorded sessionPriceParsedFromButton=1 and invoiceAmountSentToGateway=1 (Order ORD-MWHNNKBV-1TVT).
- **Impact & Priority Rationale**: Impact **critical** (Allows purchasing any catalog item at an attacker-chosen price as low as Rp 1.); Likelihood **medium** (Requires crafting a WhatsApp protobuf interactive response via modified client or Baileys.). Overall **HIGH**.
- **Smallest Source Fix**: Look up authoritative base cost from getProductVariants(productName, config) and compute sellingPrice via calculateSellingPriceForVariant() on the server inside order_var handling; reject unknown products/variants.

### 9. [HIGH] Server-Side Request Forgery (SSRF) and Merchant API Key Exfiltration in LunasQRIS & Xaviera Proxies (`ssrf.payment-and-supplier-proxy-key-exfil`)

- **Repository Source Locations**: `backend/routes/lunasQrisRoutes.ts:16, backend/services/lunasQrisService.ts:66, backend/services/lunasQrisService.ts:73, backend/routes/xavieraRoutes.ts:20`
- **Lower-Trust Principal**: Remote unauthenticated caller directing outbound server HTTP requests to internal services or a collector.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/lunasqris/balance?apikey=DUMMY_MERCHANT_SECRET&baseurl=http://127.0.0.1:<loopbackPort>`; `GET /api/xaviera/profile?tenant=<victimTenantId> after xavieraBaseUrl=http://127.0.0.1:<loopbackPort>`. Steps: Start an isolated loopback HTTP listener inside the sandbox. Call GET /api/lunasqris/balance?baseurl=http://127.0.0.1:<port> and GET /api/xaviera/profile?tenant=<victimTenantId>. Inspect requests received by the loopback listener.
- **Conditions**: authentication_level: Unauthenticated HTTP caller passing baseurl query/body param or updating xavieraBaseUrl via /api/bot/save-config.
- **Actual Observed Result**: Sandbox CHK_07 captured outbound GET /api/v1/balance with X-API-Key="DUMMY_MERCHANT_SECRET" and GET /me with Authorization="Bearer DUMMY_XAVIERA_VICTIM_SECRET".
- **Impact & Priority Rationale**: Impact **high** (Enables internal network/loopback probing (SSRF) and exfiltration of tenant LunasQRIS and Xaviera API keys.); Likelihood **high** (Directly triggerable via unauthenticated GET/POST query/body parameters.). Overall **HIGH**.
- **Smallest Source Fix**: Remove per-request baseurl overrides, enforce HTTPS-only public host validation (rejecting 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, and IPv6 local ranges after DNS resolution, with redirect: "error"), and require tenant auth.

### 10. [MEDIUM] Unauthenticated Read Endpoints on Legacy /api/apartment/* Router (`auth.apartment-unauthenticated-read-endpoints`)

- **Repository Source Locations**: `backend/app.ts:136, backend/routes/apartmentRoutes.ts:27, backend/routes/apartmentRoutes.ts:123, backend/routes/apartmentRoutes.ts:110, backend/routes/apartmentRoutes.ts:153`
- **Lower-Trust Principal**: Unauthenticated HTTP client requesting legacy apartment management endpoints.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/apartment/stats`; `GET /api/apartment/tenants`; `GET /api/apartment/current-lease`. Steps: Start serverApp inside the isolated sandbox with scratch SQLite databases. Send unauthenticated GET requests to /api/apartment/stats, /api/apartment/tenants, and /api/apartment/current-lease. Inspect HTTP status codes and JSON payload fields.
- **Conditions**: authentication_level: None required for GET /stats, /tenants, /current-lease, and /tenants/:id.
- **Actual Observed Result**: Sandbox CHK_03 returned HTTP 200 (success=true) on /stats, HTTP 200 (tenantsCount=1) on /tenants, and HTTP 200 on /current-lease.
- **Impact & Priority Rationale**: Impact **medium** (Exposes legacy apartment tenant records, counts, and lease expiry dates.); Likelihood **high** (Directly reachable over HTTP without credentials.). Overall **MEDIUM**.
- **Smallest Source Fix**: Decommission legacy /api/apartment/* routes or enforce requireMasterAdminAuth across all read and write handlers, and remove req.query.token fallback.

### 11. [MEDIUM] Master Admin Brute-Force Lockout Bypass via X-Forwarded-For Spoofing (`auth.xff-spoof-admin-lockout-bypass`)

- **Repository Source Locations**: `admin-backend/routes/authAdminRoutes.ts:10, admin-backend/utils/adminSecurityUtils.ts:127, admin-backend/services/adminAuthService.ts:66, admin-backend/utils/adminSecurityUtils.ts:123, admin-backend/services/adminAuthService.ts:101, deploy-vps.sh:133`
- **Lower-Trust Principal**: Remote unauthenticated client testing Master Admin credentials.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/admin/auth/login with rotating X-Forwarded-For header values per batch of 4 attempts`. Steps: Send 6 failed POST /api/admin/auth/login attempts with X-Forwarded-For: 198.51.100.1 to observe lockout (HTTP 429). Send a subsequent attempt with X-Forwarded-For: 198.51.100.2.
- **Conditions**: network_routing: Client sends arbitrary X-Forwarded-For header (direct or through Nginx $proxy_add_x_forwarded_for).
- **Actual Observed Result**: Sandbox CHK_06 recorded statuses [401,401,401,401,429,429] for 198.51.100.1, then HTTP 401 immediately on rotation to 198.51.100.2.
- **Impact & Priority Rationale**: Impact **medium** (Neutralizes IP-based brute-force lockout protection on Master Admin login.); Likelihood **high** (Trivial single-header bypass requiring no authentication.). Overall **MEDIUM**.
- **Smallest Source Fix**: Configure app.set("trust proxy", 1) behind a single local reverse proxy, use req.ip (never parse leftmost X-Forwarded-For directly), and add per-username failed-attempt lockout.

### 12. [MEDIUM] Wildcard CORS Policy and Overly Permissive VPS Deployment Script Configuration (`config.wildcard-cors-and-vps-script-exposure`)

- **Repository Source Locations**: `backend/app.ts:41, deploy-vps.sh:101, deploy-vps.sh:100, deploy-vps.sh:160`
- **Lower-Trust Principal**: Untrusted third-party web origin or unprivileged local VPS user.
- **Target-Native Bounded Reproduction**: Payloads: `GET /api/health with Origin: https://untrusted.example`. Steps: Send GET /api/health with Origin: https://untrusted.example to the sandbox Express app. Inspect the Access-Control-Allow-Origin response header and verify deploy-vps.sh permission commands.
- **Conditions**: system_configuration: Wildcard CORS is active in all server builds; deployment script flaws affect VPS hosts provisioned with deploy-vps.sh.
- **Actual Observed Result**: Sandbox CHK_10 confirmed Access-Control-Allow-Origin: "*" for Origin: https://untrusted.example; deploy-vps.sh lines 100-101 and 160 apply world-readable 755 permissions and UFW allow 5000/tcp.
- **Impact & Priority Rationale**: Impact **medium** (Permits any malicious webpage to exfiltrate unauthenticated API responses from a victim browser or local network.); Likelihood **high** (Wildcard CORS is enabled unconditionally on all endpoints.). Overall **MEDIUM**.
- **Smallest Source Fix**: Configure cors({ origin: allowedOrigins }) via environment configuration, restrict database/ and auth_info_baileys/ permissions to 700/600 under a dedicated non-root user, and remove ufw allow 5000/tcp while binding Node to 127.0.0.1.

### 13. [MEDIUM] Promo Code Quota Check-Then-Act Race Allows Quota Oversubscription (`race.promo-quota-toctou-oversubscription`)

- **Repository Source Locations**: `backend/handlers/messageDispatcher.ts:1138, backend/database/sqlite.ts:1151, backend/handlers/messageDispatcher.ts:215`
- **Lower-Trust Principal**: Concurrent WhatsApp buyers or parallel sessions redeeming a quota=1 promo code.
- **Target-Native Bounded Reproduction**: Payloads: `Two concurrent validateAndApplyPromo({ code: "RACEONE" }) calls against quota=1`. Steps: Create dummy promo code RACEONE with quota = 1 in sandbox SQLite DB. Invoke validateAndApplyPromo() twice before payment completes and run the post-payment increment.
- **Conditions**: timing_dependency: Two or more buyers apply the same promo code before the first order completes payment.
- **Actual Observed Result**: Sandbox CHK_08 confirmed both validations returned isValid=true/true for configuredQuota=1, leaving finalUsedCount=2.
- **Impact & Priority Rationale**: Impact **medium** (Allows coupon discount budget to be exceeded beyond configured quota.); Likelihood **medium** (Occurs naturally whenever concurrent buyers check out with a limited-quota promo.). Overall **MEDIUM**.
- **Smallest Source Fix**: Atomically reserve promo usage inside a SQLite transaction at invoice creation using a conditional UPDATE (WHERE quota IS NULL OR used_count < quota) checking changes === 1, and decrement on invoice expiry/cancellation.

### 14. [MEDIUM] Tenant Sessions Not Revoked on Password Change and Auth Cookies Lack HttpOnly/SameSite/Secure (`session.no-revocation-on-pw-change-and-weak-cookies`)

- **Repository Source Locations**: `backend/routes/authRoutes.ts:39, backend/services/authManager.ts:373, backend/services/authManager.ts:183, backend/services/authManager.ts:397`
- **Lower-Trust Principal**: Holder of a previously captured tenant session token or script reading document.cookie.
- **Target-Native Bounded Reproduction**: Payloads: `POST /api/auth/login -> Set-Cookie headers`; `updateTenantPassword() followed by getSession(oldToken)`. Steps: Create a dummy victim session, invoke updateTenantPassword() with valid old and new passwords, and query getSession(oldToken). Issue POST /api/auth/login and inspect Set-Cookie response headers.
- **Conditions**: authentication_level: Prior session token remains valid across password change; cookies exposed to JS via httpOnly: false.
- **Actual Observed Result**: Sandbox CHK_09 confirmed oldTenantSessionStillValidAfterPwChange=true and Set-Cookie=["tenant_id=t_wanzt; Max-Age=604800; Path=/; Expires=Sun, 22 Nov 2026 09:51:41 GMT","auth_token=3e66c8b4552d0a36e1d57ce9cb9ffc575aa404cb0d3f0ba374102ce49e4d3ebc; Max-Age=604800; Path=/; Expires=Sun, 22 Nov 2026 09:51:41 GMT"] (missing HttpOnly, SameSite, Secure).
- **Impact & Priority Rationale**: Impact **medium** (Old compromised tokens remain valid for up to 7 days after password rotation, and cookies are readable by client scripts.); Likelihood **medium** (Applies to every tenant password change and login response.). Overall **MEDIUM**.
- **Smallest Source Fix**: Delete all activeSessions entries matching tenantId upon updateTenantPassword() (and on tenant suspension/expiry), and switch auth cookies to httpOnly: true, sameSite: "lax", secure: isHttps.

### 15. [LOW] Unescaped HTML Markup Injection in Telegram Notification Payloads (`injection.telegram-html-markup-interpolation`)

- **Repository Source Locations**: `backend/services/telegramService.ts:247, backend/services/telegramService.ts:268, backend/services/telegramService.ts:125, backend/services/telegramService.ts:271, backend/services/telegramService.ts:199, backend/services/telegramService.ts:351`
- **Lower-Trust Principal**: Unauthenticated API caller or malicious WhatsApp buyer injecting HTML tags into storeName/productName.
- **Target-Native Bounded Reproduction**: Payloads: `productName = 'Produk <a href="https://example.test">Link</a>'`. Steps: Invoke notifyTransactionPaid() in the sandbox with a fetch interceptor capturing the JSON payload intended for api.telegram.org. Inspect payload.parse_mode and payload.text.
- **Conditions**: user_interaction: Recipient clicks an injected Telegram <a href="..."> link in chat.
- **Actual Observed Result**: Sandbox CHK_10 captured parse_mode="HTML" and confirmed telegramContainsRawAnchorTag=true.
- **Impact & Priority Rationale**: Impact **low** (Permits HTML formatting/phishing link injection inside Telegram messages (Telegram strips scripts).); Likelihood **medium** (Reachable via unauthenticated store-setup/order endpoints or supplier product names.). Overall **LOW**.
- **Smallest Source Fix**: Add an escapeTelegramHtml() utility escaping &, <, and > and apply it to every dynamic variable interpolated into parse_mode: "HTML" messages.

### 16. [LOW] Partner API Invalid-Key Rate Limiter Bypass via X-Forwarded-For Spoofing (`ratelimit.xff-spoof-partner-api-bypass`)

- **Repository Source Locations**: `admin-backend/routes/partnerPublicRoutes.ts:39, admin-backend/routes/partnerPublicRoutes.ts:29, admin-backend/routes/partnerPublicRoutes.ts:66, admin-backend/routes/partnerPublicRoutes.ts:26`
- **Lower-Trust Principal**: Unauthenticated caller sending invalid API keys to /api/v1/partner/*.
- **Target-Native Bounded Reproduction**: Payloads: `61x POST /api/v1/partner/tokens/create with X-Forwarded-For: 198.51.100.50, then 1x with 198.51.100.51`. Steps: Send 61 requests with invalid X-API-Key and X-Forwarded-For: 198.51.100.50 until HTTP 429 is returned. Send the next request with X-Forwarded-For: 198.51.100.51.
- **Conditions**: network_routing: Caller supplies varying X-Forwarded-For headers.
- **Actual Observed Result**: Sandbox CHK_06 received HTTP 429 on request 61 from 198.51.100.50, and immediate HTTP 401 (INVALID_API_KEY) when rotating X-Forwarded-For to 198.51.100.51.
- **Impact & Priority Rationale**: Impact **low** (Defeats IP-based rate limiting on Partner API key verification (though keys are 256-bit SHA-256 hashed).); Likelihood **high** (Trivial header modification on unauthenticated endpoint.). Overall **LOW**.
- **Smallest Source Fix**: Use Express trusted proxy req.ip instead of parsing X-Forwarded-For manually and apply an auxiliary global invalid-key rate limit.

### 17. [LOW] Impersonation Tokens Survive Master Admin Logout/Password Change and Are Exposed in URLs (`session.impersonation-not-revoked-and-url-token`)

- **Repository Source Locations**: `admin-backend/routes/impersonateRoutes.ts:15, admin-backend/services/adminAuthService.ts:201, backend/routes/authRoutes.ts:58, admin-backend/routes/impersonateRoutes.ts:20, frontend/src/hooks/useAuth.ts:16, admin-backend/services/adminAuthService.ts:196`
- **Lower-Trust Principal**: Holder of a leaked impersonation URL/token after Master Admin session termination.
- **Target-Native Bounded Reproduction**: Payloads: `AdminAuthService.logout() after createImpersonationToken()`. Steps: Log in as Master Admin, create an impersonation token for a dummy tenant, then call AdminAuthService.logout(). Verify whether impersonationTokens.has(impToken) remains true.
- **Conditions**: authentication_level: Master Admin creates an impersonation token before logging out or changing password, or URL logs/history are observed.
- **Actual Observed Result**: Sandbox CHK_09 confirmed impersonationTokenValidAfterAdminLogout=true after Master Admin logout.
- **Impact & Priority Rationale**: Impact **medium** (Extends unauthorized tenant dashboard access beyond Master Admin logout or password rotation.); Likelihood **low** (Requires Master Admin impersonation within a 10-minute window plus token leakage or admin compromise.). Overall **LOW**.
- **Smallest Source Fix**: Associate impersonationTokens with creatorAdminId/sessionToken, purge matching entries on logout and password change, make impersonation codes single-use exchange tokens, and avoid long-lived tokens in URL query parameters.

## 5. Needs Validation (Unresolved Deployment Leads)

> Note: Entries below are unresolved verification leads with missing live-environment facts. No severity is assigned and they are not counted as confirmed vulnerabilities.

| Fingerprint | Title | Repository Trace | Exact Blocker | Safe Owner-Observed Deployment Check |
|---|---|---|---|---|
| `deploy.vps-tls-and-port5000-exposure` | Unverified Production VPS HTTPS/TLS Configuration and External Reachability of Backend Port 5000 | `deploy-vps.sh:107` -> `deploy-vps.sh:160` | Live VPS Nginx config (/etc/nginx/sites-enabled/*), Certbot certificate state, UFW rules, and cloud security group rules are outside the local repository and isolated sandbox. | Owner should inspect the live VPS by running "ss -tulnp \| grep 5000", "ufw status verbose", and inspecting /etc/nginx/sites-enabled/bot-whatsapp for TLS server blocks and HTTPS redirects, plus verifying cloud firewall rules block external TCP/5000. |

## 6. Hardening Notes and Positive Source Patterns

### Verified Positive Source Controls (Covered Units)

1. **Master Admin Management Sub-Router Authentication (`admin-backend/routes/adminRoutes.ts:42`)**: All Master Admin management routes (`/api/admin/tenants`, `/tokens`, `/broadcast`, `/partners`, `/impersonate`, `/stats`) sit behind `requireMasterAdminAuth` validating SQLite-persisted `admin_sessions` tokens via `AdminAuthService.validateSession`.
2. **Parameterized SQLite Queries (`backend/database/sqlite.ts`, `admin-backend/database/masterSqlite.ts`)**: User-supplied inputs in tenant and master SQLite queries bind through `?` placeholders via `better-sqlite3`. Sandbox `CHK_11` confirmed `getUserByUsername("' OR '1'='1")` returned `null` without syntax errors or row leakage.
3. **WhatsApp Hide-Tag Group Admin Check (`backend/handlers/hideTagHandler.ts`, `backend/handlers/hideTagUtils.ts`)**: Group participant privilege verification (`isGroupParticipantAdmin`) enforces `admin`/`superadmin` status across both PN and LID JID formats. Sandbox `CHK_11` confirmed non-admin participants were blocked while group admins were authorized.
4. **Media Upload/Serve Path Containment (`backend/services/mediaManager.ts`)**: `mediaManager.ts` normalizes tenant IDs with strict character allowlists and applies `path.basename` + extension allowlists on upload/read/delete. Sandbox `CHK_11` confirmed traversal inputs (`../../etc/passwd`) returned `null`.

### Defense-in-Depth Hardening Notes

1. **Redundant In-Memory Admin Token Set (`admin-backend/services/adminAuthService.ts:14`)**: `activeAdminTokens` Set is maintained alongside SQLite `admin_sessions`; consolidating exclusively onto `admin_sessions` removes potential drift across multi-worker PM2 setups.
2. **Voucher Token Redemption Atomicity (`admin-backend/services/tokenService.ts:177-239`)**: `TokenService.redeemToken` queries `extension_tokens`, verifies `status !== 'used'`, calls `TenantService.extendDuration`, and then updates `status = 'used'` without `WHERE id = ? AND status = 'available'` inside a single `db.transaction(...)`. Wrap inside `db.transaction` and check `changes === 1` on `status = 'available'` before extending tenant duration.
3. **Browser `localStorage` Session Storage & Missing Security Headers (`frontend/src/hooks/useAuth.ts`, `admin-frontend/src/utils/adminAuth.ts`, `backend/app.ts`)**: Both tenant and Master Admin SPAs store bearer tokens in `localStorage` instead of `HttpOnly`, `SameSite=Lax/Strict`, `Secure` cookies, and the Express servers do not set `Strict-Transport-Security`, `Content-Security-Policy`, or `X-Content-Type-Options: nosniff`.
4. **Explicit `https:` Validation on `paymentUrl` (`frontend/src/components/tabs/TabTransaksi.tsx:346`)**: Although React 19 natively blocks `javascript:` URLs in `<a href>` (verified in `CHK_10`), add explicit `new URL(url).protocol === 'https:'` validation when storing and rendering `trx.paymentUrl` for defense-in-depth.

## 7. Coverage Summary and Disposition Ledger

- **Total Coverage Units**: **22**
  - `covered` (verified mitigated / negative controls): **4**
  - `candidate` (linked to confirmed, needs_validation, or rejected dispositions): **18**
  - `blocked`: **0** | `deferred`: **0** | `planned`: **0**
- **Companion Blocks Applied**: `WEB-PROTOCOL-AND-AUTH.md`, `CLIENT-SIDE.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`, `PROTOCOLS-RPC-AND-MESSAGING.md`, `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`, `CLOUD-AND-DEPLOYMENT.md`.
- **Excluded Companion Blocks**:
  - `MEMORY-SAFETY-AND-BINARY.md`: Pure TypeScript/Node.js and React SPA codebase with no custom C/C++/Rust-unsafe binary parsers.
  - `AI-AND-LLM.md`: @google/genai appears in package.json dependencies, but zero runtime LLM, RAG, MCP, or agent calls exist in server.ts, backend/, or admin-backend/.
  - `SUPPLY-CHAIN-AND-RELEASE.md`: No CI/CD workflows, plugin installers, or automated release pipelines present in repository root.
  - `DESKTOP-MOBILE-AND-LOCAL-IPC.md`: Web application + Node backend; no Electron, mobile WebView, or native local IPC server.
- **Rejected Candidate Record (Not a Vulnerability)**:
  - `xss.tabtransaksi-javascript-payment-url` (Claimed Stored XSS via javascript: paymentUrl in TabTransaksi.tsx Anchor): Refuted by local verification against target React 19 (CHK_10): react-dom 19.0.1 automatically blocks javascript: URLs in <a href> during rendering, replacing the attribute value with "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')". While explicit https: URL validation remains good defense-in-depth hardening, the claimed javascript: XSS execution is mitigated by React 19.
- **Schema & Critic Validation**: Both `validate-findings.cjs` (`PASS: 19 findings valid`) and `validate-coverage-ledger.cjs` (`PASS: 22 coverage units valid`) succeeded cleanly, and fresh-eyes verification across all confirmed and unresolved records completed with zero unresolved discrepancies.
