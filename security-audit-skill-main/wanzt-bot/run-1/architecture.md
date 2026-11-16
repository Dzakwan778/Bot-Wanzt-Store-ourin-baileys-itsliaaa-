# Architecture Summary: Wanzt Bot Multi-Tenant Store & Master Admin

## 1. Product, Principals, and Protected Resources
Wanzt Bot is a multi-tenant WhatsApp/Telegram digital-store automation platform backed by per-tenant SQLite stores (`database/tenants/<id>.db`) and a shared master control database (`database/master.db`).
- **Principals**:
  1. **Unauthenticated HTTP callers**: Public internet/local callers reaching Express APIs on port 3000/5000.
  2. **WhatsApp / Telegram end-customers**: Untrusted chat users sending interactive messages, button IDs, and promo codes over WhatsApp (`@itsliaaa/baileys`).
  3. **Payment Gateway / External Callback Senders**: Callers targeting `POST /api/lunasqris/webhook`.
  4. **Collaborator Partners**: External API consumers authenticating with bearer/header keys at `/api/v1/partner/*`.
  5. **Store Tenants (Operators)**: Store owners logging into `frontend` (`/`) to configure WhatsApp Baileys sessions, Xaviera/LunasQRIS API keys, pricing margins, promos, and Telegram credentials.
  6. **Master Super Admins**: Platform administrators logging into `admin-frontend` (`/admin/`) to create/suspend/delete tenants, issue voucher tokens, impersonate tenants, manage broadcasts, and create partner keys.
- **Protected Resources**: Tenant credentials (`xavieraApiKey`, `lunasQrisApiKey`, `lunasQrisSecretKey`, Telegram `botToken`/`chatId`), Baileys Signal keys (`auth_info_baileys/tenant_*`), transaction/promo integrity, `master.db` super-admin/partner tables, and server network egress.

## 2. Tech Stack, Entry Modes, and Build/Test Limits
- **Stack**: TypeScript, Node.js (v22), Express 5, `better-sqlite3`, `@itsliaaa/baileys`, React 19 + Vite, PM2 (`ecosystem.config.cjs`), Nginx/UFW deployment script (`deploy-vps.sh`).
- **Modes**: Integrated fullstack dev/prod (`server.ts`, port 3000) serving tenant SPA + `/admin/` SPA; split backend (`backend/server.ts`, port 5000) + Nginx static/proxy (`deploy-vps.sh`).
- **Offline Verification**: `npm run lint` runs offline, and Express routes / pure services / SQLite managers run cleanly inside `unshare -r -n -m` with read-only `/tmp/sbox_ro` and scratch `cwd` using dummy tenants and isolated loopback mocks. External endpoints (`lunasqris.com`, `xavierastore.com`, `api.telegram.org`, WhatsApp servers) and live VPS deployment posture (HTTPS, cloud firewall, host nginx) are strictly offline/unobservable.

## 3. Entry Surfaces and Critical Source-to-Sink Paths
- **Global Tenant Resolution (`backend/app.ts:57-117`)**: Extracts `tenantId` from query (`?impersonate=`, `?tenant=`), Bearer token, `X-Tenant-Id` (which overwrites prior Bearer resolution), or `tenant_id` cookie, calls `initTenantDb(tenantId)` (creating `database/tenants/<id>.db`), and executes request inside `tenantContextStorage`.
- **Tenant REST Routers (`backend/app.ts:125-136`)**: `/api/auth`, `/api/bot`, `/api/bot/telegram`, `/api/pricing`, `/api/promos`, `/api/xaviera`, `/api/lunasqris`, `/api/transactions`, `/api/media`, `/api/apartment`. Most routes lack authentication middleware entirely.
- **WhatsApp Message Pipeline (`backend/handlers/messageDispatcher.ts`)**: Parses incoming Baileys interactive payloads (`order_var:product|variant|price`), creates LunasQRIS invoices, polls status, and triggers Telegram HTML notifications (`backend/services/telegramService.ts`).
- **Master Admin Router (`admin-backend/routes/adminRoutes.ts`)**: `/api/admin/auth/*` handles login/lockout/password change via `normalizeClientIp`; remaining `/api/admin/*` routes enforce `requireMasterAdminAuth`.
- **Partner API (`admin-backend/routes/partnerPublicRoutes.ts`)**: Authenticates SHA-256 hashed keys on `/api/v1/partner/*` with IP rate limiting.

## 4. Trust Boundaries and Controls
- **Tenant vs. Unauthenticated / Cross-Tenant**: Currently unauthenticated across `/api/bot`, `/api/pricing`, `/api/promos`, `/api/transactions`, `/api/xaviera`, `/api/lunasqris`, `/api/media`, `/api/bot/telegram`, and `GET /api/apartment/*`; `getAuthSessionFromReq` falls back to unauthenticated `X-Tenant-Id`/`tenant_id`; `TenantStatusService.enforceRealtimeTenantExpiry` defaults unknown tenants to `active`.
- **Master Admin Boundary**: Enforced by `requireMasterAdminAuth` backed by SQLite `admin_sessions`, though login lockout trusts spoofable `X-Forwarded-For` and `hashPassword` uses a static salt with 1,000 PBKDF2 iterations.
- **Webhook Integrity**: `POST /api/lunasqris/webhook` checks HMAC-SHA256 only when `lunasQrisSecretKey` is non-empty, omitting timestamp replay window and paid-amount checks.
- **SQL & Media Path Controls**: `better-sqlite3` uses parameterized queries; `mediaManager.ts` normalizes tenant IDs and applies `path.basename`.

## 5. Companion Selection Summary
- **WEB-PROTOCOL-AND-AUTH.md**: HTTP header IP trust (`X-Forwarded-For`), browser cookie/token storage, API key rate limits, session revocation.
- **CLIENT-SIDE.md**: Frontend URL scheme rendering (`paymentUrl`), `localStorage` token handling.
- **DATA-ISOLATION-AND-LIFECYCLE.md**: Multi-tenant isolation middleware, session/impersonation revocation on logout and password change.
- **PROTOCOLS-RPC-AND-MESSAGING.md**: Webhook HMAC verification/replay, interactive WhatsApp message framing, group admin checks.
- **RESOURCE-EXHAUSTION-AND-AVAILABILITY.md**: Unauthenticated tenant DB/directory creation, promo quota concurrency.
- **CLOUD-AND-DEPLOYMENT.md**: Wildcard CORS, `deploy-vps.sh` file permissions (`chmod -R 755`), exposed port 5000, missing TLS proxy config.
- **Excluded**: `MEMORY-SAFETY-AND-BINARY.md`, `AI-AND-LLM.md`, `SUPPLY-CHAIN-AND-RELEASE.md`, `DESKTOP-MOBILE-AND-LOCAL-IPC.md`.
