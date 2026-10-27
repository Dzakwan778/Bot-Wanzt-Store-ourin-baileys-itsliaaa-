#!/usr/bin/env bash
# ==============================================================================
# Script Otomasi Deployment VPS: WhatsApp Bot Store & Dashboard (Wanzt Store)
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS / Debian 11 / 12
# ==============================================================================

set -e

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${PURPLE}  🚀 WANZT STORE - AUTO DEPLOYMENT VPS ENGINE 24/7${NC}"
echo -e "${PURPLE}  WhatsApp Bot Store & Dashboard Manager with LunasQRIS${NC}"
echo -e "${CYAN}================================================================${NC}\n"

# 1. Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Skrip ini wajib dijalankan sebagai user root!${NC}"
  echo -e "Silakan ketik: ${YELLOW}sudo bash deploy-vps.sh${NC} atau login sebagai root."
  exit 1
fi

echo -e "${GREEN}[1/7] Memperbarui sistem operasi & package repository...${NC}"
apt update -y
apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

echo -e "${GREEN}[2/7] Menginstall paket pendukung (curl, git, ufw, nginx, certbot)...${NC}"
apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# 2. Install Node.js 20 LTS jika belum terpasang atau versi lama
echo -e "${GREEN}[3/7] Memeriksa & Menginstall Node.js v20 LTS...${NC}"
CURRENT_NODE_VER=$(node -v 2>/dev/null || echo "none")
if [[ "$CURRENT_NODE_VER" != v20* && "$CURRENT_NODE_VER" != v22* ]]; then
  echo -e "${YELLOW}Mengunduh NodeSource repo untuk Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "Versi Node.js aktif: ${CYAN}$(node -v)${NC}"
echo -e "Versi npm aktif: ${CYAN}$(npm -v)${NC}"

# 3. Install PM2 dan TSX secara global
echo -e "${GREEN}[4/7] Menginstall PM2 Process Manager secara global...${NC}"
npm install -g pm2 tsx

# 4. Menyiapkan Folder Proyek
APP_DIR="/var/www/wanzt-bot"
echo -e "${GREEN}[5/7] Menyiapkan direktori aplikasi di ${APP_DIR}...${NC}"

# Cek apakah dijalankan langsung di dalam folder repo
if [ -f "package.json" ] && [ -d "server" ]; then
  echo -e "${YELLOW}Menggunakan file direktori saat ini...${NC}"
  mkdir -p "$APP_DIR"
  cp -r ./* "$APP_DIR/" 2>/dev/null || true
  cp -r ./.[!.]* "$APP_DIR/" 2>/dev/null || true
  cd "$APP_DIR"
elif [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}Folder $APP_DIR sudah ada, memperbarui dari git...${NC}"
  cd "$APP_DIR"
  if [ -d ".git" ]; then
    git pull origin main || true
  fi
else
  echo -e "${YELLOW}Melakukan clone repository resmi...${NC}"
  git clone https://github.com/Dzakwan778/Bot-Wanzt-Store-ourin-baileys-itsliaaa-remix.git "$APP_DIR"
  cd "$APP_DIR"
fi

# Pastikan folder database ada
mkdir -p "$APP_DIR/database"
mkdir -p "$APP_DIR/session"

echo -e "${GREEN}Menginstall dependensi npm di folder aplikasi...${NC}"
npm install --legacy-peer-deps

# 5. Konfigurasi Nginx Reverse Proxy
echo -e "${GREEN}[6/7] Mengonfigurasi Nginx Reverse Proxy (Port 80/Domain -> Port 3000)...${NC}"
cat << 'EOF' > /etc/nginx/sites-available/wanzt-bot
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 50M;

    # Proxy ke aplikasi Node.js / Vite di Port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Dukungan WebSocket untuk Baileys & Vite HMR
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Header Asli Klien & Webhook Signature
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_pass_request_headers on;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Aktifkan site di Nginx
ln -sf /etc/nginx/sites-available/wanzt-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true

# Test & reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# 6. Konfigurasi Firewall UFW
echo -e "${GREEN}Mengatur keamanan firewall UFW...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3000/tcp comment 'Direct Node Port'
echo "y" | ufw enable || true

# 7. Jalankan Aplikasi dengan PM2
echo -e "${GREEN}[7/7] Menjalankan Bot & Dashboard dengan PM2...${NC}"
pm2 delete wanzt-bot 2>/dev/null || true
pm2 start "npm run dev" --name "wanzt-bot" --time

# Simpan proses agar otomatis nyala saat VPS reboot
pm2 save
pm2 startup systemd -u root --hp /root || true

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}  🎉 DEPLOYMENT BERHASIL & BOT SUDAH AKTIF 24/7!${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "• Dashboard Web: ${YELLOW}http://104.64.15.80${NC} atau ${YELLOW}http://104.64.15.80:3000${NC}"
echo -e "• Webhook LunasQRIS: ${YELLOW}http://104.64.15.80/api/lunasqris/webhook${NC}"
echo -e "\n${PURPLE}📌 Perintah Berguna PM2:${NC}"
echo -e "  - Cek Log Real-Time : ${CYAN}pm2 logs wanzt-bot${NC}"
echo -e "  - Cek Status Bot    : ${CYAN}pm2 status${NC}"
echo -e "  - Restart Bot       : ${CYAN}pm2 restart wanzt-bot${NC}"
echo -e "  - Hentikan Bot      : ${CYAN}pm2 stop wanzt-bot${NC}"
echo -e "\n${PURPLE}🌐 Pasang Domain & SSL Gratis (HTTPS):${NC}"
echo -e "  Jika Anda sudah menghubungkan domain (A Record ke 104.64.15.80):"
echo -e "  Ketik: ${CYAN}certbot --nginx -d namadomainanda.com${NC}"
echo -e "${CYAN}================================================================${NC}\n"
