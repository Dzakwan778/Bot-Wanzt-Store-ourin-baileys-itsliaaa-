# Langkah Implementasi (langkah_implementasi.md)

Dokumen ini mencatat rencana aksi teknis yang **akan dilakukan (belum dieksekusi)**. Dokumen ini berfokus pada penjelasan **apa yang akan dilakukan** dan **bagaimana cara mengimplementasikannya secara rinci**, bukan melaporkan apa yang telah diubah.

---

## 📌 Format Penulisan Langkah Implementasi

Setiap ada tugas atau fitur baru yang akan dikerjakan, susun dengan format berikut:

```markdown
### [Fitur / Tugas yang Akan Dikerjakan]
1. **Tujuan & Deskripsi**: 
   Penjelasan ringkas mengenai fitur yang akan dibuat atau diubah.
2. **File Target**:
   Daftar file yang akan disentuh atau dibuat baru.
3. **Detail Rencana Implementasi (How-To)**:
   - Langkah 1: ...
   - Langkah 2: ...
   - Langkah 3: ...
4. **Metode Validasi & Pengujian**:
   Cara menguji apakah implementasi berhasil tanpa error.
```

---

## ⏳ Rencana Implementasi Aktif: Perbaikan Tampilan & Data Tab Produk (Sesuai Screenshot Asli)

### [Perbaikan Tampilan Tabel & Pemetaan Varian Produk pada Tab Produk]
1. **Tujuan & Deskripsi**:
   - Memperbaiki tampilan tabel katalog pada **Tab Produk** (`src/components/tabs/TabProduk.tsx`) agar 100% identik dan presisi dengan tangkapan layar asli pengguna (`Screenshot_20261025-062602_f4b60c00.png`).
   - Memperbaiki pemetaan data produk dari API Xaviera di `src/hooks/useXavieraData.ts` agar unroll (membongkar) setiap varian di dalam `product.variants` menjadi baris-baris varian dengan nama produk induk dan varian anak.
   - Memastikan proxy `/api/xaviera/products` di `vite.config.ts` dapat menerima query parameter `?apikey=...` dan header Authorization dari klien, serta menyiapkan default API key yang valid di `database/api_config.json`.
   - Mengubah struktur visual tabel:
     - Menghilangkan container card abu-abu tebal (`border rounded-xl shadow-2xs`).
     - Header `thead` transparan tanpa background banner `bg-slate-50`.
     - Icon produk diletakkan langsung di samping nama produk tanpa bingkai kotak putih.
     - Baris varian anak kedua dan seterusnya menampilkan `—— -` pada kolom NAMA.
     - Badge stok: Hijau dengan titik (`• 20`) jika stok > 0, atau bingkai merah (`0`) jika stok kosong (0).
     - Format harga asli: `Rp5.000` (tanpa spasi antara Rp dan angka).
     - Format harga jual: `Rp5.500 (500)` dengan angka margin dalam pill hijau lembut.
     - Menghapus footer kartu yang tidak ada di screenshot asli.

2. **File Target**:
   - `/src/components/tabs/TabProduk.tsx`: Restrukturisasi desain tabel produk agar persis screenshot.
   - `/src/hooks/useXavieraData.ts`: Unroll `variants` array saat parsing response `/api/xaviera/products` dan teruskan `apikey`.
   - `/vite.config.ts`: Dukung `req.headers.authorization` & `query.apikey` pada endpoint `/api/xaviera/products`.
   - `/database/api_config.json`: Isi default `xavieraApiKey` yang valid agar sinkronisasi langsung berfungsi.

3. **Detail Rencana Implementasi (How-To)**:
   - **Langkah 1**: Perbarui `vite.config.ts` pada rute `/api/xaviera/products` untuk membaca `queryKey || authHeader || botManager.config.xavieraApiKey || DEFAULT_API_KEY`.
   - **Langkah 2**: Perbarui `database/api_config.json` dengan API key Xaviera resmi `xvs_0726effe853aadea27bd6608ef98468cc3121b82e036e5f7`.
   - **Langkah 3**: Perbarui `src/hooks/useXavieraData.ts` di fungsi `fetchXavieraProducts` untuk melakukan unrolling varian `item.variants` secara tepat.
   - **Langkah 4**: Perbarui `src/components/tabs/TabProduk.tsx` dengan layout tabel minimalis, header transparan, icon inline, varian `—— -`, badge stok titik hijau vs kotak merah, format harga tanpa spasi, dan badge margin hijau.
   - **Langkah 5**: Verifikasi dengan `compile_applet` dan `lint_applet`.
   - **Langkah 6**: Perbarui `brain/progress.md` dan `README.md`.

