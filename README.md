# Wanzt Store WhatsApp Bot Engine & Management Dashboard

<p align="left">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
</p>

Sistem manajemen bot WhatsApp resmi untuk **wanztstore.web.id**, dirancang untuk menangani operasional pemesanan otomatis, display katalog interaktif, pengiriman kartu produk horizontal (carousel), hingga koneksi soket real-time menggunakan pairing code custom alfanumerik.

---

## 📊 GitHub Stats:

<div align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=Dzakwan778&show_icons=true&theme=dark&rank_icon=circle" alt="Wan Ma2 GitHub Stats" />
  <br />
  <img src="https://github-readme-streak-stats.herokuapp.com/?user=Dzakwan778&theme=dark" alt="GitHub Streak" />
  <br />
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=Dzakwan778&layout=compact&theme=dark" alt="Most Used Languages" />
</div>

<details>
<summary><b>Lihat Ringkasan Statistik Text</b></summary>

### 📈 Wan Ma2's GitHub Stats
- **Total Stars Earned**: 0
- **Total Commits**: 71
- **Total PRs**: 1
- **Total Issues**: 7
- **Contributed to (last year)**: 0
- **Grade**: `C`

### 🔥 Contributions & Streak
- **Total Contributions**: 116 *(Nov 24, 2021 - Present)*
- **Current Streak**: 3 *(Oct 11 - Oct 13)*
- **Longest Streak**: 6 *(Jun 12 - Jun 17)*

### 💻 Most Used Languages
- 🟡 **JavaScript**: 70.35%
- 🔵 **TypeScript**: 28.99%
- 🟣 **CSS**: 0.29%
- ⚫ **Hack**: 0.26%
- 🔴 **HTML**: 0.09%
- 🔷 **PHP**: 0.01%

</details>

---

## 🏬 Tentang Wanzt Store

**Wanzt Store** adalah pusat kebutuhan digital satu pintu (*one-stop digital store*) yang melayani pelanggan selama **24 jam nonstop** setiap harinya dengan kecepatan transaksi otomatis dan layanan pelanggan responsif.

### 🛍️ Produk & Layanan
- **Top Up Game**: Mobile Legends, Free Fire, PUBG Mobile, Valorant, Genshin Impact, dan game populer lainnya.
- **APK Premium**: Akun & langganan streaming/produktivitas legal seperti Netflix, Spotify, YouTube Premium, Canva Pro, CapCut Pro, Disney+ Hotstar, Viu, dan lainnya.
- **SMM (Social Media Marketing)**: Layanan optimasi followers, like, view, dan interaksi media sosial untuk berbagai platform.
- **Nokos (Nomor Kosong)**: Layanan nomor virtual untuk verifikasi OTP berbagai aplikasi secara instan dan aman.
- **Pulsa & Paket Data**: Pengisian pulsa reguler, transfer pulsa, paket internet, dan masa aktif untuk semua operator seluler Indonesia.

