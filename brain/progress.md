# Log Progres Perubahan (progress.md)

Dokumen ini mencatat seluruh riwayat perubahan dan pembaruan fitur yang telah selesai dilakukan pada proyek **WhatsApp Bot Store Manager & Dashboard (Wanzt Store)**.

---

## 📌 Status Terakhir Proyek
- **Status Build**: ✅ Compiled Cleanly
- **Dev Server**: Port 3000
- **Arsitektur**: React 19 + TypeScript + Vite + Tailwind CSS + Baileys Engine (`@itsliaaa/baileys`)

---

## 📋 Catatan Riwayat Perubahan (Changelog)

### [2026-10-24] - Perbaikan Tampilan & Data Tab Produk Sesuai Tangkapan Layar Asli
- **Restrukturisasi Desain Tabel `TabProduk.tsx`**:
  - Mengubah tampilan tabel agar 100% presisi dan identik dengan tangkapan layar pengguna (`Screenshot_20261025-062602_f4b60c00.png`).
  - Menghapus container card abu-abu tebal (`border rounded-xl shadow-2xs`) dan footer kartu, beralih ke layout tabel minimalis yang bersih.
  - Header tabel (`thead`) transparan tanpa background banner `bg-slate-50`.
  - Icon produk (kubus isometrik `Box` warna sky blue) diletakkan langsung di samping nama produk tanpa kotak bingkai.
  - Varian produk anak (kedua dan seterusnya) menampilkan indikator `—— -` pada kolom NAMA dengan warna muted `text-slate-300`.
  - Badge stok:
    - Jika stok > 0: Pill lembut dengan titik hijau dan angka stok (`• 20`).
    - Jika stok === 0: Pill outlined merah dengan angka `0` (`text-rose-500 border-rose-300`).
  - Format harga:
    - Harga Asli: `Rp5.000` (tanpa spasi antara Rp dan angka).
    - Harga Jual (+10%): `Rp5.500 (500)` dengan angka margin dalam pill hijau lembut bersudut halus.
- **Unrolling Data Varian Produk (`useXavieraData.ts`)**:
  - Memperbaiki parsing response dari Xaviera `/api/xaviera/products`: membongkar array `item.variants` menjadi baris-baris varian dengan nama induk produk (`Duolingo`, `Capcut`, `Gemini Ai`, `Canva Premium`, `Spotify`, dsb.) dan varian masing-masing.
  - Meneruskan query parameter `?apikey=...` pada saat memanggil `/api/xaviera/products`.
- **Dukungan Proxy API di `vite.config.ts`**:
  - Mengizinkan `/api/xaviera/products` dan `/api/xaviera/profile` mengambil API key dari query parameter, header Authorization, konfigurasi bot, maupun default key resmi toko.
- **Database `database/api_config.json`**:
  - Memastikan API key Xaviera aktif tersimpan sehingga data produk langsung tersinkronisasi saat aplikasi dibuka.

### [2026-10-24] - Penambahan Saldo Payment Gateway (Sairi) pada StoreProfileHeader
- **Komponen `StoreProfileHeader.tsx`**:
  - Menambahkan kotak metrik **"Saldo Payment Gateway"** tepat di bawah kotak "Saldo Anda" (Xaviera).
  - Menampilkan nominal saldo Sairi secara real-time (`Rp {balance.toLocaleString('id-ID')}`).
  - Dilengkapi ikon `QrCode` warna emerald dan badge label `Sairi`.
  - Dilengkapi tombol sinkronisasi refresh mandiri (`RefreshCw`) dengan animasi putar saat sedang memuat.
  - Jika API Key Sairi belum diisi, menampilkan tautan teks clickable *"Belum Diatur"* yang langsung mengarahkan pengguna ke Tab Connection.
  - Jika ada kesalahan API Key, menampilkan teks clickable *"Cek API Sairi"* yang juga mengarahkan ke Tab Connection.
