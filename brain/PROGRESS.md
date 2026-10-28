# Status Progres Proyek: WhatsApp Bot Store Manager (Wanzt Store)

Dokumen ini berfungsi sebagai panduan serah terima status proyek untuk pengembang / AI selanjutnya agar pekerjaan dapat dilanjutkan tanpa kehilangan konteks.

---

## 📌 Ringkasan Proyek
Aplikasi berbasis React + Tailwind CSS dengan backend terintegrasi Vite middleware menggunakan library `@itsliaaa/baileys`.
Aplikasi ini mengatur bot WhatsApp toko otomatis dengan fitur:
- Tombol Interaktif Native Flow (`cta_url`, `quick_reply`, `cta_call`, `cta_copy`, `vcard`).
- Command Menu, Command List (Katalog Layanan), dan Command Carousel Produk.
- Integrasi Xaviera API untuk profil, produk digital/SMM/game otomatis murni tanpa data cadangan lokal palsu.
- Integrasi Payment Gateway SairiPedia API (QRIS Real-Time).
- Arsitektur Modular: Komponen dipecah ke folder `src/components/`, `src/hooks/`, `src/types/`.
- Manajemen Whitelist Grup WhatsApp (toggle aktif/nonaktif fungsi bot per grup).

---

## ✅ Fitur yang Telah Selesai (Completed)
1. **Perbaikan Bug Tab SMM Tidak Muncul (Fix Typo SMM vs SSM)**:
   - **Penyebab**: Tab navigasi di `App.tsx` bernilai `'SMM'`, namun percabangan di `TabContentRenderer.tsx` sebelumnya hanya memeriksa `'SSM'` (double S), sehingga pengguna diarahkan ke fallback slot kosong dan tabel SMM tidak pernah muncul.
   - **Solusi**: Di `TabContentRenderer.tsx`, kondisi telah diperluas untuk mengenali `selectedTab === 'SMM' || selectedTab === 'SSM' || selectedTab === 'tab02'`.
   - **Kategori Musik**: Fungsi `detectSmmPlatform` di `src/types/dashboard.types.ts` kini memetakan Spotify/SoundCloud/Musik ke `'Layanan Musik'` agar cocok dengan tombol filter kategori di `TabSsm.tsx`.
   - **Hasil**: Seluruh 3000+ katalog layanan SMM dari Xaviera Store kini langsung muncul dengan rapi lengkap dengan fitur pencarian, filter kategori, pagination, dan harga jual (+10%).

2. **Refactoring & Modularisasi Komponen**:
   - `src/App.tsx` dipecah menjadi komponen modular di `src/components/` dan kustom hook di `src/hooks/`.

3. **Sinkronisasi Kode dengan Repositori GitHub**:
   - Kode 100% tersinkronisasi dengan repositori resmi `Dzakwan778/Bot-Wanzt-Store-ourin-baileys-itsliaaa-remix`.

4. **Penghapusan Seluruh Data Cadangan Lokal (Pure Live API Mode)**:
   - Data produk, SMM, dan Top Up murni berasal dari API Xaviera secara real-time.

5. **Implementasi Sistem Whitelist Grup WhatsApp**:
   - Toggle whitelist di tab Grup mengontrol apakah bot merespon di grup tertentu atau tidak.

6. **Penyimpanan Modular Database**:
   - File JSON konfigurasi tersimpan di folder `/database/`.

7. **Pemulihan File Modular & Hook (Fix Import Errors)**:
   - Seluruh hook kustom (`useBotConnection`, `useButtonModal`, `useStoreConfig`, `useWhatsAppGroups`, `useXavieraData`) dan komponen tab (`TabStoreInfo`, `TabCommand`, `TabProduk`, `TabSsm`, `TabTopUp`, `TabGrup`, `TabConnection`) telah tersimpan permanen di direktori proyek.
   - Pengecekan TypeScript linting (`tsc --noEmit`) dan build compilation lulus 100% tanpa error.