### 🛒 Jalur Pemesanan
1. **Otomatis via Website**:  
   Melalui [https://wanztstore.web.id](https://wanztstore.web.id). Pelanggan dapat masuk atau mendaftarkan akun untuk melihat riwayat order, status transaksi, dan katalog lengkap.
2. **Otomatis via Telegram Bot**:  
   Melalui bot [@WanztStore_bot](https://t.me/WanztStore_bot). Solusi praktis dan cepat bagi pelanggan yang menginginkan checkout instan tanpa perlu repot login di browser.
3. **Manual via WhatsApp**:  
   Melalui interaksi chat dengan bot ini atau menghubungi WhatsApp admin langsung di [+6285712439395](https://wa.me/6285712439395).

### 💳 Metode Pembayaran
- **QRIS (Instan & Otomatis)**: Mendukung seluruh e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja) serta mobile banking perbankan nasional.
- **Saldo Akun**: Fitur deposit saldo akun website untuk mempercepat proses checkout banyak produk sekaligus tanpa biaya admin berulang.

### 🛡️ Kebijakan Pengembalian & Garansi
Wanzt Store menyediakan sistem klaim otomatis untuk refund maupun klaim garansi produk digital. Jika ditemukan kendala pada pesanan, pelanggan dapat langsung mengajukan tiket klaim dari website yang secara otomatis diteruskan ke tim admin. Proses verifikasi manual oleh admin dilakukan maksimal dalam **3 hari kerja**.

### 📞 Dukungan Pelanggan (Customer Support)
- **WhatsApp Support**: [+62 838-6127-6608](https://wa.me/6283861276608)
- **Email**: [support@wanztstore.web.id](mailto:support@wanztstore.web.id)
- **Jam Operasional**: 24 Jam Nonstop

---

## ⚡ Fitur Utama Bot & Dashboard

- **Custom Pairing Code (8 Karakter)**: Penautan bot langsung ke nomor WhatsApp menggunakan kode alfanumerik kustom 8 karakter pilihan Anda tanpa perlu scan QR.
- **Auto Reconnect Handshake**: Menangani siklus status `restartRequired (515)` WhatsApp secara otomatis saat verifikasi kode di smartphone selesai.
- **Pesan Interaktif Native Flow & Non-Tombol Fleksibel**: Menu utama dapat berjalan dengan atau tanpa tombol:
  - Jika tidak ada tombol yang ditambahkan (0 tombol): bot merespon murni dengan gambar header + caption (atau teks pesan murni) tanpa tombol quick reply dan tanpa menyertakan teks footer (footer ditiadakan karena hanya relevan untuk pesan interaktif bertombol).
  - Jika tombol ditambahkan: bot menyertakan footer dan mendukung beragam tipe tombol WhatsApp native flow:
    - `quick_reply` (Balas cepat dengan dukungan Aksi Pemicu Command dropdown: `List`, `Owner` [vCard owner], `Admin` [vCard admin], `Menu`, atau `Unknown`)
    - `cta_url` (Membuka link website toko)
    - `cta_call` / `vcard` (Pengiriman kartu kontak vCard Owner/Admin resmi)
    - `cta_copy` (Salin nomor rekening/kode promo)
    - `cta_reminder` / `cta_cancel_reminder` (Pengingat interaktif WhatsApp)
- **Single-Select Dropdown List**: Menampilkan daftar kategori produk yang rapi dengan generator penomoran otomatis melalui tag `{daftarProduk}`.
- **Horizontal Carousel Cards**: Menampilkan kartu varian produk interaktif lengkap dengan media thumbnail, rincian paket, harga, stok, tombol order instan, dan kartu kontak admin vCard.
- **LID Auto-Resolving**: Otomatis mendeteksi dan mengonversi identitas pengguna WhatsApp berbasis `@lid` ke format nomor telepon resmi `@s.whatsapp.net` agar seluruh pesan interaktif dan carousel selalu terkirim dan dirender sempurna.
- **Prefix Multi-Symbol & Smart Exception**: Mendukung awalan perintah fleksibel (`/`, `.`, `!`, `?`, `#`, `$`, `%`, `&`), dengan pengecualian otomatis untuk respon tombol klik pengguna.
- **Reply / Quoting Otomatis**: Setiap respon bot (Menu, List dropdown, Carousel kartu, Kontak Admin, Order) otomatis mengutip (*quote reply*) pesan pemicu sehingga saat digunakan di grup WhatsApp, seluruh anggota grup langsung mengetahui kepada siapa bot merespon.
- **Payment Gateway SairiPedia (QRIS Dinamis Otomatis)**: Integrasi payment gateway otomatis menggunakan SairiPedia API (`api.sairibot.my.id`). Mendukung seluruh e-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja) dan Mobile Banking (BCA, Mandiri, BRI, BNI, dll.) dengan penerbitan QRIS instan dan pengecekan lunas otomatis (*auto-polling status*).
- **Alur Transaksi Privacy-First (Grup ke DM)**: Menjaga kerahasiaan kredensial produk digital pembeli secara ketat:
  1. Pembeli memilih varian produk di grup via carousel kartu dan menekan tombol *Order*.
  2. Bot memeriksa saldo akun utama supplier Xaviera terlebih dahulu.
  3. Bot membuat invoice QRIS dinamis via Sairi API.
  4. Di grup, bot membalas singkat memberi tahu bahwa invoice dikirimkan ke DM.
  5. Bot mengirimkan gambar QRIS dinamis dan detail tagihan langsung ke **chat pribadi (DM) pembeli**.
  6. Saat pembayaran lunas terverifikasi, bot mengirimkan detail akun (email, password APK premium) **langsung ke chat pribadi pembeli** sehingga data sensitif tidak pernah bocor ke grup.
- **Dual Balance Monitoring Header**: Komponen `StoreProfileHeader` menyajikan pemantauan saldo ganda secara real-time: **Saldo Anda (Xaviera Store)** untuk stok supplier/layanan produk dan **Saldo Payment Gateway (SairiPedia QRIS)** untuk pemasukan transaksi pembeli, lengkap dengan tombol refresh mandiri dan navigasi instan ke Tab Connection jika API Key belum diatur.
- **Arsitektur Modular Terpisah**: Kode backend tidak lagi menumpuk dalam 1 file raksasa, melainkan dipecah ke dalam modul-modul independen (types, config, services, messages, handlers, controller) agar proses maintenance dan penambahan fitur mudah dan cepat.
- **Minimalist Control Dashboard**: Panel admin berbasis web berkecepatan tinggi dengan metrik status live, log socket stream, manajemen tombol dinamis, katalog produk, dan pengaturan API (Xaviera & Sairi).

---

## 📁 Struktur Direktori & Arsitektur Modular

Untuk mempermudah pemeliharaan (*maintenance*) dan mencegah penumpukan ribuan baris kode, seluruh komponen backend dipecah menjadi modul-modul terpisah dengan tanggung jawab tunggal (*Single Responsibility Principle*):

```text
├── server/
│   ├── types/
│   │   └── bot.types.ts           # Definisi tipe TypeScript, interface data, konstanta prefix & status
│   ├── config/
│   │   └── configManager.ts       # Logika pembacaan & penyimpanan berkas konfigurasi database
│   ├── services/
│   │   ├── quoteHelper.ts         # Pembangun contextInfo untuk reply / quote pesan pemicu di grup & private
│   │   ├── xavieraService.ts      # Integrasi API Xaviera Store, katalog produk, dan mapper varian
│   │   ├── sairiService.ts        # Integrasi API SairiPedia, pembuatan QRIS, cek status, dan auto-polling
│   │   ├── groupService.ts        # Layanan whitelist grup WhatsApp
│   │   └── placeholderHelper.ts   # Resolver placeholder variabel teks dinamis ({storeName}, dll.)
│   ├── messages/
│   │   ├── menuMessage.ts         # Builder pesan Menu interaktif (tombol quick_reply, URL, Call, Copy, Media)
│   │   ├── listMessage.ts         # Builder pesan List interaktif (single-select dropdown kategori)
│   │   ├── carouselMessage.ts     # Builder pesan Carousel kartu horizontal varian (@itsliaaa/baileys)
│   │   └── adminContactMessage.ts # Builder pesan kontak tunggal vCard Owner & Admin Wanzt Store
│   ├── handlers/
│   │   └── messageDispatcher.ts   # Pengurai pesan masuk, routing order QRIS, tombol, dan command
│   └── botManager.ts              # Core controller / fasad soket (koneksi, auth, auto-reconnect, log)
├── src/
│   ├── components/tabs/
│   │   ├── TabProduk.tsx          # Tampilan katalog produk premium presisi tabel (nama, varian —— -, stok, harga asli, harga jual)
│   │   └── TabConnection.tsx      # Form konfigurasi API Xaviera Store & Sairi Payment Gateway (QRIS)
│   ├── App.tsx                    # Dashboard antarmuka web admin (React + Tailwind CSS)
│   ├── main.tsx                   # Entry point aplikasi frontend
│   └── media/

│       └── picture/               # Direktori asset gambar thumbnail & menu
├── commands_config.json           # Konfigurasi pesan, tombol, dan asset media
├── vite.config.ts                 # Konfigurasi bundler Vite & API middleware server
├── package.json                   # Dependensi runtime & library engine
└── tsconfig.json                  # Konfigurasi TypeScript
```

### 🧩 Penjelasan Setiap Modul di `server/`:

1. **`server/types/bot.types.ts`**
   - Berisi semua deklarasi `interface` (`CommandsConfig`, `WhatsAppButton`, `ProductVariantItem`, `LogEntry`) dan `type` (`BotStatus`, `WhatsAppButtonType`).
   - Menyimpan konstanta global seperti `ALLOWED_PREFIXES` (`/`, `.`, `!`, `?`, `#`, `$`, `%`, `&`), `DEFAULT_CUSTOM_CODE` (string kosong), dan nama direktori sesi.

2. **`server/config/configManager.ts`**
   - Menangani pembacaan dan penulisan konfigurasi bot ke `commands_config.json`.
   - Menggabungkan konfigurasi default (`DEFAULT_CONFIG`) jika berkas konfigurasi belum ada atau rusak.

3. **`server/services/quoteHelper.ts`**
   - Menyusun objek `contextInfo` resmi WhatsApp untuk *quoted message / reply*.
   - Mengambil identitas pemicu dari `m.key.participant` (pada grup) atau `m.key.remoteJid` (pada chat pribadi) serta menambahkan `mentionedJid` agar pengguna pemicu di dalam grup mendapatkan notifikasi langsung.

4. **`server/services/xavieraService.ts`**
   - Mengelola pengambilan data produk dan varian dari API Xaviera Store.
   - Menyediakan katalog cadangan (*fallback catalog*) jika API sedang offline.
   - Mengonversi teks `{daftarProduk}` menjadi daftar kategori berpenomoran rapi.

5. **`server/messages/menuMessage.ts`**
   - Khusus memproses dan mengirimkan pesan `.menu`.
   - Mendukung pengiriman pesan murni (gambar + teks atau teks saja) tanpa tombol jika daftar tombol kosong (0 tombol).
   - Memetakan berbagai tipe tombol native flow (`quick_reply`, `cta_url`, `cta_call`, `cta_copy`) jika tombol dikonfigurasi.
   - Melampirkan media gambar header jika fitur media diaktifkan.

6. **`server/messages/listMessage.ts`**
   - Khusus menangani pengiriman menu kategori produk dengan format interaktif *single-select dropdown list*.

7. **`server/messages/carouselMessage.ts`**
   - Mengombinasikan `@itsliaaa/baileys` (untuk menyusun kartu-kartu varian secara horizontal) dengan relay node `<biz>` native flow `ourin-baileys`.
   - Menghasilkan thumbnail SVG jika produk belum memiliki gambar spesifik.

8. **`server/messages/adminContactMessage.ts`**
   - Mengirimkan kontak vCard resmi Owner toko (`sendOwnerContactMessage`) berdasarkan data nama dan nomor di tab Store Info.
   - Mengirimkan kontak vCard resmi Admin toko (`sendAdminContactMessage`). Dilengkapi validasi form opsional: jika nomor admin belum diisi di Store Info, bot secara otomatis membalas dengan pesan informatif `"Informasi tentang admin belum di set pada toko ini"`.

9. **`server/handlers/messageDispatcher.ts`**
   - Titik masuk penanganan event `messages.upsert`.
   - Mendeteksi respon klik tombol interaktif, respon dropdown list, maupun ketikan teks biasa.
   - Menerapkan aturan prefix ketat untuk pesan teks manual dan pengecualian otomatis untuk respon tombol.
   - Meneruskan setiap perintah ke modul pesan yang bersangkutan dengan menyertakan pesan asli `m` untuk dikutip (*quoted*).

10. **`server/botManager.ts`**
    - Berfungsi sebagai orkestrator utama (*facade controller*).
    - Bertanggung jawab atas siklus hidup soket (`start`, `stop`, `reset`), manajemen sesi kredensial (`session_ourin`), auto-reconnect saat status 515 (`restartRequired`), dan streaming log.

---

## 🚀 Panduan Menjalankan

### 1. Prasyarat
- **Node.js** v20.x atau lebih baru
- **NPM** atau **Bun** package manager

### 2. Instalasi Dependensi
Jalankan perintah berikut di root folder project:

```bash
npm install
```

### 3. Menjalankan Mode Development
Jalankan server aplikasi:

```bash
npm run dev
```

Buka browser dan akses dashboard di:
`http://localhost:3000`

---

## 📲 Cara Menautkan Bot ke WhatsApp

1. Buka dashboard di browser (`http://localhost:3000`).
2. Pada panel **WhatsApp Connection**, masukkan nomor WhatsApp target Anda (contoh: `81234567890`).
3. Masukkan **8 karakter alfanumerik** custom pairing code (hanya huruf & angka tanpa simbol/spasi).
   - Kolom ini defaultnya kosong dan wajib diisi.
   - Tombol **[Minta Kode Pairing]** akan berwarna abu-abu dan dinonaktifkan sampai Anda menginput tepat 8 karakter valid.
4. Klik tombol **[Minta Kode Pairing]** (berubah menjadi biru saat valid).
5. Buka aplikasi WhatsApp di HP Anda:
   - Masuk ke menu **Titik Tiga** (Android) atau **Pengaturan** (iOS).
   - Pilih **Perangkat Tertaut** > **Tautkan Perangkat**.
   - Pilih opsi teks: *"Tautkan dengan nomor telepon saja"*.
   - Masukkan 8 karakter kode pairing yang tertera pada dashboard.
6. Bot akan otomatis terverifikasi dan status dashboard berubah menjadi **CONNECTED**.

---

## 🧠 Struktur Dokumentasi & Manajemen Pengetahuan (`brain/`)

Proyek ini menerapkan protokol pencatatan ketat berbasis 4 pilar di dalam folder `/brain/`:

1. **`brain/idea.md`**  
   Mencatat segala pengetahuan baru, hasil riset, referensi arsitektur, dan spesifikasi API eksternal (contoh: dokumentasi lengkap SairiPedia API QRIS Payment Gateway).
2. **`brain/progress.md`**  
   Mencatat seluruh riwayat perubahan, fitur yang telah diimplementasikan, dan changelog rilis.
3. **`brain/langkah_implementasi.md`**  
   Mencatat rencana teknis yang **akan dilakukan (belum dieksekusi)**, menjelaskan secara mendalam apa yang akan dilakukan dan bagaimana cara mengimplementasikannya secara rinci sebelum menyentuh kode.
4. **`brain/schedule.md`**  
   Mencatat perancangan, roadmap pengembangan, target milestone, dan log jadwal perencanaan.
5. **`README.md`**  
   Dokumentasi publik yang selalu disesuaikan dan diperbarui pada setiap perubahan sistem.


---

## 🛠️ Perintah (Commands) Bot

Bot mendukung berbagai pilihan awalan (*prefix*) fleksibel: `/`, `.`, `!`, `?`, `#`, `$`, `%`, `&`.

| Perintah | Deskripsi |
|---|---|
| `/menu` / `.menu` | Menampilkan menu utama interaktif beserta media foto dan tombol pilihan cepat. |
| `/list` / `.list` | Mengirimkan daftar kategori produk dalam format dropdown single-select. |
| `/owner` / `.owner` | Mengirimkan kartu kontak WhatsApp (vCard v3.0) Owner Toko (data nama & nomor dari tab Store Info). |
| `/admin` / `.admin` | Mengirimkan kartu kontak WhatsApp (vCard v3.0) Admin Toko jika telah diatur di tab Store Info. Jika form admin kosong, bot otomatis membalas dengan teks: *"Informasi tentang admin belum di set pada toko ini"*. |
| `[Nama Produk]` | Membuka kartu carousel varian produk (misal: ketik `/netflix`, `.youtube`, atau pilih dari list). |
| `🛒 Order [Varian]` / `/order` | Menangani pesanan: Dalam mode uji coba privasi, jika dipicu di grup akan merespon `"testing respon in grup"` di grup dan mengirimkan `"testing respon in private chat"` langsung ke DM pemicu. |

---

## ⚙️ Konfigurasi Pesan & Tombol

Semua template respon, daftar tombol, dan gambar tersimpan di berkas `commands_config.json` dan dapat diubah secara langsung baik melalui dashboard maupun via file:

- **Placeholder `{daftarProduk}`**: Otomatis merangkum seluruh katalog produk ke dalam format list rapi dengan penomoran berurutan per kategori.
- **Asset Gambar**: Letakkan file gambar JPG/PNG ke dalam folder `src/media/picture/` untuk dijadikan header pada pesan menu bot.

---

## 🔒 Pemeliharaan & Reset Sesi

Jika ingin mengganti nomor WhatsApp atau membersihkan riwayat login:
1. Klik tombol **[Putuskan]** pada dashboard untuk menutup socket.
2. Klik tombol **[Reset Sesi]** untuk membersihkan direktori kredensial lama (`session_ourin/`).
3. Masukkan nomor baru dan minta kode pairing yang baru.

---

<div align="center">
  <sub>© 2026 Wanzt Store • Automated WhatsApp System</sub>
</div>