4. **Metode Validasi & Pengujian**:
   - Menjalankan `compile_applet` untuk memastikan TypeScript tidak error.
   - Menjalankan `lint_applet` untuk memastikan ESLint lolos tanpa peringatan/error.
   - Memastikan data Duolingo, Capcut, Gemini Ai, Canva Premium, Spotify terisi lengkap dengan varian masing-masing dan tata letak persis tangkapan layar.


---

[1.0] - PERBAIKAN FORMAT NOMOR VCARD, TEMPLATE COMMAND LIST, DAN HEADER CAROUSEL

- Tanggal: 2026-11-01 18:56
- Status: Completed
Referensi SCHEDULE: 2.0

Tujuan Implementasi:
Memperbaiki 3 masalah teknis pada respon bot WhatsApp:
1. Menambahkan normalisasi nomor telepon otomatis (+62) pada pembuatan vCard admin dan owner.
2. Menghilangkan teks paksaan pada respon command List (`{storeName} - Katalog Produk`, daftar produk jika tidak diminta, dan kalimat instruksi bawah).
3. Mengosongkan header title & subtitle pada kartu Carousel agar nama varian dan kategori tidak muncul menimpa template teks pengguna.

Bagian yang Akan Diubah:
- "backend/services/placeholderHelper.ts" - Menambahkan fungsi helper `normalizeIndonesianPhone`.
- "backend/messages/adminContactMessage.ts" - Menerapkan normalisasi nomor telepon pada vCard Owner, Admin, dan Invoice Admin.
- "backend/messages/listMessage.ts" - Menghilangkan paksaan daftar produk dan teks hardcode title.
- "backend/messages/carouselMessage.ts" - Mengosongkan title dan subtitle pada header kartu carousel.

Alasan Perubahan:
1. Nomor admin diinput sebagai `82173515807` dan terkirim ke WhatsApp sebagai vCard tanpa awalan negara `+62`, sehingga tautan kontak tidak valid.
2. Pengguna membuat template List kustom tanpa `{daftarProduk}`, namun bot memaksakan teks judul katalog, daftar produk lengkap, dan teks instruksi bawah.
3. Kartu carousel WhatsApp memunculkan nama varian dan kategori di atas template kustom pengguna karena nilai `cardHeader.title` dan `cardHeader.subtitle` diisi statis.

Strategi Implementasi:
1. Di `backend/services/placeholderHelper.ts`:
   Buat fungsi `normalizeIndonesianPhone(phone: string): string`:
   - Hapus semua karakter non-digit.
   - Jika berawalan `08`, ganti dengan `628`.
   - Jika berawalan `8`, tambahkan `62`.
   - Kembalikan string angka bersih berawalan `62`.
2. Di `backend/messages/adminContactMessage.ts`:
   Gunakan `normalizeIndonesianPhone` untuk menghasilkan `cleanNumber`.
   Buat string TEL dan waid dengan `+${cleanNumber}` dan `waid=${cleanNumber}` yang sudah terstandarisasi.
3. Di `backend/messages/listMessage.ts`:
   - Jika `rawResponseText` mengandung `{daftarProduk}`, gantikan dengan `daftarProdukText`.
   - Jika `rawResponseText` tidak kosong dan tidak mengandung `{daftarProduk}`, gunakan teks pengguna apa adanya tanpa penambahan teks lain.
   - Jika `rawResponseText` kosong, gunakan teks default dengan `{daftarProduk}`.
   - Pada `title`: jangan kirim `title: titleText` jika tidak diperlukan atau biarkan kosong/undefined agar WhatsApp tidak memunculkan baris judul tambahan di atas template teks pengguna.
4. Di `backend/messages/carouselMessage.ts`:
   Pada `cardHeader`, set `title: ''` dan `subtitle: ''`. Media gambar tetap dipertahankan pada `imageMessage`.