8. **Migrasi Penuh Payment Gateway dari SairiPedia ke LunasQRIS (Completed)**:
   - **Arsitektur Dual-Key**: Menggunakan Public API Key (`pk_...`) untuk request API (`X-API-Key`) dan Secret Key (`sk_...`) untuk verifikasi tanda tangan Webhook HMAC-SHA256 (`X-Callback-Signature`).
   - **Layanan Backend (`server/services/lunasQrisService.ts`)**: Fungsi `getLunasQrisBalance`, `createLunasQrisTransaction`, `checkLunasQrisStatus`, `cancelLunasQrisTransaction`, `startLunasQrisPolling`, dan `verifyLunasQrisSignature`.
   - **Alur Transaksi WhatsApp Bot (`server/handlers/messageDispatcher.ts`)**: Saat pembeli klik varian produk, bot otomatis menerbitkan transaksi LunasQRIS dengan ID unik (`ORD-...`), kode unik (`unique_code`), dan total tagihan presisi (`total_amount`). Mengirimkan notifikasi ke grup, invoice QRIS lengkap ke DM pembeli, dan menjalankan polling status otomatis tiap 4 detik. Saat lunas, kredensial akun digital dikirim ke DM pembeli dan notifikasi diteruskan ke owner.
   - **Proxy & Webhook Middleware (`vite.config.ts`)**: Menangani route proxy `/api/lunasqris/balance`, `/api/lunasqris/transaction/status`, `/api/lunasqris/transaction/create`, dan `/api/lunasqris/webhook`.
   - **Antarmuka Tab Connection & Profile Header**: Form modern untuk input Public Key (`pk_...`), Secret Key (`sk_...`), Base URL, tombol Cek Saldo real-time (Saldo Siap Tarik & Saldo Hold), dan copy URL Webhook untuk dipasang di panel LunasQRIS.
   - **Database**: Tersimpan rapi di `/database/api_config.json`.

9. **Penyediaan Skrip Otomasi Deployment VPS 24/7 (`deploy-vps.sh`)**:
   - **Skrip Instalasi Turnkey**: Otomasi pembaruan OS, instalasi Node.js 20 LTS, Git, PM2, tsx, dan Nginx Reverse Proxy.
   - **Ketahanan Sistem (High Availability)**: Terintegrasi `pm2 startup` dan `pm2 save` sehingga bot langsung menyala otomatis saat VPS mati/reboot.
   - **Konfigurasi Webhook & SSL Ready**: Nginx meneruskan request dari IP/domain port 80/443 langsung ke port 3000 lengkap dengan forward header IP, signature HMAC-SHA256 LunasQRIS, serta WebSocket upgrade. Dukungan instalasi SSL gratis 1-baris via `certbot --nginx`.

10. **Perbaikan Harga Jual Carousel (+10%), Gambar QRIS Buffer PNG, & Format Invoice Rapi**:
   - **Markup Keuntungan 10% Carousel**: Pada `server/messages/carouselMessage.ts`, harga yang ditampilkan pada kartu Carousel `{price}` dan ID tombol Order (`order_var:...`) kini secara otomatis menambahkan margin 10% (`rawPrice + Math.round(rawPrice * 0.1)`). Pelanggan membayar harga jual bertambah 10%, dan keuntungan tersimpan aman di akun LunasQRIS merchant.
   - **Pemeriksaan Saldo Supplier Xaviera Akurat**: Pada `server/handlers/messageDispatcher.ts`, pengecekan saldo Xaviera disesuaikan dengan harga modal (`Math.round(price / 1.1)`), memastikan bot tidak terblokir jika saldo hanya cukup untuk modal supplier.
   - **Gambar QRIS PNG Murni (Fix File Corrupt / Gagal Download)**: Menghilangkan dependensi format `.svg` LunasQRIS yang tidak didukung WhatsApp. Menggunakan pustaka `qrcode` untuk membuat Buffer PNG murni (600x600 px) langsung di memori server dan dikirimkan via Baileys `{ image: qrBuffer, mimetype: 'image/png' }` dengan fallback axios PNG. Gambar QRIS langsung tampil tajam dan bebas masalah download di seluruh tipe HP.
   - **Format Invoice Rapi Bebas Garis**: Menghapus seluruh karakter garis horizontal (`───────`) pada teks invoice, pesan sukses pembayaran, dan notifikasi owner. Digantikan dengan tata letak spasi vertikal dan format teks tebal yang rapi sehingga tidak patah atau berantakan di berbagai resolusi layar.

