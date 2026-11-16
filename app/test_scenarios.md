# PANDUAN SKENARIO PENGUJIAN LENGKAP & EKHAUSTIF SISTEM BOT (EDISI DETAIL)

Dokumen ini adalah panduan pengujian terperinci yang mencakup seluruh alur utama, edge cases, kondisi error, dan skenario khusus (seperti kupon promo valid/invalid, timeout sesi 3 menit, stok kosong, QRIS lunas/expired, mode grup only, dll.). Gunakan 2 akun tenant (`t_wanzt` dan `t_akaj_211`), 2 nomor WhatsApp, dan 2 bot Telegram Anda untuk menguji setiap poin di bawah ini satu per satu.

---

## 1. AUTENTIKASI & SESI MASTER ADMIN (`/admin/`)

* **Skenario 1.1 (Login Sukses Master Admin):**
  - Langkah: Buka `/admin/`, masukkan username `adminutama` dan password `adminwanzt888`, klik Masuk.
  - Hasil: Login berhasil, token sesi tersimpan di client, diarahkan ke Dashboard Master Admin tab default "Daftar Unit Bot".
* **Skenario 1.2 (Login Gagal - Kredensial Salah):**
  - Langkah: Masukkan username benar, password salah.
  - Hasil: Ditolak dengan pesan "Kredensial Super Admin tidak valid", tetap di halaman login.
* **Skenario 1.3 (Impersonasi Tenant dari Master Admin):**
  - Langkah: Pada baris "Wanzt Store" (`t_wanzt`) di tabel unit bot, klik tombol ikon panah impersonasi.
  - Hasil: Master Admin langsung masuk ke Dashboard Bot Wanzt Store tanpa diminta password tenant, dengan banner indikator impersonasi aktif di bagian atas.

---

## 2. MASTER ADMIN: MANAJEMEN UNIT BOT (`Daftar Unit Bot`)

* **Skenario 2.1 (Pendaftaran Tenant Baru - Durasi Hari):**
  - Langkah: Klik "Daftarkan Unit Baru", isi ID bot (`t_toko_uji`), Nama Toko, Owner, No WA (`82173515807`), durasi 30 Hari, simpan.
  - Hasil: Tenant baru masuk ke tabel dengan status Aktif dan masa sewa 30 hari.
* **Skenario 2.2 (Pendaftaran Tenant Baru - Durasi Menit / Jam):**
  - Langkah: Buat tenant dengan durasi 10 Menit atau 2 Jam.
  - Hasil: Masa sewa dihitung presisi; saat waktu terlewati, sistem otomatis menandai status tenant menjadi `expired`.
* **Skenario 2.3 (Validasi Input Durasi Kosong):**
  - Langkah: Buka modal Tambah Tenant atau Perpanjang Sewa, hapus nilai angka durasi sampai kosong.
  - Hasil: Kolom kosong, muncul pesan peringatan "Form Tersebut Wajib Di Isi, Misal : 1", tombol simpan terkunci.
* **Skenario 2.4 (Perpanjang Masa Sewa Multi-Unit):**
  - Langkah: Perpanjang tenant `t_akaj_211` dengan unit "Bulan" sebanyak 1 bulan.
  - Hasil: Tanggal expired bergeser tepat 1 bulan ke depan dengan pratinjau tanggal yang akurat.
* **Skenario 2.5 (Suspend & Unsuspend Real-Time):**
  - Langkah: Geser sakelar Suspend tenant `t_akaj_211` ke posisi ON.
  - Hasil: Status menjadi Ditangguhkan, dan jika tenant sedang membuka dashboard tokonya, popup banned langsung muncul seketika tanpa refresh.
* **Skenario 2.6 (Reset Sesi & Hapus Tenant):**
  - Langkah: Uji tombol Reset (membersihkan sesi Baileys) dan Hapus tenant uji coba.
  - Hasil: Sesi tereset dan tenant terhapus permanen dari sistem.

---

## 3. MASTER ADMIN: TEMPLATE MESSAGE MANAGEMENT (`Template Message`)

* **Skenario 3.1 (Tambah Template Master Baru):**
  - Langkah: Buka tab "Template Message", tambah template kategori `menu`, isi teks dengan chip placeholder `{storeName}`, simpan.
  - Hasil: Template tersimpan di database pusat dan tampil di tabel master.
* **Skenario 3.2 (Toggle Status Aktif / Nonaktif Instan):**
  - Langkah: Klik sakelar switch status pada salah satu template.
  - Hasil: Status aktif/nonaktif berganti seketika; jika nonaktif, template tersembunyi dari pilihan tenant.
