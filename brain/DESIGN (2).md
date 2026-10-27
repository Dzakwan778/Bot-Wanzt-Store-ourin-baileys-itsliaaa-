# DESIGN SPECIFICATION: Minimalist Admin Dashboard
**Target: wanztstore.web.id WhatsApp Bot Management System**
**Filosofi: Clean, High-Utility, Anti-AI Slop, Mobile-First Responsive**

---

## 🎯 PRINSIP DESAIN UTAMA (ANTI-AI SLOP)

Sebagian besar template dashboard modern buatan AI terlihat seragam ("AI Slop") dengan ciri khas: gradien ungu/pink berlebihan, efek neon *glow* buram, sudut terlalu melengkung (*pill button* berlebihan), dan spasi kosong yang tidak fungsional.

Dashboard ini dirancang dengan prinsip **Industrial Utility & Editorial Minimalism**:
1. **Fokus pada Data & Kecepatan**: Informasi penting (Status Bot, Saldo Xaviera, Live Transaksi) dapat dibaca dalam waktu kurang dari 2 detik.
2. **Palet Warna Netral & Elegan**: Menggunakan warna monokrom slate/zinc dengan satu warna aksen fungsional (*clean blue / emerald* untuk status sukses).
3. **Tipografi Tajam & Hirarki Jelas**: Menggunakan font sans-serif modern (Inter / Plus Jakarta Sans) dengan font monospace khusus untuk nominal harga, kode SKU, dan Serial Number.
4. **Sentuhan Mikro-Interaksi Halus**: Transisi klik cepat (150ms-200ms), *feedback* visual saat tombol ditekan atau teks disalin, tanpa animasi berlebihan yang memperlambat sistem.

---

## 🎨 PALET WARNA (COLOR SYSTEM)

### Mode Terang (Light Mode - Primary Default):
- **Background Utama (Canvas)**: `#F8FAFC` (Slate 50)
- **Permukaan Kartu / Surface**: `#FFFFFF` (Pure White)
- **Garis Batas (Borders & Dividers)**: `#E2E8F0` (Slate 200 - tipis 1px)
- **Teks Utama (Headings & Values)**: `#0F172A` (Slate 900 - kontras tinggi)
- **Teks Sekunder (Labels & Metadata)**: `#64748B` (Slate 500)
- **Warna Aksen / Brand (`wanztstore`)**: `#0284C7` (Sky 600) / `#0369A1` (Hover)
- **Indikator Sukses (Connected / Paid / Success)**: `#059669` (Emerald 600) & `#ECFDF5` (Emerald 50 BG)
- **Indikator Peringatan (Pending / QR Issued)**: `#D97706` (Amber 600) & `#FFFBEB` (Amber 50 BG)
- **Indikator Bahaya (Disconnected / Failed)**: `#DC2626` (Red 600) & `#FEF2F2` (Red 50 BG)

### Mode Gelap (Dark Mode - Opsional):
- **Background Utama**: `#0B0F19` (Deep Charcoal)
- **Permukaan Kartu**: `#111827` (Gray 900)
- **Garis Batas**: `#1F2937` (Gray 800)
- **Teks Utama**: `#F9FAFB`
- **Teks Sekunder**: `#9CA3AF`

---

## 📐 TIPOGRAFI & SISTEM SKALA

| Elemen | Ukuran Font | Ketebalan (Weight) | Karakteristik |
|---|---|---|---|
| **Page Title** | 20px / 1.25rem | 700 (Bold) | Tracking -0.02em |
| **Section Header** | 16px / 1.0rem | 600 (Semibold) | Tracking -0.01em |
| **Card Metric / Saldo** | 24px - 28px | 700 (Bold) | Font Monospace / Numeric Tabular |
| **Body Text** | 14px / 0.875rem | 400 (Regular) | Line-height 1.5 |
| **Table Data / Cells** | 13px / 0.8125rem | 500 (Medium) | Teks rapat & efisien |
| **Badges & Labels** | 11px - 12px | 600 (Semibold) | Huruf kapital halus / tracking +0.02em |
| **Code / SKU / SN** | 12px / 0.75rem | 500 (Mono) | Font: JetBrains Mono / SF Mono |

---

## 📱 STRUKTUR TATA LETAK & RESPONSIBILITAS