11. **Pembaruan Terminologi "Fee Gateway" (Menggantikan "Kode Unik")**:
    - **Penyelarasan UX & Kepuasan Pelanggan**: Mengubah istilah "Kode Unik" / "kode unik" menjadi **"Fee Gateway"** pada teks notifikasi grup WhatsApp, rincian invoice DM pembeli, catatan penting transfer, log aktivitas sistem, dan panel Tab Connection.
    - **Tampilan Invoice DM**: Format sekarang menampilkan `⚡ *Fee Gateway:* +Rp ${trx.unique_code}` dan petunjuk `Transfer tepat *Rp ...* hingga digit terakhir (termasuk Fee Gateway) agar pembayaran terverifikasi otomatis.`
    - **Tampilan Notifikasi Grup**: Menginformasikan `... (Fee Gateway: *+Rp ${trx.unique_code}*) ...`.
    - **Hasil**: Nominal tambahan diterima oleh pembeli sebagai biaya layanan payment gateway yang wajar dan transparan, menghilangkan kesan tagihan dimahalkan secara sepihak.

12. **Pembuatan Tab "Transaksi" (Pengganti tab05) & Manajemen Riwayat Pesanan**:
    - **Perubahan Navigasi Tab**: Label `tab05` telah diganti menjadi **"Transaksi"** di navigasi utama dashboard (`App.tsx`).
    - **Kolom Rincian Transaksi**:
      - **Nomer Pembeli**: Menampilkan nomor pembeli dengan tombol salin dan tautan direct chat WhatsApp (`wa.me`).
      - **Nama Produk & Varian Produk**: Menampilkan judul produk dan badge varian paket yang dipesan.
      - **Order ID**: Teks monospace order ID dengan tombol salin instan.
      - **Nominal & Kode Unik**: Menampilkan harga dasar dan kode unik/fee gateway (`+Rp ...`).
      - **Total**: Nominal total yang wajib ditransfer pembeli.
      - **Status Pembayaran (Warna Sesuai Spesifikasi)**:
        - `pending` -> **Kuning** (`bg-amber-100 text-amber-800 border-amber-300 font-semibold`)
        - `cancel` -> **Merah** (`bg-rose-100 text-rose-800 border-rose-300 font-semibold`)
        - `paid` -> **Hijau** (`bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold`)
    - **Penyimpanan Persisten & Integrasi Otomatis**:
      - Modul backend `/server/services/transactionManager.ts` mengelola file database `/database/transactions.json`.
      - Saat transaksi baru dibuat di WhatsApp bot, status tercatat sebagai `pending`.
      - Saat auto-polling atau webhook LunasQRIS mendeteksi pembayaran sukses, status terupdate otomatis menjadi `paid`.
      - Saat batas waktu pembayaran berakhir (expired), status terupdate otomatis menjadi `cancel`.
    - **Fitur Tambahan**: Kartu statistik ringkasan omset (Total Order, Omset Paid, Jumlah Sukses/Pending/Cancel), pencarian multi-kolom, filter status tab, tombol sinkronisasi manual pending, dan tombol hapus transaksi.

13. **Command Invoice Dinamis di Tab Command & Perbaikan Tombol Hapus Transaksi**:
    - **Command Invoice di Tab Command**:
      - Menambahkan opsi **"Invoice"** pada dropdown pilih command di Tab Command (`Menu`, `List`, `Carousel`, `Invoice`).
      - Antarmuka form lengkap untuk mengatur template pesan tagihan (`invoiceOutputText`) dan footer (`invoiceFooterText`).
      - Menyediakan chip quick-insert untuk seluruh placeholder:
        - Standar: `{storeName}`, `{ownerNumber}`, `{category}`, `{varian}`, `{price}`, `{produkName}`, `{adminNumber}` / `{adminMumber}`, `{webLink}`.
        - Khusus Invoice: `{orderId}`, `{total}`, `{unikCode}`.
      - Antarmuka *Live WhatsApp Preview* yang menyimulasikan tampilan POV pembeli saat menerima invoice lengkap dengan QRIS dan 2 tombol interaktif.
      - **Dua Tombol Interaktif Native Flow**:
        - **Tombol 1 (Quick Reply - Hubungi Admin)**: Saat pembeli mengetuk tombol ini di WhatsApp, bot mengirimkan vCard kontak WhatsApp nomor admin toko. Jika form nomor admin pada dashboard kosong (karena opsional), sistem otomatis fallback mengirimkan vCard nomor owner toko (`sendInvoiceAdminContactMessage`).
        - **Tombol 2 (CTA URL - Web Checkout)**: Tombol resmi yang mengarahkan pembeli langsung ke URL web checkout pembayaran LunasQRIS (`payment_url`).
      - Database persisten: `/database/command_invoice.json` dimuat dan disimpan otomatis via `configManager.ts`.
      - Pada `server/handlers/messageDispatcher.ts`, rendering invoice DM pembeli menggunakan template dinamis dengan resolusi placeholder yang aman dan anti-duplikasi `Rp`, serta menyematkan kedua tombol interaktif tersebut ke payload pengiriman Baileys.
    - **Perbaikan Tombol Hapus Transaksi (Icon Tempat Sampah)**:
      - **Akar Masalah**: Tombol sebelumnya menggunakan `window.confirm(...)` yang diblokir oleh sandbox iframe peramban, serta memiliki area klik yang sempit.
      - **Solusi**: Mengganti pemanggilan `window.confirm` dengan **Inline Two-Step Confirmation** (`deleteConfirmId === trx.orderId`). Klik pertama memunculkan tombol konfirmasi bertuliskan "Hapus?", dengan timer auto-reset 4 detik, hit area yang lebih lega (`relative z-20`), dan feedback notifikasi toast yang informatif.

