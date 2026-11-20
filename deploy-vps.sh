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

# 4. Menyiapkan User Non-Root Khusus & Folder Proyek
SERVICE_USER="wanztbot"
APP_DIR="/opt/wanzt-bot"

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  echo -e "${GREEN}[5/7] Membuat user sistem non-root '${SERVICE_USER}'...${NC}"
  useradd --system --create-home --home-dir "/home/${SERVICE_USER}" --shell /bin/bash "$SERVICE_USER"
fi

echo -e "${GREEN}[5/7] Menyiapkan direktori aplikasi aman di ${APP_DIR}...${NC}"

# Cek apakah dijalankan langsung di dalam folder repo
CURRENT_PWD=$(pwd)
if [ -f "package.json" ] && ([ -d "backend" ] || [ -d "server" ]); then
  if [ "$CURRENT_PWD" != "$APP_DIR" ]; then
    echo -e "${YELLOW}Menyalin file dari $CURRENT_PWD ke $APP_DIR...${NC}"
    mkdir -p "$APP_DIR"
    cp -r ./* "$APP_DIR/" 2>/dev/null || true
    cp -r ./.[!.]* "$APP_DIR/" 2>/dev/null || true
  fi
  cd "$APP_DIR"
elif [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}Folder $APP_DIR sudah ada, memperbarui...${NC}"
  cd "$APP_DIR"
  if [ -d ".git" ]; then
    git pull origin main || true
  fi
else
  echo -e "${YELLOW}Menyiapkan folder $APP_DIR...${NC}"
  mkdir -p "$APP_DIR"
  cd "$APP_DIR"
fi

# Pastikan seluruh folder database, session Baileys, dan media runtime ada
mkdir -p "$APP_DIR/database/tenants"
mkdir -p "$APP_DIR/backend/database"
mkdir -p "$APP_DIR/auth_info_baileys"
mkdir -p "$APP_DIR/session"
mkdir -p "$APP_DIR/session_ourin"
mkdir -p "$APP_DIR/src/media/picture"
mkdir -p "$APP_DIR/public"

echo -e "${GREEN}Menginstall dependensi npm di folder aplikasi...${NC}"
npm install --legacy-peer-deps
npm install better-sqlite3 --legacy-peer-deps

echo -e "${GREEN}Melakukan build bundle Frontend & Admin...${NC}"
npm run build
if [ -f "$APP_DIR/admin-frontend/vite.config.ts" ]; then
  npx vite build --config "$APP_DIR/admin-frontend/vite.config.ts"
fi

# Pastikan folder frontend/dist memiliki file build lengkap
if [ -d "$APP_DIR/dist" ] && [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
  mkdir -p "$APP_DIR/frontend/dist"
  cp -r "$APP_DIR/dist"/* "$APP_DIR/frontend/dist/" 2>/dev/null || true
fi

# HARDENING PERMISSION:
# - Kepemilikan penuh ke user non-root wanztbot
# - Database & sesi Baileys/WhatsApp terkunci ketat 700 (direktori) / 600 (file)
# - Hanya aset statis hasil build frontend/dist & dist-admin yang dapat dibaca Nginx (www-data)
chown -R "${SERVICE_USER}:${SERVICE_USER}" "$APP_DIR"
chmod 755 "$APP_DIR"

for SENSITIVE_DIR in \
  "$APP_DIR/database" \
  "$APP_DIR/database/tenants" \
  "$APP_DIR/backend/database" \
  "$APP_DIR/auth_info_baileys" \
  "$APP_DIR/session" \
  "$APP_DIR/session_ourin"
do
  if [ -d "$SENSITIVE_DIR" ]; then
    chmod 700 "$SENSITIVE_DIR"
    find "$SENSITIVE_DIR" -type d -exec chmod 700 {} + 2>/dev/null || true
    find "$SENSITIVE_DIR" -type f -exec chmod 600 {} + 2>/dev/null || true
  fi
done

if [ -f "$APP_DIR/.env" ]; then
  chmod 600 "$APP_DIR/.env"
fi

for STATIC_DIR in "$APP_DIR/frontend/dist" "$APP_DIR/dist-admin"; do
  if [ -d "$STATIC_DIR" ]; then
    find "$STATIC_DIR" -type d -exec chmod 755 {} + 2>/dev/null || true
    find "$STATIC_DIR" -type f -exec chmod 644 {} + 2>/dev/null || true
  fi
done

# 5. Konfigurasi Nginx Reverse Proxy
echo -e "${GREEN}[6/7] Mengonfigurasi Nginx Reverse Proxy untuk testbot.wanma2.my.id...${NC}"
cat << 'EOF' > /etc/nginx/sites-available/bot-whatsapp
server {
    listen 80;
    listen [::]:80;
    server_name testbot.wanma2.my.id 139.59.97.50;

    server_tokens off;
    client_max_body_size 50M;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Sajikan file Frontend statis hasil build dari frontend/dist
    root /opt/wanzt-bot/frontend/dist;
    index index.html;

    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        alias /opt/wanzt-bot/dist-admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy ke Backend Node.js / Express lokal (127.0.0.1:5000 saja)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Dukungan WebSocket untuk Baileys & Real-time updates
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Header Asli Klien & Webhook Signature LunasQRIS
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Callback-Signature $http_x_callback_signature;
        proxy_set_header X-Callback-Timestamp $http_x_callback_timestamp;
        proxy_set_header X-Callback-Event $http_x_callback_event;

        proxy_pass_request_headers on;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Aktifkan site di Nginx
ln -sf /etc/nginx/sites-available/bot-whatsapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true

# Test & reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# 6. Konfigurasi Firewall UFW (Port 5000 TIDAK dibuka ke publik; wajib lewat Nginx HTTPS)
echo -e "${GREEN}Mengatur keamanan firewall UFW...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw delete allow 5000/tcp 2>/dev/null || true
echo "y" | ufw enable || true

# 7. Jalankan Aplikasi dengan PM2 sebagai user non-root (bind 127.0.0.1:5000)
echo -e "${GREEN}[7/7] Menjalankan Bot & Backend dengan PM2 sebagai '${SERVICE_USER}'...${NC}"
su - "$SERVICE_USER" -s /bin/bash -c "
  cd '$APP_DIR' && \
  pm2 delete bot-backend 2>/dev/null || true && \
  pm2 delete bot-whatsapp 2>/dev/null || true && \
  pm2 delete wanzt-bot 2>/dev/null || true && \
  if [ -f ecosystem.config.cjs ]; then \
    HOST=127.0.0.1 PORT=5000 CORS_ORIGINS='https://testbot.wanma2.my.id' pm2 start ecosystem.config.cjs --only bot-backend; \
  else \
    HOST=127.0.0.1 PORT=5000 CORS_ORIGINS='https://testbot.wanma2.my.id' pm2 start 'npx tsx backend/server.ts' --name bot-backend --time; \
  fi && \
  pm2 save
"
pm2 startup systemd -u "$SERVICE_USER" --hp "/home/${SERVICE_USER}" || true

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}  🎉 DEPLOYMENT BERHASIL & BOT SUDAH AKTIF 24/7!${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "• Service User     : ${CYAN}${SERVICE_USER} (non-root)${NC}"
echo -e "• Backend Bind     : ${CYAN}127.0.0.1:5000 (internal only)${NC}"
echo -e "• Domain Dashboard : ${YELLOW}https://testbot.wanma2.my.id${NC}"
echo -e "• Webhook LunasQRIS: ${YELLOW}https://testbot.wanma2.my.id/api/lunasqris/webhook${NC}"
echo -e "\n${PURPLE}📌 Perintah Berguna PM2 (sebagai user ${SERVICE_USER}):${NC}"
echo -e "  - Cek Log Real-Time : ${CYAN}sudo -u ${SERVICE_USER} pm2 logs bot-backend${NC}"
echo -e "  - Cek Status Bot    : ${CYAN}sudo -u ${SERVICE_USER} pm2 status${NC}"
echo -e "  - Restart Bot       : ${CYAN}sudo -u ${SERVICE_USER} pm2 restart bot-backend${NC}"
echo -e "  - Hentikan Bot      : ${CYAN}sudo -u ${SERVICE_USER} pm2 stop bot-backend${NC}"
echo -e "\n${PURPLE}🌐 Pasang SSL Gratis & Redirect HTTPS Wajib dengan Certbot:${NC}"
echo -e "  Ketik: ${CYAN}certbot --nginx --redirect -d testbot.wanma2.my.id${NC}"
echo -e "${CYAN}================================================================${NC}\n"