- **Custom Hook `src/hooks/useSairiData.ts`**:
  - Mengelola pemanggilan API `/api/sairi/balance` dengan query `apikey` dan `baseurl`.
  - Mengotomatiskan sinkronisasi saldo setiap kali `sairiApiKey` atau `sairiBaseUrl` diubah dan disimpan.
- **Integrasi di `App.tsx`**:
  - Mengikat `useSairiData` dengan konfigurasi toko dan menyalurkannya ke `<StoreProfileHeader />`.

### [2026-10-24] - Integrasi Payment Gateway SairiPedia (QRIS Dinamis & Privacy-First Transaction Flow)
- **Form Konfigurasi API Sairi di Tab Connection (`TabConnection.tsx`)**:
  - Menambahkan seksi form konfigurasi **Sairi Payment Gateway API** berdampingan langsung dengan Xaviera Store API.
  - Fitur form:
    1. **Input API Key SairiPedia**: Dilengkapi eye toggle (show/hide), icon gembok/key emerald, dan link helper ke menu profil `https://api.sairibot.my.id`.
    2. **Input Base URL Sairi**: Default `https://api.sairibot.my.id` dengan tombol "Reset ke Default".
    3. **Tombol "Cek Saldo Sairi"**: Menguji kredensial API Key secara langsung ke endpoint `GET /api/balance` dengan respon real-time dan badge saldo merchant.
    4. **Kartu Ringkasan Fitur**: Keterangan QRIS All Payment (GoPay, OVO, DANA, ShopeePay, seluruh bank), Auto-Polling Status, dan Privacy-First Dispatch.
- **Service Client SairiPedia (`server/services/sairiService.ts`)**:
  - Implementasi fungsi `getSairiBalance`: Mengambil saldo merchant via HTTP GET query.
  - Implementasi fungsi `createSairiInvoice`: Membuat invoice QRIS dinamis unik berdasarkan nominal produk.
  - Implementasi fungsi `checkSairiInvoiceStatus`: Mengecek status transaksi (`unpaid`, `paid`, `expired`).
  - Implementasi `startInvoicePolling` & `stopInvoicePolling`: Poller berkala (tiap 4 detik) dengan auto-stop saat status menjadi `paid` atau `expired`.
- **Alur Transaksi Pembelian WhatsApp Privacy-First (`messageDispatcher.ts` & `carouselMessage.ts`)**:
  - Tombol Order pada kartu carousel kini membawa metadata produk, varian, dan harga (`order_var:product|variant|price`).
  - Saat tombol Order ditekan di grup:
    1. **Pre-check Saldo Utama Xaviera**: Bot memeriksa apakah saldo supplier mencukupi via `checkXavieraBalance`. Jika kurang, bot memberi tahu pembeli secara sopan bahwa stok sedang direstock.
    2. **Penerbitan Invoice QRIS Sairi**: Bot memanggil `createSairiInvoice` untuk mendapatkan gambar QRIS dan detail tagihan.
    3. **Respon di Grup**: Bot mengirimkan konfirmasi ringkas dengan quote reply: *"Invoice QRIS sebesar Rp {total} telah kami kirimkan ke chat pribadi (DM) Anda. Kerahasiaan akun Anda terjamin aman!"*
    4. **Pengiriman Invoice ke DM Pembeli**: Bot mengirimkan gambar QRIS dinamis beserta rincian lengkap (ID invoice, nominal, fee admin, total bayar, expired time, dan cara transfer) langsung ke chat pribadi pembeli.
    5. **Auto-Polling & Pengiriman Akun Rahasia**: Ketika pembayaran diverifikasi lunas (`paid`), bot mengirimkan kredensial rahasia (email & password akun premium) langsung ke DM pembeli, serta notifikasi pesanan lunas ke nomor Owner toko.
