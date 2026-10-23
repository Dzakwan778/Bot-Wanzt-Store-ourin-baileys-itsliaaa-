# Status Progres Proyek: WhatsApp Bot Store Manager (Wanzt Store)

Dokumen ini berfungsi sebagai panduan serah terima status proyek untuk pengembang / AI selanjutnya agar pekerjaan dapat dilanjutkan tanpa kehilangan konteks.

---

## 📌 Ringkasan Proyek
Aplikasi berbasis React + Tailwind CSS dengan backend terintegrasi Vite middleware menggunakan library `@itsliaaa/baileys`.
Aplikasi ini mengatur bot WhatsApp toko otomatis dengan fitur:
- Tombol Interaktif Native Flow (`cta_url`, `quick_reply`, `cta_call`, `cta_copy`, `vcard`).
- Command Menu, Command List (Katalog Layanan), dan Command Carousel Produk.
- Integrasi Xaviera API untuk profil, produk digital/SMM/game otomatis murni tanpa data cadangan lokal palsu.
- Sistem modular JSON database di folder `/database/`.
- Manajemen Whitelist Grup WhatsApp (toggle aktif/nonaktif fungsi bot per grup).

---

## ✅ Fitur yang Telah Selesai (Completed)
1. **Penghapusan Teks Mesin Baileys di Terminal Log**:
   - Teks footer `"Mesin: @itsliaaa/baileys (Carousel & Native Flow)"` pada terminal log dashboard telah berhasil dihapus.
2. **Penyesuaian Label Profil & Saldo**:
   - Label profil ("Xaviera Developer API" $\rightarrow$ "INFO PROFIL ANDA") dan saldo ("Saldo Xaviera" $\rightarrow$ "Saldo Anda") telah disesuaikan oleh pengguna.
3. **Penggantian Nomor Default Menjadi `81234567890`**:
   - Nomor telepon default pairing bot di `src/App.tsx` serta `database/store_info.json` (`ownerNumber`) telah diganti menjadi `81234567890`.
4. **Penggantian Logo "WS" di Header Top Bar Menjadi Avatar Profil (`User` Icon)**:
   - Kotak teks "WS" di pojok kiri atas header top bar telah diganti dengan ikon avatar profil kosong (`User` dari `lucide-react`).
5. **Penghapusan Span Username Xaviera di Header**:
   - Elemen `span` kedua (`@{xavieraProfile.data?.username}`) pada header informasi toko telah berhasil dihapus.
6. **Perubahan Teks Header Top Bar Menjadi "Dashboard Bot WhatsApp"**:
   - Teks branding pada bilah navigasi atas (*top bar header*) telah diubah menjadi **"Dashboard Bot WhatsApp"**.
7. **Sinkronisasi Nama Toko Dinamis pada Judul Header (`<h1>`)**:
   - Judul utama dashboard pada header atas (`<h1>`) telah disinkronkan langsung dengan `storeInfo.storeName` dari tab Store Info (`database/store_info.json`).
8. **Implementasi Sistem Whitelist Grup WhatsApp**:
   - Status toggle grup di tab "Grup" mengontrol whitelist izin bot di grup WhatsApp. Jika toggle nonaktif, bot tidak merespon apapun di grup tersebut.
9. **Penghapusan Seluruh Data Cadangan Lokal (Pure Live API Mode)**:
   - Data produk, SMM, dan Top Up murni berasal dari API Xaviera.
10. **Implementasi Tab "Grup" (Sebelumnya `tab04`)**:
    - Tab navigation diperbarui dari `tab04` menjadi **`Grup`** dengan ikon `Users`.
11. **Perbaikan Tombol WhatsApp `cta_url` (Native Flow)**:
    - Format `nativeFlow` resmi `@itsliaaa/baileys` dengan `buttonParamsJson`.
12. **Pembersihan Form Duplikat `quick_reply`**:
    - Form ganda pada modal Tambah/Edit Tombol WhatsApp telah dibersihkan.
13. **Penyimpanan Modular Database**:
    - `database/store_info.json`, `database/command_menu.json`, `database/command_list.json`, `database/command_carousel.json`, `database/api_config.json`, `database/groups_config.json`.

---

## 📂 Struktur Penting
- `src/App.tsx`: UI Dashboard Admin (Tab Status, Menu, List, Carousel, Xaviera API, Grup, Produk, SSM, Top Up).
- `server/handlers/messageDispatcher.ts`: Router pesan masuk WhatsApp (pemeriksaan whitelist grup).
- `server/services/groupService.ts`: Pengelolaan data whitelist grup di `database/groups_config.json`.
- `server/services/xavieraService.ts`: Penghubung data API Xaviera untuk bot WhatsApp (Pure Live API Mode).
- `server/botManager.ts`: Lifecycle koneksi Baileys WhatsApp & grup fetch.
- `vite.config.ts`: Konfigurasi server Vite + API middleware (`/api/bot/*`, `/api/xaviera/*`, `/api/media/*`).

---

## 🚀 Prosedur AI Selanjutnya
Setiap kali diminta melakukan modifikasi:
1. **Buat Rencana Implementasi**: Jelaskan langkah dan file yang akan disentuh.
2. **Perbarui `PROGRESS.md`**: Catat rencana dan status terbaru ke dalam dokumen ini.
3. **Eksekusi Perubahan Kode**: Lakukan modifikasi kode sesuai rencana.
4. **Verifikasi**: Jalankan linter dan compiler untuk memastikan sistem berjalan tanpa error.
