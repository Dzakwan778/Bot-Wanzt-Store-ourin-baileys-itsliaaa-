# Panduan Instalasi & Deployment VPS (Full-Stack Node.js 22 + PM2 + Nginx + SSL)

Panduan ini disusun sesuai arsitektur terbaru **Wanzt Store** (Multi-Tenant WhatsApp Bot + Master Admin Dashboard), di mana satu server full-stack (`server.ts`) berjalan pada **Port 3000** menggunakan **Node.js 22 LTS** dan **PM2**, lalu dipublikasikan ke internet melalui **Nginx Reverse Proxy** + **HTTPS Certbot** dengan pemisahan domain antara **Dashboard Bot/Toko** dan **Dashboard Master Admin**.

---

## Daftar Isi
1. [Arsitektur & Pemisahan Domain](#1-arsitektur--pemisahan-domain)
2. [Langkah 1: Setup DNS Domain](#2-langkah-1-setup-dns-domain)
3. [Langkah 2: Persiapan VPS (Node.js 22 LTS, Nginx, Certbot, PM2)](#3-langkah-2-persiapan-vps-nodejs-22-lts-nginx-certbot-pm2)
4. [Langkah 3: Upload Proyek & Konfigurasi `.env`](#4-langkah-3-upload-proyek--konfigurasi-env)
5. [Langkah 4: Install Dependensi & Build Kedua Frontend](#5-langkah-4-install-dependensi--build-kedua-frontend)
6. [Langkah 5: Jalankan Server via PM2](#6-langkah-5-jalankan-server-via-pm2)
7. [Langkah 6: Konfigurasi Nginx (Pemisahan Domain Toko & Admin)](#7-langkah-6-konfigurasi-nginx-pemisahan-domain-toko--admin)
8. [Langkah 7: Buka Firewall UFW & Pasang SSL HTTPS (Certbot)](#8-langkah-7-buka-firewall-ufw--pasang-ssl-https-certbot)
9. [Langkah 8: Login Pertama Kali & Setup Bot](#9-langkah-8-login-pertama-kali--setup-bot)
10. [Manajemen Harian, Update Tampilan Frontend & Troubleshooting](#10-manajemen-harian-update-tampilan-frontend--troubleshooting)

---

## 1. Arsitektur & Pemisahan Domain

Contoh pembagian domain (ganti `domainanda.com` dengan domain Anda sendiri):
- **`domainanda.com`** -> Halaman **Dashboard Web Toko / Bot WhatsApp** (Tenant). Akses ke `/admin` dan `/api/admin` diblokir `404` oleh Nginx.
- **`admin.domainanda.com`** -> Halaman **Dashboard Master Admin** (Kelola Tenant, Token, Broadcast, Template, Partner API).

Kedua domain tersebut dilayani oleh satu proses Express di `http://127.0.0.1:3000` (`server.ts`), yang menyajikan:
- Build Web Toko dari `frontend/dist/` (atau `dist/`)
- Build Master Admin dari `dist-admin/`

---

## 2. Langkah 1: Setup DNS Domain

Di panel DNS registrar / Cloudflare domain Anda, tambahkan **2 DNS Record tipe A** yang mengarah ke IP publik VPS Anda:

| Type | Name | IPv4 Address | Proxy Status |
| :--- | :--- | :--- | :--- |
| `A` | `@` (atau subdomain, misal `bot`) | `IP_VPS_ANDA` | DNS Only saat pasang SSL |
| `A` | `admin` (atau `admin.bot`) | `IP_VPS_ANDA` | DNS Only saat pasang SSL |

> **Catatan Cloudflare**: Jika menggunakan Cloudflare, setel mode proxy ke **DNS Only** (awan abu-abu) terlebih dahulu sampai pemasangan SSL Certbot selesai. Jika ingin mengaktifkan Cloudflare Proxy (awan oranye) setelahnya, pastikan mode SSL/TLS di Cloudflare disetel ke **Full (strict)**.

---

## 3. Langkah 2: Persiapan VPS (Node.js 22 LTS, Nginx, Certbot, PM2)

Login ke VPS via SSH, lalu jalankan perintah berikut (Ubuntu / Debian):

```bash
# 1. Update OS & install paket pendukung (build-essential & python3 wajib untuk compile better-sqlite3)
apt update -y && apt upgrade -y
apt install -y curl wget git unzip build-essential python3 ufw nginx certbot python3-certbot-nginx

# 2. Install Node.js 22 LTS (WAJIB v22+ karena better-sqlite3 membutuhkan Node >= 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 3. Install PM2 secara global
npm install -g pm2

# 4. Pastikan versi Node.js sudah v22.x.x
node -v
npm -v
pm2 -v
```

---

## 4. Langkah 3: Upload Proyek & Konfigurasi `.env`

Buat direktori aplikasi (misalnya `/root/wanzt-bot`) dan ekstrak file proyek ke dalamnya:

```bash
mkdir -p /root/wanzt-bot
cd /root/wanzt-bot
```

Salin `.env.example` menjadi `.env` (atau edit file `.env` yang sudah tersedia), lalu sesuaikan isinya:

```bash
cp .env.example .env
nano .env
```

Isi minimal yang wajib diatur di `.env`:

```env
NODE_ENV=production
PORT=3000

CORS_ORIGINS=https://domainanda.com,https://admin.domainanda.com

ADMIN_BOOTSTRAP_USERNAME=superadmin
ADMIN_BOOTSTRAP_PASSWORD=PasswordMasterAdminKuat123!

TENANT_BOOTSTRAP_USERNAME=owner_toko
TENANT_BOOTSTRAP_PASSWORD=PasswordTenantKuat123!
```

> **Penting**: Kredensial `*_BOOTSTRAP_*` hanya dipakai saat database `database/master.db` pertama kali dibuat (masih kosong).

---

## 5. Langkah 4: Install Dependensi & Build Kedua Frontend

Masuk ke folder proyek lalu install seluruh package dan build **kedua** tampilan (Web Toko + Master Admin):

```bash
cd /root/wanzt-bot

# 1. Install seluruh dependensi npm
npm install --legacy-peer-deps

# 2. Build Frontend Dashboard Web Toko (menghasilkan dist/ & frontend/dist/)
npm run build

# 3. Build Frontend Dashboard Master Admin (WAJIB dijalankan, menghasilkan dist-admin/)
npx vite build --config admin-frontend/vite.config.ts
```

Pastikan folder `dist/`, `frontend/dist/`, dan `dist-admin/` masing-masing berisi `index.html`:

```bash
ls -la dist/index.html frontend/dist/index.html dist-admin/index.html
```

---

## 6. Langkah 5: Jalankan Server via PM2

Jalankan `server.ts` langsung dengan `tsx` lokal dan muat file `.env` menggunakan flag `--env-file=.env`:

```bash
cd /root/wanzt-bot

# Jalankan proses PM2
pm2 start "./node_modules/.bin/tsx" --name wanzt-bot -- --env-file=.env server.ts

# Simpan daftar proses & aktifkan auto-start saat VPS reboot
pm2 save
pm2 startup
```

*(Jika `pm2 startup` menampilkan satu baris perintah `sudo env PATH=...`, salin dan jalankan perintah tersebut di terminal.)*

Verifikasi bahwa server berjalan normal:

```bash
pm2 status
pm2 logs wanzt-bot --lines 25 --nostream
```

Output yang sehat akan menampilkan:
- `status: online`
- `[Wanzt Store] Server berjalan di http://0.0.0.0:3000`
- `[Wanzt Store] Mode: Production`
- `[Master DB] Akun super admin "..." diinisialisasi dari ADMIN_BOOTSTRAP_PASSWORD.`

---

## 7. Langkah 6: Konfigurasi Nginx (Pemisahan Domain Toko & Admin)

Buat konfigurasi virtual host Nginx baru:

```bash
nano /etc/nginx/sites-available/wanzt-bot
```

Masukkan konfigurasi berikut (ganti `domainanda.com` dan `admin.domainanda.com` sesuai domain Anda):

```nginx
# 1. Domain Tenant / Web Toko -> Blokir /admin & /api/admin dengan 404
server {
    listen 80;
    server_name domainanda.com;

    client_max_body_size 50M;

    # Tolak akses panel Master Admin dari domain toko
    location ^~ /admin {
        return 404;
    }

    location ^~ /api/admin {
        return 404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 2. Subdomain Khusus Master Admin
server {
    listen 80;
    server_name admin.domainanda.com;

    client_max_body_size 50M;

    # Arahkan root "/" langsung ke Master Admin di backend (URL browser tetap "/")
    location = / {
        proxy_pass http://127.0.0.1:3000/admin/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi lalu muat ulang Nginx:

```bash
ln -sf /etc/nginx/sites-available/wanzt-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## 8. Langkah 7: Buka Firewall UFW & Pasang SSL HTTPS (Certbot)

### 1. Aktifkan Firewall UFW
Port `3000` **tidak perlu dibuka** ke publik karena sudah diakses lewat Nginx (`80`/`443`):

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 2. Pastikan DNS Sudah Mengarah ke IP VPS
```bash
getent ahosts domainanda.com
getent ahosts admin.domainanda.com
```

### 3. Pasang Sertifikat SSL Let's Encrypt
```bash
certbot --nginx -d domainanda.com -d admin.domainanda.com
```
Ikuti petunjuk di terminal (masukkan email & setujui ToS). Certbot akan otomatis menambahkan blok `listen 443 ssl;` dan redirect HTTP -> HTTPS di `/etc/nginx/sites-available/wanzt-bot`.

---

## 9. Langkah 8: Login Pertama Kali & Setup Bot

1. **Dashboard Master Admin**: buka `https://admin.domainanda.com`
   - Login dengan `ADMIN_BOOTSTRAP_USERNAME` & `ADMIN_BOOTSTRAP_PASSWORD` yang Anda isi di `.env`.
2. **Dashboard Web Toko (Tenant)**: buka `https://domainanda.com`
   - Login dengan `TENANT_BOOTSTRAP_USERNAME` & `TENANT_BOOTSTRAP_PASSWORD` (atau buat akun tenant baru dari Master Admin).
   - Isi modal **Store Info** (Nama Toko, Nama Owner, Nomor WhatsApp Owner).
   - Masuk ke tab **Connection** untuk menghubungkan WhatsApp (Pairing Code) dan mengisi kredensial Payment Gateway (jika memakai LunasQRIS, atur Webhook URL ke `https://domainanda.com/api/lunasqris/webhook`).

---

## 10. Manajemen Harian, Update Tampilan Frontend & Troubleshooting

### Perintah PM2 yang Sering Dipakai
| Kebutuhan | Perintah |
| :--- | :--- |
| Cek status server | `pm2 status` |
| Lihat log real-time | `pm2 logs wanzt-bot` |
| Lihat 30 baris log terakhir | `pm2 logs wanzt-bot --lines 30 --nostream` |
| Restart server | `pm2 restart wanzt-bot` |
| Restart setelah mengubah `.env` | `pm2 delete wanzt-bot && pm2 start "./node_modules/.bin/tsx" --name wanzt-bot -- --env-file=.env server.ts && pm2 save` |

### Jika Mengubah Kode Tampilan Frontend (Tanpa Mengulang dari Awal)
Karena server produksi menyajikan file statis hasil build (`frontend/dist/` dan `dist-admin/`), mengedit file `.tsx` saja lalu refresh browser belum akan mengubah tampilan sebelum di-build ulang:
- Jika mengubah file di **`frontend/src/...`**:
  ```bash
  cd /root/wanzt-bot && npm run build
  ```
  Lalu refresh browser (`Ctrl + Shift + R`). Tidak perlu restart PM2.
- Jika mengubah file di **`admin-frontend/src/...`**:
  ```bash
  cd /root/wanzt-bot && npx vite build --config admin-frontend/vite.config.ts
  ```
  Lalu refresh browser (`Ctrl + Shift + R`). Tidak perlu restart PM2.
- Jika mengubah file backend (**`server.ts`**, **`backend/`**, atau **`admin-backend/`**):
  ```bash
  pm2 restart wanzt-bot
  ```

### Masalah Umum
1. **`npm warn EBADENGINE` / `better-sqlite3` gagal load karena versi Node**:
   Pastikan `node -v` minimal `v22.x.x`. Jika sebelumnya sempat menjalankan PM2 dengan Node 20, jalankan `pm2 kill`, install ulang `rm -rf node_modules && npm install --legacy-peer-deps`, lalu start ulang PM2.
2. **Membuka `admin.domainanda.com` malah masuk ke Dashboard Web Toko**:
   Pastikan `npx vite build --config admin-frontend/vite.config.ts` sudah dijalankan sehingga folder `dist-admin/index.html` ada, dan cek bahwa blok Nginx `admin.domainanda.com` memproksi `location = /` ke `http://127.0.0.1:3000/admin/`.
3. **Situs tidak bisa diakses dari HP / jaringan seluler, tapi bisa dari laptop**:
   Biasanya disebabkan cache DNS ISP/HP saat domain baru diubah, atau IPv6 (`AAAA` record) di DNS masih mengarah ke server lama padahal VPS hanya memakai IPv4. Hapus `AAAA` record jika VPS tidak memakai IPv6, lalu pastikan propagasi DNS sudah merata.
