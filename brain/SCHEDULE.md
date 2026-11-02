# Jadwal & Perencanaan Proyek (schedule.md)

Dokumen ini mencatat rencana kerja, roadmap fitur, target tonggak pencapaian (*milestones*), dan penjadwalan integrasi sistem untuk proyek **WhatsApp Bot Store Manager & Dashboard**.

---

## 🗺️ Roadmap & Rencana Pengembangan

### 1. Rencana Integrasi Payment Gateway SairiPedia & Xaviera (Privacy-First Flow)
- **Status Rencana**: Selesai Diimplementasikan (Completed) - Form API Sairi aktif di Tab Connection & Alur Transaksi Privacy-First berjalan otomatis.
- **Alur Transaksi yang Direncanakan (User Requirement)**:
  1. **Trigger Pembelian di Grup**: Pembeli melakukan interaksi pemesanan melalui grup WhatsApp (`@g.us`).
  2. **Kirim Carousel Varian**: Bot merespon di grup dengan menampilkan kartu horizontal carousel varian produk yang dipilih.
  3. **Pemilihan Varian & Klik Order**: Pembeli memilih varian dan menekan tombol Order pada kartu varian.
  4. **Pre-check Saldo Utama Xaviera**: Bot memeriksa apakah saldo akun utama di API Xaviera mencukupi untuk memproses varian tersebut ke supplier.
  5. **Pengiriman Invoice QRIS ke Chat Pribadi (DM)**:
     - Jika saldo Xaviera cukup, bot membuat invoice QRIS via SairiPedia API (`/api/invoice`).
     - Bot mengirimkan invoice lengkap (gambar QRIS, Invoice ID, Amount, Fee, Total, dan Waktu Kedaluwarsa) **secara pribadi (DM/PM) ke nomor pembeli**, BUKAN di grup.
     - Di grup, bot hanya mengirimkan notifikasi singkat bahwa invoice telah dikirim ke chat pribadi pembeli.
  6. **Pembayaran oleh Pembeli**: Pembeli melakukan scan dan pembayaran QRIS.
  7. **Validasi & Polling Pembayaran**: Bot melakukan validasi status pembayaran ke API SairiPedia (`/api/invoice/status`) tiap 4 detik.
  8. **Request Pemesanan ke Xaviera**: Setelah pembayaran lunas (`paid`), bot memproses order ke supplier.
  9. **Pengiriman Detail Produk Sensitif via DM**: Bot mengirimkan output produk (seperti akun APK Premium: email, password, profil, panduan) **secara ketat melalui chat pribadi pembeli** agar kredensial rahasia tidak bocor ke publik grup.

### 3. Rencana Arsitektur Headless Backend (Pure Node.js Bot Tanpa Dashboard)
- **Status Rencana**: Tahap Diskusi / Rencana Masa Depan (Rencana Awal).
- **Latar Belakang & Analisis**:
  - Pengguna merencanakan opsi mengubah bot menjadi murni backend (*headless*) tanpa dashboard web GUI React.
  - **Kelayakan Teknis**: **100% Sangat Bisa & Sangat Layak**. Semua fungsi bot WhatsApp (koneksi Baileys, scan QR/pairing code via terminal CLI, penerimaan pesan/event listener, pengiriman kartu Carousel/Native Flow buttons, auto order ke supplier Xaviera, polling/webhook payment gateway LunasQRIS/Sairi, dan pengiriman kredensial akun via DM) dieksekusi 100% oleh runtime Node.js di server. Frontend React/Vite selama ini hanyalah lapisan visual (UI) untuk monitoring dan konfigurasi.
  - **Keuntungan Headless**:
    - Konsumsi RAM dan CPU di VPS jauh lebih hemat (tidak perlu menjalankan Vite build/dev server web).
    - Proses deployment lebih ringkas (cukup dijalankan dengan `pm2 start index.js`).
    - Stabilitas lebih tinggi karena tidak ada risiko desinkronisasi antara state React dan memori backend.
