#!/usr/bin/env bash
# ==============================================================================
# Rad Suite Core (Clinical Station) - VPS Automated Build & Deployment Pipeline
# VPS Location: /www/wwwroot/radiology.sehatai.org (Port 4125, radsuite.db)
# Note: DocEducates Atlas is decoupled at /www/wwwroot/atlas.doceducates.com (Port 4128)
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 [Deploy] Starting Rad Suite Core VPS Deploy..."
echo "🕒 [Deploy] Timestamp: $(date)"
echo "=========================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
echo "📂 [Deploy] Project root: $PROJECT_ROOT"

# 1. Fetch & pull latest commit from remote Git repository
echo "📥 [Deploy] Pulling latest code from Git..."
git fetch --all
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "core-release")
git reset --hard "origin/$CURRENT_BRANCH" || git reset --hard origin/core-release || git pull origin "$CURRENT_BRANCH" || git pull

# 2. Install npm dependencies
echo "📦 [Deploy] Installing dependencies..."
npm install --prefer-offline --no-audit

# 3. Build Next.js production artifact (.next directory)
echo "🔨 [Deploy] Compiling Next.js application (npm run build)..."
npm run build

# 4. Restart Clinical Workstation (Port 4125)
echo "🔄 [Deploy] Restarting Clinical Workstation on port 4125..."
fuser -k 4125/tcp 2>/dev/null || kill -9 $(lsof -t -i:4125 2>/dev/null) 2>/dev/null || true
sleep 1

if [ -f "/www/server/nodejs/vhost/scripts/radiology.sh" ]; then
  bash /www/server/nodejs/vhost/scripts/radiology.sh
elif command -v pm2 &> /dev/null && pm2 list | grep -q "radiology"; then
  pm2 reload radiology || pm2 restart radiology || true
else
  ENABLE_ACCEL_REDIRECT=true nohup node ./node_modules/next/dist/bin/next start -p 4125 </dev/null >/tmp/next_4125.log 2>&1 &
fi

# 5. Verification & Healthchecks
echo "🩺 [Deploy] Running healthchecks and asset verification..."
sleep 4

STATUS_4125=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4125/api/health || echo "FAILED")
echo "  * Clinical (4125) Health: $STATUS_4125"

CSS_HASH=$(ls -t "$PROJECT_ROOT/.next/static/css/"*.css 2>/dev/null | head -n 1 | xargs -r basename || true)
if [ -n "$CSS_HASH" ]; then
  CSS_4125=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:4125/_next/static/css/$CSS_HASH" || echo "FAILED")
  echo "  * CSS Chunk ($CSS_HASH) -> 4125: $CSS_4125"
fi

echo "=========================================================="
echo "🎉 [Deploy] Rad Suite Core Deployment Complete!"
echo "   Clinical Workstation: https://radiology.sehatai.org (Port 4125)"
echo "   Note: DocEducates Atlas is independent at /www/wwwroot/atlas.doceducates.com"
echo "=========================================================="
