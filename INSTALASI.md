# Panduan Lengkap Instalasi VPS & Deployment Domain
## Domain: `testbot.wanma2.my.id` | IP VPS: `139.59.97.50`
### Arsitektur Fisik: `bot-whatsapp/frontend` & `bot-whatsapp/backend`

Panduan ini disusun khusus untuk mendeploy bot WhatsApp toko otomatis (**Wanzt Store**) pada VPS Anda di alamat domain **`testbot.wanma2.my.id`** (IP: **`139.59.97.50`**) dengan struktur folder fisik yang telah dipisahkan secara murni antara **Frontend** dan **Backend** di dalam direktori **`bot-whatsapp`** menggunakan **PM2** dan **Nginx**.

---

## 📑 Daftar Isi
1. [Struktur Folder Resmi `bot-whatsapp`](#1-struktur-folder-resmi-bot-whatsapp)
2. [Langkah 1: Setup DNS Domain di Cloudflare / Registrar](#langkah-1-setup-dns-domain-di-cloudflare--registrar)
3. [Langkah 2: Persiapan Sistem VPS (Node.js 20 & PM2)](#langkah-2-persiapan-sistem-vps-nodejs-20--pm2)
4. [Langkah 3: Menaruh File Proyek ke VPS](#langkah-3-menaruh-file-proyek-ke-vps)
5. [Langkah 4: Install Dependensi & Build Frontend](#langkah-4-install-dependensi--build-frontend)
6. [Langkah 5: Menjalankan Backend dengan PM2 (Port 5000)](#langkah-5-menjalankan-backend-dengan-pm2-port-5000)
7. [Langkah 6: Konfigurasi Nginx untuk Domain `testbot.wanma2.my.id`](#langkah-6-konfigurasi-nginx-untuk-domain-testbotwanma2myid)
8. [Langkah 7: Pasang SSL Gratis HTTPS (Certbot Let's Encrypt)](#langkah-7-pasang-ssl-gratis-https-certbot-lets-encrypt)
9. [Langkah 8: Pasang Webhook di Akun LunasQRIS](#langkah-8-pasang-webhook-di-akun-lunasqris)
10. [Login Pertama Kali & Setup Store Info](#login-pertama-kali--setup-store-info)
11. [Perintah Manajemen & Monitoring PM2](#perintah-manajemen--monitoring-pm2)

---

## 1. Struktur Folder Resmi `bot-whatsapp`

Proyek Anda kini memiliki dua folder independen di dalam `/root/bot-whatsapp`:

```text
/root/bot-whatsapp/
│
├── frontend/                       <-- [SELURUH KODE FRONTEND (REACT + VITE)]
│   ├── src/                        # Komponen dashboard, tab, modal, hooks, types
│   ├── index.html                  # File HTML utama dashboard
│   ├── vite.config.ts              # Konfigurasi build Vite & proxy API
│   ├── dist/                       # File bundle statis hasil build (disajikan Nginx)
│   └── package.json                # Dependensi frontend React
│
├── backend/                        <-- [SELURUH KODE BACKEND (NODE + EXPRESS + BAILEYS)]
│   ├── server.ts                   # Entry point server backend (Port 5000)
│   ├── app.ts                      # Inisialisasi Express, CORS, & Parser rawBody Webhook
│   ├── botManager.ts               # Engine koneksi WhatsApp Baileys (@itsliaaa/baileys)
│   ├── routes/                     # Router API: auth, bot, lunasqris, xaviera, transactions
│   ├── services/                   # Service LunasQRIS, Auth PBKDF2, Transaksi
│   ├── handlers/                   # Dispatcher pesan WhatsApp & flow order otomatis
│   ├── messages/                   # Template Carousel WhatsApp & vCard Admin
│   ├── database/                   # Folder database lokal JSON persisten
│   ├── auth_info_baileys/          # Sesi login WhatsApp Baileys (dibuat otomatis)
│   └── package.json                # Dependensi backend Node.js
│
├── ecosystem.config.cjs            # Konfigurasi PM2 otomatis
└── INSTALASI.md                    # File panduan ini
```

---

## Langkah 1: Setup DNS Domain di Cloudflare / Registrar

Sebelum mengatur VPS, pastikan domain Anda telah diarahkan ke IP VPS:

1. Buka DNS Management domain Anda (misal Cloudflare atau Namecheap / Rumahweb / Niagahoster).
2. Tambahkan **DNS Record Tipe A**:
   - **Type**: `A`
   - **Name**: `testbot` (akan menjadi `testbot.wanma2.my.id`)
   - **IPv4 Address**: `139.59.97.50`
   - **Proxy Status**: *DNS Only* (atau jika menggunakan Cloudflare, nonaktifkan awan oranye terlebih dahulu saat instalasi SSL Certbot).
   - **TTL**: Auto

---

## Langkah 2: Persiapan Sistem VPS (Node.js 20 & PM2)

Masuk ke VPS Anda via SSH dari terminal komputer:
```bash
ssh root@139.59.97.50
```

Jalankan perintah update dan instalasi dependensi sistem:
```bash
# 1. Update package OS
apt update -y && apt upgrade -y

# 2. Install dependensi dasar & Nginx
apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# 3. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Install PM2 dan TSX secara global
npm install -g pm2 tsx

# Verifikasi instalasi
node -v   # Output: v20.x.x
pm2 -v    # Output: v5.x.x
```

---

## Langkah 3: Menaruh File Proyek ke VPS

Buat folder `/root/bot-whatsapp`:
```bash
mkdir -p /root/bot-whatsapp
cd /root/bot-whatsapp
```

Unggah seluruh file proyek ke `/root/bot-whatsapp` (bisa menggunakan `git clone`, SCP, FileZilla SFTP, atau rsync).

Pastikan saat Anda mengetik `ls -la /root/bot-whatsapp`, Anda melihat folder `frontend/` dan `backend/`.

---

## Langkah 4: Install Dependensi & Build Frontend

Jalankan instalasi dependensi di root dan build frontend:

```bash
cd /root/bot-whatsapp

# 1. Install seluruh package npm & dependensi WhatsApp
npm install --legacy-peer-deps
npm install better-sqlite3 --legacy-peer-deps

# 2. Build tampilan Frontend menjadi file statis
npm run build

# 3. Pastikan file dist ada di folder frontend/dist
mkdir -p /root/bot-whatsapp/frontend/dist
cp -r /root/bot-whatsapp/dist/* /root/bot-whatsapp/frontend/dist/ 2>/dev/null || true

# 4. PENTING (Mencegah Nginx 500 Internal Server Error):
# Berikan izin akses folder /root agar Nginx (user www-data) diizinkan membaca file frontend
chmod 755 /root
chmod -R 755 /root/bot-whatsapp
```
> Perintah `npm run build` akan menghasilkan folder `/root/bot-whatsapp/frontend/dist` (dan `/root/bot-whatsapp/dist`). File ini yang akan disajikan langsung oleh Nginx secara instan dan sangat hemat RAM!

---

## Langkah 5: Menjalankan Backend dengan PM2 (Port 5000)

Backend Express menangani koneksi WhatsApp Baileys 24/7 dan melayani API di Port 5000.

Jalankan via PM2:
```bash
cd /root/bot-whatsapp

# Menjalankan backend murni
pm2 start ecosystem.config.cjs --only bot-backend
```

*Atau via perintah langsung:*
```bash
pm2 start "npx tsx backend/server.ts" --name "bot-backend"
```

### Kunci Auto-Start Saat VPS Reboot:
```bash
pm2 save
pm2 startup
# (Jalankan baris perintah tambahan yang dimunculkan PM2 jika diminta)
```

---

## Langkah 6: Konfigurasi Nginx untuk Domain `testbot.wanma2.my.id`

Nginx akan menyajikan tampilan Frontend dari `frontend/dist` pada port 80/443, dan meneruskan request API `/api/` langsung ke `bot-backend` di port 5000.

### 1. Buat konfigurasi server Nginx:
```bash
nano /etc/nginx/sites-available/testbot
```

### 2. Masukkan konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name testbot.wanma2.my.id 139.59.97.50;

    client_max_body_size 50M;

    # 1. Sajikan Frontend React dari frontend/dist
    root /root/bot-whatsapp/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Teruskan seluruh request /api/ ke Backend Port 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # WebSocket support untuk Baileys & Real-time update
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward IP Asli & Signature Webhook LunasQRIS
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Callback-Signature $http_x_callback_signature;
        proxy_set_header X-Callback-Timestamp $http_x_callback_timestamp;
        proxy_set_header X-Callback-Event $http_x_callback_event;
    }
}
```

### 3. Aktifkan Site & Reload Nginx:
```bash
ln -sf /etc/nginx/sites-available/testbot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4. Buka Firewall UFW:
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp
ufw --force enable
```

---

## Langkah 7: Pasang SSL Gratis HTTPS (Certbot Let's Encrypt)

Agar website menggunakan gembok hijau HTTPS yang aman, jalankan Certbot 1-baris:

```bash
certbot --nginx -d testbot.wanma2.my.id
```
- Masukkan email Anda.
- Ketik `Y` untuk menyetujui persyaratan.
- Certbot akan secara otomatis mengonfigurasi sertifikat SSL gratis dan memperbarui Nginx ke HTTPS!

Sekarang dashboard toko Anda aktif di:
👉 **`https://testbot.wanma2.my.id`**

---

## Langkah 8: Pasang Webhook di Akun LunasQRIS

Agar setiap pembayaran QRIS otomatis terdeteksi dalam hitungan detik dan bot langsung mengirim akun digital ke DM pembeli:

1. Buka dashboard akun LunasQRIS Anda di **https://lunasqris.com**.
2. Masuk ke menu **Pengaturan Webhook / Integrasi API**.
3. Isi kolom **Webhook URL** dengan URL domain Anda:
   ```text
   https://testbot.wanma2.my.id/api/lunasqris/webhook
   ```
4. Salin **Secret Key (`sk_...`)** dan **Public API Key (`pk_...`)**.
5. Buka dashboard Anda di `https://testbot.wanma2.my.id`, buka tab **Connection**, lalu masukkan kedua key tersebut ke formulir **LunasQRIS Payment Gateway** dan klik **Simpan Konfigurasi**.

---

## Login Pertama Kali & Setup Store Info

- **URL Dashboard**: `https://testbot.wanma2.my.id`
- **Username Default**: `admin`
- **Password Default**: `admin123`

Saat pertama kali login, modal **Wajib Isi Store Info** akan otomatis muncul. Anda wajib mengisi:
1. **Nama Toko**
2. **Nama Owner**
3. **Nomer Owner WhatsApp**

Setelah disimpan, server akan membuka kunci bot sehingga bot WhatsApp siap dinyalakan di tab **Connection** dengan memasukkan nomor WhatsApp dan 8 karakter Pairing Code.

---

## Perintah Manajemen & Monitoring PM2

Gunakan perintah-perintah berikut di VPS untuk memantau kinerja bot:

| Kebutuhan | Perintah Terminal VPS |
| :--- | :--- |
| **Cek Status Bot** | `pm2 status` |
| **Lihat Log WhatsApp & Webhook Real-time** | `pm2 logs bot-backend` |
| **Lihat 100 Baris Log Terakhir** | `pm2 logs bot-backend --lines 100` |
| **Restart Bot WhatsApp** | `pm2 restart bot-backend` |
| **Hentikan Sementara** | `pm2 stop bot-backend` |
| **Pantau Penggunaan RAM/CPU** | `pm2 monit` |
| **Simpan Konfigurasi PM2** | `pm2 save` |

---

## 🛠️ Solusi: Mengatasi "500 Internal Server Error" Nginx

Jika Anda membuka website dan muncul layar putih bertuliskan **500 Internal Server Error (nginx/1.28.3 Ubuntu)**, penyebab utamanya adalah **hak akses (permission) folder `/root`** atau **file `index.html` belum ter-build**.

Jalankan perintah 1-menit perbaikan berikut di terminal VPS Anda:

```bash
# 1. Berikan izin baca ke Nginx (user www-data) untuk melintasi folder /root
chmod 755 /root
chmod -R 755 /root/bot-whatsapp

# 2. Pastikan file Frontend telah di-build
cd /root/bot-whatsapp
npm run build
mkdir -p /root/bot-whatsapp/frontend/dist
cp -r /root/bot-whatsapp/dist/* /root/bot-whatsapp/frontend/dist/ 2>/dev/null || true

# 3. Bersihkan proses PM2 yang error/duplikat dan jalankan backend secara bersih
pm2 delete all
pm2 start "npx tsx backend/server.ts" --name "bot-backend"
pm2 save

# 4. Reload Nginx
systemctl restart nginx
```

Setelah menjalankan perintah di atas, muat ulang (refresh) halaman website Anda di browser. Dashboard toko akan langsung tampil normal!
