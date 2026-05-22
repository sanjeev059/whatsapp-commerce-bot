# Deploy Gharsip Custom Prints (Vercel)

The storefront lives in **`frontend/`** (Next.js). The old liquor React app was removed.

## Vercel

1. Import **`sanjeev059/whatsapp-commerce-bot`** (or connect Git).
2. **Root Directory:** `frontend`  
3. Framework: **Next.js** (auto-detected — `frontend/vercel.json` pins `npm ci` + **`next build`**).
4. **Node:** Project → Settings → set **Node.js Version** to **20.x** (matches `engines` in `frontend/package.json`).
5. **Environment variables** (optional):
   - `NEXT_PUBLIC_ADMIN_PIN` — PIN for `/admin` (defaults to demo `gharsip2026` if unset).

6. **Custom domain (`gharsip.com`)**: Project → Settings → Domains → add apex + `www`, follow DNS instructions.

No `REACT_APP_BACKEND_URL` is required for this site. Orders are demo **localStorage** until you wire Firestore / your own API.

## Backend folder (`backend/`)

The **`backend/`** FastAPI service (MongoDB, multi-vendor liquor APIs) remains in the repo for reference or future reuse. **The Prints site does not call it.** You can suspend or delete the Render service when you no longer need it.

---

## Build fails: `react-scripts: command not found`

The Vercel project is still using the **old Create React App** build.

1. **Settings → General → Root Directory:** set **`frontend`** and **Save**.
2. **Settings → General → Framework Preset:** **Next.js**.
3. **Settings → Build & Deployment:** if there is **Production Overrides** (yellow banner), disable overrides for **Build Command** (`react-scripts build`) and **Output Directory** (`build`). Save.
4. **Deployments** → `⋯` on the latest deployment → **Redeploy**, and turn on **Clear build cache**.

**Which `vercel.json` applies**

| Root Directory | Config used |
|----------------|--------------|
| **`frontend`** | `frontend/vercel.json` only |
| **`./` (repo root)** | Repo root `vercel.json` (`cd frontend && …`) |

Prefer **Root Directory = `frontend`** for the smoothest Next.js deploy.
