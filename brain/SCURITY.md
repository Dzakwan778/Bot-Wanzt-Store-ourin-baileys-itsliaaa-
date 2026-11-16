# Jadwal Perbaikan Keamanan SaaS (SCURITY.md)

Dokumen ini berisi rencana bertahap perbaikan keamanan hasil audit penuh (`security-audit-skill-main/wanzt-bot/run-1/REPORT.md`), disusun berdasarkan **tingkat kepentingan untuk operasional SaaS multi-tenant** dan dibagi menjadi **6 sesi kerja** agar mudah dipantau serta dieksekusi bertahap.

---

## Ringkasan Progres Sesi

| Sesi | Prioritas SaaS | Fokus Utama | Jumlah Temuan | Status |
|---|---|---|---|---|
| **Sesi 1** | P0 - Darurat | Isolasi Multi-Tenant & Autentikasi Endpoint Tenant | 5 temuan (2 Critical, 2 High, 1 Cross-Tenant) | `[x] Selesai` |
| **Sesi 2** | P0/P1 - Darurat | Integritas Webhook Pembayaran & Anti-Manipulasi Harga Order | 2 temuan (1 Critical, 1 High) | `[x] Selesai` |
| **Sesi 3** | P1 - Tinggi | Anti-SSRF Proxy Eksternal & Peningkatan Kriptografi | 2 temuan (1 Critical, 1 High) | `[x] Selesai` |
| **Sesi 4** | P2 - Menengah | Siklus Hidup Sesi, Token Impersonasi, Cookie & Atomisitas Kuota | 3 temuan (2 Medium, 1 Low) + Hardening | `[ ] Belum Dimulai` |
| **Sesi 5** | P2 - Menengah | Lockout Master Admin/Partner IP Trust & Legacy Endpoint | 3 temuan (2 Medium, 1 Low) | `[ ] Belum Dimulai` |
| **Sesi 6** | P3 - Produksi | CORS, Escape HTML Telegram, Script VPS & Verifikasi Live TLS/Port | 2 temuan (1 Medium, 1 Low) + 1 Needs Validation | `[ ] Belum Dimulai` |

---

## Sesi 1: Isolasi Multi-Tenant & Autentikasi Endpoint Tenant
**Prioritas**: P0 (Wajib sebelum SaaS dibuka untuk tenant/publik)
**Tujuan**: Menutup akses tanpa login ke API bot/toko, mencegah kebocoran API key merchant, menghentikan override tenant lewat header/query, dan mencegah pembuatan file SQLite liar.

### Daftar Temuan Terkait
- [x] `auth.unauthenticated-bot-control-and-key-leak` (Critical)
- [x] `auth.unauthenticated-tenant-operational-apis` (Critical)
- [x] `authz.tenant-middleware-override-and-unbounded-db` (Critical)
- [x] `auth.unauthenticated-telegram-config-leak-and-write` (High)
- [x] `auth.unauthenticated-tenant-username-and-store-takeover` (High)

### Tugas Teknis
- [x] Pastikan `frontend/src/` mengirim header `Authorization: Bearer <token>` pada seluruh panggilan API operasional agar dashboard tenant tidak putus saat endpoint dikunci.
- [x] Hapus fallback `X-Tenant-Id` / `tenant_id` di `getAuthSessionFromReq` (`backend/routes/authRoutes.ts:168-173`) agar request tanpa sesi valid mengembalikan `null` (`401`).
- [x] Terapkan middleware `requireTenantAuth` pada seluruh router operasional:
  - `backend/routes/botRoutes.ts` (`/api/bot/*`)
  - `backend/routes/telegramRoutes.ts` (`/api/bot/telegram/*`)
  - `backend/routes/pricingRoutes.ts` (`/api/pricing/*`)
  - `backend/routes/promoRoutes.ts` (`/api/promos/*`)
  - `backend/routes/transactionRoutes.ts` (`/api/transactions/*`)
  - `backend/routes/mediaRoutes.ts` (`/api/media/*`)
  - `backend/routes/tenantTemplateRoutes.ts` (`/api/bot/templates/*`)
  - `backend/routes/tenantTokenRoutes.ts` (`/api/bot/redeem-token` - ambil `tenantId` dari sesi, bukan `req.body.tenantId`)
  - `backend/routes/xavieraRoutes.ts` (`/api/xaviera/*`) dan `backend/routes/lunasQrisRoutes.ts` (`/api/lunasqris/*` kecuali `/webhook`)
  - `backend/routes/authRoutes.ts` (`/api/auth/store-setup`, `/api/auth/store-status`, `/api/auth/profile/*`)
