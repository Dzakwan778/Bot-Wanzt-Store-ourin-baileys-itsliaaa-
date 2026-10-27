# Dokumentasi & Spesifikasi Integrasi API Payment Gateway SairiBot (SairiPedia)

Dokumen ini berisi rangkuman komprehensif hasil analisis dan pengujian langsung dari dokumentasi API Payment Gateway **SairiPedia** yang dapat diakses melalui [https://api.sairibot.my.id/docs](https://api.sairibot.my.id/docs).

---

## 1. Ringkasan Platform & Layanan

- **Nama Layanan**: SairiPedia API Payment Gateway
- **Base URL**: `https://api.sairibot.my.id`
- **Tipe Integrasi**: Lightweight REST API (berbasis HTTP `GET` query-driven)
- **Metode Pembayaran Utama**: **QRIS Dinamis (All Payment)**
  - Mendukung seluruh e-Wallet: GoPay, OVO, DANA, ShopeePay, LinkAja, AstraPay, dll.
  - Mendukung Seluruh Mobile Banking: BCA Mobile, Livin' by Mandiri, BRImo, BNI Mobile, Seabank, Bank Jago, dll.
- **Karakteristik & Keunggulan**:
  - **Aktivasi Instant**: Merchant dapat langsung menerima pembayaran QRIS tanpa verifikasi rumit berhari-hari.
  - **Arsitektur Minimalis**: Terdiri dari 3 endpoint utama yang simpel tanpa payload kompleks.
  - **Real-Time Settlement**: Pembayaran pelanggan langsung masuk ke saldo akun merchant secara otomatis.
  - **Instant Withdrawal**: Penarikan saldo dapat diproses dengan cepat melalui dashboard.

---

## 2. Autentikasi & Keamanan

### 2.1. Memperoleh API Key
1. Kunjungi [https://api.sairibot.my.id](https://api.sairibot.my.id) dan buat akun (atau login).
2. Masuk ke menu **Profil**.
3. Salin **API Key** unik akun Anda.

### 2.2. Cara Mengirimkan API Key
Backend SairiPedia mendukung autentikasi melalui dua metode:

1. **Query Parameter (Standar Resmi Dokumentasi)**:
   ```
   ?apikey=YOUR_API_KEY
   ```
2. **HTTP Header (Terverifikasi dari Pengujian Backend)**:
   ```http
   x-api-key: YOUR_API_KEY
   ```

### 2.3. Respon Error Terkait Autentikasi
| HTTP Status | Respon JSON | Keterangan |
| :--- | :--- | :--- |
| `401 Unauthorized` | `{"error": "API key diperlukan"}` | Parameter atau header `apikey` tidak disertakan dalam request. |
| `401 Unauthorized` | `{"error": "API key tidak valid"}` | `apikey` yang dikirimkan salah, tidak terdaftar, atau tidak aktif. |

> **⚠️ PENTING (Security Best Practice)**:
> Jangan pernah memanggil API SairiPedia langsung dari kode sisi klien (Frontend React/Vue/Aplikasi Mobile) menggunakan API Key Anda, karena kunci rahasia dapat dibaca oleh publik melalui inspect element/network tab. Selalu gunakan server backend sebagai proxy (Express/Node.js, Laravel, Go, dll.) dan simpan API Key di file `.env`.

---

## 3. Spesifikasi Lengkap Endpoint API

### 3.1. Cek Saldo Akun (Balance)
Digunakan untuk memeriksa saldo akun merchant secara *real-time* yang siap ditarik (withdraw).

- **Method**: `GET`
- **Endpoint**: `/api/balance`
- **URL Lengkap**: `https://api.sairibot.my.id/api/balance`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/balance?apikey=YOUR_API_KEY
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "balance": 150000
}
```

---

### 3.2. Membuat Invoice Baru (Generate QRIS Dinamis)
Digunakan untuk membuat transaksi baru dan menghasilkan QRIS dinamis unik sesuai nominal yang ditentukan.

- **Method**: `GET`
- **Endpoint**: `/api/invoice`
- **URL Lengkap**: `https://api.sairibot.my.id/api/invoice`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |
| `amount` | `integer` | **Ya** | Nominal dasar pembayaran dalam Rupiah (contoh: `50000`) |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/invoice?apikey=YOUR_API_KEY&amount=50000
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "success": true,
  "invoice_id": "64c8d9e1a2b3c4d5e6f7a8b9",
  "amount": 50000,
  "fee": 500,
  "total": 50500,
  "qris_image": "https://api.sairibot.my.id/qris/...",
  "expired_at": "2025-01-01 12:00:00"
}
```

#### Struktur Kolom Respon
- `success` (`boolean`): Indikator status pembuatan invoice (`true` jika berhasil).
- `invoice_id` (`string`): ID unik transaksi yang digunakan untuk referensi pelacakan dan verifikasi status pembayaran.
- `amount` (`number`): Nominal transaksi awal yang diajukan oleh merchant/pengguna.
- `fee` (`number`): Biaya layanan transaksi / admin fee.
- `total` (`number`): Total nominal akhir yang wajib dibayar pelanggan saat memindai QRIS (`amount` + `fee`).
- `qris_image` (`string`): URL gambar QRIS dinamis yang siap ditampilkan di antarmuka pengguna (UI).
- `expired_at` (`string`): Batas waktu toleransi pembayaran QRIS (format: `YYYY-MM-DD HH:mm:ss`).

---

### 3.3. Cek Status Invoice (Verifikasi Pembayaran)
Setelah invoice dibuat dan pengguna memindai QRIS, endpoint ini dipanggil untuk mengecek apakah pembayaran telah berhasil diselesaikan oleh pembeli.

- **Method**: `GET`
- **Endpoint**: `/api/invoice/status`
- **URL Lengkap**: `https://api.sairibot.my.id/api/invoice/status`

