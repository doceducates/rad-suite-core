#!/usr/bin/env bash
# Rad Suite - Contabo Ubuntu VPS Automated Deployment Pipeline
# Compatible with aaPanel / Nginx / PM2

set -e

echo "=========================================================="
echo " RAD SUITE ENTERPRISE VPS DEPLOYMENT & PM2 SETUP"
echo "=========================================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# 1. Environment Check
if ! command -v node &> /dev/null; then
    echo "[-] Node.js is not installed. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "[+] Node version: $(node -v)"
echo "[+] NPM version:  $(npm -v)"

# 2. PM2 Process Manager
if ! command -v pm2 &> /dev/null; then
    echo "[+] Installing PM2 process manager globally..."
    sudo npm install -g pm2
fi

# 3. Environment File Verification
if [ ! -f .env.production ] && [ ! -f .env ]; then
    echo "[-] Warning: No .env or .env.production file found!"
    echo "[+] Creating baseline .env.production template..."
    cat <<EOT > .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=sqlite:./data/radsuite.db
AUTH_SECRET=$(openssl rand -hex 32)
CLINIC_NODE_SECRET=$(openssl rand -hex 16)
NEXT_PUBLIC_APP_URL=https://yourclinic.com
EOT
    echo "[!] Please edit .env.production with your real domain and database secrets."
fi

# 4. Install Dependencies & Build
echo "[+] Installing clean npm dependencies..."
npm install --legacy-peer-deps

echo "[+] Running TypeScript check..."
npx tsc --noEmit

echo "[+] Compiling Next.js production build..."
npm run build

# 5. Start / Reload with PM2
echo "[+] Launching Rad Suite via PM2..."
pm2 startOrReload ecosystem.config.js || pm2 start npm --name "rad-suite" -- start

pm2 save
echo "[+] PM2 processes saved. Service configured for automatic reboot recovery."

echo "=========================================================="
echo " DEPLOYMENT SUCCESSFUL!"
echo "=========================================================="
echo " Next Step in aaPanel:"
echo " 1. Go to aaPanel -> Website -> Add site (yourclinic.com)"
echo " 2. Add Reverse Proxy: Target URL = http://127.0.0.1:3000"
echo " 3. Enable SSL with 1-click Let's Encrypt in aaPanel"
echo "=========================================================="
