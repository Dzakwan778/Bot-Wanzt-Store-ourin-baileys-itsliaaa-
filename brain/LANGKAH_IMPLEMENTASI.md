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
     - Baris varian anak kedua dan seterusnya menampilkan `-- -` pada kolom NAMA.
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
   - **Langkah 4**: Perbarui `src/components/tabs/TabProduk.tsx` dengan layout tabel minimalis, header transparan, icon inline, varian `-- -`, badge stok titik hijau vs kotak merah, format harga tanpa spasi, dan badge margin hijau.
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

---

[8.0] - IMPLEMENTASI MODAL KONFIRMASI IN-APP UNTUK TOMBOL HAPUS & STATUS TENANT (FIX UNCLICKABLE BUTTON)

- Tanggal: 2026-11-02 02:50
- Status: Completed
Referensi SCHEDULE: 7.0

Tujuan Implementasi:
Mengatasi permasalahan tombol aksi manajemen tenant (khususnya tombol Hapus ke-4 dengan ikon `Trash2` pada tabel tenant) yang tidak dapat diklik atau tampak macet akibat penggunaan fungsi dialog bawaan peramban `window.confirm()` yang diblokir oleh sandbox iframe.

Bagian yang Akan Diubah:
- "admin-frontend/src/App.tsx" - Mengganti `window.confirm` dengan Modal Konfirmasi React in-app (`tenantToDelete`, `tenantToToggleStatus`), menambahkan `type="button"`, `cursor-pointer`, dan merancang modal konfirmasi hapus tenant yang informatif.

Alasan Perubahan:
Lingkungan pratinjau browser sandbox AI Studio memblokir pemanggilan `window.confirm()` dan `window.alert()`. Saat pengguna mengklik tombol ke-4 (ikon tempat sampah), pemanggilan `window.confirm` mengembalikan `false` secara instan tanpa memunculkan dialog, sehingga fungsi `handleDeleteTenant` berhenti dan seolah-olah tombol "tidak dapat diklik".

Strategi Implementasi:
1. Di `admin-frontend/src/App.tsx`:
   - Tambahkan state: `const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);`
   - Tambahkan state: `const [tenantToToggleStatus, setTenantToToggleStatus] = useState<Tenant | null>(null);`
   - Buat fungsi eksekusi penghapusan `confirmDeleteTenant()` yang langsung memanggil API DELETE `/api/admin/tenants/${tenantToDelete.tenant_id}` tanpa `window.confirm`.
   - Buat fungsi eksekusi perubahan status `confirmToggleStatus()` yang memanggil API POST `/api/admin/tenants/${tenantToToggleStatus.tenant_id}/status` tanpa `window.confirm`.
   - Ubah tombol hapus di tabel:
     - `onClick={() => setTenantToDelete(tenant)}`
     - Tambahkan `type="button"`, `cursor-pointer`, `active:scale-95`.
   - Ubah tombol suspend/aktifkan di tabel:
     - `onClick={() => setTenantToToggleStatus(tenant)}`
     - Tambahkan `type="button"`, `cursor-pointer`, `active:scale-95`.
   - Tambahkan Modal Konfirmasi Hapus Tenant:
     - Backdrop gelap `bg-slate-950/80 backdrop-blur-xs z-50`.
     - Header merah/rose dengan ikon `AlertTriangle`: "Hapus Unit Apartemen Toko".
     - Rincian unit: Nama Toko, ID Unit, Pemilik, dan peringatan bahwa database fisik & sesi WhatsApp akan dihapus permanen.
     - Tombol: "Batal" dan "Ya, Hapus Permanen" (merah/rose, dengan state loading `isSubmitting`).
   - Tambahkan Modal Konfirmasi Toggle Status (Suspend / Aktifkan):
     - Rincian perubahan status dari aktif ke suspend (atau sebaliknya).
     - Tombol konfirmasi yang cepat dan aman.
