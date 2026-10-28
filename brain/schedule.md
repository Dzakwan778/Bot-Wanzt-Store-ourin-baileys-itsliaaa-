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