### 1. Tampilan Mobile (< 640px)
- **Header Atas Kompak**: Logo `wanztstore`, indikator status bot (titik hijau/merah berdenyut), dan tombol hamburger menu.
- **Kartu Metrik Geser / Stack**: Kartu saldo Xaviera dan status bot ditata vertikal rapat dengan padding 12px.
- **Transaksi Berbasis Kartu**: Pada layar ponsel, tabel transaksi otomatis berubah format menjadi *list card* per transaksi agar tidak perlu scroll horizontal berlebihan.
- **Target Sentuh Jempol**: Semua tombol aksi memiliki tinggi minimal 42px - 44px dengan radius 8px-10px untuk kemudahan navigasi jempol.

### 2. Tampilan Tablet (640px - 1024px)
- **Grid Adaptif 2 Kolom**:
  * Kolom kiri: Kontrol WhatsApp Bot & form custom pairing code.
  * Kolom kanan: Saldo Xaviera & statistik transaksi hari ini.
- **Tabel Transaksi**: Menampilkan 5 kolom esensial dengan tombol expand untuk melihat rincian SN / Kredensial.

### 3. Tampilan Desktop (> 1024px)
- **Sidebar Navigasi Ramping (240px)**:
  * Brand Logo: `wanztstore.web.id`
  * Navigasi: Dashboard, WhatsApp Bot, Transaksi Live, Katalog Produk Xaviera, Pengaturan Gateway.
- **Area Konten Utama (Fluid Workspace)**:
  * Top Bar: Jam sistem, shortcut sinkronisasi API, status server.
  * Grid Dashboard 3 Kartu Metrik di baris pertama.
  * Tabel Data Lengkap dengan filter status, kolom pencarian live, pagination, dan tombol unduh log.

---

## 🧩 KOMPONEN ANTARMUKA (UI COMPONENTS)

### 1. WhatsApp Connection Panel
- Tampilan kartu bersih dengan header: `WhatsApp Connection`.
- Badge status real-time:
  * `● CONNECTED` (Pill hijau lembut, border tipis hijau).
  * `○ DISCONNECTED` (Pill abu-abu/merah).
- **Form Custom Pairing**:
  * Input Nomor WhatsApp (dengan prefix bendera `+62`).
  * Input Custom Code (8 karakter huruf kapital monospaced, misal: `WANZT888`).
  * Tombol aksi primer: `[Minta Kode Pairing]`.
  * Display Box Kode Pairing: Ditampilkan besar di tengah dengan tombol `[Salin Kode]` 1-klik.

### 2. Saldo Xaviera Card
- Menampilkan logo resmi penyedia + Label `Saldo Xaviera Store`.
- Angka saldo berukuran besar (misal: `Rp 485.000`) dengan tombol reload kecil di sampingnya.
- Riwayat ringkas penggunaan saldo terakhir.

### 3. Live Transactions Table
- Header tabel minimalis warna abu-abu tipis tanpa garis tebal yang mengganggu mata.
- Status transaksi berupa badge warna terstandarisasi:
  * `PAID` (Hijau) | `PENDING` (Kuning) | `EXPIRED` (Abu-abu)
  * `SUCCESS` (Hijau) | `FAILED` (Merah)
- Kolom Kredensial / Serial Number: Menggunakan blok monospace yang bisa disalin (*copy-to-clipboard*) dengan sekali klik.

### 4. Modular Gateway Settings Panel
- Tampilan pemilihan provider bertipe tab / radio card:
  `[Paydisini]` | `[Tripay]` | `[Tokopay]` | `[Midtrans]`
- Input dinamis:
  * API Key / Merchant Code
  * Private Key / Secret Token
  * Endpoint Webhook Callback URL (dengan tombol salin otomatis untuk di-paste ke dashboard payment gateway).

---

## ✨ PANDUAN PENGALAMAN PENGGUNA (UX DETAILS)

1. **Zero Confusion**: Setiap form memiliki teks bantuan (*helper text*) singkat di bawah input.
2. **Toast Feedback**: Notifikasi muncul di pojok kanan bawah selama 3 detik saat data berhasil disimpan atau teks berhasil disalin.
3. **Empty States Bermakna**: Jika belum ada transaksi, tampilkan ilustrasi garis minimalis dengan teks *"Belum ada transaksi masuk hari ini"* tanpa ruang kosong yang canggung.
4. **Keamanan Visual**: Kunci API dan rahasia webhook disamarkan secara default (`••••••••••••`) dengan tombol intip (*eye icon*).
