# Langkah Implementasi (langkah-implementasi.md)

Dokumen ini mencatat rencana aksi teknis yang **akan dilakukan (sebelum mengubah kode)**. Dokumen ini berfokus pada penjelasan **apa yang akan dilakukan** dan **bagaimana cara mengimplementasikannya secara rinci**, bukan melaporkan apa yang telah diubah.

---

## 📌 Rencana Implementasi: Migrasi Penuh Payment Gateway dari SairiPedia ke LunasQRIS

### 1. Tujuan & Deskripsi
Melakukan migrasi penuh (*full replacement*) sistem pembayaran QRIS otomatis dari **SairiPedia** ke **LunasQRIS** (`https://lunasqris.com`). Sesuai instruksi pengguna, bot ini hanya akan menggunakan LunasQRIS untuk keperluan kerja sama dan penjualan script bot. Sistem akan memanfaatkan:
- **Dual-Key Auth**: Public API Key (`pk_...`) untuk request API dan Secret Key (`sk_...`) untuk verifikasi tanda tangan Webhook (HMAC-SHA256).
- **QRIS Dinamis dengan Kode Unik**: Menghasilkan tagihan presisi dengan `unique_code` dan `total_amount`.
- **Dukungan EMVCo `qris_string`, SVG `qr_url`, dan `payment_url`**: Memungkinkan pengiriman gambar QRIS langsung ke DM pembeli dan link web checkout responsif.
- **Auto Polling & Webhook Handler**: Memastikan status `paid` terdeteksi cepat dalam hitungan detik untuk auto-fulfillment akun digital ke DM pembeli.

---

### 2. File Target
1. **Tipe Data**:
   - `/server/types/bot.types.ts`: Ganti properti Sairi dengan `lunasQrisApiKey`, `lunasQrisSecretKey`, `lunasQrisBaseUrl`.
   - `/src/types/dashboard.types.ts`: Ganti `SairiBalanceState` dengan `LunasQrisBalanceState` (menampung `balance` & `balanceHold`).
2. **Konfigurasi Server & Database**:
   - `/database/api_config.json`: Simpan key `lunasQrisApiKey`, `lunasQrisSecretKey`, `lunasQrisBaseUrl`.
   - `/server/config/configManager.ts`: Perbarui `DEFAULT_API_CONFIG`, `DEFAULT_CONFIG`, dan logika migrasi/penyimpanan config API.
3. **Layanan Backend Gateway**:
   - `/server/services/lunasQrisService.ts` (BARU): Implementasi fungsi `getLunasQrisBalance`, `createLunasQrisTransaction`, `checkLunasQrisStatus`, `cancelLunasQrisTransaction`, `startLunasQrisPolling`, dan `verifyLunasQrisSignature`.
   - `/server/services/sairiService.ts`: Dihapus secara bersih setelah transisi selesai.
4. **Alur Transaksi Bot WhatsApp**:
   - `/server/handlers/messageDispatcher.ts`: Ganti alur Sairi pada tombol `order_var:` / `order_` dengan `createLunasQrisTransaction`, polling status `paid`, pengiriman QRIS & `payment_url` ke DM pembeli, dan auto order Xaviera.
5. **Proxy Middleware Backend**:
   - `/vite.config.ts`: Tambahkan middleware API `/api/lunasqris/balance`, `/api/lunasqris/transaction/create`, `/api/lunasqris/transaction/status`, dan webhook `/api/lunasqris/webhook`.
6. **Frontend Hooks & Komponen UI**:
   - `/src/hooks/useLunasQrisData.ts` (BARU): Hook reaktif untuk fetch saldo dan status LunasQRIS.
   - `/src/hooks/useStoreConfig.ts`: Perbarui state dan fungsi sinkronisasi server untuk LunasQRIS.
   - `/src/components/layout/StoreProfileHeader.tsx`: Perbarui card saldo dengan branding LunasQRIS (Saldo Utama & Saldo Hold).
   - `/src/components/tabs/TabConnection.tsx`: Rancang ulang form integrasi pembayaran untuk LunasQRIS (input Public Key, Secret Key, Base URL, tombol Cek Saldo, dan info Webhook URL).
   - `/src/components/tabs/TabContentRenderer.tsx`: Hubungkan props LunasQRIS ke `TabConnection`.
   - `/src/App.tsx`: Hubungkan `useLunasQrisData` dan selaraskan komponen utama.

---

### 3. Detail Rencana Implementasi (How-To)

#### Langkah 1: Pembaruan Tipe Data TypeScript
- Di `/server/types/bot.types.ts`, ubah:
  ```typescript
  export interface ApiConfig {
    xavieraApiKey: string;
    xavieraBaseUrl: string;
    lunasQrisApiKey?: string;
    lunasQrisSecretKey?: string;
    lunasQrisBaseUrl?: string;
  }
  ```
- Di `/src/types/dashboard.types.ts`, ubah tipe balance state:
  ```typescript
  export interface LunasQrisBalanceState {
    loading: boolean;
    configured: boolean;
    balance: number | null;
    balanceHold: number | null;
    error: string | null;
  }
  ```