- [x] Perbaiki `backend/app.ts:57-117`: ambil `tenantId` hanya dari sesi terverifikasi (tolak override `X-Tenant-Id` dan `?tenant=`), dan cek eksistensi tenant di `master.db` sebelum memanggil `initTenantDb()`.
- [x] Perbaiki `backend/services/tenantStatusService.ts`: ubah `enforceRealtimeTenantExpiry()` menjadi fail-closed jika tenant tidak ditemukan di `master.db`.
- [x] Masking `xavieraApiKey`, `lunasQrisApiKey`, `lunasQrisSecretKey`, dan Telegram `botToken` pada respons `GET /api/bot/status` dan `GET /api/bot/telegram/config`.

### Kriteria Selesai (DoD)
- [x] Request tanpa token ke semua endpoint operasional tenant menghasilkan HTTP `401`.
- [x] Header `X-Tenant-Id` atau `?tenant=ghost` tidak lagi menimpa sesi atau membuat file `database/tenants/*.db` baru.
- [x] Dashboard tenant tetap login dan seluruh tab bekerja normal (`npm run lint` & `npm run build` lulus).

---

## Sesi 2: Integritas Webhook Pembayaran & Anti-Manipulasi Harga Order
**Prioritas**: P0/P1 (Melindungi pendapatan dan mencegah order palsu)
**Tujuan**: Memastikan tidak ada order lunas tanpa pembayaran sah dan tidak ada invoice Rp 1 dari manipulasi tombol interaktif WhatsApp.

### Daftar Temuan Terkait
- [x] `webhook.lunasqris-failopen-replay-and-amount-bypass` (Critical)
- [x] `logic.whatsapp-order-var-price-tampering` (High)

### Tugas Teknis
- [x] Perbaiki `backend/routes/lunasQrisRoutes.ts` & `backend/services/lunasQrisService.ts`:
  - Ubah verifikasi signature menjadi **fail-closed**: tolak dengan `401`/`503` bila `lunasQrisSecretKey` tenant kosong.
  - Tambahkan validasi batas usia timestamp pada `verifyLunasQrisSignature()` (maksimal `<= 300` detik) untuk mencegah replay attack.
  - Pastikan pembaruan status order hanya memproses transaksi berstatus `'pending'` secara atomik dan memverifikasi nominal bayar dari webhook cocok dengan total order di SQLite `transactions`.
- [x] Perbaiki `backend/handlers/messageDispatcher.ts:576-588` (serta cek keselarasan `backend/messages/carouselMessage.ts`):
  - Abaikan nilai harga jual yang berasal dari string tombol WhatsApp `order_var:produk|varian|harga`.
  - Gunakan hanya nama/ID produk & varian untuk membaca harga dasar otoritatif dari `getProductVariants(productName, config)` lalu hitung harga jual melalui `calculateSellingPriceForVariant()` di server; tolak order jika produk/varian tidak ditemukan.

### Kriteria Selesai (DoD)
- [x] Webhook dengan `secretKey` kosong, timestamp kedaluwarsa, atau nominal lebih kecil dari tagihan ditolak server.
- [x] Payload tombol `order_var:` dengan harga diubah menjadi `1` tetap menerbitkan invoice menggunakan harga resmi server.
- [x] `npm run lint` & `npm run build` lulus.

---

## Sesi 3: Anti-SSRF Proxy Eksternal & Peningkatan Kriptografi
**Prioritas**: P1 (Perlindungan jaringan internal, kunci API, dan hash password)
**Tujuan**: Mencegah server dimanfaatkan untuk probing jaringan lokal / mencuri API key via proxy, serta menyingkirkan hash lemah, kredensial default, dan PRNG tidak aman.

### Daftar Temuan Terkait
- [x] `ssrf.payment-and-supplier-proxy-key-exfil` (High)
- [x] `crypto.weak-kdf-static-salt-and-default-creds` (Critical)

### Tugas Teknis
- [x] Perbaiki `backend/routes/lunasQrisRoutes.ts`, `backend/routes/xavieraRoutes.ts`, dan `backend/services/lunasQrisService.ts`:
  - Hapus kemampuan override `baseurl`/`baseUrl` per-request dari query/body pada endpoint LunasQRIS.
  - Untuk `xavieraBaseUrl` (domain toko dinamis per tenant), wajibkan skema `https://`, lakukan resolusi DNS sebelum request untuk menolak seluruh IP privat/loopback/link-local (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, dan range lokal IPv6), dan pasang `redirect: 'error'` pada `fetch()`.