2. Validasi dengan `compile_applet` dan `lint_applet`.
3. Catat penyelesaian di `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Catat entri [8.0] di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Edit `admin-frontend/src/App.tsx`.
3. Verifikasi kompilasi dan linting.
4. Perbarui status entri [8.0] menjadi Completed dan catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Tombol aksi hapus dan suspend di Master Admin dapat diklik 100% responsif dan memunculkan pop-up modal interaktif yang konsisten dengan tema desain dashboard.

Rencana Pengujian:
1. Jalankan `compile_applet` untuk build frontend admin.
2. Jalankan `lint_applet` untuk memeriksa type checking TypeScript.
3. Pastikan modal konfirmasi muncul saat tombol hapus atau suspend diklik.

Hasil yang Diharapkan:
Tombol dapat diklik tanpa error, modal konfirmasi tampil jelas di layar, dan proses penghapusan/perubahan status berjalan normal.





---

[8.0] - REAKTIVASI FITUR LOGIN PADA DASHBOARD UTAMA (FRONTEND/SRC) DAN DUKUNGAN MULTI-TENANT APARTEMEN

- Tanggal: 2026-11-02 16:30
- Status: Completed
Referensi SCHEDULE: 6.0

Tujuan Implementasi:
1. Mengaktifkan kembali pintu gerbang login (`LoginPage`) pada dashboard utama di `frontend/src/App.tsx` yang sebelumnya dinonaktifkan sementara selama proses perombakan UI dan migrasi folder.
2. Memastikan sesi login diverifikasi secara aman ke server sebelum dashboard utama dapat diakses.
3. Mendukung otentikasi ganda yang selaras dengan arsitektur fitur apartemen (multi-tenant):
   - Kredensial akun admin utama (`admin` / `admin123`).
   - Kredensial unit tenant apartemen dari `database/master.db` maupun `bot.db`.
   - Token impersonasi ("Buka Toko") dari dashboard Master Admin via parameter URL `?impersonate=...`.
4. Menyediakan antarmuka loading verifikasi sesi yang elegan dan senada dengan desain baru dashboard (slate-50).

Bagian yang Akan Diubah:
- "frontend/src/App.tsx" - Mengaktifkan kembali pengecekan `auth.authLoading` dan `!auth.isAuthenticated` untuk menampilkan `<LoginPage />`.
- "frontend/src/hooks/useAuth.ts" - Menambahkan deteksi parameter query `impersonate` pada URL saat diarahkan dari Master Admin.
- "backend/services/authManager.ts" - Menambahkan fungsi `getSession()`, memperluas `verifyLogin()` untuk memvalidasi akun admin dan akun tenant apartemen.
- "backend/routes/authRoutes.ts" - Memperbarui rute `/api/auth/session` untuk mengembalikan username pengguna asli yang sedang login dan mendukung token impersonasi.
- "admin-backend/routes/adminRoutes.ts" - Mengekspor `impersonationTokens` agar dapat divalidasi oleh rute otentikasi.

Alasan Perubahan:
Sesuai instruksi pengguna, seluruh dashboard utama harus terlindungi oleh sistem login kembali setelah migrasi folder frontend ke `/frontend/src/` selesai, dan harus kompatibel dengan sistem apartemen multi-tenant yang telah berjalan.

Strategi Implementasi:
1. Buka blok komentar login guard di `frontend/src/App.tsx`.
2. Perbarui `frontend/src/hooks/useAuth.ts` agar menangani penyimpanan token otomatis jika URL memiliki parameter `impersonate`.
3. Di `backend/services/authManager.ts`, buat fungsi `getSession(token)` dan perbarui `verifyLogin()` agar memeriksa kredensial di tabel `auth` (admin utama) serta tabel `tenants` di `master.db` (tenant apartemen).
4. Di `backend/routes/authRoutes.ts`, sinkronkan pemeriksaan sesi dengan `getSession()` dan validasi token impersonasi dari `adminRoutes.ts`.
5. Uji build dan linting untuk memastikan zero-error.

Urutan Pengerjaan:
1. Tambahkan `export` pada `impersonationTokens` di `admin-backend/routes/adminRoutes.ts`.
2. Perbarui `backend/services/authManager.ts`.
3. Perbarui `backend/routes/authRoutes.ts`.
4. Perbarui `frontend/src/hooks/useAuth.ts`.
5. Perbarui `frontend/src/App.tsx` untuk mengaktifkan kembali tampilan login.
6. Jalankan `compile_applet` dan `lint_applet`.
7. Perbarui status entri di `brain/LANGKAH_IMPLEMENTASI.md` menjadi Completed dan catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Dashboard utama di `frontend/src/` akan terkunci rapat dan hanya dapat diakses setelah login berhasil atau melalui impersonasi resmi dari Master Admin.

Rencana Pengujian:
1. Validasi build TypeScript dengan `compile_applet`.
2. Validasi linting dengan `lint_applet`.
3. Pengujian respon sesi `/api/auth/session` dan login `/api/auth/login`.

Hasil yang Diharapkan:
Dashboard utama menampilkan form login saat belum login, dan setelah login berhasil langsung menampilkan dashboard toko lengkap dengan data profil, bot, dan manajemen pesanan.

---

[9.0] - IMPLEMENTASI ISOLASI DATABASE DAN SESI BOT PER-TENANT (ARSITEKTUR APARTEMEN ASLI)

- Tanggal: 2026-11-02 17:15
- Status: Completed
Referensi SCHEDULE: 6.0

Tujuan Implementasi:
1. Menghilangkan ketergantungan seluruh layanan pada satu file database statis (`bot.db`) yang sebelumnya menyebabkan seluruh tenant berbagi data toko, harga, promo, transaksi, dan bot yang sama.
2. Menerapkan isolasi database sejati (*Database-per-Tenant*) di `/database/tenants/{tenantId}.db`:
   - Tenant utama / Admin: `t_wanzt.db` (disinkronkan dari data awal `bot.db`).
   - Setiap tenant unit apartemen baru: `{tenantId}.db` yang memiliki skema tabel lengkap secara mandiri.
3. Mengembangkan sistem `TenantContext` berbasis Node.js `AsyncLocalStorage`:
   - Mendeteksi `tenantId` secara otomatis pada setiap request HTTP dari Bearer Token sesi, Token Impersonasi Master Admin, header `x-tenant-id`, cookie `tenant_id`, query parameter `?tenant=`, atau subdomain.
   - Menyediakan `db` Proxy dinamis sehingga seluruh pemanggilan `db.prepare()`, `db.exec()`, dsb. di seluruh endpoint otomatis mengeksekusi file database tenant yang sedang aktif.
4. Menerapkan isolasi sesi WhatsApp bot multi-instance via `getBotManager(tenantId)`:
   - Setiap tenant memiliki folder kredensial Baileys terisolasi di `auth_info_baileys/tenant_{tenantId}`.
   - Status koneksi bot, pairing code, QR code, dan log terminal berjalan terpisah per tenant.
5. Memperbarui alur login (`/api/auth/login`) dan pengecekan sesi (`/api/auth/session`):
   - Mengaitkan token sesi dengan `tenantId` masing-masing penyewa.
   - Menetapkan cookie `tenant_id` dan `auth_token` untuk memastikan seluruh panggilan `fetch()` dari frontend otomatis membawa identitas tenant.
   - Memasang patch global `fetch` di frontend agar selalu menyertakan header otentikasi dan tenant ID.

Bagian yang Akan Diubah:
- "backend/database/tenantContext.ts" - Modul baru untuk penyimpanan konteks tenant request-scoped (`AsyncLocalStorage`).
- "backend/database/tenantDbManager.ts" - Memperbarui inisialisasi skema tabel lengkap untuk setiap tenant DB baru dan sinkronisasi awal `t_wanzt.db`.
- "backend/database/sqlite.ts" - Menghubungkan export `db` sebagai Proxy dinamis yang diarahkan ke database tenant aktif berdasarkan request context.
- "backend/services/authManager.ts" - Memperbarui pembuatan sesi (`createSession`) dan pencarian sesi (`getSession`) agar menyimpan dan mengembalikan `tenantId`.
- "backend/routes/authRoutes.ts" - Menetapkan cookie tenant dan mengembalikan `tenantId` pada respon login/session.
- "backend/app.ts" - Memasang middleware penentu `tenantId` global yang membungkus setiap request dalam konteks `tenantContextStorage`.
- "backend/botManager.ts" - Mengubah arsitektur bot singleton menjadi multi-instance pool per-tenant `getBotManager(tenantId)` dengan folder auth terpisah.
- "frontend/src/main.tsx" - Memasang interceptor fetch ringan untuk menyertakan `Authorization` dan `x-tenant-id` ke setiap request `/api/*`.

Alasan Perubahan:
Tujuan inti dari fitur apartemen adalah multi-tenancy sejati: setiap tenant yang login memiliki toko sendiri, database sendiri, pengaturan harga sendiri, daftar transaksi sendiri, dan bot WhatsApp sendiri tanpa saling mencampuri data tenant lain.

Strategi Implementasi:
1. Buat `backend/database/tenantContext.ts` dengan `AsyncLocalStorage`.
2. Sempurnakan `initTenantDb` di `backend/database/tenantDbManager.ts` agar membuat seluruh tabel dan indeks yang identik dengan skema lengkap toko.
3. Ubah objek `db` di `backend/database/sqlite.ts` menjadi Proxy dinamis ke `getTenantDb(getActiveTenantId())`.
4. Perbarui `botManager.ts` dengan `getBotManager(tenantId)` dan proxy `botManager`.
5. Tambahkan middleware tenant-context di `backend/app.ts`.
6. Perbarui `authManager.ts` dan `authRoutes.ts` untuk melacak `tenantId` di sesi.
7. Pasang fetch interceptor di `frontend/src/main.tsx`.
8. Verifikasi kompilasi dan uji coba pemisahan data antar tenant.

Urutan Pengerjaan:
1. Buat `backend/database/tenantContext.ts`.
2. Perbarui `backend/database/tenantDbManager.ts`.
3. Perbarui `backend/database/sqlite.ts`.
4. Perbarui `backend/services/authManager.ts`.
5. Perbarui `backend/routes/authRoutes.ts`.
6. Perbarui `backend/botManager.ts`.
7. Perbarui `backend/app.ts`.
8. Perbarui `frontend/src/main.tsx`.
9. Jalankan `compile_applet` dan `lint_applet`.
10. Uji coba dengan curl dan verifikasi pembuatan file DB terpisah.
11. Perbarui status di `brain/LANGKAH_IMPLEMENTASI.md` dan catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Setiap pengguna yang login dengan kredensial tenant berbeda akan masuk ke unit apartemen toko miliknya sendiri dengan database terisolasi dan bot terisolasi.

Rencana Pengujian:
1. Buat tenant baru di Master Admin (misal: `t_toko_budi`).
2. Login sebagai `admin` (masuk ke `t_wanzt.db`), ubah nama toko menjadi "Wanzt Store".
3. Login sebagai `t_toko_budi` (masuk ke `t_toko_budi.db`), ubah nama toko menjadi "Budi Cell".
4. Verifikasi bahwa data di kedua toko tidak saling menimpa dan tersimpan di file database terpisah.
5. Verifikasi `compile_applet` dan `lint_applet` lulus 100%.

Hasil yang Diharapkan:
Arsitektur multi-tenant apartemen berjalan sempurna dengan isolasi database dan bot 100% per-tenant.


---

[10.0] - PERBAIKAN RUNTIME ERROR GLOBAL FETCH INTERCEPTOR (GETTER-ONLY WINDOW.FETCH)

- Tanggal: 2026-11-02 17:50
- Status: Completed

Tujuan Implementasi:
Mengatasi runtime error pada frontend toko:
`TypeError: Cannot set property fetch of #<Window> which has only a getter at /src/main.tsx:9:14`
yang disebabkan oleh assignment langsung `window.fetch = ...` di lingkungan browser / iframe sandbox tertentu di mana properti `fetch` pada `Window.prototype` hanya memiliki getter tanpa setter.

Bagian yang Akan Diubah:
- "frontend/src/main.tsx" - Mengganti assignment langsung `window.fetch = ...` dengan pendefinisian aman menggunakan `Object.defineProperty` berpelindung try-catch ganda, serta menjamin eksekusi render React `createRoot(...).render(<App />)` tidak pernah terhalang oleh error runtime interceptor.

Alasan Perubahan:
Pada lingkungan sandbox iframe AI Studio atau implementasi window proxy browser tertentu, penugasan langsung properti `window.fetch = customFetch` ditolak dengan error 'Cannot set property fetch of #<Window> which has only a getter'. Akibatnya, eksekusi skrip terhenti sebelum `createRoot(...).render(...)` sempat berjalan, menyebabkan layar aplikasi gagal memuat (blank atau crash).

Strategi Implementasi:
1. Bungkus inisialisasi interceptor dalam blok `try...catch` agar jika lingkungan melarang intervensi `fetch`, aplikasi tetap dapat memuat antarmuka React secara normal tanpa crash.
2. Gunakan `Object.defineProperty(window, 'fetch', { value: customFetch, writable: true, configurable: true, enumerable: true })` untuk mendefinisikan own-property pada objek `window` yang membungkus pemanggilan asli `originalFetch.bind(window)`.
3. Sediakan fallback penugasan alternatif jika `Object.defineProperty` tidak didukung.
4. Pastikan `createRoot(document.getElementById('root')!).render(<App />);` selalu dieksekusi dengan andal di baris akhir skrip.

Urutan Pengerjaan:
1. Catat entri [10.0] pada `brain/LANGKAH_IMPLEMENTASI.md`.
2. Perbarui `frontend/src/main.tsx` dengan implementasi interceptor yang aman dari getter-only exception.
3. Jalankan `lint_applet` dan `compile_applet` untuk memastikan tidak ada kesalahan sintaks atau kompilasi.
4. Uji respon dev server melalui curl untuk memastikan frontend menyajikan script dengan benar.
5. Perbarui status entri [10.0] menjadi Completed dan catat hasil pekerjaan pada `brain/PROGRESS.md` entri [23.0].

Dampak Perubahan:
Aplikasi frontend toko utama akan dimuat secara mulus tanpa runtime crash di browser atau iframe sandbox manapun.

Rencana Pengujian:
1. Verifikasi `frontend/src/main.tsx` lolos linting TypeScript.
2. Verifikasi dev server merespons file `/src/main.tsx` dengan kode interceptor baru.
3. Uji kompilasi production build via `compile_applet`.

Hasil yang Diharapkan:
Runtime error `Cannot set property fetch` terselesaikan 100%, antarmuka dashboard toko utama terbuka dengan normal.

---

[11.0] - REFACTORING ARSITEKTUR FRONTEND DASHBOARD: ISOLASI STATE PER-TENANT & CLEAN REMOUNT (FIX ISU DATA TERCAMPUR)

- Tanggal: 2026-11-02 03:27
- Status: Completed
Referensi SCHEDULE: 8.0

Tujuan Implementasi:
Memperbaiki arsitektur rendering frontend toko agar setiap tenant yang login (misal `berkah_erot` / Berkah Store) memperoleh data toko mandiri (Mak Erot, transaksi, kupon, dan bot terpisah) tanpa kebocoran atau kontaminasi state dari toko default (Wanzt Store):
1. Memperbarui `frontend/src/hooks/useAuth.ts` agar menyertakan `tenantId` pada tipe `UserSession`, menyimpan ke `localStorage`, dan mengalirkan `tenantId` ke state React.
2. Memisahkan seluruh logika dashboard toko dari root `App.tsx` ke komponen mandiri `frontend/src/components/dashboard/TenantDashboard.tsx`.
3. Memperbarui `frontend/src/App.tsx` agar:
   - Root `App` hanya menangani otentikasi (`useAuth`).
   - Saat belum login (`!isAuthenticated`), hanya menampilkan `LoginPage` tanpa mengeksekusi hook data toko.
   - Saat terotentikasi, merender `<TenantDashboard key={auth.user?.tenantId} auth={auth} />`.
   - Prop `key={auth.user?.tenantId}` menjamin penghancuran (*unmount*) total instance lama dan pembuatan (*mount*) instance baru yang bersih saat tenant berganti.
4. Menyelaraskan fallback teks pada `useStoreConfig.ts` agar tidak meng-hardcode nama Wanzt Store melainkan menggunakan placeholder `{storeName}` dinamis.

Bagian yang Akan Diubah/Dibuat:
- "frontend/src/hooks/useAuth.ts" - Menambahkan `tenantId` ke interface UserSession dan state.
- "frontend/src/components/dashboard/TenantDashboard.tsx" - Komponen dashboard toko terisolasi.
- "frontend/src/App.tsx" - Menggunakan `TenantDashboard` dengan `key={auth.user?.tenantId}`.
- "frontend/src/hooks/useStoreConfig.ts" - Menghilangkan teks hardcode toko default.

Alasan Perubahan:
Sebelumnya, hook bisnis dijalankan di level root `App` sebelum pengguna login. Hal ini menyebabkan state terisi data default Wanzt Store saat di halaman login, dan tidak di-reset ketika user login dengan akun tenant lain (`berkah_erot`).

Strategi Implementasi:
1. Buat file `frontend/src/components/dashboard/TenantDashboard.tsx` yang memuat seluruh hook bisnis, sidebar, navbar, dan tab content renderer toko.
2. Perbarui `frontend/src/hooks/useAuth.ts` dengan interface `UserSession { username: string; tenantId?: string; }`.
3. Sederhanakan `frontend/src/App.tsx` menjadi shell otentikasi bersih yang merender `TenantDashboard` berdasarkan `key={auth.user?.tenantId}`.
4. Validasi kompilasi dan linting (`lint_applet`, `compile_applet`).
5. Uji respon endpoint login dan dashboard via curl.
6. Perbarui status entri [11.0] menjadi Completed dan catat hasil di `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Catat entri [11.0] di `brain/LANGKAH_IMPLEMENTASI.md`.
2. Perbarui `frontend/src/hooks/useAuth.ts`.
3. Buat `frontend/src/components/dashboard/TenantDashboard.tsx`.
4. Perbarui `frontend/src/App.tsx` dan `frontend/src/hooks/useStoreConfig.ts`.
5. Uji dengan `lint_applet` dan `compile_applet`.
6. Restart dev server.
7. Catat penyelesaian di `brain/PROGRESS.md`.

Dampak Perubahan:
Setiap tenant memiliki pengalaman dashboard toko yang 100% terisolasi. Login sebagai `berkah_erot` akan langsung memuat Berkah Store, dan login sebagai `admin` memuat Wanzt Store.

Rencana Pengujian:
1. Typecheck TypeScript dengan `lint_applet`.
2. Build kompilasi dengan `compile_applet`.
3. Verifikasi alur login dan pemuatan data per tenant.

Hasil yang Diharapkan:
Dashboard tidak lagi menampilkan data Wanzt Store saat login dengan akun tenant lain. Data toko, bot, dan transaksi 100% terpisah antar penyewa.

---

[12.0] - PENYERAGAMAN FITUR MULTI-TENANT & ELIMINASI SISTEM TIER BERDASARKAN MASA SEWA

- Tanggal: 2026-11-02 04:16
- Status: Completed
Referensi SCHEDULE: 9.0

Tujuan Implementasi:
1. Menghapus sistem paket bertingkat (tier Basic, Pro, Enterprise) yang membeda-bedakan hak akses atau kapabilitas antar unit toko penyewa.
2. Menyeragamkan seluruh fitur bot WhatsApp, kapasitas grup, dan integrasi API agar 100% sama rata, adil, dan setara bagi seluruh penyewa apartemen bot.
3. Menjadikan Masa Sewa (sisa hari masa aktif dan tanggal kedaluwarsa) sebagai satu-satunya indikator peringkat, status, dan prioritas unit bot pada dashboard Master Admin.

Bagian yang Akan Diubah:
- "admin-frontend/src/App.tsx" - Menghapus input dropdown paket sewa di form pendaftaran tenant baru, menghapus kolom "Paket", memperkaya tabel dengan ranking masa sewa, status aktifitas, dan filter/sorting durasi masa sewa.
- "admin-backend/services/tenantManager.ts" - Menyeragamkan pembuatan tenant baru tanpa tier buatan (`package_name` disetarakan 'Akses Penuh', `max_groups` disetarakan 50), serta menyediakan pengurutan peringkat berdasarkan sisa masa sewa.
- "admin-backend/routes/adminRoutes.ts" - Menyelaraskan endpoint POST `/api/admin/tenants` agar tidak lagi mewajibkan parameter paket.
- "backend/config/configManager.ts" - Menyelaraskan default Xaviera Base URL ke `https://xavierastore.com/api/v1`.

Alasan Perubahan:
Sesuai instruksi pengguna: "fitur multi tenant memiliki beberapa tier, saya tidak ingin hal tersebut ada, hapus fitur tier tersebut, saya ingin semuanya sama rata, peringkat tier bot hanya berdasarkan masa sewa saja, jadi semuanya sama rata dan adil".

Strategi Implementasi:
1. Di `admin-frontend/src/App.tsx`:
   - Hapus state `newPackage` dan elemen `<select>` paket sewa pada Modal "Tambah Unit Apartemen Toko".
   - Di tabel unit toko, ganti kolom "Paket" menjadi kolom yang fokus pada durasi dan keaktifan masa sewa dengan badge peringkat durasi (misal: "Aktif Panjang", "Prioritas Perpanjangan", dsb.) serta visualisasi sisa hari yang informatif.
   - Tambahkan kontrol pengurutan (Sorting) tabel berdasarkan Masa Sewa: "Masa Sewa Terpanjang" (Peringkat Atas), "Mendekati Kedaluwarsa", dan "Paling Baru Terdaftar".
   - Pastikan teks bebas dari em-dash (`—`) dan mematuhi aturan anti-AI slop.
2. Di `admin-backend/services/tenantManager.ts`:
   - Pada `createTenant`: Tetapkan `package_name: 'Akses Penuh'` dan `max_groups: 50` secara merata untuk semua unit baru.
   - Pada `getAllTenants`: Urutkan data secara default berdasarkan keaktifan status dan sisa hari masa sewa (`days_remaining DESC`), sehingga unit dengan durasi sewa aktif terpanjang otomatis menempati peringkat atas.
3. Di `admin-backend/routes/adminRoutes.ts`:
   - Sederhanakan validasi pendaftaran unit tanpa mewajibkan paket.
4. Di `backend/config/configManager.ts`:
   - Perbarui `DEFAULT_API_CONFIG.xavieraBaseUrl` menjadi `'https://xavierastore.com/api/v1'`.
5. Uji build dengan `compile_applet` dan linting dengan `lint_applet`.
6. Dokumentasikan hasil penyelesaian di `brain/PROGRESS.md` entri [26.0].

Urutan Pengerjaan:
1. Update `admin-backend/services/tenantManager.ts` & `admin-backend/routes/adminRoutes.ts`.
2. Update `admin-frontend/src/App.tsx`.
3. Update `backend/config/configManager.ts`.
4. Uji kompilasi `compile_applet` dan `lint_applet`.
5. Verifikasi pengoperasian API dan UI.
6. Catat status di `brain/PROGRESS.md`.

Dampak Perubahan:
Seluruh tenant apartemen memiliki hak dan fitur bot yang setara tanpa adanya diskriminasi tier atau kasta fitur. Hirarki bot hanya dibedakan secara adil dari durasi masa sewa mereka.

Rencana Pengujian:
1. Jalankan `lint_applet` untuk memastikan tidak ada error tipe TypeScript.
2. Jalankan `compile_applet` untuk memastikan kompilasi bundle Vite dan Node.js tuntas tanpa masalah.
3. Uji tambah tenant baru dan verifikasi tidak ada input paket, serta data tersimpan dengan status sama rata.
4. Uji tampilan tabel Master Admin memastikan kolom paket telah digantikan dengan peringkat dan durasi masa sewa.

Hasil yang Diharapkan:
Sistem multi-tenant 100% adil dan sama rata. Peringkat unit bot ditentukan murni oleh masa sewa.

---

[27.0] - PERBAIKAN ERROR VITE DEV SERVER (PORT CONFLICT & UNSUPPORTED __DIRNAME)

- Tanggal: 2026-11-03 00:50
- Status: Planned
Referensi SCHEDULE: 7.0

Tujuan Implementasi:
Memperbaiki error "dev server process died" yang disebabkan oleh konflik port WebSocket HMR (24678) antara dua instance Vite (Tenant & Admin) dan mengganti penggunaan `__dirname` yang usang dengan `import.meta.dirname` di file konfigurasi Vite.

Bagian yang Akan Diubah:
- "vite.config.ts" - Mengganti `__dirname` dengan `import.meta.dirname`.
- "admin-frontend/vite.config.ts" - Mengganti `__dirname` dengan `import.meta.dirname`.
- "server.ts" - Menetapkan port HMR yang berbeda untuk `viteTenant` dan `viteAdmin` guna menghindari konflik WebSocket.

Alasan Perubahan:
1. `__dirname` tidak didukung secara native oleh loader Vite baru di lingkungan ES Module.
2. Secara default, setiap instance Vite mencoba menggunakan port 24678 untuk HMR. Karena kita menjalankan dua server Vite dalam satu proses Node.js di `server.ts`, terjadi bentrok port yang menyebabkan proses terhenti.

Strategi Implementasi:
1. Perbarui kedua file `vite.config.ts`.
2. Di `server.ts`, pada saat inisialisasi `createViteServer`, tambahkan konfigurasi `server: { hmr: { port: ... } }` dengan port yang berbeda (misal 24678 dan 24679).
3. Jalankan `restart_dev_server`.

Urutan Pengerjaan:
1. Edit `vite.config.ts` (root).
2. Edit `/frontend/vite.config.ts`.
3. Edit `admin-frontend/vite.config.ts`.
4. Edit `server.ts`.
5. Restart dev server.

Dampak Perubahan:
Dev server akan berjalan stabil tanpa error port conflict dan peringatan deprecation.

Rencana Pengujian:
1. Verifikasi log dev server memastikan tidak ada error "Port already in use".
2. Pastikan kedua antarmuka (Toko & Admin) dapat diakses di sandbox.

Hasil yang Diharapkan:
Aplikasi berjalan normal di port 3000 dengan dual-routing fungsional. Semuanya menggunakan standar `import.meta.dirname`.

---

[28.0] - IMPLEMENTASI ISOLASI PENYIMPANAN MEDIA MULTI-TENANT & FITUR UPLOAD FOTO KUSTOM

- Tanggal: 2026-11-03 08:35
- Status: Completed
Referensi SCHEDULE: 10.0

Tujuan Implementasi:
1. Mencegah kebocoran file gambar antar tenant dengan membuat direktori penyimpanan lokal terpisah per-tenant: `storage/tenants/<tenantId>/media/`.
2. Menyediakan endpoint upload foto kustom berbasis Base64 JSON (`POST /api/media/upload`) tanpa dependensi tambahan, dengan validasi format dan sanitasi nama file.
3. Mengisolasi endpoint `GET /api/media/pictures`, `GET /api/media/view`, dan `DELETE /api/media/:filename` sehingga tenant hanya dapat melihat dan mengelola foto miliknya sendiri.
4. Menghubungkan pengiriman pesan bot WhatsApp (`menuMessage.ts` dan `carouselMessage.ts`) ke folder media tenant aktif dengan fallback ke media default sistem.
5. Membangun antarmuka manajemen media di dashboard toko (`frontend/src/components/tabs/TabCommand.tsx`) dengan fitur upload file langsung dari browser, grid thumbnail interaktif, pemilihan foto aktif, dan tombol hapus file.

Bagian yang Akan Diubah/Dibuat:
- "backend/services/mediaManager.ts" - Modul helper baru untuk manajemen direktori media per-tenant, seed aset default, upload base64, dan pencarian path file.
- "backend/routes/mediaRoutes.ts" - Memperbarui endpoint daftar gambar, upload, view, dan delete yang terikat dengan konteks `getActiveTenantId()`.
- "backend/app.ts" - Menyesuaikan batas limit express json menjadi 25MB agar mendukung transfer data gambar base64.
- "backend/messages/menuMessage.ts" - Mengarahkan pencarian file gambar menu ke folder tenant aktif.
- "backend/messages/carouselMessage.ts" - Mengarahkan pencarian file gambar carousel ke folder tenant aktif.
- "frontend/src/components/tabs/TabCommand.tsx" - Menambahkan komponen Upload Media, indikator loading, pratinjau thumbnail, dan tombol aksi hapus/pilih pada bagian Menu dan Carousel.

Alasan Perubahan:
Sebelumnya seluruh gambar diletakkan di satu folder publik frontend `/frontend/src/media/picture`. Akibatnya seluruh tenant melihat foto yang sama di dropdown dan tidak bisa mengunggah foto promosi mereka sendiri tanpa bantuan teknis di server.

Strategi Implementasi:
1. Buat `backend/services/mediaManager.ts` untuk menyediakan operasi file aman (mkdir recursive, path basename sanitization, seed media default dari aset yang sudah ada).
2. Perbarui `backend/app.ts` untuk menaikkan limit json parser ke `25mb`.
3. Perbarui `backend/routes/mediaRoutes.ts` dengan memanfaatkan helper `mediaManager`.
4. Perbarui `backend/messages/menuMessage.ts` dan `carouselMessage.ts` untuk mengambil gambar via `getPicturePath(tenantId, filename)`.
5. Perbarui `frontend/src/components/tabs/TabCommand.tsx` dengan komponen upload drag-and-drop / tombol pilih file, galeri mini interaktif, dan penghapusan foto.
6. Uji kompilasi dengan `compile_applet` dan linting dengan `lint_applet`.
7. Catat progres di `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Buat `backend/services/mediaManager.ts`.
2. Edit `backend/app.ts`.
3. Edit `backend/routes/mediaRoutes.ts`.
4. Edit `backend/messages/menuMessage.ts`.
5. Edit `backend/messages/carouselMessage.ts`.
6. Edit `frontend/src/components/tabs/TabCommand.tsx`.
7. Uji dengan `compile_applet` dan `lint_applet`.
8. Catat di `brain/PROGRESS.md` dan update status [28.0] menjadi Completed.

Dampak Perubahan:
Setiap tenant dapat mengunggah foto promosi bot mereka sendiri secara mandiri dari browser dashboard. Foto milik satu tenant tidak akan terlihat atau dapat diakses oleh tenant lain, dan respon bot WhatsApp akan menggunakan foto kustom masing-masing tenant.

Rencana Pengujian:
1. Kompilasi TypeScript dan Vite build via `compile_applet`.
2. Linting TypeScript via `lint_applet`.
3. Uji upload media via API dan verifikasi file tersimpan di `storage/tenants/<tenantId>/media/`.
4. Uji pemisahan data antara tenant `t_wanzt` dan tenant lainnya.

---

[29.0] - IMPLEMENTASI TABEL DAFTAR PENYEWA 13 KOLOM PADA DASHBOARD MASTER ADMIN

- Tanggal: 2026-11-03 08:50
- Status: Completed
Referensi SCHEDULE: 11.0

Tujuan Implementasi:
1. Memperbarui tabel daftar penyewa di Dashboard Master Admin (`admin-frontend/src/App.tsx`) dengan struktur 13 kolom yang diminta pengguna secara presisi:
   - Status (Status akun: Aktif, Suspend, Expired dengan badge warna)
   - ID Bot (Kode unit bot, misal: t_berkahstore_450)
   - Toko (Nama toko)
   - Owner (Nama pemilik)
   - No. WhatsApp (Nomor WhatsApp dengan tautan langsung wa.me)
   - Username (Username login dashboard)
   - Masa Sewa (Durasi masa sewa, misal: 360 Hari)
   - Expired (Tanggal berakhirnya masa sewa dalam format Indonesia)
   - Status Bot (Online dengan indikator hijau berkedip / Offline)
   - Perpanjang (Tombol aksi membuka modal perpanjangan masa sewa)
   - Suspend (Toggle switch interaktif: On = disuspend, Off = aktif/normal)
   - Reset (Tombol aksi membuka modal reset password akun tenant)
   - Hapus (Tombol aksi menghapus akun tenant dengan modal konfirmasi)
2. Menghubungkan pembacaan status online/offline koneksi WhatsApp bot secara real-time dari Baileys socket (`getBotManager(tenantId).status === 'connected'`) pada endpoint `GET /api/admin/tenants`.
3. Menambahkan endpoint backend baru `POST /api/admin/tenants/:id/reset-password` dan method `TenantManager.resetPassword` untuk mereset kata sandi tenant.
4. Menambahkan modal interaktif tanpa window.alert untuk Reset Password, Perpanjang Sewa, dan Konfirmasi Hapus.

Bagian yang Akan Diubah:
- "admin-backend/services/tenantManager.ts":
  - Tambahkan properti `bot_status: 'online' | 'offline'` dan `duration_days?: number` pada `TenantRecord`.
  - Integrasikan pengecekan `getBotManager(tenant_id)` pada `getAllTenants()`.
  - Tambahkan method `resetPassword(tenantId: string, newPassword?: string)` yang meng-hash password dan memperbarui tabel `tenants` di `master.db`.
- "admin-backend/routes/adminRoutes.ts":
  - Tambahkan route `POST /tenants/:id/reset-password` untuk mengeksekusi reset password tenant.
- "admin-frontend/src/App.tsx":
  - Perbarui interface `Tenant` untuk memuat `bot_status` dan `duration_days`.
  - Susun ulang `<thead>` dan `<tbody>` tabel dengan 13 kolom yang rapi, elegan, dan terstruktur.
  - Implementasikan toggle switch untuk kolom Suspend yang langsung memicu pembaruan status ke server secara responsif.
  - Tambahkan modal dialog in-app untuk Reset Password dengan opsi custom password atau generate password otomatis.
  - Perbarui modal Perpanjang Sewa dan modal Konfirmasi Hapus agar serasi dengan desain tema master admin.

Alasan Perubahan:
Pengguna ingin tabel master admin lebih fungsional, informatif, dan memiliki kontrol langsung atas status sewa, operasional bot Baileys, akun login, dan status suspensi unit toko dalam satu pandangan ringkas.

Strategi Implementasi:
1. Perbarui `admin-backend/services/tenantManager.ts` untuk melengkapi data bot_status dan fungsi reset password.
2. Daftarkan endpoint reset password di `admin-backend/routes/adminRoutes.ts`.
3. Rombak antarmuka tabel di `admin-frontend/src/App.tsx` dengan CSS Tailwind, komponen toggle modern, badge warna kontras tinggi, dan modal-modal konfirmasi in-app.
4. Pastikan tidak ada karakter em-dash maupun en-dash di seluruh tampilan antarmuka.
5. Uji dengan `compile_applet` dan pastikan build berjalan sukses.

Urutan Pengerjaan:
1. Edit `admin-backend/services/tenantManager.ts`.
2. Edit `admin-backend/routes/adminRoutes.ts`.
3. Edit `admin-frontend/src/App.tsx`.
4. Jalankan `compile_applet`.
5. Catat progres di `brain/PROGRESS.md` dan update status [29.0] menjadi Completed.

Dampak Perubahan:
Dashboard Master Admin memiliki tabel penyewa terlengkap dengan 13 kolom yang memudahkan pemantauan dan pengelolaan seluruh tenant secara real-time.

Rencana Pengujian:
1. Verifikasi `compile_applet` untuk build server dan client frontend.
2. Pastikan tabel merender 13 kolom secara rapi di desktop dan responsif saat di-scroll horizontal.
3. Uji fungsi toggle Suspend, modal Perpanjang Sewa, modal Reset Password, dan modal Hapus Tenant.

Hasil yang Diharapkan:
Tabel 13 kolom tampil elegan, interaktif, responsif, dengan fitur reset password dan toggle suspend yang berfungsi optimal.

---

[30.0] - STANDARDISASI DAN NORMALISASI FORMAT NOMOR WHATSAPP (+628xxxx) PADA TABEL MASTER ADMIN

- Tanggal: 2026-11-03 09:05
- Status: Completed

Tujuan Implementasi:
1. Memastikan setiap nomor WhatsApp pada kolom No. WhatsApp di tabel Master Admin (`admin-frontend/src/App.tsx`) selalu tampil dengan format internasional standar `+628xxxx`.
2. Menangani berbagai variasi input dari tenant, baik yang mengawali nomor dengan `08...`, `8...`, `62...`, maupun `+62...`, sehingga hasil tampilan konsisten menjadi `+628xxxx`.
3. Menyelaraskan tautan `https://wa.me/` agar menggunakan digit bersih hasil normalisasi (`628xxxx`) sehingga saat diklik dapat langsung membuka obrolan WhatsApp tanpa error.
4. Menambahkan normalisasi nomor pada backend (`admin-backend/services/tenantManager.ts`) saat admin mendaftarkan unit toko baru agar data tersimpan dalam bentuk standar.

Bagian yang Akan Diubah:
- "admin-frontend/src/App.tsx":
  - Menambahkan fungsi helper `formatIndonesianPhone(phone: string)` untuk mengubah input `08...`, `8...`, atau `62...` menjadi format tampilan `+628...` dan clean digits `628...`.
  - Menggunakan helper ini pada render sel tabel "No. WhatsApp" dan pada tautan `href`.
- "admin-backend/services/tenantManager.ts":
  - Menerapkan sanitasi/normalisasi format nomor telepon pada fungsi `createTenant` agar nilai `owner_phone` yang disimpan ke database selalu seragam diawali dengan `628`.

Alasan Perubahan:
Tenant atau admin dapat menginput nomor dengan format yang beragam (seperti 0812..., 812..., atau 62812...). Format tampilan yang tidak seragam membuat tabel terlihat kurang konsisten dan tautan wa.me bisa bermasalah jika ada format 08 yang tidak dikonversi ke kode negara.

Strategi Implementasi:
1. Buat fungsi helper normalisasi di frontend:
   - Bersihkan seluruh karakter selain angka (`\D`).
   - Jika diawali `0`, potong angka `0` di awal lalu tambahkan `62`.
   - Jika diawali `8`, tambahkan `62` di depan.
   - Jika sudah diawali `62`, biarkan.
   - Kembalikan objek `{ display: '+62...', cleanDigits: '62...' }`.
2. Di backend, terapkan logika normalisasi serupa pada saat input tenant baru dibuat.
3. Jalankan `compile_applet` dan `lint_applet` untuk memastikan tidak ada kesalahan kompilasi.

Urutan Pengerjaan:
1. Edit `admin-frontend/src/App.tsx`.
2. Edit `admin-backend/services/tenantManager.ts`.
3. Uji kompilasi dengan `compile_applet`.
4. Catat penyelesaian di `brain/PROGRESS.md` dan update status [30.0] menjadi Completed.

Dampak Perubahan:
Tampilan nomor WhatsApp di tabel master admin akan 100% konsisten diawali `+628...` dan tautan direct chat WhatsApp bekerja lancar untuk seluruh tenant.

Rencana Pengujian:
1. Uji tampilan kolom nomor WhatsApp dengan berbagai bentuk nomor (contoh: 0812..., 812..., 62812...).
2. Verifikasi tautan `wa.me` mengarah ke format nomor yang valid.
3. Verifikasi build dengan `compile_applet`.

Hasil yang Diharapkan:
Seluruh nomor WhatsApp pada tabel master admin tampil rapi dengan awalan `+628...` dan tautan WhatsApp berfungsi sempurna.

---

[31.0] - PENEGAKAN SUSPEND: PEMUTUSAN KONEKSI BOT WHATSAPP & MODAL PEMBERITAHUAN NON-DISMISSIBLE

- Tanggal: 2026-11-03 16:51
- Status: Completed
Referensi SCHEDULE: 12.0


Tujuan Implementasi:
1. Menerapkan pemutusan koneksi paksa bot WhatsApp (`forceDisconnect`) saat Master Admin mengubah status akun tenant menjadi `suspended`. Jika bot sedang berstatus `connected` / socket aktif, socket langsung ditutup sehingga bot berhenti menerima dan merespons seluruh pesan di WhatsApp.
2. Mengizinkan tenant suspended untuk tetap login dan masuk ke dashboard toko miliknya, namun dashboard langsung mengunci layar dengan popup modal pemberitahuan non-dismissible (tidak ada tombol close X, tidak bisa ditutup klik backdrop, tidak bisa ditutup Escape).
3. Di dalam popup modal, sediakan 2 tombol aksi:
   - Tombol 1: "Hubungi Master Admin" dengan tautan ke WhatsApp `https://wa.me/6285712439395`.
   - Tombol 2: "Keluar / Logout" untuk keluar dari sesi akun.
4. Membuat file konfigurasi nomor WhatsApp Master Admin terpusat (`frontend/src/config/adminContact.ts` dan backend) agar pemilik dapat dengan mudah mengganti nomor telepon Master Admin sewaktu-waktu di satu tempat tanpa perlu mengedit komponen kode lainnya.

Bagian yang Akan Diubah/Dibuat:
- "frontend/src/config/adminContact.ts" - File konfigurasi terpusat nomor WhatsApp Master Admin (default: 085712439395).
- "backend/botManager.ts" - Menambahkan method `forceDisconnect()` pada class `BotManager`.
- "admin-backend/services/tenantManager.ts" - Pada method `setStatus`, saat status diubah menjadi `suspended`, panggil `forceDisconnect()` pada bot manager tenant terkait.
- "backend/services/authManager.ts" - Perbarui `verifyLogin()` agar akun berstatus `suspended` tetap dapat login, namun mengembalikan status akun `accountStatus: 'suspended'`.
- "backend/routes/authRoutes.ts" - Perbarui endpoint `/api/auth/login`, `/api/auth/session`, dan `/api/auth/store-status` agar menyertakan status akun tenant (`accountStatus: 'active' | 'suspended' | 'expired'`).
- "frontend/src/components/modals/SuspendedAccountModal.tsx" - Komponen modal pemberitahuan akun ditangguhkan yang non-dismissible dengan tombol WhatsApp dan Logout.
- "frontend/src/components/dashboard/TenantDashboard.tsx" - Mengecek `accountStatus` tenant saat memuat dashboard dan merender `SuspendedAccountModal` jika status adalah `suspended`.

Alasan Perubahan:
Sesuai instruksi pengguna:
1. Saat akun tenant disuspend, jika bot sedang online terhubung ke WhatsApp, seluruh sambungan harus diputus agar bot tidak berfungsi.
2. Saat tenant suspended login, tenant harus masuk ke dashboard terlebih dahulu lalu muncul popup pemberitahuan akun disuspend yang tidak dapat ditutup.
3. Tombol diarahkan ke link `wa.me/6285712439395` dengan nomor Master Admin yang dapat diubah dengan mudah jika suatu saat berganti.

Strategi Implementasi:
1. Buat file `frontend/src/config/adminContact.ts` berisi konstanta `MASTER_ADMIN_PHONE = '085712439395'` dan helper `getMasterAdminWaLink()`.
2. Di `backend/botManager.ts`:
   - Tambahkan method `forceDisconnect()`:
     ```ts
     async forceDisconnect() {
       if (this.sock) {
         try {
           this.sock.ev.removeAllListeners('connection.update');
           this.sock.ev.removeAllListeners('messages.upsert');
           await this.sock.end(undefined);
         } catch {}
         this.sock = null;
       }
       this.status = 'closed';
       this.pairingCode = '';
       this.addLog('warning', 'Koneksi WhatsApp bot diputus paksa oleh Master Admin karena akun toko disuspend.');
     }
     ```
3. Di `admin-backend/services/tenantManager.ts`:
   - Pada `setStatus(tenantId, status)`:
     ```ts
     if (status === 'suspended') {
       try {
         const bot = getBotManager(tenantId);
         if (bot) {
           await bot.forceDisconnect();
         }
       } catch (err) {
         console.error('Gagal memutus koneksi bot saat suspend:', err);
       }
     }
     ```
4. Di `backend/services/authManager.ts`:
   - Pada `verifyLogin()`, izinkan tenant yang berstatus `suspended` tetap login dan sertakan `status: masterTenant.status` pada kembalian.
5. Di `backend/routes/authRoutes.ts`:
   - Sertakan `accountStatus` pada respon `/api/auth/session`, `/api/auth/login`, dan `/api/auth/store-status`.
6. Di `frontend/src/components/modals/SuspendedAccountModal.tsx`:
   - Desain modal popup non-dismissible dengan background overlay gelap `fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4`.
   - Ikon peringatan `AlertTriangle` / `PauseCircle` bernuansa oranye/amber elegan.
   - Pesan jelas: Akun toko telah ditangguhkan oleh Master Admin. Bot WhatsApp telah dinonaktifkan.
   - Tombol "Hubungi Master Admin" membuka `https://wa.me/6285712439395` di tab baru.
   - Tombol "Keluar / Logout" memicu fungsi `onLogout()`.
7. Di `frontend/src/components/dashboard/TenantDashboard.tsx`:
   - Ambil `accountStatus` dari `/api/auth/store-status` atau dari props sesi auth.
   - Jika `accountStatus === 'suspended'`, render `<SuspendedAccountModal onLogout={auth.logout} />`.

Urutan Pengerjaan:
1. Buat `frontend/src/config/adminContact.ts`.
2. Edit `backend/botManager.ts` untuk method `forceDisconnect()`.
3. Edit `admin-backend/services/tenantManager.ts` untuk pemutusan bot saat suspend.
4. Edit `backend/services/authManager.ts` & `backend/routes/authRoutes.ts` untuk informasi `accountStatus`.
5. Buat `frontend/src/components/modals/SuspendedAccountModal.tsx`.
6. Edit `frontend/src/components/dashboard/TenantDashboard.tsx` untuk render modal.
7. Uji build dan linting (`compile_applet` dan `lint_applet`).
8. Catat progres di `brain/PROGRESS.md`.

Dampak Perubahan:
Akun yang disuspend tidak akan bisa memanfaatkan bot WhatsApp (koneksi diputus), dan dashboard akan terkunci dengan popup peringatan non-dismissible yang mengarahkan komunikasi ke nomor WhatsApp Master Admin.

Rencana Pengujian:
1. Jalankan `compile_applet` dan `lint_applet`.
2. Login sebagai tenant aktif, periksa bot berjalan normal.
3. Di Master Admin, nyalakan toggle Suspend untuk tenant tersebut, pastikan status bot langsung menjadi Offline/closed.
4. Login kembali sebagai tenant tersebut di dashboard toko, pastikan berhasil masuk ke dashboard dan popup modal Suspend langsung muncul di tengah layar serta tidak bisa ditutup.
5. Klik tombol Hubungi Admin, pastikan tautan mengarah ke `https://wa.me/6285712439395`.
6. Klik tombol Logout, pastikan berhasil keluar ke halaman login.

Hasil yang Diharapkan:
Sistem penegakan suspend bekerja 100% presisi sesuai instruksi pengguna, aman, dan nomor Master Admin mudah diganti sewaktu-waktu di satu file konfigurasi.

---

[32.0] - PEMBUATAN AKUN TENANT INSTAN OTOMATIS & TOMBOL TUTUP SEMENTARA POPUP SUSPEND

- Tanggal: 2026-11-03 17:06
- Status: Completed
Referensi SCHEDULE: 13.0


Tujuan Implementasi:
1. Menyederhanakan form pendaftaran tenant baru di Dashboard Master Admin (`admin-frontend/src/App.tsx` & `admin-backend`):
   - Admin tidak lagi wajib mengisi Nama Toko, Nama Owner, Nomor WhatsApp, Username, dan Password.
   - Sistem menyediakan opsi "Generate Otomatis Akun Baru" (1-klik):
     * Username acak terstruktur unik: format `tenant_` diikuti 4 digit angka acak (contoh: `tenant_4829`, `tenant_7193`).
     * Password acak yang rapi dan mudah dibaca: format `pass_` diikuti 4-6 karakter alfanumerik acak (contoh: `pass_8392`).
     * Field Nama Toko, Nama Owner, dan Nomor WhatsApp dikosongkan (`""`) pada database tenant dan master.
     * Admin cukup memilih Durasi Masa Sewa (default 365 hari, opsi 30/60/90/365 hari atau custom).
   - Setelah akun berhasil dibuat, tampilkan Modal Pop-up Sukses yang memperlihatkan Username, Password, dan Durasi Sewa lengkap dengan tombol "Salin Kredensial" agar admin bisa langsung membagikannya ke calon penyewa bot.
   - Saat tenant login pertama kali dengan username dan password tersebut, dashboard toko mendeteksi data profil kosong dan langsung menampilkan popup modal wajib isi Store Info (`MandatoryStoreSetupModal`) untuk diisi mandiri oleh tenant.
2. Memperbarui `SuspendedAccountModal.tsx`:
   - Menambahkan tombol "Tutup Sementara" (atau ikon minimize/close sementara) di sudut atau bagian bawah modal.
   - Menyediakan tombol pintas langsung "Akses Portal Master Admin" (`/admin/`) agar admin yang sedang menguji atau memeriksa akun tidak terkunci selamanya dan dapat kembali ke dashboard master dengan mudah.

Bagian yang Akan Diubah/Dibuat:
- "admin-backend/services/tenantManager.ts":
  - Izinkan `store_name`, `owner_name`, `owner_phone` bernilai kosong atau opsional.
  - Implementasikan helper generator username acak terstruktur unik: `generateStructuredUsername()`.
  - Implementasikan helper generator password acak: `generateRandomPassword()`.
- "admin-backend/routes/adminRoutes.ts":
  - Buat handler pembuatan tenant fleksibel (tidak wajib me-require store_name jika menggunakan auto-generate).
  - Kembalikan `raw_password` pada respon sukses penambahan tenant agar modal admin bisa menampilkannya.
- "admin-frontend/src/App.tsx":
  - Sederhanakan modal "Tambah Unit Apartemen Toko":
    * Opsi default: "Buat Akun Otomatis (Instan)" yang hanya meminta Durasi Masa Sewa dan Catatan opsional.
    * Opsi kustom (opsional accordion/toggle jika admin ingin isi manual).
    * Modal Dialog Kredensial Baru: Menampilkan Username, Password, Masa Sewa, dan tombol "Salin Akun ke Clipboard".
- "frontend/src/components/modals/SuspendedAccountModal.tsx":
  - Tambahkan prop `onCloseTemporary?: () => void`.
  - Tambahkan tombol "Tutup Sementara" dan tombol "Buka Master Admin" (`/admin/`).
- "frontend/src/components/dashboard/TenantDashboard.tsx":
  - Kelola state `isSuspendModalDismissedTemporary` sehingga jika ditutup sementara pada sesi browser tersebut, modal dapat ditutup sementara.

Alasan Perubahan:
Pengguna meminta proses penambahan akun dipermudah (tidak wajib isi profil toko, dibuatkan username acak terstruktur dan password otomatis), serta modal suspend diberi opsi tutup sementara agar admin tidak terhalang saat ingin kembali ke dashboard master.

Strategi Implementasi:
1. Di `admin-backend/services/tenantManager.ts`:
   - Jika `input.username` tidak diisi, generate `tenant_${Math.floor(1000 + Math.random() * 9000)}`.
   - Jika `input.password` tidak diisi, generate `pass_${Math.random().toString(36).substring(2, 7)}`.
   - Jika `input.store_name` tidak diisi, gunakan `Toko Baru` atau kosong.
   - Kembalikan `{ ...tenant, generated_password }`.
2. Di `admin-frontend/src/App.tsx`:
   - Tambahkan state `createdCredential: { username: string; password: string; storeName: string; durationDays: number } | null`.
   - Tampilkan modal hasil pembuatan akun dengan kartu kredensial yang siap dicopy.
3. Di `frontend/src/components/modals/SuspendedAccountModal.tsx`:
   - Tambahkan tombol "Tutup Sementara" dan tautan "Masuk Portal Master Admin".
4. Jalankan `compile_applet` dan `lint_applet`.
5. Catat hasil akhir di `brain/PROGRESS.md`.

Urutan Pengerjaan:
1. Update `admin-backend/services/tenantManager.ts`.
2. Update `admin-backend/routes/adminRoutes.ts`.
3. Update `admin-frontend/src/App.tsx`.
4. Update `frontend/src/components/modals/SuspendedAccountModal.tsx`.
5. Update `frontend/src/components/dashboard/TenantDashboard.tsx`.
6. Uji kompilasi dan linting.
7. Catat di `brain/PROGRESS.md`.

Dampak Perubahan:
Pembuatan tenant baru menjadi instan (1-klik), profil diisi mandiri oleh tenant di dashboard toko mereka, dan admin leluasa berpindah ke dashboard master meskipun akun sedang berstatus suspend.

Rencana Pengujian:
1. Uji pembuatan akun tenant baru di `/admin/` tanpa mengisi nama toko, nama owner, nomor wa, username, dan password.
2. Pastikan akun berhasil terbuat dengan username acak terstruktur dan password muncul di layar.
3. Login ke dashboard toko menggunakan akun baru tersebut, pastikan popup wajib isi Store Info muncul otomatis.
4. Uji popup suspend, pastikan terdapat tombol tutup sementara dan tombol akses master admin.
5. Verifikasi kelulusan `compile_applet` dan `lint_applet`.

Hasil yang Diharapkan:
Seluruh fitur penambahan akun instan otomatis dan tombol tutup sementara popup suspend berjalan mulus dan elegan.



