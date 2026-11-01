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
