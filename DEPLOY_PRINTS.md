# Deploy Gharsip Custom Prints (Vercel)

The storefront lives in **`frontend/`** (Next.js). The old liquor React app was removed.

## Vercel

1. Import **`sanjeev059/whatsapp-commerce-bot`** (or connect Git).
2. **Root Directory:** `frontend`  
3. Framework: **Next.js** (auto-detected).
4. Build: `npm run build` (default). Install: `npm install` / `npm ci`.
5. **Environment variables** (optional):
   - `NEXT_PUBLIC_ADMIN_PIN` — PIN for `/admin` (defaults to demo `gharsip2026` if unset).

6. **Custom domain (`gharsip.com`)**: Project → Settings → Domains → add apex + `www`, follow DNS instructions.

No `REACT_APP_BACKEND_URL` is required for this site. Orders are demo **localStorage** until you wire Firestore / your own API.

## Backend folder (`/` backend`)

The **`backend/`** FastAPI service (MongoDB, multi-vendor liquor APIs) remains in the repo for reference or future reuse. **The Prints site does not call it.** You can suspend or delete the Render service when you no longer need it.