- **Rekomendasi Peletakan API Key & Secret Key**:
  1. **Kredensial Sensitif & Rahasia (`.env`)**:
     - Tempat: File `.env` di root folder (dibaca menggunakan modul bawaan Node.js `process.env` atau `dotenv`).
     - Komponen:
       - `LUNASQRIS_API_KEY=pk_live_...`
       - `LUNASQRIS_SECRET_KEY=sk_live_...`
       - `XAVIERA_API_KEY=...`
       - `XAVIERA_SECRET_KEY=...`
       - `BOT_PHONE_NUMBER=628...`
       - `PORT=3000` (untuk webhook receiver jika menggunakan webhook)
     - Alasan: File `.env` dimasukkan ke `.gitignore` agar tidak pernah ter-push ke GitHub publik, aman dari kebocoran kredensial, dan menjadi standar industri di lingkungan VPS/server production.
  2. **Konfigurasi Operasional Toko (`config.json` atau `data/settings.json`)**:
     - Komponen: Margin keuntungan (markup persen/nominal), teks template pesan, daftar ID grup yang diizinkan (whitelist), auto-reply switcher, durasi timeout invoice QRIS.
     - Alasan: Bisa diedit sewaktu-waktu atau diperbarui via perintah chat bot WhatsApp (misal perintah admin: `!setmargin 10%`) tanpa harus me-restart proses bot di VPS (*hot-reloading*).

