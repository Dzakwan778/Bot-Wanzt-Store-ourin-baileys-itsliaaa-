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

- **Custom Pairing Code (8 Karakter)**: Penautan bot langsung ke nomor WhatsApp menggunakan kode alfanumerik kustom (default: `WANZTSTR` / `WANZT888`) tanpa perlu scan QR.
- **Auto Reconnect Handshake**: Menangani siklus status `restartRequired (515)` WhatsApp secara otomatis saat verifikasi kode di smartphone selesai.
- **Pesan Interaktif Native Flow**: Menu utama interaktif dengan dukungan beragam tipe tombol:
  - `quick_reply` (Balas cepat pemicu aksi)
  - `cta_url` (Membuka link website toko)
  - `cta_call` (Panggilan langsung ke Admin)
  - `cta_copy` (Salin nomor rekening/kode promo)
- **Single-Select Dropdown List**: Menampilkan daftar kategori produk yang rapi dengan generator penomoran otomatis melalui tag `{daftarProduk}`.
- **Horizontal Carousel Cards**: Menampilkan kartu varian produk interaktif lengkap dengan media thumbnail, rincian paket, harga, stok, tombol order instan, dan kartu kontak admin vCard.
- **LID Auto-Resolving**: Otomatis mendeteksi dan mengonversi identitas pengguna WhatsApp berbasis `@lid` ke format nomor telepon resmi `@s.whatsapp.net` agar seluruh pesan interaktif dan carousel selalu terkirim dan dirender sempurna.
- **Prefix Multi-Symbol & Smart Exception**: Mendukung awalan perintah fleksibel (`/`, `.`, `!`, `?`, `#`, `$`, `%`, `&`), dengan pengecualian otomatis untuk respon tombol klik pengguna.
- **Minimalist Control Dashboard**: Panel admin berbasis web berkecepatan tinggi dengan metrik status live, log socket stream, manajemen tombol dinamis, dan katalog produk.

---

## 📁 Struktur Direktori

```text
├── server/
│   └── botManager.ts         # Inti logika soket, session auth, & responder bot
├── src/
│   ├── App.tsx               # Dashboard antarmuka web admin
│   ├── main.tsx              # Entry point aplikasi frontend
│   └── media/
│       └── picture/          # Direktori asset gambar thumbnail & menu
├── commands_config.json      # Konfigurasi pesan, tombol, dan asset media
├── vite.config.ts            # Konfigurasi bundler & middleware API server internal
├── package.json              # Dependensi runtime dan library engine
└── tsconfig.json             # Konfigurasi TypeScript engine
```

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

1. Buka dashboard di browser.
2. Pada panel **WhatsApp Connection**, masukkan nomor WhatsApp target Anda (contoh: `85712439395`).
3. Tentukan 8 karakter alfanumerik custom pairing code (contoh: `WANZTSTR`).
4. Klik tombol **[Minta Kode Pairing]**.
5. Buka aplikasi WhatsApp di HP Anda:
   - Masuk ke menu **Titik Tiga** (Android) atau **Pengaturan** (iOS).
   - Pilih **Perangkat Tertaut** > **Tautkan Perangkat**.
   - Pilih opsi teks: *"Tautkan dengan nomor telepon saja"*.
   - Masukkan 8 karakter kode pairing yang tertera pada dashboard.
6. Bot akan otomatis terverifikasi dan status dashboard berubah menjadi **CONNECTED**.

---

## 🛠️ Perintah (Commands) Bot

| Perintah | Deskripsi |
|---|---|
| `.menu` | Menampilkan menu utama interaktif beserta media foto dan tombol pilihan cepat. |
| `.list` | Mengirimkan daftar kategori produk dalam format dropdown single-select. |
| `[Nama Produk]` | Membuka kartu carousel varian produk (misal: ketik `.youtube` atau pilih dari list). |
| `.admin` / `.contact` | Mengirimkan kartu kontak vCard resmi Admin Toko secara langsung. |
| `.order [varian]` | Merekam pesanan pelanggan dan mengarahkan langsung ke kontak pembayaran admin. |

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
