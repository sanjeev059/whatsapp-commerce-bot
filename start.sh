#!/usr/bin/env bash
# Start Gharsip Custom Prints (Next.js). Legacy FastAPI backend is optional — see README.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d frontend ]]; then
  echo "❌ Missing frontend/. Clone the repo and ensure frontend/ exists."
  exit 1
fi

echo ""
echo "==========================================================="
echo " Gharsip Custom Prints — Next.js"
echo "-----------------------------------------------------------"
echo "  Install & dev server  →  http://localhost:3000"
echo "  Customizer            →  http://localhost:3000/customize"
echo ""
echo "  (Optional API) Backend is not started by default."
echo "  To run legacy FastAPI: cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo "==========================================================="
echo ""

cd frontend
if [[ ! -d node_modules ]]; then
  echo "📦 Installing dependencies…"
  npm install
fi
exec npm run dev