- **Pembaruan Backend & Database**:
  - Menambahkan endpoint `/api/sairi/balance` di Vite middleware.
  - Memperbarui `commands_config.json`, `database/api_config.json`, dan `configManager.ts` untuk persistensi `sairiApiKey` dan `sairiBaseUrl`.
  - Sinkronisasi state pada `useStoreConfig.ts` dan `TabContentRenderer.tsx`.

### [2026-10-24] - Penambahan Opsi Command Owner & Admin pada Dropdown Aksi Pemicu Quick Reply
- **Dukungan Dropdown Aksi Pemicu Command (Quick Reply)**:
  - Pada modal `AddEditButtonModal`, dropdown **Aksi Pemicu Command (Dropdown)** kini telah menyertakan pilihan:
    1. `Command: List` (Memicu pesan Command List)
    2. `Command: Owner` (Memicu Kontak Owner vCard)
    3. `Command: Admin` (Memicu Kontak Admin vCard)
    4. `Command: Menu` (Memicu pesan Command Menu)
    5. `Unknown` (Tidak memicu command apapun)
  - Penambahan auto-fill cerdas: Saat pengguna memilih opsi `owner` atau `admin`, input teks output secara otomatis mengisi default `.owner` atau `.admin`.
  - Penambahan teks petunjuk interaktif di bawah dropdown untuk memperjelas respon otomatis yang akan dilakukan bot.
  - Penyesuaian placeholder input pesan balasan sesuai dengan command yang dipilih.
- **Pembaruan Tipe Data & State Management**:
  - Mendefinisikan tipe `QuickReplyTriggerAction` ('list' | 'menu' | 'owner' | 'admin' | 'unknown') di `src/types/dashboard.types.ts` dan `server/types/bot.types.ts`.
  - Memperbarui hook `useButtonModal.ts` untuk menangani nilai aksi pemicu baru saat pembuatan, pengeditan, dan penyimpanan tombol.
- **Pembaruan Badge Tombol di Tab Command**:
  - Menampilkan badge visual berwarna untuk status pemicu tombol (`👑 Command: Owner` [kuning/amber], `📞 Command: Admin` [hijau/emerald], `⚡ Command: List` [biru/sky], `📋 Command: Menu` [ungu/purple], `⚪ Unknown` [abu-abu/slate]).
- **Integrasi Eksekusi Tombol di Server Baileys**:
  - Pada `server/handlers/messageDispatcher.ts`, tombol dengan `triggerAction === 'owner'` langsung mengeksekusi `sendOwnerContactMessage()`.
  - Tombol dengan `triggerAction === 'admin'` langsung mengeksekusi `sendAdminContactMessage()`.

### [2026-10-24] - Penambahan Command /owner dan /admin (vCard & Validasi Form Opsional)
- **Implementasi Command /owner**:
  - Menambahkan dukungan command `/owner` (beserta prefix `.owner`, `!owner`, dll.).
  - Mengambil data nama owner (`ownerName`) dan nomor telepon owner (`ownerNumber`) langsung dari tab **Store Info** (`config.storeInfo`).
  - Mengirimkan kartu kontak WhatsApp (vCard v3.0) berisi nama owner, nama toko (`storeName`), dan link kontak WhatsApp resmi dengan *quote reply*.
- **Implementasi Command /admin (Form Opsional)**:
  - Menambahkan dukungan command `/admin` (beserta alias `.admin`, `!admin`, `.contact`, dll.).
  - Melakukan validasi apakah form kontak admin di tab **Store Info** telah diisi (`adminNumber`).
  - **Jika Form Kosong / Belum Di-set**:
    - Bot membalas dengan pesan teks: `"Informasi tentang admin belum di set pada toko ini"` (dengan quote reply).
    - Mencatat log info pada dashboard bahwa data admin belum dikonfigurasi.
  - **Jika Form Terisi**:
    - Mengirimkan kartu kontak WhatsApp (vCard v3.0) berisi nama admin (`adminName`) dan nomor admin (`adminNumber`).