#### Langkah 2: Pembaruan Konfigurasi & Database
- Di `/server/config/configManager.ts`:
  - Ubah `DEFAULT_API_CONFIG` dengan `lunasQrisApiKey: ''`, `lunasQrisSecretKey: ''`, `lunasQrisBaseUrl: 'https://lunasqris.com'`.
  - Sesuaikan fungsi `saveCommandsConfig` agar menyimpan data LunasQRIS ke `database/api_config.json`.
- Di `/database/api_config.json`, masukkan template field LunasQRIS.

#### Langkah 3: Pembuatan `server/services/lunasQrisService.ts`
- Implementasi fungsi-fungsi inti:
  - `getLunasQrisBalance(apiKey, baseUrl)`: `GET /api/v1/balance` dengan header `X-API-Key`.
  - `createLunasQrisTransaction(apiKey, payload, baseUrl)`: `POST /api/v1/transaction/create` dengan header `X-API-Key`, mengirim `amount`, `order_id`, `description`, `customer_name`, `expired_minutes`.
  - `checkLunasQrisStatus(apiKey, trxIdOrOrderId, baseUrl)`: `GET /api/v1/transaction/status?order_id=...` atau `/api/v1/transaction/{trx_id}`.
  - `startLunasQrisPolling(pollConfig, addLog)`: Poller background tiap 4 detik yang memeriksa status lunas. Begitu `paid`, panggil `onPaid()`. Jika kedaluwarsa atau timeout, panggil `onExpired()`.

#### Langkah 4: Pembaruan `vite.config.ts` (API Proxy)
- Tambahkan handler route:
  - `GET /api/lunasqris/balance`: Mengambil saldo dari LunasQRIS menggunakan API Key yang tersimpan di botManager.
  - `POST /api/lunasqris/transaction/create`: Proxy pembuatan transaksi.
  - `GET /api/lunasqris/transaction/status`: Proxy pengecekan status transaksi.

#### Langkah 5: Pembaruan `server/handlers/messageDispatcher.ts`
- Ganti import `createSairiInvoice` dan `startInvoicePolling` dengan `createLunasQrisTransaction` dan `startLunasQrisPolling`.
- Saat pembeli klik tombol varian produk (`order_var:`):
  1. Validasi saldo Xaviera (pre-check).
  2. Validasi ketersediaan `lunasQrisApiKey`.
  3. Buat transaksi LunasQRIS dengan ID unik `ORD-[TIMESTAMP]-[RANDOM]`.
  4. Kirim notifikasi singkat di grup: tagihan QRIS sebesar `Rp [total_amount]` (termasuk kode unik `[unique_code]`) telah dikirim ke DM pembeli.
  5. Kirim gambar QRIS (`qr_url`) dan detail tagihan lengkap ke DM pembeli beserta link pembayaran web (`payment_url`).
  6. Jalankan background polling LunasQRIS. Saat status `paid`:
     - Kirim kredensial akun rahasia ke DM pembeli.
     - Kirim notifikasi ringkas ke nomor Owner WhatsApp.

#### Langkah 6: Pembaruan Frontend UI & Hooks
- Buat `/src/hooks/useLunasQrisData.ts` untuk fetch saldo LunasQRIS otomatis saat API Key berubah.
- Di `/src/components/layout/StoreProfileHeader.tsx`:
  - Ubah card Sairi menjadi Card **LunasQRIS Gateway**.
  - Tampilkan Saldo Utama dan Saldo Hold secara informatif.
- Di `/src/components/tabs/TabConnection.tsx`:
  - Buat antarmuka konfigurasi **LunasQRIS Payment Gateway**:
    - Input **Public API Key (`pk_...`)**
    - Input **Secret Key (`sk_...`)**
    - Input **Base URL** (default: `https://lunasqris.com`)
    - Tombol **Cek Saldo LunasQRIS**
    - Kotak ringkasan fitur LunasQRIS (DANA Bisnis, Deteksi Mutasi Otomatis, Kode Unik Transaksi, Privacy-First DM Delivery).

---

### 4. Metode Validasi & Pengujian
1. Jalankan `lint_applet` (`tsc --noEmit`) untuk memastikan semua import dan tipe data sinkron tanpa error.
2. Jalankan `compile_applet` untuk memverifikasi proses build Vite berhasil 100%.
3. Verifikasi file database `database/api_config.json` terisi dengan konfigurasi LunasQRIS.
4. Perbarui `brain/PROGRESS.md` dan `brain/schedule.md` untuk mencatat penyelesaian migrasi.

---

## 📌 Rencana Implementasi: Skrip Otomasi Deployment VPS (`deploy-vps.sh`)

### 1. Tujuan & Deskripsi
Membuat skrip otomasi bash `deploy-vps.sh` yang dapat langsung dijalankan oleh pengguna di VPS miliknya (`104.64.15.80`). Skrip ini akan secara otomatis:
1. Memperbarui package sistem Ubuntu/Debian (`apt update -y && apt upgrade -y`).
2. Menginstall dependensi penting: `git`, `curl`, `wget`, `build-essential`, `ufw`, `nginx`, `certbot`, `python3-certbot-nginx`.
3. Menginstall runtime Node.js v20 LTS dan npm melalui NodeSource.
4. Menginstall PM2 dan `tsx` secara global untuk manajemen proses background 24/7.
5. Menyiapkan direktori proyek bot, menginstall dependensi npm (`npm install`).
6. Membuat file konfigurasi Nginx Reverse Proxy (mengarahkan port 80/domain ke port 3000 dengan dukungan WebSocket untuk Baileys & Webhook LunasQRIS).
7. Mengaktifkan firewall UFW (membuka port 22 SSH, 80 HTTP, 443 HTTPS, dan 3000).
8. Menjalankan bot via PM2 (`pm2 start "npm run dev" --name "wanzt-bot"`) dan mengonfigurasi `pm2 startup` + `pm2 save` agar bot otomatis menyala jika VPS reboot.