14. **Live Requirements Checklist untuk Custom Pairing Code (UI Modern Mirip Password Requirements)**:
    - **Pembaruan UX Sesuai Referensi Pengguna (`Screenshot_20261028-064352.png`)**:
      - Mengganti kotak peringatan kuning statis lama (*"Form Pairing Code Belum Diisi"*) dengan komponen interaktif **Live Requirements Checklist**.
      - **Segmented Progress Bar**: Indikator 4 segmen dinamis yang menyala halus:
        - Abu-abu / kosong saat belum diisi.
        - Merah cerah jika terdeteksi simbol terlarang.
        - Kuning/Sky bertahap sesuai panjang karakter (1-7 karakter).
        - Hijau penuh (`bg-emerald-500`) saat kode tepat 8 karakter dan valid.
      - **Status Header Dinamis**: Teks status cerdas (`Wajib Diisi`, `Format Tidak Sesuai`, `Panjang Belum Cukup (x/8)`, dan `Siap Digunakan ✓`).
      - **Checklist Kriteria Real-Time**:
        - `✓ Wajib 8 karakter`: Menampilkan centang hijau saat tepat 8 karakter, atau titik `•` beserta sisa karakter yang dibutuhkan saat belum cukup.
        - `✓ Tidak menyertakan simbol`: Menampilkan centang hijau saat bersih tanpa simbol, atau silang merah `✕` saat terdeteksi karakter simbol/spasi.
        - `✓ Hanya angka dan huruf (A-Z, 0-9)`: Menampilkan centang hijau saat menggunakan kombinasi alfanumerik yang sah.
15. **Sistem Login Dashboard Aman (Zero Inspect Leak) & Lock Wajib Store Info**:
    - **Halaman Login Aman (`src/components/auth/LoginPage.tsx`)**:
      - Menyediakan antarmuka login minimalis dengan input Username, Password (dengan toggle intip mata), dan tombol Masuk.
      - **Zero Client Password Leak**: Tidak ada password yang di-*hardcode* atau diekspos di kode JavaScript frontend (tidak bisa dibaca lewat *Inspect Element*, *Sources*, atau *DevTools*).
      - **Hashing Kriptografis Server-Side**: Password diverifikasi di server via `/api/auth/login` menggunakan algoritma PBKDF2 (SHA-512 dengan 100.000 iterasi dan salt unik 16-byte) yang tersimpan di `/database/auth.json`.
      - **Manajemen Sesi Token**: Menggunakan session token acak (`crypto.randomBytes(32)`) dengan durasi 7 hari.
      - **Full Dashboard Gate**: Seluruh dashboard dan data sensitif terkunci rapat sebelum pengguna berhasil login.
    - **Lock Bot di Server (`POST /api/bot/start`)**:
      - Server memverifikasi kelengkapan 3 data wajib: `Nama Toko`, `Nama Owner`, dan `Nomer Owner`. Jika belum lengkap, backend langsung menolak menjalankan bot WhatsApp dengan pesan error jelas.
    - **Pop-up Modal Wajib Isi Store Info (`MandatoryStoreSetupModal.tsx`)**:
      - Setelah login, jika ketiga data toko belum terisi, otomatis muncul modal pop-up wajib isi data toko.
      - Modal bersifat **non-dismissible** (tidak bisa ditutup atau di-bypass dengan klik luar atau tombol ESC).
      - Saat pengguna mengisi dan menyimpan, data otomatis tersimpan permanen ke `/database/store_info.json` dan sinkron langsung ke formulir Store Info dashboard.

