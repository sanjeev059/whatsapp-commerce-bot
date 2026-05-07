#!/usr/bin/env bash
# One-time setup when the Codespace is created.
set -e

echo "📦 Installing system dependencies…"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends gnupg curl ca-certificates

# Yarn (Node feature already installed Node 20)
if ! command -v yarn >/dev/null 2>&1; then
  echo "📦 Installing yarn…"
  sudo npm install -g yarn
fi

# MongoDB data dir
sudo mkdir -p /data/db
sudo chown -R "$USER" /data/db

# ---- Backend ----
echo "🐍 Installing Python dependencies…"
cd /workspaces/$(basename "$PWD")/backend 2>/dev/null || cd "$(dirname "$0")/../backend"
python -m pip install --upgrade pip
pip install -r requirements.txt

# ---- Frontend ----
echo "⚛️  Installing frontend dependencies…"
cd ../frontend
yarn install --frozen-lockfile || yarn install

echo ""
echo "✅ Setup complete. Run ./start.sh to launch everything."