Urutan Pengerjaan:
1. Perbarui `backend/services/placeholderHelper.ts`.
2. Perbarui `backend/messages/adminContactMessage.ts`.
3. Perbarui `backend/messages/listMessage.ts`.
4. Perbarui `backend/messages/carouselMessage.ts`.
5. Jalankan `compile_applet`.
6. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` dan catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Pengiriman kontak vCard akan otomatis memiliki format internasional valid (+62). Template kustom List dan Carousel dari dashboard akan 100% dipatuhi oleh bot WhatsApp.

Rencana Pengujian:
1. Jalankan `compile_applet` untuk memastikan tidak ada kesalahan kompilasi TypeScript.
2. Verifikasi logika regex dan penggantian string pada masing-masing handler pesan.

Hasil yang Diharapkan:
1. vCard admin/owner terkirim dengan format nomor `+6282173515807` (waid=6282173515807).
2. Command List merespon persis sesuai template pengguna tanpa teks sisipan asing.
3. Kartu Carousel menampilkan teks persis dimulai dari `*{storeName}*` tanpa awalan varian dan kategori yang duplikat.

---

[2.0] - PENGHAPUSAN FILE DATABASE JSON USANG DAN CLEANUP KONFIGURASI

- Tanggal: 2026-11-01 19:18
- Status: Completed
Referensi SCHEDULE: 3.0

Tujuan Implementasi:
Membersihkan seluruh file database `.json` usang pada `/database/` dan `/backend/database/` yang sudah tidak lagi digunakan setelah migrasi penuh ke SQLite (`bot.db`), serta merapikan referensi konstanta yang sudah tidak digunakan.

Bagian yang Akan Diubah:
- File yang akan dihapus di `/database/`:
  - `database/api_config.json`
  - `database/command_carousel.json`
  - `database/command_invoice.json`
  - `database/command_list.json`
  - `database/command_menu.json`
  - `database/groups_config.json`
  - `database/store_info.json`
  - `database/transactions.json`
- File yang akan dihapus di `/backend/database/`:
  - `backend/database/api_config.json`
  - `backend/database/auth.json`
  - `backend/database/command_carousel.json`
  - `backend/database/command_invoice.json`
  - `backend/database/command_list.json`
  - `backend/database/command_menu.json`
  - `backend/database/groups_config.json`
  - `backend/database/store_info.json`
  - `backend/database/transactions.json`
- File kode yang akan dirapikan:
  - `backend/types/bot.types.ts` - Menghapus export `CONFIG_FILE = 'commands_config.json'` yang sudah usang.
  - `backend/config/configManager.ts` - Menghapus import `CONFIG_FILE` yang tidak digunakan.

Alasan Perubahan:
Sistem telah 100% menggunakan database SQLite relasional (`bot.db` dengan WAL mode). Keberadaan file-file JSON lama membingungkan pengguna dan membuat duplikasi data yang tidak pernah terbarui.

Strategi Implementasi:
1. Menghapus file-file JSON usang menggunakan tool `delete_file`.
2. Menjaga file SQLite aktif tetap utuh:
   - `database/bot.db`
   - `database/bot.db-shm`
   - `database/bot.db-wal`
   - `backend/database/sqlite.ts`
3. Menghapus import dan export `CONFIG_FILE` yang tidak dipakai di `backend/types/bot.types.ts` dan `backend/config/configManager.ts`.
4. Menjalankan verifikasi kompilasi dan linting.

Urutan Pengerjaan:
1. Hapus file-file JSON di `database/`.
2. Hapus file-file JSON di `backend/database/`.
3. Rapikan `backend/types/bot.types.ts` dan `backend/config/configManager.ts`.
4. Jalankan `compile_applet` dan `lint_applet`.
5. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` menjadi Completed.
6. Catat hasil di `brain/PROGRESS.md`.

Dampak Perubahan:
Folder database menjadi bersih, rapi, dan hanya memuat SQLite (`bot.db`) yang merupakan single source of truth data toko dan bot.

Rencana Pengujian:
1. Verifikasi isi direktori `database/` dan `backend/database/` menggunakan `list_dir`.
2. Menjalankan `compile_applet` dan `lint_applet`.
3. Memastikan bot dan server tetap dapat membaca dan menulis ke SQLite tanpa error.

Hasil yang Diharapkan:
Seluruh file JSON usang terhapus bersih, dan sistem berjalan normal menggunakan SQLite `bot.db`.

---