16. **Redesain Halaman Login & Pop-up Modal Wajib Store Info Sesuai `DESIGN (2).md` (Anti-AI Slop)**:
    - **Menghilangkan Seluruh Unsur AI Slop**: Menghapus background gelap dengan efek *glowing blur blob*, kartu gradien warna-warni, serta tombol kapsul (*pill-shaped*). Mengadopsi prinsip desain **Industrial Utility & Editorial Minimalism**.
    - **Palet Warna & Tata Letak Mode Terang (Light Mode Default)**:
      - **Background Canvas**: Slate 50 (`#F8FAFC`).
      - **Surface Kartu**: Putih murni (`#FFFFFF`), border 1px tipis Slate 200 (`#E2E8F0`), bayangan halus (`shadow-xs` / `shadow-sm`).
      - **Tipografi & Kontras**: Teks judul tebal Slate 900 (`#0F172A`) dengan *letter-spacing* tajam (`tracking-tight`), dan subteks Slate 500 (`#64748B`).
      - **Aksen Tombol Utama**: Solid Sky 600 (`#0284C7`, `bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-lg py-2.5`).
    - **Halaman Login (`src/components/auth/LoginPage.tsx`)**:
      - Tampilan bersih, minimalis, dan profesional.
      - Avatar bot modern dengan palet `bg-sky-50 border-sky-200 text-sky-600 rounded-xl`.
      - Judul "Bot Dashboard Manager" dengan pesan instruksi yang jelas.
      - Input fields berstandar input form dashboard dengan outline halus Slate 300 dan ring Sky 600/20 saat fokus.
      - Indikator keamanan PBKDF2 yang ringkas dan elegan di bagian bawah kartu.
    - **Modal Pop-up Wajib Store Info (`src/components/modals/MandatoryStoreSetupModal.tsx`)**:
      - Menghapus header gradien oranye/amber yang mencolok.
      - Menggunakan header putih bersih dengan garis pembatas tipis (`border-b border-slate-100`) dan badge status amber fungsional (`bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold`).
      - Kotak pemberitahuan amber utilitas yang rapi dan elegan (`bg-amber-50/80 border-amber-200 text-amber-900`).
      - Input Nomor WhatsApp Owner dilengkapi *prefix badge* bendera + kode negara `+62` yang identik dengan form koneksi WhatsApp pada panel dashboard.
      - Selaras 100% dengan keseluruhan antarmuka sistem.

17. **Pemisahan Frontend & Backend serta Panduan Deployment VPS (`INSTALASI.md`)**:
    - **Pemisahan Modular Backend Express**:
      - Seluruh 600+ baris middleware yang sebelumnya menumpuk di `vite.config.ts` telah dipisahkan ke modul Express router mandiri di `/server/routes/`:
        - `authRoutes.ts`: Login PBKDF2, session token, logout, dan store info setup.
        - `botRoutes.ts`: Status, pairing code, start (dengan lock store info), stop, reset, dan whitelist grup.
        - `lunasQrisRoutes.ts`: Cek saldo, status pembayaran, create transaksi, dan webhook callback dengan verifikasi HMAC-SHA256 signature.
        - `xavieraRoutes.ts`: Proxy profil saldo, daftar produk, SMM services, dan game.
        - `transactionRoutes.ts`: Get transactions, ringkasan metrik, sync pending, dan delete.
        - `mediaRoutes.ts`: Gambar QR & upload media.
      - `/server/app.ts`: Setup Express app sentral dengan CORS dan body-parser rawBody.
      - `/server/standalone.ts`: Server backend mandiri di port 5000 (`npm run backend`).
      - `server.ts`: Entry point full-stack standar menghubungkan Express dan Vite middlewares (`npm run dev` & `npm run start`).
    - **Penyederhanaan `vite.config.ts`**:
      - `vite.config.ts` menjadi konfigurasi Vite murni yang bersih, cepat, dan teratur dengan proxy otomatis `/api` ke `http://localhost:5000` jika frontend dijalankan terpisah.
    - **Konfigurasi PM2 Siap Pakai (`ecosystem.config.cjs`)**:
      - Terkonfigurasi untuk deployment di VPS `104.64.15.80` dalam folder `bot-whatsapp`, auto-restart on crash, memory limit 1GB, dan startup ready.
    - **Panduan Terperinci di `INSTALASI.md`**:
      - Panduan copy-paste langkah demi langkah untuk VPS IP `104.64.15.80` di folder `bot-whatsapp`:
        - Persiapan OS (Node.js 20, PM2, Git, Nginx, UFW).
        - Menaruh file ke `/root/bot-whatsapp`.
        - Perintah PM2 (`pm2 start ecosystem.config.cjs`, `pm2 startup`, `pm2 save`).
        - Konfigurasi Nginx Reverse Proxy (Port 80 -> 3000) lengkap dengan header WebSocket Baileys dan Webhook LunasQRIS.
        - Pengaturan URL Webhook LunasQRIS `http://104.64.15.80/api/lunasqris/webhook`.
