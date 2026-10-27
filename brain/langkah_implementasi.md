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