[3.0] - IMPLEMENTASI TAB KONFIRMASI CHECKOUT DAN ALUR KODE PROMO BOT WHATSAPP

- Tanggal: 2026-11-01 22:30
- Status: Completed
Referensi SCHEDULE: 4.0

Tujuan Implementasi:
1. Menambahkan tab "Konfirmasi" pada halaman Respon Bot (Tab Command) di dashboard untuk mengatur 4 template teks:
   - Ringkasan Pesanan (Order Summary)
   - Permintaan Input Kode Promo
   - Pesan Jika Kode Promo Valid
   - Pesan Jika Kode Promo Invalid
2. Mendukung placeholder dinamis: `{promoCode}`, `{discount}`, `{finalPrice}`, dan `{reason}` di samping placeholder standar toko `{storeName}`, `{produkName}`, `{varian}`, `{price}`.
3. Mengubah alur order bot WhatsApp agar membuka sesi konfirmasi di DM (durasi 90 detik) dengan tombol pilihan `[Pakai Kode Promo]` dan `[Lanjut Bayar (Normal)]`, memvalidasi kupon via SQLite `validateAndApplyPromo()`, dan menerbitkan invoice QRIS dengan harga diskon jika promo valid.

Bagian yang Akan Diubah:
- "backend/types/bot.types.ts" - Menambahkan tipe `ConfirmationCommandConfig` dan memperbarui `CommandsConfig`.
- "src/types/dashboard.types.ts" - Menambahkan opsi tab `'Confirmation'` dan tipe data konfigurasi konfirmasi.
- "backend/config/configManager.ts" - Menambahkan default template konfirmasi dan fungsi get/save ke SQLite tabel `commands_config`.
- "backend/services/placeholderHelper.ts" - Menambahkan resolusi placeholder `{promoCode}`, `{discount}`, `{finalPrice}`, dan `{reason}`.
- "src/components/tabs/TabCommand.tsx" - Menambahkan tab "Konfirmasi", 4 form textarea pesan, dan tombol sisipkan tag placeholder.
- "src/App.tsx" - Menyediakan state konfigurasi konfirmasi dan handler penyimpanan API `/api/config/command/confirmation`.
- "backend/routes/configRoutes.ts" / "backend/app.ts" / "backend/server.ts" - Menangani endpoint API get dan update konfigurasi command konfirmasi.
- "backend/handlers/messageDispatcher.ts" - Mengimplementasikan sesi checkout 90 detik di DM pelanggan, interaksi tombol promo vs bayar langsung, pembacaan kode promo, dan integrasi invoice QRIS diskon.

Alasan Perubahan:
Alur saat ini langsung membuat invoice QRIS seketika saat tombol Order ditekan tanpa memberi kesempatan bagi pembeli untuk menginput kupon promo. Penambahan tab Konfirmasi memungkinkan pemilik toko mengontrol teks pesan setiap tahapan checkout tanpa mengubah kode sumber.

Strategi Implementasi:
1. Definisikan tipe data dan template default di backend dan frontend.
2. Tambahkan handler SQLite di `configManager.ts` untuk menyimpan command `confirmation`.
3. Pasang tab visual "Konfirmasi" di `TabCommand.tsx` dengan UI yang konsisten, preview tag placeholder yang lengkap, dan tombol simpan.
4. Perbarui `placeholderHelper.ts` agar mendukung `{promoCode}`, `{discount}`, `{finalPrice}`, `{reason}`.
5. Di `messageDispatcher.ts`:
   - Buat in-memory Map `activeCheckoutSessions` dengan key `remoteJid` (pembeli).
   - Saat tombol `order_` ditekan:
     - Simpan data varian, produk, dan harga normal ke sesi dengan masa berlaku 90 detik.
     - Jika order berasal dari grup, kirim notifikasi singkat ke grup bahwa ringkasan pesanan dikirim ke DM.
     - Di DM pembeli, kirim rincian pesanan dari template `confirmSummaryText` disertai 2 tombol: `[🎟️ Pakai Kode Promo]` dan `[⚡ Lanjut Bayar (Normal)]`.
   - Tangani klik tombol `checkout_promo`:
     - Set status sesi `waitingForPromo = true`.
     - Kirim teks `confirmInputPromoText`.
   - Tangani klik tombol `checkout_direct`:
     - Hapus sesi, langsung lanjutkan alur pembuatan invoice QRIS LunasQRIS harga normal.
   - Tangani pesan balasan teks pembeli saat `waitingForPromo = true`:
     - Jika pembeli mengetik `BATAL`: lanjutkan invoice QRIS harga normal.
     - Jika pembeli mengetik kode promo:
       - Panggil `validateAndApplyPromo()`.
       - Jika valid: kirim `confirmPromoSuccessText` lalu terbitkan invoice QRIS LunasQRIS dengan nominal hemat `{finalPrice}`.
       - Jika invalid: kirim `confirmPromoInvalidText` (dengan `{reason}`) dan beri kesempatan coba kode lain atau ketik BATAL sebelum timeout 90 detik.