- **Penyempurnaan Integrasi Tombol & Message Dispatcher**:
  - Mengupdate `server/handlers/messageDispatcher.ts` untuk memisahkan logika command teks manual dan tombol quick reply untuk `owner` dan `admin`.
  - Memperbaiki argumen pemanggilan fungsi `sendAdminContactMessage` pada event klik tombol interaktif kartu carousel agar `config` selalu dipass secara tepat.

### [2026-10-24] - Penyesuaian Command Menu: Peniadaan Footer Saat Tombol Interaktif Kosong
- **Peniadaan Footer pada Mode Non-Tombol (0 Button)**:
  - Pada WhatsApp, footer adalah komponen estetika yang melekat pada pesan interaktif (tombol/native flow).
  - Ketika pengguna mengosongkan tombol di konfigurasi Command Menu (`nativeFlowButtons.length === 0`), bot kini **tidak menyertakan teks footer sama sekali**.
  - Pesan yang dikirim murni berupa teks judul (`titleText`), baik sebagai caption gambar maupun pesan teks mandiri, tanpa teks footer di bawahnya (`\n\n_${footerText}_` dihilangkan).
  - Jika ada tombol interaktif (`nativeFlowButtons.length > 0`), footer tetap disertakan secara resmi melalui payload Baileys (`footer: footerText`).

### [2026-10-24] - Perbaikan Command Menu Saat Tombol Interaktif Kosong (0 Tombol)
- **Eliminasi Tombol Fallback Default**:
  - Menghapus fallback hardcoded `[{ text: '📑 List Produk', id: '.list' }]` di `server/messages/menuMessage.ts`.
  - Sebelumnya, jika pengguna mengosongkan tombol di dashboard (0 tombol), bot secara otomatis menyisipkan tombol quick reply `📑 List Produk` karena aturan fallback native flow.
- **Dukungan Murni Media & Teks Tanpa Tombol**:
  - Ketika `nativeFlowButtons.length === 0`:
    - Jika media aktif dan gambar tersedia: bot mengirimkan pesan gambar murni (`{ image, caption }`) beserta kutipan contextInfo tanpa tombol.
    - Jika media nonaktif: bot mengirimkan pesan teks murni (`{ text }`) tanpa tombol.
  - Jika pengguna menambahkan 1 atau lebih tombol interaktif: bot tetap mengirimkan format native flow buttons interaktif WhatsApp.
  - Memperbaiki fallback error handling agar tetap menyertakan gambar jika tersedia saat terjadi kegagalan jaringan.

### [2026-10-23] - Uji Coba Respon Tombol Order Carousel (Grup & Private Chat)
- **Implementasi Uji Coba Pesan Terpisah**:
  - Menyesuaikan penanganan tombol `order_` dan command `.order` pada `server/handlers/messageDispatcher.ts`.
  - Ketika tombol Order pada kartu Carousel varian ditekan oleh anggota di dalam grup WhatsApp (`@g.us`):
    - Bot membalas di dalam grup dengan pesan: `"testing respon in grup"` (dengan *quote reply* ke pesan kartu/pemicu).
    - Bot mengirimkan pesan secara pribadi (DM) langsung ke nomor pemicu (`senderJid`): `"testing respon in private chat"`.
  - Ketika tombol Order ditekan di dalam private chat (DM):
    - Bot membalas langsung di chat pribadi dengan pesan: `"testing respon in private chat"`.
  - Melakukan sanitasi `senderJid` dari indeks device Baileys (menghilangkan suffix port `:1@` agar pengiriman DM valid).
  - Melacak ID pesan bot dengan `markMessageAsBotSent()` untuk mencegah loop pesan.

