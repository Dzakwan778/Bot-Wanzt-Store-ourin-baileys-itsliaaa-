# Status Progres Proyek: WhatsApp Bot Store Manager (Wanzt Store)

Dokumen ini berfungsi sebagai panduan serah terima status proyek untuk pengembang / AI selanjutnya agar pekerjaan dapat dilanjutkan tanpa kehilangan konteks.

---

## 📌 Ringkasan Proyek
Aplikasi berbasis React + Tailwind CSS dengan backend terintegrasi Vite middleware menggunakan library `@itsliaaa/baileys`.
Aplikasi ini mengatur bot WhatsApp toko otomatis dengan fitur:
- Tombol Interaktif Native Flow (`cta_url`, `quick_reply`, `cta_call`, `cta_copy`, `vcard`).
- Command Menu, Command List (Katalog Layanan), dan Command Carousel Produk.
- Integrasi Xaviera API untuk profil, produk digital/SMM/game otomatis murni tanpa data cadangan lokal palsu.
- Integrasi Payment Gateway LunasQRIS API (DANA Bisnis QRIS Dinamis + Kode Unik Otomatis).
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

---

## 📂 Struktur Penting
- `src/components/tabs/TabContentRenderer.tsx`: Pengendali rendering konten tab yang aktif.
- `src/components/tabs/TabSsm.tsx`: Komponen visual katalog layanan SMM.
- `src/hooks/useXavieraData.ts`: Hook pengambil data produk, SMM, dan game dari Xaviera API.
- `src/hooks/useLunasQrisData.ts`: Hook pengelola data saldo dan status LunasQRIS Payment Gateway.
- `src/types/dashboard.types.ts`: Definisi interface tipe data dan helper fungsi `detectSmmPlatform`.
- `server/services/lunasQrisService.ts`: Mesin interaksi API dan verifikasi Webhook LunasQRIS.