- [x] Perbaiki `admin-backend/database/masterSqlite.ts` & `backend/services/authManager.ts`:
  - Tingkatkan `hashPassword` ke `crypto.scrypt` atau PBKDF2-SHA256 minimal 600.000 iterasi dengan salt acak 16-byte per akun (siapkan kompatibilitas verifikasi transparan saat login lama lalu re-hash).
  - Hapus kredensial default hardcoded dari kode sumber (`wan_admin773`, `wanzt`, `admin`, `superadmin`); pindahkan inisialisasi awal ke environment variable bootstrap (`ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD`) atau one-time setup token.
  - Ganti seluruh komparasi hash `===` di `backend/services/authManager.ts:117,346` dengan `crypto.timingSafeEqual`.
- [x] Perbaiki `admin-backend/utils/generatorUtils.ts` dan lokasi pembangkit token/password lain: ganti seluruh `Math.random()` ke `crypto.randomBytes()` / `crypto.randomInt()`.

### Kriteria Selesai (DoD)
- [x] Permintaan ke host `http://127.0.0.1` atau IP privat via proxy LunasQRIS/Xaviera ditolak sebelum `fetch()` dipanggil.
- [x] Tidak ada lagi kredensial default hardcoded maupun `Math.random()` untuk rahasia; seluruh tes login admin & tenant berjalan normal.
- [x] `npm run lint` & `npm run build` lulus.

---

## Sesi 4: Siklus Hidup Sesi, Token Impersonasi, Cookie & Atomisitas Promo/Voucher
**Prioritas**: P2 (Ketahanan sesi jangka panjang & keadilan kuota promo/voucher)
**Tujuan**: Mencabut akses lama secara otomatis saat password berubah/admin logout, mengamankan cookie/impersonation, dan menghilangkan race condition kuota.

### Daftar Temuan & Hardening Terkait
- [ ] `session.no-revocation-on-pw-change-and-weak-cookies` (Medium)
- [ ] `session.impersonation-not-revoked-and-url-token` (Low)
- [ ] `race.promo-quota-toctou-oversubscription` (Medium)
- [ ] Hardening: Atomisitas `TokenService.redeemToken` (`admin-backend/services/tokenService.ts:177-239`) & hapus redundansi `activeAdminTokens` Set (`admin-backend/services/adminAuthService.ts:14`).

### Tugas Teknis
- [ ] Di `backend/services/authManager.ts` & `backend/routes/authRoutes.ts`:
  - Hapus seluruh entri `activeSessions` milik `tenantId` saat `updateTenantPassword()`, suspensi, atau expired.
  - Set atribut cookie sesi menjadi `httpOnly: true`, `sameSite: 'lax'`, dan `secure: true` (saat HTTPS).
- [ ] Di `admin-backend/services/adminAuthService.ts` & `admin-backend/routes/impersonateRoutes.ts`:
  - Kaitkan `impersonationTokens` dengan sesi Master Admin pembuatnya agar ikut hangus saat admin logout atau ganti password.
  - Ubah mekanisme impersonasi menjadi kode penukaran sekali pakai via `POST` alih-alih mengirim token jangka panjang melalui URL `?impersonate=`.
  - Hapus `activeAdminTokens` Set yang redundan jika validasi sudah sepenuhnya bersandar pada tabel SQLite `admin_sessions`.
- [ ] Di `backend/handlers/messageDispatcher.ts`, `backend/database/sqlite.ts`, dan `admin-backend/services/tokenService.ts`:
  - Lakukan reservasi kuota promo secara atomik saat invoice dibuat di dalam `db.transaction(...)` menggunakan `UPDATE promo_codes SET used_count = used_count + 1 WHERE ... AND (quota IS NULL OR used_count < quota)` dan cek `changes === 1` (kembalikan kuota bila invoice batal/expired).
  - Bungkus `TokenService.redeemToken` dalam `db.transaction(...)` dengan kondisi `WHERE id = ? AND status = 'available'`.

### Kriteria Selesai (DoD)
- [ ] Token tenant lama langsung gagal (`401`) setelah ganti password; token impersonasi ikut mati saat Master Admin logout/ganti password.
- [ ] Dua transaksi paralel pada promo/voucher berkuota 1 hanya meloloskan tepat 1 transaksi.
- [ ] `npm run lint` & `npm run build` lulus.

---

## Sesi 5: Keamanan Lockout IP Trust & Penghapusan Legacy Endpoint
**Prioritas**: P2 (Proteksi brute-force & pembersihan permukaan API lama)
**Tujuan**: Mencegah spoofing IP lewat header `X-Forwarded-For` pada login Master Admin dan Partner API, serta menutup endpoint legacy `/api/apartment/*`.

### Daftar Temuan Terkait
- [ ] `auth.apartment-unauthenticated-read-endpoints` (Medium)
- [ ] `auth.xff-spoof-admin-lockout-bypass` (Medium)
- [ ] `ratelimit.xff-spoof-partner-api-bypass` (Low)