* **Skenario 3.3 (Edit & Hapus Template Master):**
  - Langkah: Edit isi teks atau hapus template.
  - Hasil: Perubahan tersimpan atau template terhapus permanen.

---

## 4. MASTER ADMIN: BOT TELEGRAM MANAGEMENT (`Bot Telegram`)

* **Skenario 4.1 (Memantau 4 Status Bot Telegram Tenant):**
  - Langkah: Buka tab "Bot Telegram" di Master Admin, amati status tenant (Nonaktif, Online, Offline, Suspend).
  - Hasil: Tabel menampilkan badge status yang akurat sesuai kondisi konfigurasi tenant.
* **Skenario 4.2 (Admin Menonaktifkan Bot Telegram Tenant):**
  - Langkah: Matikan sakelar Telegram Admin pada tenant `t_akaj_211` (Suspend).
  - Hasil: Bot Telegram tenant dimatikan secara paksa dari sisi admin (`admin_disabled = 1`).
* **Skenario 4.3 (Kirim Pesan Resmi Admin ke Telegram Owner):**
  - Langkah: Klik tombol "Kirim Pesan" pada baris tenant di tabel Telegram, ketik pesan, kirim.
  - Hasil: Pesan terkirim ke Telegram owner tanpa pernah memperlihatkan token bot atau chat ID rahasia kepada admin.

---

## 5. MASTER ADMIN: MANAGEMENT TOKEN (`Management Token`)

* **Skenario 5.1 (Generate Voucher Token Perpanjangan):**
  - Langkah: Buka tab "Management Token", buat token durasi 7 Hari.
  - Hasil: Muncul popup token berformat `DDMM-XXXX-XXDA-XXXX`, tombol salin instan, dan token masuk ke tabel dengan status `available`.
* **Skenario 5.2 (Filter & Salin Kode Voucher):**
  - Langkah: Gunakan filter pill (Semua, Tersedia, Terpakai) dan salin kode token.
  - Hasil: Tabel memfilter data dengan benar dan kode tersalin ke clipboard.

---

## 6. MASTER ADMIN: PARTNER & RESELLER API (`Partner API`)

* **Skenario 6.1 (Pembuatan & Pengujian API Key Mitra):**
  - Langkah: Buat API Key baru di tab Partner API, lalu uji endpoint `POST /api/v1/partner/tenants/create` menggunakan cURL dengan header `x-api-key`.
  - Hasil: Server mengembalikan JSON sukses berisi akun tenant baru dan tercatat di log partner.

---

## 7. MASTER ADMIN: BROADCAST / PESAN SIARAN (`Pesan Siaran`)

* **Skenario 7.1 (Kirim Broadcast Langsung - Semua Kanal):**
  - Langkah: Buka tab "Pesan Siaran", pilih kanal "WA & Telegram", isi pesan dengan placeholder `{storeName}`, pastikan target 2 tenant aktif, klik "Kirim Broadcast Sekarang".
  - Hasil: Pesan dikirim paralel ke 2 tenant aktif. Karena bot WA offline dan telegram belum diset, log mencatat kegagalan dengan alasan yang transparan.
* **Skenario 7.2 (Buat Jadwal Berulang Otomatis - Mingguan):**
  - Langkah: Buat broadcast dengan jadwal berulang mingguan (Senin, 09:00 WIB), simpan.
  - Hasil: Kampanye masuk tabel riwayat dengan status "Berulang Aktif" dan jadwal berikutnya tertera rapi.
* **Skenario 7.3 (Aksi Edit, Kirim Sekarang, Batalkan, dan Hapus Jadwal):**
  - Langkah: Uji tombol **Edit**, **Kirim** (eksekusi paksa), **Batalkan**, dan **Hapus**.
  - Hasil: Setiap aksi merespons dengan benar dan memperbarui status kampanye secara instan.
* **Skenario 7.4 (Inspeksi Log 2 Tingkat & Kirim Ulang yang Gagal):**
  - Langkah: Buka modal log detail (`BroadcastLogModal`), uji filter kanal/status, pencarian, dan tombol **Kirim Ulang yang Gagal**.
  - Hasil: Audit log tersaji lengkap per-tenant per-kanal dan proses retry berjalan lancar.

---

## 8. MASTER ADMIN: PENGATURAN MASTER (`Pengaturan Master`)