### 2. File Target
- `/deploy-vps.sh` (BARU): Skrip instalasi lengkap.

---

## 📌 Rencana Implementasi: Perbaikan Harga Carousel (+10%), Gambar QRIS PNG, & Format Invoice Rapi

### 1. Tujuan & Deskripsi
Memperbaiki 3 poin penting sesuai instruksi pengguna:
1. **Harga Carousel (+10% Keuntungan)**:
   - Pada `server/messages/carouselMessage.ts`, harga yang tertera di caption kartu Carousel `{price}` dan ID tombol Order (`order_var:...`) saat ini masih berupa harga modal asli dari supplier Xaviera.
   - Ubah agar menghitung margin keuntungan 10%: `sellingPrice = rawPrice + Math.round(rawPrice * 0.10)`.
   - Dengan begitu, pelanggan melihat harga jual dengan keuntungan 10%, dan invoice LunasQRIS yang dibuat otomatis menagihkan nominal harga jual tersebut.
   - Di `server/handlers/messageDispatcher.ts`, validasi saldo akun Xaviera disesuaikan untuk memeriksa harga modal (`Math.round(price / 1.10)`), sehingga transaksi tidak terhambat jika saldo pas-pasan sesuai modal.
2. **Perbaikan Pengiriman Gambar QRIS (Fix File Bermasalah / Gagal Download)**:
   - Penyebab error: WhatsApp / Baileys tidak mendukung format file `.svg` yang dihasilkan LunasQRIS (`trx.qr_url`). Klien WhatsApp di HP menolak format SVG sehingga muncul notifikasi file bermasalah / tidak dapat didownload.
   - Solusi: Pasang package `qrcode` untuk mengonversi EMVCo raw string (`trx.qris_string`) menjadi **Buffer gambar PNG murni (600x600 px)** langsung di memori server.
   - Kirimkan sebagai `{ image: pngBuffer, mimetype: 'image/png' }`. Karena berupa binary buffer PNG asli, WhatsApp akan mengunggahnya secara resmi melalui media server WhatsApp dan langsung menampilkan gambar QR code yang tajam, bisa discan, dan bebas masalah download di seluruh perangkat.
   - Sediakan fallback unduh PNG via `axios` dari API generator PNG jika library lokal memerlukan cadangan.
3. **Format Keterangan Invoice Tanpa Garis Pembatas**:
   - Menghapus seluruh karakter garis horizontal (`───────`) pada teks invoice, pesan sukses pembayaran, dan notifikasi owner di `server/handlers/messageDispatcher.ts`.
   - Menggantinya dengan spasi vertikal (*double newline*), format tebal (*bold*), dan ikon/emoji yang rapi sehingga tata letak pesan tetap presisi dan tidak patah di berbagai ukuran layar smartphone.

### 2. File Target
- `package.json`: Pasang `qrcode` & `@types/qrcode`.
- `/server/messages/carouselMessage.ts`: Perhitungan harga jual (+10%) pada caption dan tombol Order.
- `/server/handlers/messageDispatcher.ts`:
  - Perhitungan modal untuk check saldo Xaviera.
  - Pembuatan Buffer PNG QRIS menggunakan `QRCode.toBuffer` / fallback axios PNG.
  - Penghapusan seluruh garis pembatas pada teks invoice, pesan sukses pembayaran, dan notifikasi pesanan.

---

## 📌 Rencana Implementasi: Perubahan Istilah "Kode Unik" Menjadi "Fee Gateway"

### 1. Tujuan & Deskripsi
Mengganti penyebutan istilah "Kode Unik" / "kode unik" menjadi **"Fee Gateway"** pada seluruh teks pesan WhatsApp (notifikasi grup dan invoice DM ke pembeli) serta log & interface dashboard:
- **Alasan**: Pelanggan sering merasa nominal tagihan kemahalan atau heran jika melihat istilah "kode unik", sedangkan istilah "Fee Gateway" (misal: `⚡ Fee Gateway: +Rp 234`) jauh lebih lazim, mudah dipahami, dan diterima secara ramah sebagai biaya layanan sistem pembayaran/gateway.
- **Konsistensi Format**:
  - Pada notifikasi grup: `... (Fee Gateway: *+Rp ${trx.unique_code}*) ...`
  - Pada rincian tagihan DM: `⚡ *Fee Gateway:* +Rp ${trx.unique_code}`
  - Pada catatan penting invoice: `⚠️ *PENTING:* Transfer tepat *Rp ${trx.total_amount.toLocaleString('id-ID')}* hingga digit terakhir (termasuk Fee Gateway) agar pembayaran terverifikasi otomatis.`
  - Pada dashboard `TabConnection.tsx`: Ubah penjelasan deskripsi menjadi Fee Gateway otomatis.