### 4. Rencana & Panduan Deployment VPS (IP: 139.59.97.50)
- **Status Rencana**: Tahap Perencanaan & Panduan Deployment Siap Pakai.
- **Tujuan**: Memasang dan menjalankan WhatsApp Bot Store & Dashboard Wanzt Store secara persisten 24/7 di VPS Ubuntu/Debian pengguna (`139.59.97.50`).
- **Arsitektur Produksi di VPS**:
  1. **Runtime Node.js 20 LTS**: Menjalankan engine Baileys, Express/Vite middleware, dan handler LunasQRIS/Xaviera.
  2. **Process Manager (PM2)**: Menjaga bot tetap aktif 24 jam non-stop, otomatis restart jika terjadi crash, dan otomatis aktif kembali saat VPS reboot (`pm2 startup`).
  3. **Web Server & Reverse Proxy (Nginx)**: Meneruskan lalu lintas HTTP/HTTPS dari IP atau custom domain ke port 3000, serta menangani WebSocket upgrade.
  4. **Keamanan & SSL (Let's Encrypt / Certbot)**: Mengamankan endpoint webhook LunasQRIS (`https://domain.com/api/lunasqris/webhook`) dengan sertifikat SSL gratis.
  5. **Firewall (UFW)**: Mengamankan port server (hanya membuka SSH 22, HTTP 80, HTTPS 443, dan port 3000).
- **Alasan Teknis AI Tidak Masuk SSH Langsung**:
  - Lingkungan cloud sandbox AI Studio tidak memiliki terminal SSH interaktif keluar (*outbound interactive TTY*) untuk mengontrol server privat pihak ketiga.
  - Sesuai standar keamanan industri (*DevOps Best Practice*), hak akses root dan SSH ke server produksi wajib dikontrol secara mandiri oleh pemilik server melalui terminal pribadi (PuTTY / Termius / PowerShell / Terminal Mac-Linux) guna mencegah risiko *accidental lockout* atau kebocoran akses.
  - Untuk mempermudah pengguna, disediakan **Skrip Otomasi 1-Baris (`deploy-vps.sh`)** dan panduan langkah demi langkah yang tinggal di-*copy-paste*.

---

## 📅 Log Perencanaan Diskusi
Setiap ada ide rencana baru dari hasil diskusi atau instruksi pengguna, daftarkan ke tabel perencanaan di bawah ini:

| Tanggal | Topik Perencanaan | Rincian Rencana | Target Penyelesaian | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-10-23 | Integrasi Payment Gateway QRIS | Menerapkan integrasi pembayaran otomatis via SairiPedia API | Tahap Diskusi | Selesai |
| 2026-10-23 | Alur Transaksi Privasi Grup ke DM | Alur beli di grup -> invoice QRIS ke DM -> cek saldo Xaviera -> order Xaviera -> kredensial rahasia dikirim via DM | Perencanaan Alur | Selesai |
| 2026-10-24 | Form API Sairi di Tab Connection | Menambahkan form input API Key & Base URL Sairi pada Tab Connection bersama API Xaviera | Implementasi | Selesai |
| 2026-10-24 | Restorasi Tampilan & Data Tab Produk | Menyesuaikan tabel Tab Produk 100% presisi dengan tangkapan layar asli & unrolling varian API | Tahap 1 | Selesai |
| 2026-10-23 | Standarisasi File Dokumentasi | Menerapkan 4 pilar file `idea.md`, `progress.md`, `langkah_implementasi.md`, `schedule.md` | Selesai | Aktif |
| 2026-10-26 | Studi & Rencana Migrasi ke LunasQRIS | Mempelajari dokumentasi resmi LunasQRIS API (lunasqris.com/docs), komparasi dengan Sairi, dan perumusan arsitektur implementasi | Tahap Diskusi & Review | Selesai |
| 2026-10-26 | Konsep Headless Backend & Struktur Key | Evaluasi arsitektur headless (tanpa dashboard), verifikasi fitur Carousel & alur bot tetap jalan, rekomendasi struktur `.env` dan `config.json` | Tahap Diskusi & Review | Selesai Dicatat |
| 2026-10-26 | Implementasi Penuh LunasQRIS | Migrasi penuh payment gateway dari Sairi ke LunasQRIS (Dual-Key Auth, Dynamic QRIS + Kode Unik, Polling & Webhook HMAC-SHA256, Tab Connection UI) | Implementasi | Selesai Diimplementasikan |
| 2026-10-26 | Deployment ke VPS 139.59.97.50 | Panduan remote SSH, skrip otomasi `deploy-vps.sh`, instalasi Node.js 20, PM2, konfigurasi Nginx reverse proxy, dan setup webhook domain | Panduan & Skrip | Siap Diterapkan |


| 2026-10-27 | Command Invoice Dinamis & Tombol Interaktif | Menambahkan command Invoice pada Tab Command, template teks invoice kustom, dukungan placeholder ({storeName}, {ownerNumber}, {category}, {varian}, {price}, {produkName}, {adminNumber}, {webLink}, {orderId}, {total}, {unikCode}), tombol Quick Reply vCard (Admin/fallback Owner), dan tombol CTA URL Web Checkout | Tahap Implementasi | Selesai Diimplementasikan |
| 2026-10-27 | Migrasi Database ke SQLite (`better-sqlite3`) | Menggantikan file JSON lokal dengan SQLite database (`database/bot.db`) untuk transaksi & konfigurasi, mendukung ACID, zero-config untuk skrip siap jual, bebas biaya pihak ketiga | Roadmap Masa Depan | Terjadwal (Scheduled) |
| 2026-10-27 | Halaman Login Aman & Lock Wajib Store Info | Pembuatan sistem otentikasi login berbasis server (zero inspect leak), hashing aman, proteksi lock bot tanpa store info, dan pop-up modal wajib isi store info (non-dismissible) | Tahap Diskusi & Review | Menunggu Konfirmasi Eksekusi |

### 5. Rencana Command Invoice Dinamis & Pesan Interaktif Bot
- **Status Rencana**: Selesai Diimplementasikan (Completed).
- **Latar Belakang**: Memungkinkan pemilik toko mengatur sendiri teks invoice tagihan pembayaran QRIS melalui dashboard di Tab Command opsi "Invoice", tanpa perlu mengubah kode sumber.
- **Rincian Komponen**:
  1. **Opsi Command**: Menambahkan `'Invoice'` pada dropdown pilih command di Tab Command (`Menu`, `List`, `Carousel`, `Invoice`).
  2. **Template Teks & Footer**: Mengatur teks pesan invoice dengan tombol sisipkan placeholder dinamis dan form teks footer.
  3. **Placeholder Toko & Produk**: `{storeName}`, `{ownerNumber}`, `{category}`, `{varian}`, `{price}`, `{produkName}`, `{adminNumber}`, `{webLink}`.
  4. **Placeholder Transaksi Spesifik**:
     - `{orderId}`: ID pesanan unik (misal: `ORD-M5X91A-8821`).
     - `{total}`: Total pembayaran lunas presisi (harga jual + kode unik).
     - `{unikCode}`: Nominal kode unik / fee gateway.
  5. **Dua Tombol Interaktif Pesan Invoice**:
     - **Tombol 1 (Quick Reply - Hubungi Admin)**: Mengirimkan vCard kontak WhatsApp nomor admin toko. Jika form nomor admin kosong, otomatis fallback mengirimkan vCard nomor owner toko.
     - **Tombol 2 (CTA URL - Web Checkout)**: Tombol link langsung mengarahkan pembeli ke URL pembayaran web checkout LunasQRIS (`payment_url`).

### 6. Rencana Migrasi Database ke SQLite (`better-sqlite3`)
- **Status Rencana**: Terjadwal (Scheduled) - Tidak dieksekusi sekarang sesuai arahan pengguna.
- **Latar Belakang & Tujuan**:
  - Menggantikan sistem penyimpanan flat-file JSON lokal (`database/*.json`) dengan database relasional SQLite file tunggal (`database/bot.db`).
  - Menyiapkan arsitektur database yang tangguh, aman, dan *zero-configuration* untuk produk script bot yang siap dijual ke publik.
- **Keunggulan untuk Script yang Dijual**:
  1. **Zero-Configuration (Plug & Play)**: Pembeli script tidak perlu install service database eksternal (MySQL/Postgres) di VPS. Cukup jalankan bot, file database `.db` akan terbuat secara otomatis.
  2. **Bebas Ketergantungan Cloud & Biaya Bulanan**: Menghindari Firebase/Supabase yang merepotkan pembeli script (harus daftar akun, pasang API keys, dan risiko biaya kuota).
  3. **Keamanan Transaksi Bersamaan (ACID & WAL Mode)**: Mencegah risiko file corrupt saat banyak pesanan masuk di detik yang sama melalui mekanisme transaksi database yang solid.
  4. **Kemudahan Backup & Migrasi**: Pembeli script cukup mencadangkan satu file `bot.db` untuk menyimpan seluruh riwayat transaksi dan pengaturan toko.
  5. **Query Cepat & Fleksibel**: Mendukung query SQL lengkap untuk pagination riwayat transaksi, pencarian, dan rekap keuangan bulanan.
- **Rencana Skema Tabel**:
  - `transactions`: ID transaksi, order_id, customer_number, customer_name, product_name, variant_name, nominal, fee_gateway, total, payment_url, status (`pending`, `paid`, `cancel`), created_at, updated_at.
  - `store_config`: Pengaturan profil toko (nama store, owner, admin, web link).
  - `command_templates`: Template teks & footer dinamis untuk menu, list, carousel, dan invoice.
  - `api_config`: Kredensial API LunasQRIS dan Xaviera.

---

## 🚀 Roadmap Resmi Selanjutnya (Kesepakatan Produk)

Berikut adalah urutan roadmap bertahap yang telah disepakati untuk pengembangan selanjutnya:

### 1. Tahap 1 (Fokus Besok): Pengaturan Harga, Diskon & Kode Promo
- **Fitur Pengaturan Margin/Markup Harga Jual:** Pengaturan margin laba fleksibel (persentase atau nominal rupiah) per kategori atau per produk.
- **Sistem Diskon:** Diskon global atau khusus produk tertentu (dalam bentuk Rupiah `Rp` atau Persentase `%`).
- **Sistem Kode Promo / Kupon:** Pembuatan kode voucher (misal: `HEMAT10`, `DISKONMERDEKA`), kuota penggunaan, potongan harga, dan validasi otomatis saat pembeli memasukkan kode di chat WhatsApp.

### 2. Tahap 2: Rombak Total Tampilan Dashboard (Anti AI-Slop & Desain Modern)
- **Tujuan:** Desain ulang antarmuka dashboard agar tampil sangat premium, profesional, elegan, dan bersih dari kesan "AI Slop".
- **Prinsip Utama:** Menjaga 100% fungsionalitas yang ada tanpa menghilangkan satu pun fitur (koneksi WhatsApp, pairing code, grup whitelist, tab produk, SMM, Top Up, dan LunasQRIS).
- **Peningkatan:** Tipografi tegas, kontras warna yang nyaman di mata, transisi mikro yang halus, dan tata letak informasi yang lebih ergonomis.

### 3. Tahap 0: Migrasi Database ke SQLite & Pembersihan Workspace [SELESAI (COMPLETED)]
- **Status:** Selesai Diimplementasikan (100% Berhasil)
- **Implementasi:**
  - Database file tunggal di `database/bot.db` dengan mode WAL (*Write-Ahead Logging*).
  - Skema tabel relasional: `auth`, `store_info`, `api_config`, `commands_config`, `group_whitelist`, `transactions`.
  - Auto-migrasi otomatis dari file JSON lama tanpa kehilangan data sepeserpun.
  - Seluruh service backend (`authManager`, `configManager`, `groupService`, `transactionManager`) terhubung murni ke SQLite.
  - Pembersihan file usang di root folder: menghapus duplikat file `DESIGN (2).md`, `PROGRESS.md`, `Promt.md`, `commands_config.json`, dan folder duplikat `/server`. Seluruh dokumentasi terpusat di `/brain/`.

### 4. Tahap Selanjutnya 1: Pengaturan Harga Produk (Markup Rp & %), Diskon & Kode Promo
- **Fitur "Set Harga Produk" (SELESAI / COMPLETED):**
  - Panel form "Set Harga Produk" berada di posisi paling atas tab Produk.
  - Form input angka nominal/persentase dengan tombol toggle di samping kolom untuk berganti mode antara `Rp` dan `%`.
  - Logika perhitungan dinamis:
    - Mode `Rp`: Harga Jual = Harga Asli + Angka (misal: Rp 10.000 + 100 = Rp 10.100).
    - Mode `%`: Harga Jual = Harga Asli + (Harga Asli * Angka / 100) (misal: Rp 10.000 + 10% = Rp 11.000).
  - Terintegrasi penuh ke database SQLite (`bot.db` tabel `pricing_config`) dan sinkron ke bot WhatsApp (pesan carousel & checkout invoice QRIS).
  - Tampilan tabel produk otomatis menampilkan Harga Asli modal supplier, Harga Jual terhitung, dan badge margin laba.
- **Sistem Diskon (Next Sub-step):** Diskon global atau khusus produk tertentu (dalam bentuk Rupiah `Rp` atau Persentase `%`).
- **Sistem Kode Promo / Kupon (Next Sub-step):** Pembuatan kode voucher (misal: `HEMAT10`, `DISKONMERDEKA`), kuota penggunaan, potongan harga, dan validasi otomatis saat pembeli memasukkan kode di chat WhatsApp.

### 5. Tahap Selanjutnya 2: Rombak Total Tampilan Dashboard (Anti AI-Slop & Desain Modern)
- **Tujuan:** Desain ulang antarmuka dashboard agar tampil sangat premium, profesional, elegan, dan bersih dari kesan "AI Slop".
- **Prinsip Utama:** Menjaga 100% fungsionalitas yang ada tanpa menghilangkan satu pun fitur.

### 6. Tahap Selanjutnya 3: Auto-Order Layanan SMM & Top Up Game
- **Tujuan:** Mengembangkan alur order otomatis untuk kategori SMM (Followers, Likes, Views) dan Top Up Game langsung ke supplier Xaviera Store via WhatsApp, melengkapi fitur APK Premium yang sudah aktif saat ini.

### 7. Tahap Selanjutnya 4: "Fitur Apartemen" (Multi-Tenant & Master Admin Dashboard)
- **Dashboard Master / Super Admin (`/dashboard/adminutama`):**
  - Panel kontrol khusus pemilik (Owner).
  - Manajemen akun penyewa: Buat akun baru, atur durasi sewa, perpanjang masa sewa, dan tombol suspend/hapus akun.
- **Penyewa (Tenant) Dashboard:**
  - Login mandiri untuk tiap penyewa bot.
  - Setiap penyewa mendapatkan bot WhatsApp mereka sendiri (*multi-session Baileys*).

### 8. Tahap Selanjutnya 5: Fitur AI (Smart Customer Support & Auto-Reply)
- **Tujuan:** Mengintegrasikan `@google/genai` untuk asisten CS cerdas yang memahami pertanyaan pembeli santai di WhatsApp dan otomatis merekomendasikan produk relevan.




---

[2.0] - PERBAIKAN FORMATTING PESAN BOT WHATSAPP (VCARD, COMMAND LIST, DAN CAROUSEL)

- Tanggal: 2026-11-01 18:55
- Status: Completed

Tujuan:
Menyelesaikan 3 permasalahan teknis terkait formatting respon bot WhatsApp:
1. Normalisasi otomatis nomor telepon admin/owner (+62) pada vCard.
2. Penyesuaian output teks command List agar 100% menghormati template kustom pengguna tanpa teks hardcode atau pemaksaan daftar produk.
3. Penyesuaian header kartu Carousel agar nama varian dan kategori tidak muncul mendahului template teks pengguna.

Rencana:
1. Menyiapkan catatan implementasi lengkap di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Membuat fungsi pembantu normalisasi nomor telepon Indonesia di backend.
3. Memperbaiki penyusunan vCard di `/backend/messages/adminContactMessage.ts` untuk owner, admin, dan invoice admin.
4. Memperbaiki logika `listMessage.ts` agar tidak memaksakan `{daftarProduk}`, teks instruksi, dan title hardcode.
5. Memperbaiki `cardHeader` di `/backend/messages/carouselMessage.ts` agar `title` dan `subtitle` tidak menimpa bagian atas template teks pengguna.
6. Menguji kompilasi dengan `compile_applet` dan mencatat hasil di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Seluruh respon bot WhatsApp tampil rapi, konsisten, dan 100% sesuai dengan konfigurasi yang diatur pengguna di dashboard.

---

[3.0] - PEMBERSIHAN FILE DATABASE JSON USANG PASCA MIGRASI SQLITE

- Tanggal: 2026-11-01 19:16
- Status: Completed

Tujuan:
Menghapus seluruh file database `.json` usang pada folder `/database/` dan `/backend/database/` yang sudah tidak lagi digunakan setelah migrasi penuh ke SQLite (`bot.db`).

Rencana:
1. Menyiapkan catatan implementasi teknis di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Menghapus file JSON usang di `/database/` (`api_config.json`, `command_carousel.json`, `command_invoice.json`, `command_list.json`, `command_menu.json`, `groups_config.json`, `store_info.json`, `transactions.json`).
3. Menghapus file JSON usang di `/backend/database/` (`api_config.json`, `auth.json`, `command_carousel.json`, `command_invoice.json`, `command_list.json`, `command_menu.json`, `groups_config.json`, `store_info.json`, `transactions.json`).
4. Memastikan file aktif tetap utuh: `/backend/database/sqlite.ts` dan `/database/bot.db` (beserta WAL file).
5. Membersihkan unused export konstanta `CONFIG_FILE` di `backend/types/bot.types.ts` dan import di `backend/config/configManager.ts`.
6. Melakukan verifikasi kompilasi dan linting (`compile_applet` dan `lint_applet`).
7. Mencatat hasil akhir di `brain/PROGRESS.md` dan memperbarui status rencana.

Hasil yang Diharapkan:
Folder database rapi dan bersih dari artefak legacy tanpa mempengaruhi integritas data dan fungsionalitas aplikasi.

---

[4.0] - PERANCANGAN ALUR CHECKOUT BOT DENGAN DUKUNGAN KODE PROMO

- Tanggal: 2026-11-01 21:45
- Status: Planned (Disepakati & Disimpan)

Tujuan:
Menerapkan alur checkout interaktif berbasis sesi di Chat Pribadi (DM) WhatsApp agar pelanggan dapat memanfaatkan kupon diskon/kode promo sebelum invoice QRIS diterbitkan, tanpa menghambat pembeli yang ingin langsung membayar dengan harga normal.

Rencana yang Disepakati (Opsi 1):
1. **Trigger Order**: Pelanggan menekan tombol `Order` pada kartu Carousel di Grup atau DM.
2. **Notifikasi Grup**: Jika order dipicu di grup, bot merespon dengan pemberitahuan singkat bahwa konfirmasi pesanan telah dikirim ke DM pelanggan (menjaga privasi).
3. **Pesan Ringkasan di DM**: Bot mengirimkan rincian pesanan (Nama Produk, Varian, Harga Normal) disertai 2 Tombol Interaktif Native Flow:
   - Tombol 1: `[🎟️ Pakai Kode Promo]`
   - Tombol 2: `[⚡ Lanjut Bayar (Normal)]`
4. **Sesi Input Kode Promo**:
   - Jika pembeli memilih `[🎟️ Pakai Kode Promo]`, bot membuka sesi tunggu selama **1 menit 30 detik (90 detik)**.
   - Pembeli mengetik kode promo di DM.
   - Bot memvalidasi kode promo menggunakan `validateAndApplyPromo()` di SQLite (memeriksa masa aktif, kuota, kesesuaian varian, minimal transaksi, dan proteksi margin agar tidak memotong modal dasar supplier).
   - Jika valid: Bot menampilkan rincian potongan diskon lalu membuat invoice QRIS LunasQRIS dengan nominal hemat.
   - Jika tidak valid / timeout: Bot memberi pesan penjelasan dan opsi coba lagi atau lanjut bayar normal.
5. **Bayar Langsung**:
   - Jika pembeli memilih `[⚡ Lanjut Bayar (Normal)]` atau sesi timeout, bot langsung menerbitkan invoice QRIS harga normal.

Hasil yang Diharapkan:
Alur checkout berjalan interaktif, fleksibel, ramah pengguna, aman dari segi privasi kode kupon di grup, dan siap dieksekusi kapan pun pengguna menginstruksikan.

---

[5.0] - PERSIAPAN & IMPLEMENTASI FITUR APARTEMEN (MULTI-TENANT & PORTAL MASTER ADMIN)

- Tanggal: 2026-11-01 19:39
- Status: In Progress

Tujuan:
Mempersiapkan dan mengimplementasikan arsitektur "Fitur Apartemen" (Multi-Tenant & Master Admin Dashboard) agar platform bot WhatsApp dapat menyewakan unit-unit bot ke berbagai pemilik toko/penyewa secara terisolasi, terukur, dan aman.

Rencana:
1. Skema Database SQLite untuk Apartemen:
   - Tabel `tenants`: Menyimpan identitas unit, nama toko, username, hash password, salt, no WA penyewa, paket langganan, durasi hari, tanggal mulai, tanggal kedaluwarsa, status (`active`, `expired`, `suspended`), dan kuota grup.
   - Tabel `master_admin`: Kredensial akun Super Admin pengelola apartemen dengan salt & hash PBKDF2 aman.
   - Migrasi dan inisialisasi unit awal (Unit 101 - Wanzt Store) agar kompatibel dengan data yang ada.
2. Backend Apartemen (Service & API Routes):
   - `backend/services/apartmentManager.ts`: Mengelola validasi status sewa (auto-expire check), CRUD unit tenant, perpanjangan masa sewa, suspensi, dan autentikasi master admin.
   - `backend/routes/apartmentRoutes.ts`: Endpoint terproteksi untuk master admin login, ambil daftar unit, tambah unit baru, perpanjang masa sewa, toggle suspend, reset password, dan statistik.
   - Sambungkan route ke `backend/app.ts` (`/api/apartment/*`).
3. Frontend Master Admin Dashboard ("Portal Apartemen / Kelola Gedung"):
   - Komponen `src/components/apartment/MasterAdminApartmentPanel.tsx` dan `src/components/apartment/MasterAdminLoginModal.tsx`.
   - Akses mudah via URL `/adminutama` atau tombol "Portal Apartemen" pada navbar/login page.
   - Desain UI Anti-AI Slop:
     - 4 Kartu Metrik Apartemen: Total Unit, Unit Aktif, Unit Kedaluwarsa, Unit Suspended.
     - Tabel daftar unit apartemen dengan rincian: No Unit, Nama Toko/Penyewa, Username, Kontak WhatsApp, Paket, Masa Berlaku, Sisa Hari, dan Status.
     - Modal Tambah Unit Apartemen Baru dengan pilihan durasi (30, 60, 90, 365 hari atau custom).
     - Modal Perpanjang Masa Sewa (+7 hari, +30 hari, +90 hari, +1 tahun).
     - Tombol Aksi Cepat: Suspend/Aktifkan, Reset Password, Hapus Unit.
4. Tenant Banner & Layar Masa Sewa:
   - Banner indikator status masa sewa pada header dashboard penyewa (menampilkan sisa hari sewa).
   - Layar kunci ramah jika status sewa expired atau suspended, memandu penyewa menghubungi Admin Utama.
5. Verifikasi:
   - Uji kompilasi dengan `compile_applet`.
   - Uji linting dengan `lint_applet`.
   - Dokumentasi lengkap di `brain/LANGKAH_IMPLEMENTASI.md` dan `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Platform memiliki sistem manajemen multi-tenant apartemen yang siap pakai, aman, dan mudah dikelola langsung oleh Master Admin tanpa perlu menyentuh database manual.

---

[6.0] - IMPLEMENTASI TAHAP 4: ARSITEKTUR MONOREPO, MULTI-DOMAIN, DAN DATABASE-PER-TENANT

- Tanggal: 2026-11-01 23:48
- Status: Planned

Tujuan:
Menerapkan arsitektur lengkap Tahap 4 (Fitur Apartemen Multi-Tenant) sesuai hasil kesepakatan:
1. Pemisahan folder: `admin-frontend/` & `admin-backend/` (untuk Master Admin) terpisah dari `frontend/` & `backend/` (untuk Toko Pengguna).
2. Routing multi-domain: `admin.wanma2.my.id` ➔ `admin-frontend/`, `dashboard.wanma2.my.id` ➔ `frontend/` (didukung di development mode via path `/admin` dan deteksi hostname).
3. Database-per-Tenant: `database/master.db` (Master DB) + `database/tenants/{tenant_id}.db` (Tenant DBs).
4. Multi-Session Baileys Bot Manager: Setiap tenant memiliki sesi bot independen di `auth_info_baileys/tenant_{tenant_id}/`.
5. Fitur Lengkap Master Admin: CRUD tenant, perpanjang sewa, suspend/activate, impersonation (1-klik buka toko tenant), kontrol restart/reset bot, dan statistik platform.

Rencana:
1. Menyiapkan database `database/master.db` dan `admin-backend/database/masterSqlite.ts`.
2. Menyiapkan database dinamis per-tenant di `backend/database/tenantDbManager.ts`.
3. Menyiapkan service dan router Master Admin di `admin-backend/`.
4. Mengembangkan multi-session Baileys manager di `backend/services/multiBotManager.ts`.
5. Membangun UI Dashboard Master Admin di `admin-frontend/` (React + Tailwind + Lucide).
6. Mengonfigurasi `server.ts` untuk melayani dua aplikasi (admin & tenant) berdasarkan hostname / path `/admin`.
7. Menguji kompilasi dan linting, serta mencatat kemajuan di `brain/PROGRESS.md`.

Hasil yang Diharapkan:
Sistem multi-tenant apartemen beroperasi penuh dengan isolasi database, sesi bot, dan antarmuka mandiri.