- **Dokumentasi SairiPedia API**: Selesai mempelajari, menguji endpoint backend, dan mencatat spesifikasi lengkap integrasi QRIS All Payment ke `brain/idea.md`.
- **Protokol File Tracking Baru**: Mengesahkan aturan alur kerja:
  - `brain/idea.md`: Mencatat segala hal baru/pengetahuan yang dipelajari.
  - `brain/progress.md`: Mencatat seluruh perubahan yang telah selesai dilakukan.
  - `brain/langkah_implementasi.md`: Mencatat apa yang akan dilakukan dan bagaimana cara mengimplementasikannya (sebelum dieksekusi).
  - `brain/schedule.md`: Mencatat perancangan, rencana fitur, roadmap, dan jadwal kerja.
  - `README.md`: Selalu disesuaikan dan diperbarui setiap kali terjadi perubahan.

### [2026-10-23] - Tombol Pairing Code Disabled & Visual Abu-abu
- **Tombol Nonaktif**: Tombol "Minta Kode Pairing" (`Minta Kode Pairing`) di `WhatsAppConnectionPanel.tsx` dinonaktifkan (`disabled={true}`) secara default saat kode pairing belum diisi.
- **Styling Tombol**: Tombol berwarna abu-abu (`bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed`) selama kode pairing kosong, kurang dari 8 karakter, atau mengandung simbol.
- **Aktivasi Tombol**: Tombol otomatis berubah aktif dan berwarna biru langit (`bg-sky-600 hover:bg-sky-700 text-white cursor-pointer`) tepat ketika input mencapai 8 karakter kombinasi alfanumerik valid.

### [2026-10-23] - Validasi Custom Pairing Code & Pesan Peringatan
- **Default Kosong**: Nilai bawaan custom pairing code diubah menjadi string kosong `''` di server (`botManager.ts`, `bot.types.ts`) dan form UI. Fallback `WANZTSTR` dibersihkan total.
- **Pesan Kolom Kosong**: Menampilkan peringatan amber: *"Form pairing code belum diisi! Silakan isi kolom kode pairing (8 karakter huruf/angka) untuk melakukan koneksi."*
- **Pesan Simbol Dilarang**: Menampilkan peringatan rose jika pengguna mengetik simbol/spasi: *"Custom pairing code tidak sesuai! Dilarang menggunakan simbol atau spasi (hanya angka dan huruf saja)."*
- **Pesan Panjang Karakter**: Menampilkan indikator real-time jika belum 8 karakter: *"Custom pairing code tidak sesuai! Wajib tepat 8 karakter (saat ini X karakter)."*
- **Pesan Valid**: Menampilkan indikator hijau ketika format valid dan siap request.

### [2026-10-23] - Modularisasi Arsitektur & Penciutan App.tsx
- **Ekstraksi Custom Hooks**: Logika state management dipisahkan dari `App.tsx` ke dalam 5 dedicated custom hooks:
  - `src/hooks/useBotConnection.ts`
  - `src/hooks/useXavieraData.ts`
  - `src/hooks/useWhatsAppGroups.ts`
  - `src/hooks/useStoreConfig.ts`
  - `src/hooks/useButtonModal.ts`
- **Pemisahan Tab Renderer**: Seluruh percabangan tab dipindahkan ke `src/components/tabs/TabContentRenderer.tsx`.
- **Hasil App.tsx**: Ukuran file berhasil diciutkan dari sebelumnya >4.300 baris menjadi hanya **~200 baris** sebagai root orchestrator yang bersih.

### [2026-10-23] - Pembersihan Teks Teknis & Profil Header
- Menghapus teks teknis mesin Baileys pada footer terminal.
- Menghapus teks catatan teknis penautan WhatsApp di bawah tombol pairing.
- Menghapus badge `@username` Xaviera di header dashboard.
- Mengganti teks brand menjadi "Dashboard Bot WhatsApp".
- Mengganti kotak teks "WS" menjadi ikon avatar `User`.
- Menghubungkan judul header `<h1>` dinamis dengan nama toko dari Store Info.
- Menerapkan sistem whitelist grup WhatsApp melalui tab "Grup".