18. **Pemisahan Fisik Folder `bot-whatsapp/frontend` & `bot-whatsapp/backend` serta Konfigurasi Domain `testbot.wanma2.my.id`**:
    - **Struktur Folder Terpisah**:
      - `bot-whatsapp/frontend/`: Memuat seluruh antarmuka React (`src/`), `index.html`, `vite.config.ts`, `package.json`, dan bundle `dist/`.
      - `bot-whatsapp/backend/`: Memuat server Express di Port 5000 (`backend/server.ts`), modular routes (`backend/routes/`), business services (`backend/services/`), handlers Baileys (`backend/handlers/`), database lokal (`backend/database/`), dan `package.json`.
    - **Konfigurasi Domain `testbot.wanma2.my.id` (IP: 104.64.15.80)**:
      - **Nginx Reverse Proxy**:
        - Menyajikan file frontend statis dari `/root/bot-whatsapp/frontend/dist` pada port 80/443.
        - Meneruskan seluruh request `/api/` ke backend port 5000 dengan header WebSocket Baileys dan HMAC signature webhook LunasQRIS.
      - **PM2**: Dikonfigurasi di `ecosystem.config.cjs` dengan proses `bot-backend` (`backend/server.ts`) yang berjalan 24/7 di Port 5000.
      - **Webhook LunasQRIS**: Diarahkan ke `https://testbot.wanma2.my.id/api/lunasqris/webhook`.
      - **SSL Gratis**: Panduan 1-baris Certbot `certbot --nginx -d testbot.wanma2.my.id`.
    - **Pembaruan Skrip Otomasi**: `deploy-vps.sh` dan `INSTALASI.md` diselaraskan 100% dengan struktur direktori dan domain ini.

---

## 📂 Struktur Penting
- `INSTALASI.md`: Panduan instalasi dan deployment lengkap VPS 104.64.15.80 di folder `bot-whatsapp`.
- `ecosystem.config.cjs`: Konfigurasi manajemen proses PM2 production.
- `server.ts`: Entry point server full-stack utama (Express + Vite).
- `server/app.ts`: Aplikasi Express modular terpusat.
- `server/standalone.ts`: Server backend independen (Port 5000).
- `server/routes/`: Seluruh controller REST API modular (auth, bot, lunasqris, xaviera, transactions, media).
- `deploy-vps.sh`: Skrip otomasi deployment 1-klik untuk VPS Ubuntu/Debian.
- `database/command_invoice.json`: File database persisten template teks & footer invoice.
- `database/auth.json`: Kredensial akun admin ter-hash PBKDF2.
- `database/transactions.json`: Database riwayat transaksi pesanan bot.
- `src/components/tabs/TabTransaksi.tsx`: Komponen tampilan tabel riwayat transaksi dengan tombol hapus inline confirmation yang aman.
- `server/services/transactionManager.ts`: Modul pengelola transaksi & database persisten `/database/transactions.json`.
- `src/hooks/useTransactions.ts`: Hook reaktif sinkronisasi transaksi dashboard.
- `server/messages/carouselMessage.ts`: Pembuat kartu Carousel varian produk dengan markup harga jual +10%.
- `server/handlers/messageDispatcher.ts`: Dispatcher pesan, generate QRIS PNG buffer, format invoice rapi, dan auto-fulfillment.
- `src/components/tabs/TabConnection.tsx`: Antarmuka manajemen konfigurasi API LunasQRIS dan Xaviera.
- `server/services/lunasQrisService.ts`: Modul layanan integrasi LunasQRIS API & Webhook.
- `src/hooks/useXavieraData.ts`: Hook pengambil data produk, SMM, dan game dari Xaviera API.
- `src/types/dashboard.types.ts`: Definisi interface tipe data dan helper fungsi `detectSmmPlatform`.