Urutan Pengerjaan:
1. Update `backend/types/bot.types.ts` dan `src/types/dashboard.types.ts`.
2. Update `backend/config/configManager.ts` dan `backend/services/placeholderHelper.ts`.
3. Update endpoint backend di `backend/app.ts` / `backend/server.ts` untuk route konfigurasi `confirmation`.
4. Update frontend `src/components/tabs/TabCommand.tsx` dan `src/App.tsx`.
5. Update alur checkout di `backend/handlers/messageDispatcher.ts`.
6. Jalankan `compile_applet` dan `lint_applet` untuk verifikasi build.
7. Catat penyelesaian implementasi di `brain/PROGRESS.md`.

Dampak Perubahan:
Pemilik toko memiliki kendali penuh atas pesan checkout di dashboard Respon Bot. Pelanggan dapat berbelanja dengan kode promo secara interaktif dan aman di DM WhatsApp.

Rencana Pengujian:
1. Validasi kompilasi TypeScript dengan `compile_applet`.
2. Validasi linting dengan `lint_applet`.
3. Memastikan semua endpoint API berjalan lancar tanpa error runtime.

Hasil yang Diharapkan:
Tab "Konfirmasi" tampil di Respon Bot, pengaturan tersimpan persisten ke database SQLite, dan bot WhatsApp menjalankan alur checkout interaktif 90 detik dengan dukungan penuh kupon diskon promo.

---

[4.0] - PERBAIKAN WEBSOCKET ERROR PORT 24678 & PENONAKTIFAN HMR VITE

- Tanggal: 2026-11-01 19:28
- Status: Completed
Referensi SCHEDULE: 1.0

Tujuan Implementasi:
Mengatasi pesan error `WebSocket server error: Port 24678 is already in use` dengan menonaktifkan HMR WebSocket pada Vite dev server middleware dan konfigurasi Vite (`server.hmr = false`). Hal ini sesuai dengan batasan environment AI Studio ("HMR: Disabled. Ignore WebSocket errors").

Bagian yang Akan Diubah:
- "server.ts" - Menambahkan opsi `hmr: false` pada `createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' })`.
- "vite.config.ts" - Menambahkan konfigurasi `server.hmr = false`.
- "frontend/vite.config.ts" - Menambahkan konfigurasi `server.hmr = false`.

Alasan Perubahan:
Secara default, Vite dev server middleware mencoba membuat server WebSocket untuk Hot Module Replacement (HMR) pada port 24678. Pada environment runtime AI Studio (dan iframe sandbox), HMR dinonaktifkan dan port 24678 seringkali terblokir atau sudah digunakan instance sebelumnya, memicu error log `WebSocket server error: Port 24678 is already in use`.

Strategi Implementasi:
1. Di `server.ts`:
   Konfigurasikan instance `createViteServer` dengan `server: { middlewareMode: true, hmr: false }`.
2. Di `vite.config.ts`:
   Tambahkan `hmr: false` di dalam blok konfigurasi `server`.
3. Di `frontend/vite.config.ts`:
   Tambahkan `hmr: false` di dalam blok konfigurasi `server`.
4. Jalankan validasi `compile_applet` dan `lint_applet` untuk memastikan sintaks bersih.
5. Restart server dev agar konfigurasi baru aktif tanpa konflik port WebSocket.