* **Skenario 8.1 (Kelola Multi Master Admin & Range Slider 100%):**
  - Langkah: Buka tab "Pengaturan Master", atur range slider probabilitas antar admin (total terkunci di 100%, auto-balance), atau klik "Bagi Rata".
  - Hasil: Slider menyeimbangkan persentase otomatis, tombol "Simpan Pengaturan" berhasil menyimpan perubahan.
* **Skenario 8.2 (Tambah & Hapus Kontak Master Admin):**
  - Langkah: Tambah admin ke-3, lalu uji hapus salah satu admin (minimal tersisa 1 admin).
  - Hasil: Baris admin bertambah/berkurang dengan mulus dan tombol hapus terkunci jika hanya tinggal 1 baris.

---

## 9. TENANT BOT DASHBOARD: SETUP AWAL & AUTENTIKASI

* **Skenario 9.1 (Login & Normalisasi Nomor WhatsApp):**
  - Langkah: Login ke Dashboard Toko (`t_wanzt`). Masukkan nomor owner dengan awalan `082173515807` atau `6282173515807`.
  - Hasil: Kotak input otomatis menyaring dan hanya menampilkan format lokal `82173515807`, namun tersimpan di database dengan format resmi internasional `+6282173515807`.

---

## 10. TENANT BOT DASHBOARD: KONEKSI BOT & LIVE TERMINAL (`Koneksi`)

* **Skenario 10.1 (Pairing WhatsApp & Live Terminal Stream):**
  - Langkah: Buka tab "Koneksi", minta kode pairing WhatsApp.
  - Hasil: Live Terminal menampilkan log Baileys secara real-time dan kode pairing 8 digit muncul.
* **Skenario 10.2 (Konfigurasi Bot Telegram & Tes Kirim Notifikasi):**
  - Langkah: Masukkan Bot Token (@BotFather) dan Chat ID Telegram di halaman Koneksi, klik "Simpan", lalu "Tes Kirim Notifikasi".
  - Hasil: Bot Telegram tenant mengirim pesan uji coba instan ke akun Telegram Anda.
* **Skenario 10.3 (Saklar Grup Only ON / OFF):**
  - Langkah: Aktifkan sakelar "Grup Only" menjadi ON.
  - Hasil: Bot mengabaikan seluruh chat pribadi (DM) demi keamanan anti-ban WhatsApp, namun tetap melayani alur order dari grup.

---

## 11. TENANT BOT DASHBOARD: RESPON BOT & KUSTOMISASI PESAN (`Respon Bot`)

* **Skenario 11.1 (Memilih Template Master untuk Respon Bot):**
  - Langkah: Buka tab "Respon Bot", pilih salah satu sub-tab (Menu, List, Transaksi, Notifikasi, atau 4 sub-tab Konfirmasi Promo), klik "Pilih Template".
  - Hasil: Modal pemilih template terbuka dan hanya menampilkan template yang **sesuai secara ketat** dengan kategori sub-tab tersebut (anti-campur).
* **Skenario 11.2 (Menyisipkan Variabel Placeholder & Simpan Respon):**
  - Langkah: Gunakan chip placeholder (misal `{customerName}`, `{total}`), edit pesan, klik "Simpan Respon".
  - Hasil: Pesan kustom tersimpan di SQLite tenant dan langsung digunakan oleh bot.

---

## 12. ALUR PEMBELIAN, KODE PROMO, STOK KOSONG, & QRIS GATEWAY

* **Skenario 12.1 (Checkout Normal Tanpa Kupon):**
  - Langkah: Kirim pesan `.menu` ke bot, pilih produk dan varian, tentukan jumlah, lalu konfirmasi pesanan.
  - Hasil: Bot menghasilkan ringkasan pesanan, mencatat transaksi ke database, dan menerbitkan QRIS pembayaran.
* **Skenario 12.2 (Checkout dengan Kode Promo Valid):**
  - Langkah: Saat bot meminta input kode promo pada alur konfirmasi, masukkan kode promo yang valid (misal `PROMO50` atau diskon aktif).
  - Hasil: Bot mengenali kode promo, memicu template `confirm_promo_valid`, memotong harga secara akurat, dan memperbarui total bayar (`finalPrice`).
* **Skenario 12.3 (Checkout dengan Kode Promo Tidak Valid / Salah):**
  - Langkah: Masukkan kode promo ngawur atau kupon yang sudah expired saat diminta input promo.
  - Hasil: Bot menolak kupon, memicu template `confirm_promo_invalid`, menampilkan alasan penolakan (`reason`), dan mempersilakan pembeli lanjut tanpa diskon atau mengetik ulang.