#### Parameter Request
| Nama Parameter | Tipe Data | Wajib? | Penjelasan |
| :--- | :--- | :--- | :--- |
| `apikey` | `string` | **Ya** | API Key akun merchant Anda |
| `invoice_id` | `string` | **Ya** | ID invoice yang didapatkan saat pembuatan invoice |

#### Contoh Request
```http
GET https://api.sairibot.my.id/api/invoice/status?apikey=YOUR_API_KEY&invoice_id=64c8d9e1a2b3c4d5e6f7a8b9
```

#### Contoh Respon Berhasil (`200 OK`)
```json
{
  "invoice_id": "64c8d9e1a2b3c4d5e6f7a8b9",
  "amount": 50000,
  "fee": 500,
  "total": 50500,
  "status": "paid",
  "qris_image": "https://api.sairibot.my.id/qris/...",
  "expired_at": "2025-01-01 12:00:00",
  "created_at": "2025-01-01 11:30:00"
}
```

#### Nilai Status Transaksi (`status`)
| Status | Penjelasan |
| :--- | :--- |
| `unpaid` / `pending` | Pengguna belum melakukan transfer/scan atau pembayaran belum terkonfirmasi oleh sistem bank. |
| `paid` | Pembayaran telah lunas diterima. Saldo telah masuk ke akun merchant, proses pemenuhan pesanan dapat dijalankan. |
| `expired` | Waktu pembayaran telah melewati `expired_at` dan transaksi dibatalkan secara otomatis. |

---

## 4. Alur Kerja Integrasi Sistem (Lifecycle & Polling)

Karena API SairiPedia berfokus pada kesederhanaan (tidak mewajibkan webhook URL yang rumit), arsitektur integrasinya menggunakan alur **Long Polling / Periodic Interval Checking**:

```
[ Pelanggan / User ]         [ Backend Aplikasi Anda ]          [ API SairiPedia ]
        |                               |                              |
        | 1. Memilih Produk & Bayar     |                              |
        |------------------------------>|                              |
        |                               | 2. GET /api/invoice          |
        |                               |    ?apikey=KEY&amount=TOTAL  |
        |                               |----------------------------->|
        |                               | 3. Kembalikan Invoice Data   |
        |                               |<-----------------------------|
        | 4. Tampilkan Gambar QRIS      |                              |
        |<------------------------------|                              |
        |                               |                              |
        | 5. Pelanggan Scan & Bayar     |                              |
        |    (via e-wallet / m-banking) |                              |
        |                               | 6. Interval Polling (tiap 3-5 detik)
        |                               |    GET /api/invoice/status   |
        |                               |----------------------------->|
        |                               |<-----------------------------|
        |                               |    Response: "status": "unpaid"
        |                               |                              |
        |                               |    ... (Setelah bayar) ...   |
        |                               |    GET /api/invoice/status   |
        |                               |----------------------------->|
        |                               |<-----------------------------|
        |                               |    Response: "status": "paid"|
        |                               |                              |
        | 7. Notifikasi Pembayaran      | 8. Update DB (Order Success) |
        |    Berhasil (Lunas)           |    & Kirim Produk/Fitur      |
        |<------------------------------|------------------------------|
```