Urutan Pengerjaan:
1. Perbarui `server.ts`.
2. Perbarui `vite.config.ts`.
3. Perbarui `frontend/vite.config.ts`.
4. Uji kompilasi dengan `compile_applet` dan `lint_applet`.
5. Restart dev server dengan `restart_dev_server`.
6. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` dan catat hasil di `brain/PROGRESS.md`.

Dampak Perubahan:
Vite tidak lagi memicu WebSocket server pada port 24678. Log server Express & Vite middleware berjalan bersih tanpa error binding port WebSocket.

Rencana Pengujian:
1. Menjalankan `compile_applet`.
2. Menjalankan `lint_applet`.
3. Menjalankan `restart_dev_server` dan memverifikasi server berjalan bersih di port 3000.

Hasil yang Diharapkan:
Pesan error `WebSocket server error: Port 24678 is already in use` hilang sepenuhnya dan server berjalan normal.

---

[5.0] - MIGRASI PENUH KE FRONTEND/SRC DAN PENGHAPUSAN FOLDER ROOT /SRC

- Tanggal: 2026-11-01 22:20
- Status: Completed
Referensi SCHEDULE: 2.0

Tujuan Implementasi:
Memusatkan seluruh kode frontend ke direktori `frontend/src/` dan menghapus direktori root `/src/` secara permanen, sehingga struktur proyek bersih dan modular tanpa redundansi atau kebingungan lokasi kode aktif.

Bagian yang Akan Diubah:
- "frontend/src/**" - Menyinkronkan seluruh file mutakhir dari `/src` ke `/frontend/src`.
- "frontend/index.html" - Memastikan sinkronisasi metadata title, description, dan entry point script `/src/main.tsx` (terkait root `frontend/`).
- "vite.config.ts" - Mengatur root Vite ke `path.resolve(__dirname, 'frontend')` dan alias `@` mengarah ke `./frontend/src`.
- "frontend/vite.config.ts" - Menyelaraskan plugin Tailwind & React serta setting port dan proxy.
- "server.ts" - Mengatur `root: path.resolve(__dirname, 'frontend')` pada `createViteServer` saat mode development.
- "package.json" - Memperbarui script `build` (`vite build frontend --outDir ../dist`) dan `lint` (`tsc --noEmit`).
- "tsconfig.json" - Menghapus `"src"` dari array `"include"` dan mengarahkan path `@/*` ke `"frontend/src/*"`.
- "/src/**" - Menghapus folder root `/src` setelah verifikasi sukses.

Alasan Perubahan:
Pengguna meminta agar aplikasi menggunakan `frontend/src` sebagai satu-satunya folder kode frontend, menghilangkan duplikasi `/src` di root, dan memastikan tidak ada fungsionalitas yang hilang atau rusak.

Strategi Implementasi:
1. Sinkronisasi seluruh file dari `src/` ke `frontend/src/` (termasuk komponen baru `DesktopSidebar`, `DesktopTopNav`, `TabKuponPromo`, `TabSaldo`, `TabConnectionDedicated`, `TabKoneksiLayanan`, `usePricingConfig`, `usePromos`, dll).
2. Perbarui `server.ts` agar `createViteServer` mengarahkan root ke direktori `frontend`.
3. Perbarui `vite.config.ts` root agar menetapkan `root: path.resolve(__dirname, 'frontend')` dan output build ke `../dist`.
4. Perbarui `frontend/index.html` dengan metadata yang selaras.
5. Perbarui `tsconfig.json` paths dan includes.
6. Jalankan `compile_applet` dan `lint_applet` untuk memvalidasi kelulusan build 100%.
7. Hapus folder `/src` di root.
8. Jalankan `compile_applet` ulang untuk membuktikan build berjalan murni dari `frontend/src`.
9. Restart server dev dan catat hasil di `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Salin seluruh isi `src/` ke `frontend/src/`.
2. Perbarui konfigurasi `server.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`.
3. Verifikasi build dengan `compile_applet` dan `lint_applet`.
4. Hapus folder `/src`.
5. Uji kompilasi ulang dengan `compile_applet`.
6. Restart dev server dengan `restart_dev_server`.
7. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` dan `brain/PROGRESS.md`.

Dampak Perubahan:
Struktur proyek menjadi rapi (`frontend/`, `backend/`, `database/`, `brain/`). Tidak ada lagi kebingungan direktori ganda `/src`.

Rencana Pengujian:
1. Menjalankan `compile_applet` untuk build frontend.
2. Menjalankan `lint_applet` untuk type check TypeScript.
3. Memastikan Vite menyajikan file dari `frontend/src/main.tsx` di port 3000.

Hasil yang Diharapkan:
Aplikasi berjalan 100% menggunakan `frontend/src`, folder `/src` bersih terhapus, seluruh fungsi berjalan normal tanpa ada regresi.

---

[6.0] - IMPLEMENTASI TAHAP 4: ARSITEKTUR MONOREPO, MULTI-DOMAIN, DAN DATABASE-PER-TENANT (FITUR APARTEMEN)

- Tanggal: 2026-11-01 23:49
- Status: Completed
Referensi SCHEDULE: 6.0

Tujuan Implementasi:
Membangun fondasi dan antarmuka Tahap 4 ("Fitur Apartemen" / Multi-Tenant Platform):
1. Membuat struktur folder terpisah: `admin-frontend/` & `admin-backend/` berdampingan dengan `frontend/` & `backend/`.
2. Menerapkan pola Database-per-Tenant menggunakan SQLite: `database/master.db` untuk master platform dan `database/tenants/{tenant_id}.db` untuk setiap toko tenant.
3. Mengembangkan Multi-Session Baileys Bot Manager yang mendukung koneksi bot WhatsApp mandiri per tenant di `auth_info_baileys/tenant_{tenant_id}/`.
4. Membangun API backend Super Admin di `admin-backend/`: autentikasi master admin, CRUD unit tenant, perpanjangan sewa (+7/+30/+90/+365 hari), suspend/activate, reset bot session, impersonation token.
5. Membangun UI Dashboard Master Admin di `admin-frontend/` (Modern, Anti-AI Slop, responsive): ringkasan metrik gedung, tabel tenant, modal tambah tenant, modal perpanjang masa sewa, tombol kontrol status bot, dan impersonation login.
6. Mengonfigurasi `server.ts` agar menyajikan `admin-frontend/` jika request berasal dari domain `admin.wanma2.my.id` atau path `/admin`, dan menyajikan `frontend/` untuk pengguna toko.

Bagian yang Akan Diubah/Dibuat:
- "database/master.db" - Database SQLite untuk master admin, tenants, dan paket sewa.
- "database/tenants/" - Folder untuk database SQLite masing-masing tenant.
- "admin-backend/database/masterSqlite.ts" - Koneksi & inisialisasi tabel `master.db`.
- "admin-backend/services/tenantManager.ts" - Logika bisnis manajemen tenant, sewa, dan status.
- "admin-backend/routes/adminRoutes.ts" - Endpoint REST API Master Admin.
- "backend/database/tenantDbManager.ts" - Resolver database SQLite dinamis per tenant.
- "backend/services/multiBotManager.ts" - Multi-session manager untuk Baileys WhatsApp bot.
- "admin-frontend/**" - Aplikasi React + Tailwind untuk Master Admin.
- "server.ts" - Routing Express & Vite middleware untuk multi-domain / path `/admin`.
- "package.json" & "tsconfig.json" - Penyesuaian skrip dan compiler path options.

Alasan Perubahan:
Pengguna menginstruksikan implementasi penuh Tahap 4 sesuai kesepakatan desain arsitektur (Monorepo multi-app, multi-domain Nginx ready, database-per-tenant, dan multi-session Baileys bot).

Strategi Implementasi:
1. Inisialisasi `masterSqlite.ts` dan tabel-tabel master (`tenants`, `super_admins`).
2. Buat `tenantDbManager.ts` untuk menyediakan koneksi DB per-tenant dan migrasikan data awal `bot.db` ke tenant default `t_wanzt`.
3. Buat service `tenantManager.ts` dan `adminRoutes.ts` di `admin-backend/`.
4. Buat `multiBotManager.ts` di backend untuk mengelola session per-tenant.
5. Buat antarmuka `admin-frontend/` lengkap (tabel tenant, modal, kartu statistik, aksi impersonate).
6. Integrasikan route dan static/vite middleware di `server.ts`.
7. Jalankan `compile_applet` dan `lint_applet` untuk memastikan build bersih tanpa error.
8. Update `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Catat di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Buat backend master: `admin-backend/database/masterSqlite.ts`, `admin-backend/services/tenantManager.ts`, `admin-backend/routes/adminRoutes.ts`.
3. Buat `backend/database/tenantDbManager.ts` dan integrasikan ke `backend/app.ts`.
4. Buat `backend/services/multiBotManager.ts` multi-session Baileys.
5. Buat folder `admin-frontend/` (src, components, hooks, index.html, vite.config.ts).
6. Perbarui `server.ts` untuk melayani `/admin` dan subdomain `admin.*`.
7. Update `tsconfig.json` dan verifikasi dengan `compile_applet`.
8. Restart dev server dan dokumentasikan di `brain/PROGRESS.md`.

Dampak Perubahan:
Aplikasi memiliki platform manajemen sewa bot WhatsApp lengkap, siap menampung banyak penyewa sekaligus dengan isolasi data dan bot 100%.

Rencana Pengujian:
1. Kompilasi TypeScript dan Vite build melalui `compile_applet`.
2. Typecheck melalui `lint_applet`.
3. Uji coba endpoint API `/api/admin/tenants` dan antarmuka `/admin`.

Hasil yang Diharapkan:
Dashboard Master Admin aktif, terisolasi, terhubung ke master.db, mampu mengelola tenant dan masa sewa, dan bot berjalan multi-session dengan DB per-tenant.

---

[7.0] - PENYESUAIAN VITE DEV SERVER BASE ROUTING UNTUK AKSES MASTER ADMIN DI SANDBOX AISTUDIO

- Tanggal: 2026-11-02 08:05
- Status: Completed
Referensi SCHEDULE: 6.0

Tujuan Implementasi:
Memastikan antarmuka Master Admin (`admin-frontend`) dapat dimuat secara sempurna dan mulus tanpa konflik bundle/asset saat dibuka di lingkungan sandbox AI Studio melalui path `/admin` maupun subdomain produksi `admin.wanma2.my.id`.

Bagian yang Akan Diubah:
- "server.ts" - Menyesuaikan konfigurasi Vite dev server untuk `admin-frontend` dengan `base: '/admin/'` dan penanganan rewrite URL cerdas pada Express middleware.
- "admin-frontend/vite.config.ts" - Menetapkan `base: '/admin/'` (atau berbasis env) agar seluruh tag script (`main.tsx`), CSS, dan chunk Vite menyertakan prefix `/admin/`.
- "frontend/src/components/layout/DesktopTopNav.tsx" - Memastikan tautan tombol "Master Apartemen" mengarah ke `/admin/`.
- "frontend/src/components/layout/Navbar.tsx" - Menambahkan tombol pintas "Master Apartemen" di header mobile untuk akses responsif.

Alasan Perubahan:
Ketika browser mengakses URL `/admin` di sandbox, jika `base` tidak diatur ke `/admin/`, tag `<script src="/src/main.tsx">` akan diminta ke root (`/src/main.tsx`), yang menyebabkan Vite dev server pengguna (`frontend/`) merespon alih-alih `admin-frontend/`. Penambahan `base: '/admin/'` memastikan pemisahan 100% request aset kedua aplikasi di port yang sama.

Strategi Implementasi:
1. Atur `base: '/admin/'` pada `admin-frontend/vite.config.ts`.
2. Pada `server.ts`, arahkan request `req.path === '/admin'` otomatis ke `/admin/`.
3. Izinkan `viteAdmin.middlewares` menangani semua request yang diawali `/admin/` secara native tanpa penghapusan prefix yang merusak request nested asset.
4. Uji coba dengan curl dan pastikan respon HTML dan JS `/admin/src/main.tsx` merujuk ke `admin-frontend`.

Urutan Pengerjaan:
1. Update `admin-frontend/vite.config.ts`.
2. Update `server.ts`.
3. Update `DesktopTopNav.tsx` dan `Navbar.tsx`.
4. Uji kompilasi dengan `compile_applet`.
5. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` dan catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Pengguna dapat membuka Dashboard Master secara instan di sandbox dengan mengklik tombol "Master Apartemen" atau mengunjungi URL `/admin/` tanpa kendala layar putih atau bentrok script.

Rencana Pengujian:
1. Tes endpoint `/admin` dan `/admin/src/main.tsx` menggunakan curl.
2. Pastikan file JavaScript yang disajikan berasal dari `admin-frontend/src/main.tsx`.
3. Kompilasi lulus tanpa error linting.

Hasil yang Diharapkan:
Dashboard Master dapat diakses dengan lancar di AI Studio preview URL via tombol atau path `/admin/`.



