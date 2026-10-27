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

---

## 📂 Struktur Penting
- `src/components/tabs/TabTransaksi.tsx`: Komponen tampilan tabel riwayat transaksi (Nomer Pembeli, Produk, Varian, Order ID, Nominal, Kode Unik, Total, Status).
- `server/services/transactionManager.ts`: Modul pengelola transaksi & database persisten `/database/transactions.json`.
- `src/hooks/useTransactions.ts`: Hook reaktif sinkronisasi transaksi dashboard.
- `deploy-vps.sh`: Skrip instalasi otomatis bot & dashboard di VPS Ubuntu/Debian.
- `server/messages/carouselMessage.ts`: Pembuat kartu Carousel varian produk dengan markup harga jual +10%.
- `server/handlers/messageDispatcher.ts`: Dispatcher pesan, generate QRIS PNG buffer, format invoice rapi, dan auto-fulfillment.
- `src/components/tabs/TabConnection.tsx`: Antarmuka manajemen konfigurasi API LunasQRIS dan Xaviera.
- `server/services/lunasQrisService.ts`: Modul layanan integrasi LunasQRIS API & Webhook.
- `src/hooks/useXavieraData.ts`: Hook pengambil data produk, SMM, dan game dari Xaviera API.
- `src/types/dashboard.types.ts`: Definisi interface tipe data dan helper fungsi `detectSmmPlatform`.