### Tugas Teknis
- [ ] Evaluasi `backend/routes/apartmentRoutes.ts`: nonaktifkan router legacy `/api/apartment/*` jika sudah tergantikan penuh oleh `/api/admin/*`, atau pasang `requireMasterAdminAuth` pada seluruh route `GET` (`/stats`, `/tenants`, `/current-lease`, `/tenants/:id`) dan hapus fallback `req.query.token`.
- [ ] Konfigurasikan `app.set('trust proxy', 1)` di Express (`backend/app.ts`) dan perbaiki `normalizeClientIp` (`admin-backend/utils/adminSecurityUtils.ts`) serta `getClientIp` (`admin-backend/routes/partnerPublicRoutes.ts`) agar menggunakan `req.ip` yang terpercaya, bukan parsing manual entri paling kiri header `X-Forwarded-For`.
- [ ] Tambahkan lockout gagal login berbasis `username` selain IP di `AdminAuthService.login`, dan tambah fallback rate limit global untuk percobaan key invalid di Partner API.

### Kriteria Selesai (DoD)
- [ ] Mengganti header `X-Forwarded-For` berulang kali tidak mereset hitungan brute-force Master Admin maupun rate limit Partner API.
- [ ] `GET /api/apartment/*` tanpa token admin ditolak (`401` atau `404` jika dinonaktifkan).
- [ ] `npm run lint` & `npm run build` lulus.

---

## Sesi 6: Pengerasan Produksi (CORS, Notifikasi Telegram, Script VPS & Audit Live Server)
**Prioritas**: P3 (Kesiapan deployment produksi aman)
**Tujuan**: Mengunci konfigurasi lintas-origin, mencegah injeksi markup Telegram, memperketat script VPS, dan memastikan TLS + firewall live VPS benar.

### Daftar Temuan & Verifikasi Terkait
- [ ] `config.wildcard-cors-and-vps-script-exposure` (Medium)
- [ ] `injection.telegram-html-markup-interpolation` (Low)
- [ ] `deploy.vps-tls-and-port5000-exposure` (`needs_validation` - verifikasi oleh pemilik VPS)
- [ ] Hardening `frontend/src/components/tabs/TabTransaksi.tsx:346` & security HTTP headers

### Tugas Teknis
- [ ] Di `backend/app.ts`: ganti `cors()` wildcard menjadi `cors({ origin: allowedOrigins })` berbasis environment variable `CORS_ORIGINS`, serta tambahkan header keamanan dasar (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security` saat HTTPS).
- [ ] Di `backend/services/telegramService.ts`: buat helper `escapeTelegramHtml()` untuk meng-escape karakter `&`, `<`, dan `>` pada seluruh variabel dinamis (`storeName`, `productName`, `variantName`, `reason`, `adminMessage`) sebelum dikirim dengan `parse_mode: 'HTML'`.
- [ ] Di `frontend/src/components/tabs/TabTransaksi.tsx`: tambahkan validasi eksplisit `https:` sebelum merender `trx.paymentUrl` pada tautan tombol bayar.
- [ ] Di `deploy-vps.sh`:
  - Jalankan Node.js dengan user non-root khusus.
  - Hapus `chmod 755 /root` dan `chmod -R 755 "$APP_DIR"`; terapkan izin ketat `700`/`600` pada folder `database/` dan `auth_info_baileys/`.
  - Bind backend Express ke `127.0.0.1:5000` dan hapus `ufw allow 5000/tcp` agar trafik publik wajib lewat Nginx HTTPS.
- [ ] **Checklist Verifikasi Mandiri di VPS Live (Anda lakukan via SSH)**:
  - Jalankan `ss -tulnp | grep 5000` (pastikan listen di `127.0.0.1:5000`, bukan `0.0.0.0:5000`).
  - Jalankan `ufw status verbose` dan periksa firewall cloud provider untuk memastikan TCP port `5000` tertutup dari internet.
  - Periksa `/etc/nginx/sites-enabled/bot-whatsapp` untuk memastikan sertifikat SSL/TLS (`certbot --nginx`) aktif dan HTTP port 80 dialihkan otomatis ke HTTPS.

### Kriteria Selesai (DoD)
- [ ] Origin luar yang tidak terdaftar tidak mendapat header `Access-Control-Allow-Origin: *`.
- [ ] Seluruh pesan Telegram tidak merender tag HTML liar dari input pengguna/toko.
- [ ] `npm run lint` & `npm run build` lolos bersih, dan seluruh checklist VPS live tercentang.

---

## Catatan Pengoperasian Saat Eksekusi
Untuk memulai sesi mana pun, cukup instruksikan misalnya: **"Kerjakan Sesi 1 di brain/SCURITY.md"** dan setelah selesai saya akan langsung memperbarui tanda centang `[x]` serta status di tabel dokumen ini.