### 2. File Target
1. `/server/handlers/messageDispatcher.ts`:
   - Log pembuatan transaksi (ganti `Kode Unik` -> `Fee Gateway`).
   - Teks notifikasi grup `groupNotification`.
   - Teks rincian invoice `invoiceCaption`.
2. `/src/components/tabs/TabConnection.tsx`:
   - Teks deskripsi integrasi dan badge fitur.
3. `/brain/PROGRESS.md`:
   - Catat progres perubahan penamaan dan verifikasi build.

---

## 📌 Rencana Implementasi: Pembuatan Tab "Transaksi" (Pengganti tab05) & Pelacak Transaksi Otomatis

### 1. Tujuan & Deskripsi
Mengganti slot `tab05` menjadi tab resmi bernama **"Transaksi"** yang memuat seluruh riwayat transaksi pesanan bot toko secara komprehensif, real-time, dan persisten di database:
1. **Navigasi Tab**: Mengubah label `tab05` menjadi `Transaksi` di navigasi utama `App.tsx` dan merendernya di `TabContentRenderer.tsx` saat dipilih (`Transaksi` atau `tab05`).
2. **Kolom & Data yang Dimuat**:
   - **Nomer Pembeli**: Nomor WhatsApp pembeli (dengan tombol salin dan link chat WhatsApp).
   - **Nama Produk**: Judul produk digital yang dibeli (misal: Netflix Premium, Spotify, dll).
   - **Varian Produk**: Detail paket varian yang dipilih (misal: 1 Bulan 4K UHD, Sharing, dll).
   - **Order ID**: ID unik pesanan (misal: `ORD-XXXXXX`), teks monospace dengan tombol salin.
   - **Nominal**: Harga dasar produk sebelum fee/kode unik dalam format Rupiah (`Rp ...`).
   - **Kode Unik**: Nominal unik/fee gateway dalam format Rupiah (`+Rp ...`).
   - **Total**: Total keseluruhan pembayaran yang ditagihkan (`Rp ...`).
   - **Status Pembayaran (Warna Khusus)**:
     - `pending`: Badge berwarna **kuning** (`bg-amber-100 text-amber-800 border-amber-300 font-semibold`)
     - `cancel`: Badge berwarna **merah** (`bg-rose-100 text-rose-800 border-rose-300 font-semibold`)
     - `paid`: Badge berwarna **hijau** (`bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold`)
3. **Penyimpanan Persisten & Manajemen Data**:
   - Membuat file `/server/services/transactionManager.ts` untuk membaca dan menyimpan data ke `/database/transactions.json`.
   - Mengintegrasikan pencatatan otomatis saat transaksi baru dibuat di `server/handlers/messageDispatcher.ts` (status: `pending`).
   - Mengubah status otomatis menjadi `paid` saat polling LunasQRIS atau Webhook mendeteksi pembayaran berhasil.
   - Mengubah status otomatis menjadi `cancel` saat transaksi kedaluwarsa atau timeout.
4. **Endpoint API Backend**:
   - `GET /api/transactions`: Mengambil semua daftar transaksi (diurutkan dari yang terbaru) serta ringkasan metrik (Total Transaksi, Total Omset Paid, Jumlah Pending, Paid, dan Cancel).
   - `POST /api/transactions/sync`: Sinkronisasi status transaksi pending ke API LunasQRIS.
   - `DELETE /api/transactions/:orderId`: Menghapus riwayat transaksi jika dibutuhkan.
5. **Frontend UI**:
   - Hook kustom `/src/hooks/useTransactions.ts`.
   - Komponen `/src/components/tabs/TabTransaksi.tsx` lengkap dengan kartu statistik, fitur pencarian multi-kolom (Order ID, nomor pembeli, produk), filter status (Semua, Pending, Paid, Cancel), tombol refresh, dan tabel responsif.

### 2. File Target
1. `/database/transactions.json` (BARU): Tempat penyimpanan persisten data transaksi.
2. `/server/services/transactionManager.ts` (BARU): Modul CRUD dan helper kalkulasi riwayat transaksi.
3. `/server/handlers/messageDispatcher.ts`: Menyimpan transaksi baru (`pending`), update `paid`, dan update `cancel`.
4. `/vite.config.ts`: Menyediakan endpoint API `/api/transactions`, `/api/transactions/sync`, dan integrasi Webhook ke status database.
5. `/src/types/dashboard.types.ts`: Menambahkan tipe data `TransactionItem` dan `TransactionSummary`.
6. `/src/hooks/useTransactions.ts` (BARU): Hook reaktif pengelola data transaksi.
7. `/src/components/tabs/TabTransaksi.tsx` (BARU): Antarmuka tabel transaksi lengkap dengan badge warna kuning, merah, hijau.
8. `/src/components/tabs/TabContentRenderer.tsx`: Menghubungkan TabTransaksi saat `selectedTab === 'Transaksi' || selectedTab === 'tab05'`.
9. `/src/App.tsx`: Mengubah label tab `tab05` menjadi `Transaksi` pada navigasi bar dan menyambungkan hook transaksi.
10. `/brain/PROGRESS.md`: Pencatatan status progres.

---

## 📌 Rencana Implementasi: Command Invoice Dinamis & Perbaikan Tombol Hapus Transaksi

