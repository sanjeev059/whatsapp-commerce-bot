#!/usr/bin/env bash
# Launch backend + frontend together. Works on Codespaces, Gitpod, and plain Linux.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ---- Detect frontend backend URL ----
# In GitHub Codespaces, ports get a public preview URL of the shape
#   https://<CODESPACE_NAME>-<PORT>.<GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN>
# We construct it automatically so the React app can talk to the backend.
detect_backend_url() {
  if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
    echo "https://${CODESPACE_NAME}-8001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  elif [[ -n "${GITPOD_WORKSPACE_URL:-}" ]]; then
    # Gitpod-style: https://<port>-<host>
    local host="${GITPOD_WORKSPACE_URL#https://}"
    echo "https://8001-${host}"
  else
    echo "http://localhost:8001"
  fi
}

BACKEND_URL="$(detect_backend_url)"
echo "🌐 Detected backend URL: $BACKEND_URL"

# ---- backend/.env ----
if [[ ! -f backend/.env ]]; then
  echo "📝 Creating backend/.env"
  cat > backend/.env <<EOF
MONGO_URL="mongodb://127.0.0.1:27017"
DB_NAME="local_commerce"
CORS_ORIGINS="*"
JWT_SECRET="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
ADMIN_EMAIL="admin@store.com"
ADMIN_PASSWORD="admin123"
EOF
fi

# ---- frontend/.env ----
echo "📝 Writing frontend/.env (REACT_APP_BACKEND_URL=$BACKEND_URL)"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=$BACKEND_URL
REACT_APP_VENDOR_PHONE=916305468471
WDS_SOCKET_PORT=443
EOF

# ---- Make sure MongoDB is up ----
ensure_mongo() {
  # Already running natively?
  if pgrep -x mongod >/dev/null 2>&1; then
    echo "🍃 MongoDB (native) already running"
    return
  fi
  # Already running in Docker?
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^lc-mongo$'; then
    echo "🍃 MongoDB (docker) already running"
    return
  fi
  # Try native mongod
  if command -v mongod >/dev/null 2>&1; then
    echo "🍃 Starting MongoDB (native)…"
    sudo mkdir -p /data/db
    sudo chown -R "$USER" /data/db
    nohup mongod --bind_ip 127.0.0.1 --dbpath /data/db > /tmp/mongod.log 2>&1 &
    sleep 2
    return
  fi
  # Fallback to Docker
  if command -v docker >/dev/null 2>&1; then
    echo "🍃 Starting MongoDB (docker)…"
    if docker ps -a --format '{{.Names}}' | grep -q '^lc-mongo$'; then
      docker start lc-mongo >/dev/null
    else
      docker run -d --name lc-mongo -p 27017:27017 mongo:7 >/dev/null
    fi
    sleep 3
    return
  fi
  echo "❌ Neither mongod nor docker is available. Install one before running."
  exit 1
}
ensure_mongo

# ---- Start backend ----
echo "🚀 Starting FastAPI backend on :8001…"
( cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload ) &
BACKEND_PID=$!

# ---- Start frontend ----
echo "🚀 Starting React frontend on :3000…"
( cd frontend && yarn start ) &
FRONTEND_PID=$!

trap 'echo ""; echo "👋 Shutting down…"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM

echo ""
echo "==========================================================="
echo " 🛒  Local Commerce is starting up"
echo "-----------------------------------------------------------"
echo "  Storefront     →  ${BACKEND_URL/8001/3000}"
echo "  Admin login    →  ${BACKEND_URL/8001/3000}/admin/login"
echo "                    admin@store.com  /  admin123"
echo "  Vendor WhatsApp →  +91 6305468471"
echo "==========================================================="
echo ""

wait $BACKEND_PID $FRONTEND_PID
