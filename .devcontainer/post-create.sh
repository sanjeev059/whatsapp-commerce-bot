#!/usr/bin/env bash
# One-time setup when the Codespace is created.
set -e

echo "📦 Installing system dependencies…"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends gnupg curl ca-certificates

# MongoDB data dir (optional — only if you run legacy backend locally)
sudo mkdir -p /data/db
sudo chown -R "$USER" /data/db

# ---- Backend (optional / legacy APIs) ----
echo "🐍 Installing Python dependencies…"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO/backend"
python -m pip install --upgrade pip
pip install -r requirements.txt

# ---- Frontend (Gharsip Custom Prints — Next.js) ----
echo "⚛️  Installing frontend dependencies…"
cd "$REPO/frontend"
npm ci || npm install

echo ""
echo "✅ Setup complete. Run ./start.sh to launch the Prints storefront (:3000)."