### 1. Tujuan & Deskripsi
Menerapkan 2 tugas utama sesuai instruksi pengguna:
1. **Command Invoice Dinamis di Tab Command**:
   - Menambahkan opsi `'Invoice'` pada dropdown pilih command di Tab Command (`Menu`, `List`, `Carousel`, `Invoice`).
   - Konten halaman Command Invoice memungkinkan admin mengatur template teks invoice tagihan (`invoiceOutputText`) dan footer (`invoiceFooterText`).
   - Mendukung seluruh placeholder toko & produk: `{storeName}`, `{ownerNumber}`, `{category}`, `{varian}`, `{price}`, `{produkName}`, `{adminNumber}`, `{webLink}`.
   - Mendukung placeholder khusus invoice: `{orderId}`, `{total}`, `{unikCode}`.
   - Menyertakan **2 tombol interaktif Native Flow**:
     - **Tombol 1 (Quick Reply - Hubungi Admin)**: Saat diklik oleh pembeli di WhatsApp, bot mengirimkan vCard kontak WhatsApp nomor admin toko. Jika form nomor admin kosong (karena opsional), otomatis fallback mengirimkan nomor owner toko.
     - **Tombol 2 (CTA URL - Web Checkout)**: Tombol resmi yang mengarahkan pembeli langsung ke URL web checkout LunasQRIS (`payment_url`).
   - Pratinjau interaktif (*Live WhatsApp Preview*) POV pembeli lengkap dengan simulasi QR code dan 2 tombol interaktif.
   - Penyimpanan persisten di `/database/command_invoice.json` dan tersinkronisasi dengan konfigurasi backend.
   - Di `server/handlers/messageDispatcher.ts`, pesan invoice akan dirender menggunakan template dinamis ini dengan seluruh placeholder diganti secara tepat, dan dikirimkan bersama QRIS serta kedua tombol interaktif tersebut.
2. **Perbaikan Tombol Hapus Transaksi (Icon Tempat Sampah) di Tab Transaksi**:
   - **Penyebab Masalah**: Tombol sebelumnya memanggil fungsi bawaan peramban `window.confirm(...)`. Di dalam lingkungan sandbox iframe AI Studio atau web preview, pemanggilan `window.confirm` dilarang/diblokir oleh browser sandbox (`Avoid window.alert/window.open`), sehingga konfirmasi langsung gagal/noop dan penghapusan tidak pernah dieksekusi. Selain itu, tombol aksi berada di ujung kanan dengan padding kecil yang rentan tertimpa *hitbox* tautan Web Checkout.
   - **Solusi**:
     - Hapus `window.confirm(...)`.
     - Terapkan **Inline Two-Step Confirmation**: Klik pertama mengubah tombol menjadi konfirmasi "Hapus? Ya" (atau tombol konfirmasi merah cerah dengan ikon centang) dengan timeout otomatis pembatalan 3 detik jika tidak diklik.
     - Perbesar area klik (*touch target*) dengan `relative z-10`, padding memadai, dan efek visual yang jelas.
     - Tambahkan feedback notifikasi toast saat transaksi berhasil dihapus.

### 2. File Target
1. `/database/command_invoice.json` (BARU): Tempat penyimpanan persisten template teks & footer invoice.
2. `/server/types/bot.types.ts`: Menambahkan `InvoiceCommandConfig` dan properti `invoiceOutputText`, `invoiceFooterText`.
3. `/server/config/configManager.ts`: Mengelola load dan save untuk file `command_invoice.json`.
4. `/src/types/dashboard.types.ts`: Menambahkan opsi `'Invoice'` pada `selectedCommand` dan interface invoice.
5. `/src/hooks/useStoreConfig.ts`: Menambahkan state `invoiceOutputText` & `invoiceFooterText` dan sinkronisasi server.
6. `/src/components/tabs/TabCommand.tsx`: Menambahkan tampilan form pengaturan Invoice (chips placeholder, textarea, footer, preview WhatsApp, tombol simpan).
7. `/server/handlers/messageDispatcher.ts`: Menggunakan template dinamis invoice saat kirim QRIS, menyertakan 2 tombol native flow, dan handler tombol vCard Hubungi Admin (dengan fallback nomor owner).
8. `/src/components/tabs/TabTransaksi.tsx`: Memperbaiki tombol tempat sampah dengan inline confirmation bebas `window.confirm`.
9. `/brain/PROGRESS.md`: Pencatatan status progres.

---

## 📌 Rencana Implementasi: Live Requirements Checklist untuk Custom Pairing Code

### 1. Tujuan & Deskripsi
Mengganti kotak peringatan kuning statis (*"Form Pairing Code Belum Diisi"*) pada panel koneksi WhatsApp dengan antarmuka **Live Requirements Checklist** modern dan interaktif, mengacu pada contoh referensi `Screenshot_20261028-064352.png`:
1. **Segmented Progress Bar**:
   - Baris 4-segmen animasi transisi halus di bawah input pairing code.
   - Status warna: Merah (kosong/simbol), Kuning (1-7 char), Hijau (8 char valid).
2. **Status Label Dinamis**:
   - Menampilkan status kekuatan kode: `Belum Diisi` (abu), `Format Tidak Sesuai` (merah), `Panjang Belum Cukup (x/8)` (kuning/sky), dan `Kode Valid & Siap Digunakan` (hijau).
