# Findings Detail (Critical, High, and Medium Confirmed Findings)

This document provides full source traces, bounded local sandbox reproduction steps (from `agents/verifier-local/artifacts/local-poc-results.json`), observed outputs, conditions, and concrete source remediations for all **14** confirmed `critical`, `high`, and `medium` findings. (Low-severity findings are summarized in `REPORT.md` Section 4.)

## 1. [CRITICAL] Unauthenticated Bot Control, Config Tampering, and API Key Disclosure (/api/bot/*)

- **Fingerprint**: `auth.unauthenticated-bot-control-and-key-leak`
- **Severity**: **CRITICAL** (Likelihood: `high` - Zero authentication on publicly mounted Express router. | Impact: `critical` - Discloses payment and supplier API keys and allows full control of tenant bot behavior and connectivity.)
- **Confidence**: `high` - Confirmed by direct source inspection and sandboxed request verification.

### Root Cause and Intended Behavior

- **Description**: The /api/bot router enforces no authentication or tenant session verification. Any anonymous client can call GET /api/bot/status to retrieve sensitive tenant secrets (xavieraApiKey, lunasQrisApiKey, lunasQrisSecretKey, pairingCode) and call POST /save-config, /start, /stop, /reset, or /groups/* to reconfigure or disrupt any tenant bot.
- **Root Cause**: Neither backend/app.ts nor backend/routes/botRoutes.ts attaches an authentication middleware validating the caller session against the active tenant.
- **Intended Behavior**: All /api/bot/* endpoints must require a valid authenticated tenant or impersonation session, bind exclusively to the session tenantId, and redact write-only secret keys from status responses.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:126` (`createServerApp`): Mounts botRouter at /api/bot without authentication middleware.
2. **[propagation]** `backend/routes/botRoutes.ts:12` (`GET /api/bot/status`): Reads unauthenticated AsyncLocalStorage tenantId via getActiveTenantId().
3. **[sink]** `backend/botManager.ts:129` (`BotManager.getStatus`): Returns full this.config object including xavieraApiKey and LunasQRIS secrets to caller.

### Supporting Source Evidence

- `backend/routes/botRoutes.ts:11`: GET /api/bot/status returns botManager.getStatus() without session check.
- `backend/routes/botRoutes.ts:118`: POST /api/bot/save-config writes arbitrary config fields for any active tenant.
- `backend/botManager.ts:129`: getStatus() serializes plaintext API keys and secret keys in config.

### Conditions and Containment

- **authentication_level**: No authentication required; target tenant selected via ?tenant= or X-Tenant-Id.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated remote HTTP client targeting a known or guessed tenantId.
- **Target-Native Inputs / Payloads**:
  - `GET /api/bot/status?tenant=<victimTenantId>`
  - `POST /api/bot/save-config?tenant=<victimTenantId> with custom gateway keys/URLs`
- **Bounded Execution Steps**:
  1. Create a dummy victim tenant with dummy xavieraApiKey and lunasQrisApiKey values.
  2. Issue an unauthenticated GET /api/bot/status?tenant=<victimTenantId> request in the sandbox.
  3. Verify that plaintext API keys are returned in the JSON response.
- **Observed Result**: Sandbox CHK_01 leaked xavieraApiKey="DUMMY_XAVIERA_VICTIM_SECRET" and lunasQrisApiKey="DUMMY_LUNAS_VICTIM_SECRET" to an unauthenticated GET /api/bot/status request.

### Remediation and Regression Case

- **Remediation Strategy**: Enforce requireTenantAuth middleware on /api/bot/*, reject tenant overrides via query/header/body, and mask secret keys in GET /api/bot/status responses.
- **Proposed Code Changes**:
  - File: `backend/routes/botRoutes.ts`
```ts
botRouter.use(requireTenantAuth);
// In getStatus response, mask xavieraApiKey, lunasQrisApiKey, and lunasQrisSecretKey to boolean flags or redacted strings.
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 2. [CRITICAL] Missing Authentication Across Operational Tenant APIs (/api/pricing, /promos, /transactions, /media, /redeem-token)

- **Fingerprint**: `auth.unauthenticated-tenant-operational-apis`
- **Severity**: **CRITICAL** (Likelihood: `high` - Directly accessible over HTTP with zero credentials. | Impact: `critical` - Allows anonymous tampering with product selling prices, promo codes, transaction history, and tenant media.)
- **Confidence**: `high` - Confirmed across router source files and sandbox HTTP mutation check.

### Root Cause and Intended Behavior

- **Description**: All tenant business APIs (/api/pricing, /api/promos, /api/transactions, /api/media, /api/bot/templates, /api/bot/redeem-token) lack authentication checks. Anonymous callers can read transactions, delete records, create/disable promo codes, alter selling markups, upload/delete media, and redeem vouchers for arbitrary tenants.
- **Root Cause**: backend/app.ts mounts operational routers without a tenant authentication middleware, and tenantTokenRoutes.ts additionally accepts req.body.tenantId.
- **Intended Behavior**: All tenant management and financial/configuration routes must require a valid Bearer session token bound strictly to session.tenantId.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:130` (`createServerApp`): Mounts pricing, promos, transactions, media, and tenantToken routers without authentication.
2. **[propagation]** `backend/routes/tenantTokenRoutes.ts:10` (`POST /api/bot/redeem-token`): Also accepts req.body.tenantId fallback instead of a verified session.
3. **[sink]** `backend/routes/pricingRoutes.ts:52` (`POST /api/pricing`): Persists attacker-supplied markup pricing into victim tenant SQLite DB.

### Supporting Source Evidence

- `backend/routes/pricingRoutes.ts:39`: POST /api/pricing mutates tenant selling markup without auth.
- `backend/routes/promoRoutes.ts:47`: POST /api/promos creates or edits promo discounts unauthenticated.
- `backend/routes/transactionRoutes.ts:14`: GET/DELETE /api/transactions exposes and deletes buyer transaction logs unauthenticated.
- `backend/routes/mediaRoutes.ts:23`: POST /upload and DELETE /:filename allow unauthenticated media modification.
- `backend/routes/tenantTokenRoutes.ts:7`: POST /api/bot/redeem-token accepts unauthenticated tenantId.

### Conditions and Containment

- **authentication_level**: No authentication token required on any listed route.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated HTTP client targeting any tenant.
- **Target-Native Inputs / Payloads**:
  - `POST /api/pricing?tenant=<victimTenantId> {"mode":"rp","value":1}`
- **Bounded Execution Steps**:
  1. Send unauthenticated POST /api/pricing?tenant=<victimTenantId> with mode "rp" and value 1.
  2. Verify HTTP 200 response and updated markup value in sandbox.
- **Observed Result**: Sandbox CHK_01 mutated victim tenant pricing markup unauthenticated (success=true, value=1).

### Remediation and Regression Case

- **Remediation Strategy**: Enforce requireTenantAuth on pricingRouter, promoRouter, transactionRouter, mediaRouter, tenantTemplateRouter, and tenantTokenRouter, and derive tenantId exclusively from verified session state.
- **Proposed Code Changes**:
  - File: `backend/routes/tenantTokenRoutes.ts`
```ts
const tenantId = req.authenticatedSession.tenantId;
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 3. [CRITICAL] Cross-Tenant Session Override via X-Tenant-Id / Query Params and Unbounded Tenant DB Creation

- **Fingerprint**: `authz.tenant-middleware-override-and-unbounded-db`
- **Severity**: **CRITICAL** (Likelihood: `high` - Trivial via single header or query parameter on every request. | Impact: `critical` - Breaks multi-tenant isolation completely and enables unbounded SQLite file/handle exhaustion on disk.)
- **Confidence**: `high` - Confirmed by source inspection and sandbox execution in CHK_01.

### Root Cause and Intended Behavior

- **Description**: The global tenant middleware in backend/app.ts resolves tenantId from query param ?tenant=, Bearer token, X-Tenant-Id header, or tenant_id cookie, allowing X-Tenant-Id to overwrite a valid Bearer session (horizontal privilege escalation). Furthermore, it calls initTenantDb(tenantId) for any arbitrary string without verifying existence in master.db, and enforceRealtimeTenantExpiry() returns "active" for unknown tenant IDs.
- **Root Cause**: backend/app.ts:62-113 prioritizes client-controlled X-Tenant-Id and ?tenant= over verified session identity and invokes initTenantDb() before validating tenant existence; tenantStatusService.ts:84-86 defaults missing tenants to "active".
- **Intended Behavior**: Authenticated tenant requests must resolve tenantId exclusively from verified session tokens, reject unauthenticated tenant switching, and reject unknown tenant IDs instead of instantiating new SQLite files or defaulting to active.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:57` (`tenantResolutionMiddleware`): Inspects ?tenant=, X-Tenant-Id, and tenant_id cookie on all non-partner API requests.
2. **[propagation]** `backend/app.ts:94` (`tenantResolutionMiddleware`): Header X-Tenant-Id unconditionally overwrites tenantId resolved from Bearer token.
3. **[sink]** `backend/database/tenantDbManager.ts:477` (`initTenantDb`): Creates and caches a new SQLite file on disk for any arbitrary tenantId.

### Supporting Source Evidence

- `backend/app.ts:94`: headerTenant overwrites Bearer session tenantId.
- `backend/app.ts:110`: initTenantDb(tenantId) executes on every request for unvalidated tenantId.
- `admin-backend/services/tenantStatusService.ts:84`: Returns "active" when tenantId is missing from master.db.

### Conditions and Containment

- **authentication_level**: Any unauthenticated client or authenticated tenant user supplying X-Tenant-Id or ?tenant=.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Authenticated tenant user (attacker_user_01) or unauthenticated client sending arbitrary tenant identifiers.
- **Target-Native Inputs / Payloads**:
  - `GET /api/bot/status with Authorization: Bearer <attackerToken> and X-Tenant-Id: <victimTenantId>`
  - `GET /api/bot/status?tenant=ghost_unlisted_tenant_999`
- **Bounded Execution Steps**:
  1. Authenticate as dummy attacker tenant and send GET /api/bot/status with X-Tenant-Id set to dummy victim tenant.
  2. Send GET /api/bot/status?tenant=ghost_unlisted_tenant_999 and check accountStatus and database/tenants/ directory.
- **Observed Result**: Sandbox CHK_01 resolved attacker Bearer token to victim tenant "t_dummyvictimstore_6364", returned accountStatus="active" for nonexistent tenant, and created database/tenants/ghost_unlisted_tenant_999.db on disk (ghostTenantDbCreatedOnDisk=true).

### Remediation and Regression Case

- **Remediation Strategy**: Derive tenantId exclusively from verified session tokens (or signed/lookup webhook/bot contexts), validate tenant existence in master.db before initTenantDb(), and fail closed when a tenant record does not exist.
- **Proposed Code Changes**:
  - File: `admin-backend/services/tenantStatusService.ts`
```ts
if (!row) {
  return 'suspended';
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 4. [CRITICAL] Weak Static-Salt 1000-Iteration PBKDF2, Default Seeded Credentials, Non-Constant-Time Hash Compare, and Math.random() Secrets

- **Fingerprint**: `crypto.weak-kdf-static-salt-and-default-creds`
- **Severity**: **CRITICAL** (Likelihood: `high` - Default credentials are hardcoded in repository source and automatically provisioned on boot. | Impact: `critical` - Allows immediate unauthorized Super Admin or tenant dashboard login when defaults remain unchanged, and permits rapid offline/rainbow cracking of master.db hashes.)
- **Confidence**: `high` - Directly observed in source and verified in sandbox CHK_09.

### Root Cause and Intended Behavior

- **Description**: admin-backend/database/masterSqlite.ts hashes Super Admin and tenant passwords using a hardcoded global static salt ("master_salt_wanzt_2026") and only 1,000 PBKDF2-HMAC-SHA256 iterations, and seeds hardcoded default accounts (wan_admin773, wanzt, admin, superadmin) directly on startup. Additionally, authManager.ts compares tenant password hashes with === instead of crypto.timingSafeEqual(), and tokenService.ts / generatorUtils.ts generate license vouchers and tenant passwords with non-cryptographic Math.random().
- **Root Cause**: masterSqlite.ts:11-14 hardcodes static salt and 1,000 iterations; lines 246-280, authManager.ts:48-54, and apartmentManager.ts:45-52 seed default accounts; authManager.ts:117,346 uses ===; tokenService.ts:25 and generatorUtils.ts:22 use Math.random().
- **Intended Behavior**: Use per-user CSPRNG salts with strong KDF parameters (>= 600,000 PBKDF2-SHA256 iterations or Argon2id/scrypt), eliminate hardcoded default passwords in source, use timingSafeEqual everywhere, and use crypto.randomBytes/randomInt for tokens and passwords.

### Ordered Source Trace

1. **[entrypoint]** `admin-backend/database/masterSqlite.ts:246` (`initMasterDatabase`): Automatically seeds hardcoded super_admins and default tenants on initialization.
2. **[propagation]** `admin-backend/database/masterSqlite.ts:11` (`hashPassword`): Derives password hashes with static salt "master_salt_wanzt_2026" and 1,000 iterations.
3. **[sink]** `backend/services/authManager.ts:117` (`verifyLogin`): Compares static-salted master.db password hashes using non-constant-time ===.

### Supporting Source Evidence

- `admin-backend/database/masterSqlite.ts:12`: Static salt "master_salt_wanzt_2026" and 1,000 PBKDF2 iterations.
- `admin-backend/database/masterSqlite.ts:246`: Hardcoded seeded super admin wan_admin773 and default tenant wanzt.
- `backend/services/authManager.ts:48`: Hardcoded seeded admin/admin123 account in tenant auth table.
- `backend/services/authManager.ts:117`: Non-constant-time === hash comparison in verifyLogin and updateTenantPassword (346).
- `admin-backend/services/tokenService.ts:25`: Math.random() used to generate 16-character voucher extension tokens.
- `admin-backend/utils/generatorUtils.ts:22`: Math.random() used in generateRandomPassword().

### Conditions and Containment

- **system_configuration**: Active immediately upon database initialization in any unconfigured deployment.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated attacker testing seeded credentials or offline/timing cracker with DB read access.
- **Target-Native Inputs / Payloads**:
  - `POST /api/auth/login with seeded default admin credentials`
  - `masterSqlite.hashPassword() identical output across invocations`
- **Bounded Execution Steps**:
  1. Initialize master.db and tenant DB in isolated scratch workdir.
  2. Attempt login with seeded default admin credentials and verify identical hash output from masterSqlite.hashPassword().
- **Observed Result**: Sandbox CHK_09 confirmed defaultSuperAdminSeeded=true, staticSaltIdenticalHash=true, defaultAdminLoginSucceeded=true, and generatedPasswordSample="pass_wq689z".

### Remediation and Regression Case

- **Remediation Strategy**: Generate per-account random 16-byte salts with scrypt/Argon2id (or >= 600k PBKDF2-SHA256 iterations), require env-provided bootstrap credentials or one-time setup token, compare hashes using crypto.timingSafeEqual, and replace Math.random() with crypto.randomInt().
- **Proposed Code Changes**:
  - File: `admin-backend/utils/generatorUtils.ts`
```ts
import crypto from 'crypto';
export function generateRandomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  let gen = '';
  for (let i = 0; i < 16; i++) {
    gen += chars.charAt(crypto.randomInt(chars.length));
  }
  return gen;
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 5. [CRITICAL] LunasQRIS Webhook Fail-Open When Secret Empty, Missing Replay Window, and Missing Amount Verification

- **Fingerprint**: `webhook.lunasqris-failopen-replay-and-amount-bypass`
- **Severity**: **CRITICAL** (Likelihood: `high` - Any tenant without lunasQrisSecretKey allows unsigned payment spoofing via a single POST request. | Impact: `critical` - Enables marking unpaid or underpaid orders as paid without transferring funds.)
- **Confidence**: `high` - Both fail-open and stale-timestamp/amount bypass reproduced in sandbox CHK_04.

### Root Cause and Intended Behavior

- **Description**: POST /api/lunasqris/webhook bypasses HMAC-SHA256 verification entirely whenever a tenant has not configured lunasQrisSecretKey (fail-open). Even when a secret is configured, verifyLunasQrisSignature() does not validate freshness of x-callback-timestamp (allowing infinite replay), and the handler updates SQLite transactions to paid without verifying that paid amount matches the stored order nominal/total.
- **Root Cause**: lunasQrisRoutes.ts:49 checks `if (secretKey)` instead of rejecting empty secrets; lunasQrisService.ts:286-301 never checks timestamp age; lunasQrisRoutes.ts:67-74 ignores payload amount.
- **Intended Behavior**: Reject webhook callbacks (401/503) if lunasQrisSecretKey is unconfigured, reject timestamps outside a short replay window (e.g., +/- 300s) with idempotent status guards, and verify payload amount/total_amount matches the stored pending order total.

### Ordered Source Trace

1. **[entrypoint]** `backend/routes/lunasQrisRoutes.ts:40` (`POST /api/lunasqris/webhook`): Receives unauthenticated webhook callback for resolved tenant.
2. **[propagation]** `backend/routes/lunasQrisRoutes.ts:49` (`POST /api/lunasqris/webhook`): Skips signature verification if secretKey is empty; calls verifyLunasQrisSignature otherwise without timestamp age or amount check.
3. **[sink]** `backend/routes/lunasQrisRoutes.ts:70` (`POST /api/lunasqris/webhook`): Marks local transaction paid via updateTransactionStatus().

### Supporting Source Evidence

- `backend/routes/lunasqrisRoutes.ts:49`: if (secretKey) skips verification when secret is empty.
- `backend/services/lunasQrisService.ts:292`: verifyLunasQrisSignature checks string truthiness only, not timestamp freshness.
- `backend/routes/lunasqrisRoutes.ts:70`: Calls updateTransactionStatus without comparing data.total_amount against DB total.

### Conditions and Containment

- **system_configuration**: Any unconfigured lunasQrisSecretKey enables immediate unsigned spoofing; configured keys remain vulnerable to stale replay or mismatched amounts.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Remote unauthenticated HTTP caller sending forged or replayed callback payloads.
- **Target-Native Inputs / Payloads**:
  - `POST /api/lunasqris/webhook?tenant=<victimTenantId> {"event":"transaction.paid","data":{"order_id":"ORD-WH-OPEN","status":"paid"}}`
  - `POST /api/lunasqris/webhook with X-Callback-Timestamp: 1000000000 and amount: 1 for a 100000 order`
- **Bounded Execution Steps**:
  1. Seed two pending dummy transactions (ORD-WH-OPEN with empty secretKey, ORD-WH-REPLAY with secretKey configured).
  2. Send unsigned callback for ORD-WH-OPEN and stale-timestamp/amount=1 HMAC-signed callback for ORD-WH-REPLAY.
- **Observed Result**: Sandbox CHK_04 returned HTTP 200 and marked ORD-WH-OPEN "paid"; for ORD-WH-REPLAY with stale timestamp 1000000000 and amount=1, returned HTTP 200 and marked order "paid".

### Remediation and Regression Case

- **Remediation Strategy**: Fail closed (return 401/503) if lunasQrisSecretKey is empty, enforce timestamp age <= 300 seconds in verifyLunasQrisSignature, enforce pending-only transitions, and verify paid amount matches stored order total.
- **Proposed Code Changes**:
  - File: `backend/routes/lunasQrisRoutes.ts`
```ts
if (!secretKey || !verifyLunasQrisSignature(rawBody, timestamp, signature, secretKey)) {
  return res.status(401).json({ success: false, error: 'Invalid or unconfigured webhook signature' });
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 6. [HIGH] Unauthenticated Telegram Bot Token Disclosure and Overwrite (/api/bot/telegram/*)

- **Fingerprint**: `auth.unauthenticated-telegram-config-leak-and-write`
- **Severity**: **HIGH** (Likelihood: `high` - Endpoint is publicly accessible without authentication. | Impact: `high` - Exposes Telegram Bot API credentials and permits silent redirection of sale notifications.)
- **Confidence**: `high` - Confirmed by source inspection and sandbox HTTP reproduction.

### Root Cause and Intended Behavior

- **Description**: Endpoints GET /api/bot/telegram/config, POST /api/bot/telegram/config, and POST /api/bot/telegram/test lack authentication middleware. Unauthenticated callers can read any tenant botToken and chatId, overwrite notification destinations, or trigger test messages.
- **Root Cause**: telegramRouter relies solely on getActiveTenantId() from unauthenticated tenant middleware without verifying a login session.
- **Intended Behavior**: Telegram configuration and test endpoints must require an authenticated tenant session and never return raw botToken strings in API responses.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:129` (`createServerApp`): Mounts telegramRouter at /api/bot/telegram without authentication.
2. **[propagation]** `backend/routes/telegramRoutes.ts:15` (`GET /api/bot/telegram/config`): Resolves tenantId from unauthenticated context and queries telegram_config.
3. **[sink]** `backend/services/telegramService.ts:39` (`getTelegramConfig`): Returns plaintext botToken and chatId in HTTP JSON response.

### Supporting Source Evidence

- `backend/routes/telegramRoutes.ts:13`: GET /config returns full TelegramConfig including botToken.
- `backend/routes/telegramRoutes.ts:27`: POST /config overwrites botToken, chatId, and notifEnabled unauthenticated.
- `backend/routes/telegramRoutes.ts:49`: POST /test sends arbitrary Telegram test API requests unauthenticated.

### Conditions and Containment

- **authentication_level**: No credentials required; caller passes ?tenant= or X-Tenant-Id.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated remote HTTP client.
- **Target-Native Inputs / Payloads**:
  - `GET /api/bot/telegram/config?tenant=<victimTenantId>`
  - `POST /api/bot/telegram/config?tenant=<victimTenantId>`
- **Bounded Execution Steps**:
  1. Seed a dummy victim tenant Telegram botToken and chatId.
  2. Issue an unauthenticated GET /api/bot/telegram/config?tenant=<victimTenantId>.
- **Observed Result**: Sandbox CHK_02 returned HTTP 200 with plaintext botToken="123456:DUMMY_TG_TOKEN" and chatId="999888777".

### Remediation and Regression Case

- **Remediation Strategy**: Protect telegramRouter with requireTenantAuth and mask botToken on GET responses (e.g., return hasBotToken boolean and masked preview only).
- **Proposed Code Changes**:
  - File: `backend/routes/telegramRoutes.ts`
```ts
telegramRouter.use(requireTenantAuth);
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 7. [HIGH] Unauthenticated Tenant Username Hijack and Store Info Overwrite via Fallback Context

- **Fingerprint**: `auth.unauthenticated-tenant-username-and-store-takeover`
- **Severity**: **HIGH** (Likelihood: `high` - Directly exploitable unauthenticated with a single HTTP request. | Impact: `high` - Locks tenant owners out of their login username and overwrites store contact/owner information.)
- **Confidence**: `high` - Confirmed in source code and reproduced in sandbox CHK_02.

### Root Cause and Intended Behavior

- **Description**: In backend/routes/authRoutes.ts, getAuthSessionFromReq() falls back to unauthenticated req.tenantId / cookies.tenant_id / X-Tenant-Id when no valid Bearer token is present, allowing unauthenticated requests to change any tenant login username via POST /api/auth/profile/update-username. POST /api/auth/store-setup likewise overwrites store metadata without authentication.
- **Root Cause**: Lines 169-173 of backend/routes/authRoutes.ts fabricate an authenticated session object from unauthenticated request context, and POST /api/auth/store-setup does not enforce session authentication.
- **Intended Behavior**: getAuthSessionFromReq must return null unless a valid cryptographic Bearer session or active impersonation token is verified, and store-setup must require authentication.

### Ordered Source Trace

1. **[entrypoint]** `backend/routes/authRoutes.ts:179` (`POST /api/auth/profile/update-username`): Calls getAuthSessionFromReq(req) to authenticate username change.
2. **[propagation]** `backend/routes/authRoutes.ts:169` (`getAuthSessionFromReq`): Falls back to unauthenticated req.tenantId / X-Tenant-Id and looks up tenant username.
3. **[sink]** `backend/services/authManager.ts:268` (`updateTenantUsername`): Updates master.db tenants.username and local SQLite auth.username without password or token verification.

### Supporting Source Evidence

- `backend/routes/authRoutes.ts:169`: Fallback returns valid-looking session from headers/cookies/req.tenantId without a token.
- `backend/routes/authRoutes.ts:110`: POST /api/auth/store-setup saves storeName/ownerName/ownerNumber without requiring a session.
- `backend/services/authManager.ts:268`: UPDATE tenants SET username = ? WHERE tenant_id = ?.

### Conditions and Containment

- **authentication_level**: Unauthenticated HTTP caller knowing or guessing a tenantId (or targeting default t_wanzt).

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated remote caller sending forged X-Tenant-Id header.
- **Target-Native Inputs / Payloads**:
  - `POST /api/auth/profile/update-username with X-Tenant-Id: <victimTenantId> and {"newUsername":"hijacked_victim_99"}`
  - `POST /api/auth/store-setup with X-Tenant-Id: <victimTenantId>`
- **Bounded Execution Steps**:
  1. Send unauthenticated POST /api/auth/profile/update-username with X-Tenant-Id pointing to dummy victim tenant.
  2. Send unauthenticated POST /api/auth/store-setup with X-Tenant-Id pointing to dummy victim tenant.
- **Observed Result**: Sandbox CHK_02 succeeded unauthenticated: update-username returned success=true (username="hijacked_victim_99"), and store-setup returned success=true (storeName="Overwritten Store").

### Remediation and Regression Case

- **Remediation Strategy**: Remove lines 168-173 fallback from getAuthSessionFromReq so unauthenticated requests return null (401), and enforce authentication on /api/auth/store-setup and /api/auth/store-status.
- **Proposed Code Changes**:
  - File: `backend/routes/authRoutes.ts`
```ts
function getAuthSessionFromReq(req: Request) {
  // Verify Bearer token against impersonationTokens or activeSessions only; otherwise return null.
  return null;
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 8. [HIGH] Client-Controlled Price Tampering via WhatsApp order_var Interactive Button ID

- **Fingerprint**: `logic.whatsapp-order-var-price-tampering`
- **Severity**: **HIGH** (Likelihood: `medium` - Requires crafting a WhatsApp protobuf interactive response via modified client or Baileys. | Impact: `critical` - Allows purchasing any catalog item at an attacker-chosen price as low as Rp 1.)
- **Confidence**: `high` - Full path from button parsing to loopback payment gateway invoice confirmed in CHK_05.

### Root Cause and Intended Behavior

- **Description**: When sending product carousels, carouselMessage.ts encodes the selling price inside the quick-reply button ID (order_var:<product>|<variant>|<sellingPrice>). Upon receiving an incoming WhatsApp message, messageDispatcher.ts parses productName, variantName, and price directly from the user-controlled button ID without re-fetching authoritative catalog cost or server-side pricing rules, allowing a buyer to submit a forged button response (e.g., Rp 1) to generate a valid QRIS invoice for any product.
- **Root Cause**: backend/handlers/messageDispatcher.ts:576-588 trusts client-supplied pPrice parsed from buttonIdOrText and propagates it directly to activeCheckoutSessions and executeLunasQrisInvoice.
- **Intended Behavior**: The message dispatcher must treat interactive button IDs strictly as product/variant identifiers and recalculate authoritative selling price server-side from the Xaviera catalog and tenant pricing_config.

### Ordered Source Trace

1. **[entrypoint]** `backend/handlers/messageDispatcher.ts:576` (`dispatchIncomingMessages`): Parses selectedButtonId starting with order_var: from untrusted incoming WhatsApp message.
2. **[propagation]** `backend/handlers/messageDispatcher.ts:643` (`dispatchIncomingMessages`): Stores untrusted parsed price into activeCheckoutSessions.
3. **[sink]** `backend/handlers/messageDispatcher.ts:143` (`executeLunasQrisInvoice`): Forwards tampered amount to createLunasQrisTransaction() to issue a Rp 1 invoice.

### Supporting Source Evidence

- `backend/messages/carouselMessage.ts:150`: Embeds sellingPrice into client-submittable quick_reply button id.
- `backend/handlers/messageDispatcher.ts:583`: Accepts arbitrary numeric pPrice directly from buyer message without catalog re-verification.
- `backend/handlers/messageDispatcher.ts:146`: Passes effectiveAmount directly into LunasQRIS invoice creation.

### Conditions and Containment

- **authentication_level**: Any WhatsApp buyer able to send a custom buttonsResponseMessage or interactiveResponseMessage payload.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Malicious WhatsApp buyer crafting a modified interactive button response ID.
- **Target-Native Inputs / Payloads**:
  - `buttonsResponseMessage.selectedButtonId = "order_var:Netflix%20Premium|1%20Bulan%20Private|1"`
  - `buttonsResponseMessage.selectedButtonId = "checkout_direct"`
- **Bounded Execution Steps**:
  1. Invoke dispatchIncomingMessages() in the sandbox with a dummy buyer message containing order_var:Netflix%20Premium|1%20Bulan%20Private|1.
  2. Follow up with checkout_direct and inspect the request body sent to the loopback LunasQRIS server.
- **Observed Result**: Sandbox CHK_05 recorded sessionPriceParsedFromButton=1 and invoiceAmountSentToGateway=1 (Order ORD-MWHNNKBV-1TVT).

### Remediation and Regression Case

- **Remediation Strategy**: Look up authoritative base cost from getProductVariants(productName, config) and compute sellingPrice via calculateSellingPriceForVariant() on the server inside order_var handling; reject unknown products/variants.
- **Proposed Code Changes**:
  - File: `backend/handlers/messageDispatcher.ts`
```ts
const variants = await getProductVariants(productName, config);
const matched = variants.find((v) => v.variant === variantName);
if (!matched || matched.price <= 0) continue;
const calc = calculateSellingPriceForVariant(`${productName}|${variantName}`, matched.price, productName, variantName);
price = calc.sellingPrice;
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 9. [HIGH] Server-Side Request Forgery (SSRF) and Merchant API Key Exfiltration in LunasQRIS & Xaviera Proxies

- **Fingerprint**: `ssrf.payment-and-supplier-proxy-key-exfil`
- **Severity**: **HIGH** (Likelihood: `high` - Directly triggerable via unauthenticated GET/POST query/body parameters. | Impact: `high` - Enables internal network/loopback probing (SSRF) and exfiltration of tenant LunasQRIS and Xaviera API keys.)
- **Confidence**: `high` - Confirmed by source inspection and loopback HTTP capture in sandbox CHK_07.

### Root Cause and Intended Behavior

- **Description**: LunasQRIS proxy routes (/api/lunasqris/balance, /transaction/status, /transaction/create) accept arbitrary baseurl/baseUrl values from request query/body and attach merchant credentials (X-API-Key and Authorization: Bearer) directly into outbound server-side fetch() calls without protocol, loopback, or private-IP filtering. Xaviera routes (/api/xaviera/profile, /products, /smm, /games) similarly fetch botManager.config.xavieraBaseUrl (writable unauthenticated via /api/bot/save-config) with Authorization: Bearer.
- **Root Cause**: lunasQrisRoutes.ts:16,29,87 forwards caller-controlled baseurl/baseUrl into lunasQrisService.ts fetch() calls; xavieraRoutes.ts:8 fetches unvalidated botManager.config.xavieraBaseUrl with Authorization: Bearer.
- **Intended Behavior**: Restrict outbound gateway and supplier base URLs to HTTPS only, enforce a strict hostname allowlist or DNS-resolved public-IP check blocking loopback/link-local/RFC1918 ranges, and require authentication before proxying requests.

### Ordered Source Trace

1. **[entrypoint]** `backend/routes/lunasQrisRoutes.ts:16` (`GET /api/lunasqris/balance`): Reads unvalidated req.query.baseurl and forwards it to getLunasQrisBalance.
2. **[propagation]** `backend/services/lunasQrisService.ts:66` (`getLunasQrisBalance`): Normalizes trailing slashes only without scheme or IP validation.
3. **[sink]** `backend/services/lunasQrisService.ts:73` (`getLunasQrisBalance`): Executes fetch(url) sending X-API-Key and Authorization: Bearer to attacker-specified host.

### Supporting Source Evidence

- `backend/routes/lunasQrisRoutes.ts:16`: Accepts req.query.baseurl on /balance and /transaction/status (29) and req.body.baseUrl on /transaction/create (87).
- `backend/services/lunasQrisService.ts:73`: Sends X-API-Key and Authorization Bearer to constructed URL without allowlist.
- `backend/routes/xavieraRoutes.ts:20`: Fetches config.xavieraBaseUrl with Authorization: Bearer apiKey.

### Conditions and Containment

- **authentication_level**: Unauthenticated HTTP caller passing baseurl query/body param or updating xavieraBaseUrl via /api/bot/save-config.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Remote unauthenticated caller directing outbound server HTTP requests to internal services or a collector.
- **Target-Native Inputs / Payloads**:
  - `GET /api/lunasqris/balance?apikey=DUMMY_MERCHANT_SECRET&baseurl=http://127.0.0.1:<loopbackPort>`
  - `GET /api/xaviera/profile?tenant=<victimTenantId> after xavieraBaseUrl=http://127.0.0.1:<loopbackPort>`
- **Bounded Execution Steps**:
  1. Start an isolated loopback HTTP listener inside the sandbox.
  2. Call GET /api/lunasqris/balance?baseurl=http://127.0.0.1:<port> and GET /api/xaviera/profile?tenant=<victimTenantId>.
  3. Inspect requests received by the loopback listener.
- **Observed Result**: Sandbox CHK_07 captured outbound GET /api/v1/balance with X-API-Key="DUMMY_MERCHANT_SECRET" and GET /me with Authorization="Bearer DUMMY_XAVIERA_VICTIM_SECRET".

### Remediation and Regression Case

- **Remediation Strategy**: Remove per-request baseurl overrides, enforce HTTPS-only public host validation (rejecting 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, and IPv6 local ranges after DNS resolution, with redirect: "error"), and require tenant auth.
- **Proposed Code Changes**:
  - File: `backend/routes/lunasQrisRoutes.ts`
```ts
// Enforce auth middleware and use only validated HTTPS tenant configuration (remove req.query.baseurl / req.body.baseUrl overrides).
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 10. [MEDIUM] Unauthenticated Read Endpoints on Legacy /api/apartment/* Router

- **Fingerprint**: `auth.apartment-unauthenticated-read-endpoints`
- **Severity**: **MEDIUM** (Likelihood: `high` - Directly reachable over HTTP without credentials. | Impact: `medium` - Exposes legacy apartment tenant records, counts, and lease expiry dates.)
- **Confidence**: `high` - Confirmed by source inspection and sandboxed HTTP execution.

### Root Cause and Intended Behavior

- **Description**: Legacy apartment management GET endpoints (/stats, /tenants, /current-lease, /tenants/:id) omit requireMasterAdminAuth, exposing tenant records and operational statistics without authentication. In addition, requireMasterAdminAuth accepts bearer tokens via the URL query string (?token=).
- **Root Cause**: apartmentRoutes.ts only applies requireMasterAdminAuth to mutating routes (POST/PUT/DELETE) and leaves read routes unprotected; requireMasterAdminAuth also falls back to req.query.token.
- **Intended Behavior**: All Master Admin apartment endpoints exposing tenant lists, status, or statistics must require a valid Master Admin Authorization Bearer header, and tokens must never be accepted in URL query parameters.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:136` (`createServerApp`): Mounts apartmentRouter at /api/apartment with no authentication middleware.
2. **[propagation]** `backend/routes/apartmentRoutes.ts:27` (`requireMasterAdminAuth`): Defines token middleware accepting req.query.token, but omits it from GET routes.
3. **[sink]** `backend/routes/apartmentRoutes.ts:123` (`GET /api/apartment/tenants`): Returns full legacy apartment tenant records from getAllTenants() without authentication.

### Supporting Source Evidence

- `backend/routes/apartmentRoutes.ts:110`: GET /api/apartment/stats has no requireMasterAdminAuth middleware.
- `backend/routes/apartmentRoutes.ts:123`: GET /api/apartment/tenants has no requireMasterAdminAuth middleware.
- `backend/routes/apartmentRoutes.ts:153`: GET /api/apartment/tenants/:id exposes per-unit records without auth.
- `backend/routes/apartmentRoutes.ts:27`: requireMasterAdminAuth falls back to req.query.token.

### Conditions and Containment

- **authentication_level**: None required for GET /stats, /tenants, /current-lease, and /tenants/:id.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Unauthenticated HTTP client requesting legacy apartment management endpoints.
- **Target-Native Inputs / Payloads**:
  - `GET /api/apartment/stats`
  - `GET /api/apartment/tenants`
  - `GET /api/apartment/current-lease`
- **Bounded Execution Steps**:
  1. Start serverApp inside the isolated sandbox with scratch SQLite databases.
  2. Send unauthenticated GET requests to /api/apartment/stats, /api/apartment/tenants, and /api/apartment/current-lease.
  3. Inspect HTTP status codes and JSON payload fields.
- **Observed Result**: Sandbox CHK_03 returned HTTP 200 (success=true) on /stats, HTTP 200 (tenantsCount=1) on /tenants, and HTTP 200 on /current-lease.

### Remediation and Regression Case

- **Remediation Strategy**: Decommission legacy /api/apartment/* routes or enforce requireMasterAdminAuth across all read and write handlers, and remove req.query.token fallback.
- **Proposed Code Changes**:
  - File: `backend/routes/apartmentRoutes.ts`
```ts
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-master-token'] as string);
// Apply requireMasterAdminAuth to /stats, /tenants, /current-lease, and /tenants/:id.
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 11. [MEDIUM] Master Admin Brute-Force Lockout Bypass via X-Forwarded-For Spoofing

- **Fingerprint**: `auth.xff-spoof-admin-lockout-bypass`
- **Severity**: **MEDIUM** (Likelihood: `high` - Trivial single-header bypass requiring no authentication. | Impact: `medium` - Neutralizes IP-based brute-force lockout protection on Master Admin login.)
- **Confidence**: `high` - Confirmed by source code and sandboxed HTTP verification.

### Root Cause and Intended Behavior

- **Description**: POST /api/admin/auth/login tracks failed login attempts by IP derived from normalizeClientIp(req.ip, req.headers["x-forwarded-for"]), which trusts the leftmost client-supplied X-Forwarded-For entry. Rotating X-Forwarded-For resets the 5-attempt / 15-minute lockout counter on every request.
- **Root Cause**: adminSecurityUtils.ts:119-134 parses the first element of X-Forwarded-For without trusted proxy configuration or rightmost non-proxy extraction, while deploy-vps.sh Nginx uses $proxy_add_x_forwarded_for which preserves attacker-prepended entries.
- **Intended Behavior**: Brute-force tracking must derive client IP from Express trusted proxy configuration (req.ip with explicit trust proxy hops) or the socket/X-Real-IP set by Nginx, plus per-username throttling.

### Ordered Source Trace

1. **[entrypoint]** `admin-backend/routes/authAdminRoutes.ts:10` (`POST /api/admin/auth/login`): Extracts clientIp via normalizeClientIp(req.ip, req.headers["x-forwarded-for"]).
2. **[propagation]** `admin-backend/utils/adminSecurityUtils.ts:127` (`normalizeClientIp`): Selects leftmost comma-separated X-Forwarded-For value controllable by client.
3. **[sink]** `admin-backend/services/adminAuthService.ts:66` (`AdminAuthService.login`): Queries and increments admin_login_attempts keyed solely by spoofable clientIp.

### Supporting Source Evidence

- `admin-backend/utils/adminSecurityUtils.ts:123`: Trusts first entry of xForwardedFor before reqIp.
- `admin-backend/services/adminAuthService.ts:101`: Locks out only per ip key in admin_login_attempts.
- `deploy-vps.sh:133`: Nginx appends to client-supplied header via $proxy_add_x_forwarded_for.

### Conditions and Containment

- **network_routing**: Client sends arbitrary X-Forwarded-For header (direct or through Nginx $proxy_add_x_forwarded_for).

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Remote unauthenticated client testing Master Admin credentials.
- **Target-Native Inputs / Payloads**:
  - `POST /api/admin/auth/login with rotating X-Forwarded-For header values per batch of 4 attempts`
- **Bounded Execution Steps**:
  1. Send 6 failed POST /api/admin/auth/login attempts with X-Forwarded-For: 198.51.100.1 to observe lockout (HTTP 429).
  2. Send a subsequent attempt with X-Forwarded-For: 198.51.100.2.
- **Observed Result**: Sandbox CHK_06 recorded statuses [401,401,401,401,429,429] for 198.51.100.1, then HTTP 401 immediately on rotation to 198.51.100.2.

### Remediation and Regression Case

- **Remediation Strategy**: Configure app.set("trust proxy", 1) behind a single local reverse proxy, use req.ip (never parse leftmost X-Forwarded-For directly), and add per-username failed-attempt lockout.
- **Proposed Code Changes**:
  - File: `admin-backend/utils/adminSecurityUtils.ts`
```ts
export function normalizeClientIp(reqIp?: string): string {
  return (reqIp && reqIp.trim()) || "unknown";
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 12. [MEDIUM] Wildcard CORS Policy and Overly Permissive VPS Deployment Script Configuration

- **Fingerprint**: `config.wildcard-cors-and-vps-script-exposure`
- **Severity**: **MEDIUM** (Likelihood: `high` - Wildcard CORS is enabled unconditionally on all endpoints. | Impact: `medium` - Permits any malicious webpage to exfiltrate unauthenticated API responses from a victim browser or local network.)
- **Confidence**: `high` - CORS header verified in sandbox CHK_10 and script lines verified directly in deploy-vps.sh.

### Root Cause and Intended Behavior

- **Description**: backend/app.ts applies wildcard app.use(cors()), allowing any external origin to issue cross-origin API requests and read responses (including leaked API keys on unauthenticated routes). Additionally, deploy-vps.sh sets chmod 755 on /root and recursively chmod -R 755 on the application directory (making SQLite databases and Baileys WhatsApp credentials world-readable to any local system user) and opens UFW port 5000/tcp directly.
- **Root Cause**: backend/app.ts:41 uses default cors() without an origin allowlist; deploy-vps.sh:100-101 grants 755 permissions recursively over database/ and session folders and line 160 exposes backend port 5000 publicly.
- **Intended Behavior**: CORS must restrict origins to configured dashboard domains, runtime database/session directories must restrict permissions to the service account (700/600), and backend port 5000 must bind only to 127.0.0.1 behind Nginx.

### Ordered Source Trace

1. **[entrypoint]** `backend/app.ts:41` (`createServerApp`): Registers app.use(cors()) allowing Access-Control-Allow-Origin: * for all routes.
2. **[sink]** `deploy-vps.sh:101` (`VPS deployment setup`): Sets chmod -R 755 "$APP_DIR" and ufw allow 5000/tcp (line 160).

### Supporting Source Evidence

- `backend/app.ts:41`: Unrestricted cors() middleware enables cross-origin data reading by any website.
- `deploy-vps.sh:100`: chmod 755 /root && chmod -R 755 "$APP_DIR" exposes SQLite DBs and Baileys keys to local users.
- `deploy-vps.sh:160`: ufw allow 5000/tcp exposes backend directly bypassing Nginx proxy.

### Conditions and Containment

- **system_configuration**: Wildcard CORS is active in all server builds; deployment script flaws affect VPS hosts provisioned with deploy-vps.sh.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Untrusted third-party web origin or unprivileged local VPS user.
- **Target-Native Inputs / Payloads**:
  - `GET /api/health with Origin: https://untrusted.example`
- **Bounded Execution Steps**:
  1. Send GET /api/health with Origin: https://untrusted.example to the sandbox Express app.
  2. Inspect the Access-Control-Allow-Origin response header and verify deploy-vps.sh permission commands.
- **Observed Result**: Sandbox CHK_10 confirmed Access-Control-Allow-Origin: "*" for Origin: https://untrusted.example; deploy-vps.sh lines 100-101 and 160 apply world-readable 755 permissions and UFW allow 5000/tcp.

### Remediation and Regression Case

- **Remediation Strategy**: Configure cors({ origin: allowedOrigins }) via environment configuration, restrict database/ and auth_info_baileys/ permissions to 700/600 under a dedicated non-root user, and remove ufw allow 5000/tcp while binding Node to 127.0.0.1.
- **Proposed Code Changes**:
  - File: `backend/app.ts`
```ts
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 13. [MEDIUM] Promo Code Quota Check-Then-Act Race Allows Quota Oversubscription

- **Fingerprint**: `race.promo-quota-toctou-oversubscription`
- **Severity**: **MEDIUM** (Likelihood: `medium` - Occurs naturally whenever concurrent buyers check out with a limited-quota promo. | Impact: `medium` - Allows coupon discount budget to be exceeded beyond configured quota.)
- **Confidence**: `high` - Confirmed by source inspection and sandbox CHK_08 quota oversubscription check.

### Root Cause and Intended Behavior

- **Description**: validateAndApplyPromo() checks promo.usedCount >= promo.quota when the buyer submits a promo code, without reserving quota or running an atomic update. The counter increment (UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?) happens asynchronously later inside the onPaid callback, allowing multiple concurrent checkouts to pass validation for a single-use quota and exceed promo.quota.
- **Root Cause**: Separation between quota check (sqlite.ts:1151) and unconditional post-payment increment (messageDispatcher.ts:215) with no atomic reservation or WHERE used_count < quota constraint.
- **Intended Behavior**: Promo quota must be reserved atomically inside a SQLite transaction (UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND (quota IS NULL OR used_count < quota)) and released if checkout expires/cancels.

### Ordered Source Trace

1. **[entrypoint]** `backend/handlers/messageDispatcher.ts:1138` (`dispatchIncomingMessages`): Calls validateAndApplyPromo() before payment without reserving quota.
2. **[propagation]** `backend/database/sqlite.ts:1151` (`validateAndApplyPromo`): Reads promo.usedCount >= promo.quota non-atomically without incrementing or locking.
3. **[sink]** `backend/handlers/messageDispatcher.ts:215` (`onPaid`): Unconditionally executes UPDATE promo_codes SET used_count = used_count + 1 without quota check.

### Supporting Source Evidence

- `backend/database/sqlite.ts:1151`: Non-atomic usedCount >= quota check.
- `backend/handlers/messageDispatcher.ts:215`: Post-payment increment lacks WHERE used_count < quota guard.

### Conditions and Containment

- **timing_dependency**: Two or more buyers apply the same promo code before the first order completes payment.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Concurrent WhatsApp buyers or parallel sessions redeeming a quota=1 promo code.
- **Target-Native Inputs / Payloads**:
  - `Two concurrent validateAndApplyPromo({ code: "RACEONE" }) calls against quota=1`
- **Bounded Execution Steps**:
  1. Create dummy promo code RACEONE with quota = 1 in sandbox SQLite DB.
  2. Invoke validateAndApplyPromo() twice before payment completes and run the post-payment increment.
- **Observed Result**: Sandbox CHK_08 confirmed both validations returned isValid=true/true for configuredQuota=1, leaving finalUsedCount=2.

### Remediation and Regression Case

- **Remediation Strategy**: Atomically reserve promo usage inside a SQLite transaction at invoice creation using a conditional UPDATE (WHERE quota IS NULL OR used_count < quota) checking changes === 1, and decrement on invoice expiry/cancellation.
- **Proposed Code Changes**:
  - File: `backend/database/sqlite.ts`
```ts
const res = db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND is_active = 1 AND (quota IS NULL OR used_count < quota)').run(promo.id);
if (res.changes === 0) return { isValid: false, errorMessage: 'Kuota promo habis' };
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.

## 14. [MEDIUM] Tenant Sessions Not Revoked on Password Change and Auth Cookies Lack HttpOnly/SameSite/Secure

- **Fingerprint**: `session.no-revocation-on-pw-change-and-weak-cookies`
- **Severity**: **MEDIUM** (Likelihood: `medium` - Applies to every tenant password change and login response. | Impact: `medium` - Old compromised tokens remain valid for up to 7 days after password rotation, and cookies are readable by client scripts.)
- **Confidence**: `high` - Confirmed by source inspection and sandbox CHK_09.

### Root Cause and Intended Behavior

- **Description**: updateTenantPassword() in backend/services/authManager.ts updates password hashes without invalidating existing sessions in activeSessions, allowing stolen tokens to stay valid up to 7 days after password rotation. Additionally, backend/routes/authRoutes.ts sets tenant_id and auth_token cookies with httpOnly: false and omits SameSite and Secure flags.
- **Root Cause**: authManager.ts:307-405 never iterates/deletes activeSessions entries for tenantId on password update; authRoutes.ts:39-40,64,75 sets httpOnly: false without sameSite/secure.
- **Intended Behavior**: Password changes must revoke existing tenant sessions (except optionally the current caller token), and authentication cookies must set httpOnly: true, sameSite: "lax" (or "strict"), and secure: true over HTTPS.

### Ordered Source Trace

1. **[entrypoint]** `backend/routes/authRoutes.ts:39` (`POST /api/auth/login`): Issues session token and sets cookies with httpOnly: false and no SameSite/Secure.
2. **[propagation]** `backend/services/authManager.ts:373` (`updateTenantPassword`): Updates password hashes in master.db and tenant DB without clearing activeSessions.
3. **[sink]** `backend/services/authManager.ts:183` (`getSession`): Returns old activeSessions entry as valid after password change.

### Supporting Source Evidence

- `backend/services/authManager.ts:397`: Returns success from updateTenantPassword without touching activeSessions.
- `backend/routes/authRoutes.ts:39`: Sets tenant_id and auth_token cookies with httpOnly: false and no SameSite/Secure.

### Conditions and Containment

- **authentication_level**: Prior session token remains valid across password change; cookies exposed to JS via httpOnly: false.

### Bounded Local Reproduction & Observed Output

- **Dummy Attacker / Principal**: Holder of a previously captured tenant session token or script reading document.cookie.
- **Target-Native Inputs / Payloads**:
  - `POST /api/auth/login -> Set-Cookie headers`
  - `updateTenantPassword() followed by getSession(oldToken)`
- **Bounded Execution Steps**:
  1. Create a dummy victim session, invoke updateTenantPassword() with valid old and new passwords, and query getSession(oldToken).
  2. Issue POST /api/auth/login and inspect Set-Cookie response headers.
- **Observed Result**: Sandbox CHK_09 confirmed oldTenantSessionStillValidAfterPwChange=true and Set-Cookie=["tenant_id=t_wanzt; Max-Age=604800; Path=/; Expires=Sun, 22 Nov 2026 09:51:41 GMT","auth_token=3e66c8b4552d0a36e1d57ce9cb9ffc575aa404cb0d3f0ba374102ce49e4d3ebc; Max-Age=604800; Path=/; Expires=Sun, 22 Nov 2026 09:51:41 GMT"] (missing HttpOnly, SameSite, Secure).

### Remediation and Regression Case

- **Remediation Strategy**: Delete all activeSessions entries matching tenantId upon updateTenantPassword() (and on tenant suspension/expiry), and switch auth cookies to httpOnly: true, sameSite: "lax", secure: isHttps.
- **Proposed Code Changes**:
  - File: `backend/services/authManager.ts`
```ts
for (const [tok, sess] of activeSessions.entries()) {
  if (sess.tenantId === tenantId) activeSessions.delete(tok);
}
```
- **Regression Test Case**: Re-run the bounded payload(s) above against the patched handler in an isolated sandbox and verify the request is rejected (HTTP 401/403/400/429 or server-recalculated invariant) with no unauthorized state change or secret disclosure.