* **Skenario 12.4 (Checkout dengan Kupon Valid namun Sesi Habis / Timeout):**
  - Langkah: Mulai alur checkout, pilih varian, tetapi diamkan chat selama **lebih dari 3 menit** sebelum memasukkan kode promo atau menekan tombol konfirmasi.
  - Hasil: Sistem mendeteksi masa aktif `activeCheckoutSessions` telah berakhir (timeout 3 menit), bot merespons dengan pesan sesi habis (`sessionExpiredText`), dan meminta pembeli mengulang dari menu awal.
* **Skenario 12.5 (Order Produk dengan Stok Kosong / Restock):**
  - Langkah: Coba beli produk yang stok variannya diset 0 (`stock = 0`).
  - Hasil: Bot menolak pesanan dan membalas dengan template kustom `stockEmptyText` (Stok Kosong / Restock).
* **Skenario 12.6 (QRIS Payment Success / Lunas):**
  - Langkah: Setelah QRIS diterbitkan, lakukan simulasi pelunasan transaksi (atau ubah status transaksi menjadi `paid` di database/admin).
  - Hasil: Bot secara instan mengirimkan pesan sukses pembayaran (`paymentSuccessDmText` & `paymentSuccessGroupText`) ke DM pembeli dan grup toko, serta memicu notifikasi `notifyTransactionPaid` ke Telegram owner.
* **Skenario 12.7 (QRIS Payment Expired / Dibatalkan):**
  - Langkah: Biarkan QRIS sampai kedaluwarsa atau pembeli mengetik kata `BATAL` di chat.
  - Hasil: Transaksi ditandai batal/expired, bot mengirimkan pesan pembatalan (`promoCancelledText` atau invoice expired), serta memicu notifikasi `notifyTransactionFailed` ke Telegram owner.

---

## 13. TENANT BOT DASHBOARD: MANAGEMENT BOT & REDEEM VOUCHER (`Management Bot`)

* **Skenario 13.1 (Memantau Masa Aktif & Sisa Hari):**
  - Langkah: Buka menu "Management Bot" di sidebar tenant.
  - Hasil: Kartu menampilkan status bot, sisa hari dan total masa aktif dalam format wajib `[sisa]/[total] day` (contoh: `431/450 day`), progress bar visual, serta tanggal kedaluwarsa WIB lengkap.
* **Skenario 13.2 (Redeem Voucher Token Perpanjangan Sukses):**
  - Langkah: Masukkan kode token 16 digit yang valid (`XXXX-XXXX-XXXX-XXXX`) pada form redeem di halaman Management Bot, klik "Gunakan Token".
  - Hasil: Masa aktif toko bertambah seketika sesuai durasi token dan status akun kembali aktif.
* **Skenario 13.3 (Redeem Token Gagal - Token Salah atau Sudah Dipakai):**
  - Langkah: Masukkan kode token ngawur atau token yang sudah pernah digunakan oleh tenant lain.
  - Hasil: Sistem menolak dengan pesan error yang jelas (misal "Token sudah pernah digunakan" atau "Token tidak valid").

---

## 14. PENEGAKAN REAL-TIME EXPIRED & SUSPENSION (POPUP TERKUNCI)

* **Skenario 14.1 (Popup Expired Non-Dismissible & Pemutusan Bot Real-Time):**
  - Langkah: Set `expires_at` tenant di masa lalu melalui Master Admin. Buka Dashboard Tenant.
  - Hasil: Koneksi WhatsApp bot terputus otomatis dalam 10 detik tanpa menghapus file sesi (`creds.json` tetap utuh), dan muncul `ExpiredAccountModal` yang terkunci (tidak bisa ditutup dengan klik luar atau Escape).
* **Skenario 14.2 (Redeem Token Langsung dari Popup Expired):**
  - Langkah: Di dalam popup expired yang sedang mengunci layar, masukkan kode token perpanjangan yang valid, klik Konfirmasi Perpanjang.
  - Hasil: Token divalidasi, masa aktif bertambah, popup langsung tertutup otomatis, dan Dashboard Tenant kembali dapat diakses normal.
* **Skenario 14.3 (Tombol Hubungi Master Admin & Logout di Popup Expired):**
  - Langkah: Pada popup expired, klik tombol "Hubungi Master Admin" atau "Keluar / Logout Akun".
  - Hasil: Tombol menghubungi admin memuat nomor WhatsApp Master Admin secara acak berbobot, dan tombol logout mengeluarkan sesi tenant kembali ke halaman login.