3. **Daftar Syarat Real-Time (Requirements Checklist)**:
   - **Syarat 1 (Wajib 8 karakter)**: Menampilkan tanda centang hijau `✓` jika tepat 8 karakter, atau titik `•` / hitungan sisa karakter jika belum 8 karakter.
   - **Syarat 2 (Tidak menyertakan simbol)**: Menampilkan tanda centang hijau `✓` jika bersih tanpa simbol/spasi, atau silang merah `✕` jika terdeteksi simbol.
   - **Syarat 3 (Hanya angka dan huruf A-Z, 0-9)**: Menampilkan tanda centang hijau `✓` jika mengandung kombinasi alfanumerik yang valid.

### 2. File Target
1. `/src/components/connection/WhatsAppConnectionPanel.tsx`: Mengganti alert box lama dengan komponen Live Requirements Checklist dan segmented progress bar.
2. `/brain/PROGRESS.md`: Pencatatan status progres penyelesaian.

---

## 📌 Rencana Implementasi: Halaman Login Aman & Lock Wajib Store Info

### 1. Tujuan & Deskripsi
Menerapkan sistem keamanan otentikasi login pengguna dan proteksi operasional bot WhatsApp:
1. **Halaman Login Aman (Zero Inspect Leak)**:
   - Antarmuka form login minimalis: Username, Password (dengan toggle intip), dan tombol Login.
   - Keamanan tingkat tinggi: Tidak ada kredensial yang diletakkan di frontend. Password di-hash di backend (`crypto.pbkdf2Sync` + salt) pada `/database/auth.json`.
   - Menggunakan session token acak (`crypto.randomBytes(32)`).
   - Seluruh dashboard terkunci total sebelum pengguna berhasil login.
2. **Server-Side Enforcement & Bot Lock**:
   - Di `/api/bot/start` (backend): Jika Nama Toko, Nama Owner, atau Nomer Owner kosong, server menolak menyalakan bot.
3. **Pop-up Modal Wajib Isi Store Info (Non-Dismissible)**:
   - Setelah login, jika data toko belum lengkap, tampilkan pop-up modal tanpa tombol close / batalkan (tidak bisa di-dismiss).
   - Pengguna wajib mengisi: Nama Toko, Nama Owner, dan Nomer Owner.
   - Saat disimpan, data tersimpan di backend (`/database/store_info.json`) dan otomatis mengisi formulir Store Info pada dashboard.

### 2. File Target
1. `/server/services/authManager.ts` (BARU): Modul hashing password (PBKDF2), validasi login, dan sesi token.
2. `/database/auth.json` (BARU): Tempat penyimpanan kredensial akun administrator.
3. `/vite.config.ts`: Endpoint `/api/auth/login`, `/api/auth/session`, `/api/auth/logout`, `/api/auth/store-setup`, dan validasi data toko di `/api/bot/start`.
4. `/src/hooks/useAuth.ts` (BARU): Hook status otentikasi pengguna.
5. `/src/components/auth/LoginPage.tsx` (BARU): Komponen halaman login bersih dan modern.
6. `/src/components/modals/MandatoryStoreSetupModal.tsx` (BARU): Modal pop-up wajib isi data toko (non-dismissible).
7. `/src/App.tsx`: Gerbang otentikasi dan render modal wajib store info.
8. `/brain/PROGRESS.md`: Pencatatan status progres.

---

## 📌 Rencana Implementasi: Redesain Login Page & Pop-up Modal Sesuai `DESIGN (2).md` (Anti-AI Slop)

### 1. Tujuan & Deskripsi
Menyelaraskan desain antarmuka `LoginPage.tsx` dan `MandatoryStoreSetupModal.tsx` secara 100% konsisten dengan spesifikasi resmi pada `DESIGN (2).md`:
1. **Menghilangkan Seluruh Unsur "AI Slop"**:
   - Menghapus gradien warna-warni (purple/indigo/orange gradient), efek neon glow/blur melayang, dan tombol pill berlebihan.
   - Mengadopsi prinsip **Industrial Utility & Editorial Minimalism**.
2. **Kesesuaian Palet Warna Mode Terang (Light Mode - Primary Default)**:
   - **Background Canvas**: `#F8FAFC` (`bg-slate-50`).
   - **Surface Kartu**: `#FFFFFF` (`bg-white`), tipis 1px border `#E2E8F0` (`border-slate-200`), shadow halus (`shadow-xs` / `shadow-sm`).
   - **Teks Utama**: `#0F172A` (`text-slate-900`) dengan tracking tajam `-0.02em`.
   - **Teks Sekunder**: `#64748B` (`text-slate-500`).
   - **Warna Aksen Brand**: `#0284C7` (`bg-sky-600 hover:bg-sky-700 text-white`).
   - **Indikator Peringatan / Sukses**: Menggunakan token warna utilitas bersih (`bg-amber-50 border-amber-200 text-amber-800` & `bg-emerald-50 border-emerald-200 text-emerald-800`).
3. **Redesain `LoginPage.tsx`**:
   - Background canvas bersih Slate 50.
   - Kartu login putih minimalis dengan border tipis 1px slate-200.
   - Header konsisten: Logo avatar `wanztstore` / bot icon bernuansa sky-50/sky-600.
   - Judul: `Bot Dashboard Manager` (sesuai edit pengguna) dengan subjudul bersih.
   - Form input bersih: `border-slate-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20`.
   - Tombol login: Solid Sky 600 (`bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-lg py-2.5`).
   - Footer info keamanan minimalis tanpa dekorasi berlebihan.