### Tips Pengaturan Polling:
1. **Interval**: Atur interval polling status antara **3 sampai 5 detik** agar tidak terjadi rate-limiting namun tetap responsif bagi pengguna.
2. **Auto-Stop saat Expired**: Bandingkan waktu sekarang dengan `expired_at`. Jika waktu telah lewat atau status bernilai `expired`, hentikan interval pengecekan dan infokan kepada pembeli bahwa transaksi telah kedaluwarsa.
3. **Auto-Stop saat Paid**: Segera hentikan polling saat status `paid` diterima untuk menghemat resource server.

---

## 5. Contoh Implementasi Kode (Production-Ready)

### 5.1. Implementasi Node.js / TypeScript (Service Class)

```typescript
// services/sairiPayment.ts

interface CreateInvoiceResponse {
  success: boolean;
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  qris_image: string;
  expired_at: string;
}

interface InvoiceStatusResponse {
  invoice_id: string;
  amount: number;
  fee: number;
  total: number;
  status: 'unpaid' | 'pending' | 'paid' | 'expired';
  qris_image: string;
  expired_at: string;
  created_at: string;
}

export class SairiPaymentService {
  private baseUrl = 'https://api.sairibot.my.id';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Cek saldo akun SairiPedia
   */
  async getBalance(): Promise<number> {
    const url = `${this.baseUrl}/api/balance?apikey=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.balance;
  }

  /**
   * Buat invoice QRIS dinamis baru
   */
  async createInvoice(amount: number): Promise<CreateInvoiceResponse> {
    if (amount <= 0) {
      throw new Error('Nominal amount harus lebih besar dari 0');
    }
    const url = `${this.baseUrl}/api/invoice?apikey=${encodeURIComponent(this.apiKey)}&amount=${amount}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Gagal membuat invoice: HTTP ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Cek status pembayaran transaksi
   */
  async checkInvoiceStatus(invoiceId: string): Promise<InvoiceStatusResponse> {
    const url = `${this.baseUrl}/api/invoice/status?apikey=${encodeURIComponent(this.apiKey)}&invoice_id=${encodeURIComponent(invoiceId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Gagal cek status: HTTP ${response.status}`);
    }
    return await response.json();
  }
}
```

---

### 5.2. Implementasi Python

```python
import requests

class SairiPayment:
    BASE_URL = "https://api.sairibot.my.id"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_balance(self):
        url = f"{self.BASE_URL}/api/balance"
        resp = requests.get(url, params={"apikey": self.api_key})
        resp.raise_for_status()
        return resp.json().get("balance", 0)

    def create_invoice(self, amount: int):
        url = f"{self.BASE_URL}/api/invoice"
        resp = requests.get(url, params={"apikey": self.api_key, "amount": amount})
        resp.raise_for_status()
        return resp.json()

    def check_status(self, invoice_id: str):
        url = f"{self.BASE_URL}/api/invoice/status"
        resp = requests.get(url, params={"apikey": self.api_key, "invoice_id": invoice_id})
        resp.raise_for_status()
        return resp.json()
```

---

### 5.3. Contoh Request cURL

```bash
# 1. Cek Saldo
curl -X GET "https://api.sairibot.my.id/api/balance?apikey=YOUR_API_KEY"

# 2. Buat Invoice QRIS
curl -X GET "https://api.sairibot.my.id/api/invoice?apikey=YOUR_API_KEY&amount=25000"

# 3. Cek Status Invoice
curl -X GET "https://api.sairibot.my.id/api/invoice/status?apikey=YOUR_API_KEY&invoice_id=INVOICE_ID"
```

---

## 6. Rangkuman & Rekomendasi Integrasi

1. **Format Request Seragam**: Semua interaksi API saat ini menggunakan protokol `HTTP GET` dengan query parameters.
2. **Kesesuaian Fitur**: Sangat cocok untuk:
   - Bot WhatsApp / Telegram transaksi otomatis.
   - Toko digital, top up voucher game, dan sistem deposit saldo member.
   - SaaS atau donasi instan.
3. **Penyimpanan Lokal**: Rekomendasikan menyimpan riwayat setiap transaksi ke database lokal dengan schema:
   - `order_id` (ID pesanan lokal)
   - `sairi_invoice_id` (ID invoice dari SairiPedia)
   - `user_id` / `phone_number`
   - `amount` (Nominal produk)
   - `fee` (Biaya admin)
   - `total` (Total tagihan QRIS)
   - `qris_image_url`
   - `status` (`pending`, `paid`, `expired`)
   - `created_at` & `expired_at`

---

# Dokumentasi & Spesifikasi Lengkap Integrasi LunasQRIS API (lunasqris.com)

Dokumen ini berisi rangkuman komprehensif hasil analisis mendalam dari dokumentasi resmi **LunasQRIS** ([https://lunasqris.com/docs](https://lunasqris.com/docs)).

---

## 1. Ringkasan Platform & Layanan
- **Nama Layanan**: LunasQRIS Payment Gateway
- **Base URL**: `https://lunasqris.com`
- **Tipe Integrasi**: Standar REST API (JSON Body & Header-based Authentication)
- **Basis Sistem**: Payment gateway QRIS berbasis DANA Bisnis dengan sistem deteksi mutasi otomatis dan kode unik transaksi.
- **Mata Uang**: Seluruh nilai nominal uang dalam Rupiah (`IDR`), bilangan bulat tanpa desimal (`integer`).

---

## 2. Autentikasi & Model Keamanan
LunasQRIS menggunakan model pemisahan kunci ganda (*Dual-Key Architecture*):

1. **API Key / Public Key (`pk_...`)**:
   - Disertakan pada **setiap request API** dari server aplikasi.
   - Header:
     ```http
     X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
     ```
     atau:
     ```http
     Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxx
     ```
   - Diperoleh dari Panel Toko LunasQRIS › Menu **API & Integrasi**.

2. **Secret Key (`sk_...`)**:
   - **HANYA** digunakan di sisi server untuk memvalidasi tanda tangan kriptografi (*HMAC-SHA256 signature*) pada Webhook/Callback.
   - ⚠️ **Dilarang keras**: Jangan pernah mengirim `sk_...` pada request API keluar atau mengeksposnya ke frontend klien.

---

## 3. Spesifikasi Lengkap Endpoint REST API

### 3.1. Buat Transaksi QRIS Dinamis (Create Transaction)
Digunakan saat pembeli melakukan checkout produk untuk menerbitkan tagihan QRIS dinamis unik.

- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/create`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json
  ```
- **Payload Request (JSON Body)**:
  | Field | Tipe | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `amount` | `integer` | **Ya** | Nominal dasar pembayaran dalam Rupiah. Kode unik ditambahkan otomatis oleh sistem toko. |
  | `order_id` | `string` | Tidak | ID pesanan unik di sistem toko (misal: `INV-20261026-001`). Pemanggilan ulang bersifat idempoten. |
  | `description` | `string` | Tidak | Deskripsi singkat pembelian (tampil pada web checkout). |
  | `customer_name` | `string` | Tidak | Nama pembeli. |
  | `customer_email` | `string` | Tidak | Email pembeli. |
  | `callback_url` | `string` | Tidak | Mengganti (*override*) URL webhook default toko untuk transaksi spesifik ini. |
  | `return_url` | `string` | Tidak | URL tujuan saat pembeli menekan tombol "Kembali ke Toko". |
  | `expired_minutes` | `integer` | Tidak | Batas waktu kedaluwarsa tagihan (rentang 1–1440 menit). Jika tidak diisi, mengikuti default panel toko. |
  | `metadata` | `object/string` | Tidak | Data kustom tambahan (maks 2KB) yang akan dikembalikan kembali pada callback. |

- **Contoh Request cURL**:
  ```bash
  curl -X POST https://lunasqris.com/api/v1/transaction/create \
    -H "X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 25000,
      "order_id": "INV-20261026-001",
      "description": "Beli Akun Netflix Premium 1 Bulan",
      "customer_name": "Wanzt",
      "expired_minutes": 15
    }'
  ```

- **Contoh Respon Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "trx_id": "TKO2610A1B2C3",
      "order_id": "INV-20261026-001",
      "amount": 25000,
      "unique_code": 117,
      "total_amount": 25117,
      "status": "pending",
      "qris_string": "00020101021226...6304AB12",
      "qr_url": "https://lunasqris.com/qr/TKO2610A1B2C3.svg",
      "payment_url": "https://lunasqris.com/pay/TKO2610A1B2C3",
      "expired_at": "2026-10-26T08:45:00.000Z"
    }
  }
  ```

- **Elemen Respon Penting**:
  - `total_amount`: Total nominal akhir yang **wajib dibayar tepat** oleh pembeli (`amount` + `unique_code`).
  - `qris_string`: String raw format EMVCo QRIS. Sangat fleksibel karena dapat diubah langsung menjadi gambar QR code di bot WhatsApp menggunakan generator buffer lokal, atau ditampilkan via SVG `qr_url`.
  - `qr_url`: URL langsung ke file SVG gambar QR code.
  - `payment_url`: Halaman web checkout instan responsif lengkap dengan hitung mundur (*countdown timer*) dan auto-check status.

---

### 3.2. Cek Status Transaksi (Check Transaction Status)
Digunakan untuk mengecek status transaksi terbaru secara on-demand / polling.

- **Method**: `GET`
- **Endpoint**:
  - Berdasarkan Order ID: `/api/v1/transaction/status?order_id={order_id}`
  - Berdasarkan ID Transaksi LunasQRIS: `/api/v1/transaction/{trx_id}`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  ```
- **Nilai Status (`status`)**:
  - `pending`: Menunggu pembayaran dari pembeli.
  - `paid`: Pembayaran lunas terverifikasi otomatis.
  - `expired`: Waktu pembayaran telah habis dan transaksi otomatis hangus.
  - `cancelled`: Transaksi dibatalkan secara manual.

---

### 3.3. Cek Saldo Toko (Check Merchant Balance)
Digunakan untuk memeriksa saldo penerimaan merchant di LunasQRIS.

- **Method**: `GET`
- **Endpoint**: `/api/v1/balance`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  ```
- **Contoh Respon Berhasil**:
  ```json
  {
    "success": true,
    "data": {
      "balance": 250000,
      "balance_hold": 15000
    }
  }
  ```

---

### 3.4. Batalkan Transaksi (Cancel Transaction)
Digunakan jika pembeli membatalkan pesanan atau ingin mengganti pilihan produk sebelum masa aktif habis.

- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/cancel`
- **Headers**:
  ```http
  X-API-Key: pk_xxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json
  ```
- **Payload Request**:
  ```json
  {
    "trx_id": "TKO2610A1B2C3"
    // atau "order_id": "INV-20261026-001"
  }
  ```

---

### 3.5. Daftar Riwayat Transaksi (List Transactions)
- **Method**: `GET`
- **Endpoint**: `/api/v1/transactions?page=1&limit=20&status=paid`
- **Query Params**: `page`, `limit`, `status`.

---

## 4. Mekanisme Webhook / Callback & Verifikasi Signature

Saat status transaksi berubah menjadi lunas (`paid`) atau kedaluwarsa (`expired`), server LunasQRIS akan mengirimkan HTTP `POST` ke Callback URL toko. Pengiriman akan diulang hingga 7 kali dengan jeda bertingkat (*exponential backoff*) sampai server merespons HTTP `200 OK`.

### 4.1. Header Webhook yang Dikirimkan:
- `X-Callback-Event`: `transaction.paid` atau `transaction.expired`
- `X-Callback-Timestamp`: UNIX timestamp detik (contoh: `1760500000`)
- `X-Callback-Signature`: Hasil enkripsi hash HMAC-SHA256

### 4.2. Payload Webhook:
```json
{
  "event": "transaction.paid",
  "data": {
    "trx_id": "TKO2610A1B2C3",
    "order_id": "INV-20261026-001",
    "status": "paid",
    "amount": 25000,
    "total_amount": 25117,
    "net_amount": 24941,
    "paid_at": "2026-10-26T08:35:12.000Z",
    "paid_via": "notif"
  }
}
```

### 4.3. Algoritma Verifikasi Signature (Node.js / Express):
```javascript
const crypto = require('crypto');

function verifyLunasQrisSignature(req, secretKey) {
  const timestamp = req.header('X-Callback-Timestamp');
  const signature = req.header('X-Callback-Signature');
  const rawBody = req.rawBody; // Wajib raw string body asli sebelum di-JSON.parse

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return signature === expectedSignature;
}
```

---

## 5. Analisis Perbandingan: SairiPedia vs LunasQRIS

| Parameter / Fitur | SairiPedia API | LunasQRIS API |
| :--- | :--- | :--- |
| **Metode Permintaan** | Berbasis `GET` query param (`?apikey=...&amount=...`) | Berbasis standar REST `POST` JSON body & Header Authorization |
| **Sistem Autentikasi** | 1 Kunci (`apikey` tunggal) | 2 Kunci: Public API Key (`pk_...`) untuk request & Secret Key (`sk_...`) untuk verifikasi webhook |
| **Output QRIS** | Hanya URL gambar QR (`qris_image`) | Raw `qris_string` EMVCo + SVG image `qr_url` + Web checkout `payment_url` |
| **Sistem Kode Unik** | Ditentukan manual / flat fee | Otomatis dibuatkan `unique_code` + `total_amount` |
| **Batas Waktu Kedaluwarsa** | Tetap dari server Sairi | Dinamis per transaksi (`expired_minutes`: 1–1440) |
| **Fitur Pembatalan** | Tidak tersedia di API | Tersedia (`POST /api/v1/transaction/cancel`) |
| **Deteksi Pembayaran** | Polling interval manual (tiap 3-5 detik) | Mendukung **Webhook/Callback real-time** dengan HMAC-SHA256 signature + Dukungan Polling Status |
| **Fitur Cek Saldo** | `/api/balance` (hanya saldo aktif) | `/api/v1/balance` (menampilkan saldo aktif & saldo hold) |

---

## 6. Rencana Desain Penerapan di Bot Wanzt Store (Jika Disetujui)

Jika nanti pengguna menyetujui migrasi, alur teknis penerapannya adalah sebagai berikut:

1. **Penyimpanan Konfigurasi (`database/api_config.json`)**:
   - Menambahkan field `lunasQrisApiKey` (format `pk_...`) dan `lunasQrisSecretKey` (format `sk_...`).
   - Menyediakan opsi pemilihan provider aktif: `"paymentProvider": "lunasqris"` atau `"sairi"`.

2. **Dashboard UI (Tab Connection)**:
   - Menambahkan card konfigurasi **LunasQRIS** lengkap dengan field input API Key (`pk_...`), Secret Key (`sk_...`), status koneksi, dan tombol tes koneksi (cek saldo).
   - Opsi toggle switch memilih gateway utama (LunasQRIS vs Sairi).

3. **Backend Proxy Server (Vite / Express Middleware)**:
   - Endpoint proxy:
     - `POST /api/lunasqris/transaction/create`
     - `GET /api/lunasqris/transaction/status`
     - `GET /api/lunasqris/balance`
     - `POST /api/lunasqris/transaction/cancel`
     - `POST /api/lunasqris/webhook` (Endpoint penerima callback webhook)

4. **Kustom Hook Frontend (`useLunasQrisData.ts`)**:
   - Mengelola state transaksi, pembuatan invoice, dan cek status pembayaran LunasQRIS secara reaktif di dashboard.

5. **Logika Transaksi WhatsApp (Bot Engine)**:
   - Memanfaatkan `qris_string` untuk membuat gambar QR code beresolusi tinggi langsung di memory, atau mengirim `qr_url` ke chat pribadi pembeli (DM).
   - Memanfaatkan `payment_url` sebagai tombol tautan alternatif (*Native Flow button `cta_url`*) agar pembeli dapat membuka halaman bayar di browser jika ingin melihat timer hitung mundur.
   - Menggunakan sistem polling berkala (tiap 4-5 detik) atau webhook instan untuk mendeteksi `status: "paid"`, lalu mengeksekusi order produk ke Xaviera API dan mengirimkan akun ke DM pembeli.