4. **Redesain `MandatoryStoreSetupModal.tsx`**:
   - Kartu modal putih bersih (`bg-white border-slate-200 rounded-xl`).
   - Header modal minimalis dengan border bawah tipis (`border-b border-slate-100`) dan badge status amber fungsional (`bg-amber-50 text-amber-700 border-amber-200`).
   - Kotak informasi tanpa gradien: `bg-amber-50/80 border-amber-200 text-amber-900`.
   - Input fields: Identik dengan form Store Info di dashboard utama.
   - Tombol simpan: Solid Sky 600 (`bg-sky-600 hover:bg-sky-700`).

### 2. File Target
1. `/src/components/auth/LoginPage.tsx`: Redesain total ke style clean industrial minimalism.
2. `/src/components/modals/MandatoryStoreSetupModal.tsx`: Redesain total selaras dengan palet dashboard.
3. `/brain/PROGRESS.md`: Pencatatan progres.

## 📌 Rencana Implementasi: Pemisahan Frontend & Backend serta Panduan Instalasi VPS (`INSTALASI.md`)

### 1. Tujuan & Deskripsi
Memisahkan arsitektur sistem menjadi Frontend (React + Vite) dan Backend (Express + Node.js) yang terpisah, bersih, dan modular, serta menyusun panduan lengkap instalasi VPS di `INSTALASI.md` untuk IP `104.64.15.80` dalam direktori `bot-whatsapp` dengan manajemen proses PM2:
1. **Pemisahan Arsitektur Backend (Express Modular Routes)**:
   - Memindahkan seluruh logika route REST API yang sebelumnya menumpuk di dalam middleware `vite.config.ts` (600+ baris) ke dalam folder `/server/routes/`:
     - `/server/routes/authRoutes.ts`: Route otentikasi aman (`/api/auth/*`).
     - `/server/routes/botRoutes.ts`: Route kontrol WhatsApp Baileys bot (`/api/bot/*`).
     - `/server/routes/xavieraRoutes.ts`: Route proxy integrasi Xaviera API (`/api/xaviera/*`).
     - `/server/routes/lunasQrisRoutes.ts`: Route proxy LunasQRIS & Webhook HMAC-SHA256 (`/api/lunasqris/*`).
     - `/server/routes/transactionRoutes.ts`: Route data riwayat transaksi (`/api/transactions/*`).
     - `/server/routes/mediaRoutes.ts`: Route manajemen file gambar (`/api/media/*`).
   - Membuat `/server/app.ts`: Setup Express app utama dengan middleware `cors`, parsing JSON (dengan rawBody buffer untuk signature webhook), dan mounting semua routes.
   - Membuat `/server/standalone.ts`: Server backend mandiri (port 5000 / `process.env.PORT`) untuk skenario eksekusi backend terpisah di VPS.
2. **Server Entry Point & Integrasi Dev (`server.ts`)**:
   - Sesuai standar AI Studio Build Full-Stack: Membuat `server.ts` yang menjalankan Express app pada port 3000 dengan `vite.middlewares` saat development (`npm run dev`), dan menyajikan bundle statis `dist` saat production.
3. **Penyederhanaan `vite.config.ts`**:
   - Menghapus 600+ baris middleware dari `vite.config.ts` sehingga menjadi file konfigurasi Vite murni, ringan, dan cepat.
4. **Pembaruan `package.json`**:
   - Menambahkan script `"dev": "tsx server.ts"`, `"start": "tsx server.ts"`, `"backend": "tsx server/standalone.ts"`, dan `"frontend:dev": "vite --port=3000 --host=0.0.0.0"`.
5. **Konfigurasi PM2 (`ecosystem.config.cjs`)**:
   - Menyediakan file konfigurasi PM2 siap pakai untuk folder `bot-whatsapp` di VPS `104.64.15.80`.
6. **Dokumentasi Lengkap `INSTALASI.md`**:
   - Panduan terperinci langkah demi langkah untuk VPS IP `104.64.15.80`:
     - Struktur folder proyek di dalam `/root/bot-whatsapp` (atau `/home/ubuntu/bot-whatsapp`).
     - Penjelasan pemisahan Frontend dan Backend.
     - Prasyarat (Node.js 20 LTS, Git, PM2).
     - Menjalankan via PM2 (`pm2 start ecosystem.config.cjs` / perintah mandiri).
     - Konfigurasi Nginx Reverse Proxy & Firewall (UFW).
     - Konfigurasi Webhook LunasQRIS ke `http://104.64.15.80/api/lunasqris/webhook`.
     - Monitoring, logs, restart otomatis, dan troubleshooting.

### 2. File Target
1. `/server/routes/authRoutes.ts` (BARU)
2. `/server/routes/botRoutes.ts` (BARU)
3. `/server/routes/xavieraRoutes.ts` (BARU)
4. `/server/routes/lunasQrisRoutes.ts` (BARU)
5. `/server/routes/transactionRoutes.ts` (BARU)
6. `/server/routes/mediaRoutes.ts` (BARU)
7. `/server/app.ts` (BARU)
8. `/server/standalone.ts` (BARU)
9. `/server.ts` (BARU)
10. `/vite.config.ts` (REFACTOR - bersihkan middleware)
11. `/package.json` (UPDATE scripts)
12. `/ecosystem.config.cjs` (BARU)
13. `/INSTALASI.md` (BARU)
14. `/brain/PROGRESS.md` (UPDATE)

## 📌 Rencana Implementasi: Pemisahan Fisik Folder `frontend/` dan `backend/` serta Domain `testbot.wanma2.my.id`

### 1. Tujuan & Deskripsi
Menerapkan pemisahan fisik penuh struktur direktori proyek menjadi:
- `bot-whatsapp/frontend/`: Seluruh kode dan aset antarmuka (React components, hooks, types, `index.html`, `vite.config.ts`, `package.json`).
- `bot-whatsapp/backend/`: Seluruh engine dan API server (Express server, routes, services, handlers, database JSON, `package.json`).
- Serta mengonfigurasi domain khusus pengguna **`testbot.wanma2.my.id`** pada Nginx Reverse Proxy, SSL Certbot, Webhook LunasQRIS, skrip otomatisasi `deploy-vps.sh`, dan panduan `INSTALASI.md`.

### 2. File Target
1. `/frontend/` (BARU):
   - `/frontend/package.json`
   - `/frontend/vite.config.ts`
   - `/frontend/index.html`
   - `/frontend/src/` (Komponen, hooks, types, media)
2. `/backend/` (BARU):
   - `/backend/package.json`
   - `/backend/server.ts` (Express server port 5000)
   - `/backend/app.ts` (Express app & routing)
   - `/backend/routes/` (auth, bot, lunasqris, xaviera, transaction, media)
   - `/backend/services/`
   - `/backend/handlers/`
   - `/backend/messages/`
   - `/backend/config/`
   - `/backend/database/` (Data json persisten)
3. Root Orchestrator:
   - `/package.json`: Menghubungkan dev, build, dan start agar berjalan mulus di AI Studio port 3000 maupun di VPS.
   - `/server.ts`: Full-stack dev runner menghubungkan backend Express dan frontend Vite middleware.
   - `/ecosystem.config.cjs`: Disesuaikan untuk domain `testbot.wanma2.my.id` dan target folder `backend/server.ts`.
   - `/INSTALASI.md`: Panduan instalasi terupdate khusus domain `testbot.wanma2.my.id` dan VPS `104.64.15.80`.
   - `/deploy-vps.sh`: Skrip otomatisasi dengan domain `testbot.wanma2.my.id`.

---

## ⏳ Log Status & Riwayat Rencana Implementasi

| Tanggal | Tugas / Fitur | File Target | Status |
| :--- | :--- | :--- | :--- |
| 2026-10-28 | Pemisahan Fisik Folder `frontend/` & `backend/` + Domain `testbot.wanma2.my.id` | `frontend/*`, `backend/*`, `INSTALASI.md` | Selesai (Verified) |
| 2026-10-28 | Pemisahan Frontend & Backend serta Panduan Instalasi VPS | `server/*`, `server.ts`, `vite.config.ts`, `INSTALASI.md` | Selesai (Verified) |
| 2026-10-28 | Redesain Login Page & Pop-up Modal Sesuai `DESIGN (2).md` | `src/components/auth/*`, `src/components/modals/*` | Selesai (Verified) |
| 2026-10-27 | Halaman Login Aman & Lock Wajib Store Info | `server/*`, `src/*`, `database/auth.json` | Selesai (Verified) |
| 2026-10-27 | Live Requirements Checklist Custom Pairing Code | `src/components/connection/WhatsAppConnectionPanel.tsx` | Selesai (Verified) |
| 2026-10-27 | Command Invoice Dinamis & Fix Tombol Hapus Transaksi | `src/*`, `server/*`, `database/command_invoice.json` | Selesai (Verified) |
| 2026-10-26 | Ganti tab05 Jadi Tab "Transaksi" & Data Riwayat Real-time | `src/*`, `server/*`, `database/transactions.json` | Selesai (Verified) |
| 2026-10-26 | Ubah Istilah "Kode Unik" Menjadi "Fee Gateway" | `server/handlers/messageDispatcher.ts`, `src/components/tabs/TabConnection.tsx` | Selesai (Verified) |
| 2026-10-26 | Harga Carousel +10%, QR PNG Buffer, & Hapus Garis Invoice | `server/messages/carouselMessage.ts`, `server/handlers/messageDispatcher.ts` | Selesai (Verified) |
| 2026-10-26 | Skrip Otomasi Deployment VPS 1-Klik | `deploy-vps.sh` | Selesai (Verified) |
| 2026-10-26 | Migrasi Payment Gateway Sairi ke LunasQRIS | `server/*`, `src/*`, `database/api_config.json` | Selesai (Verified) |
| 2026-10-26 | Pemulihan File Modular & Hook (Fix Import Errors) | `src/hooks/*`, `src/components/tabs/*` | Selesai (Verified) |
| 2026-10-26 | Perbaikan Bug Tab SMM (Fix Typo SMM vs SSM) | `src/components/tabs/TabContentRenderer.tsx`, `src/types/dashboard.types.ts` | Selesai (Verified) |
| 2026-10-25 | Sinkronisasi Kode GitHub & Modularisasi | `src/App.tsx`, `src/components/*` | Selesai (Verified) |






