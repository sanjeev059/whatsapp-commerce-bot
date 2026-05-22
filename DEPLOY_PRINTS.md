# Deploy Gharsip Custom Prints

Monorepo: **Next.js storefront** in `frontend/`, **FastAPI + MongoDB** in `backend/` (orders API only — no legacy liquor stack).

## 1. MongoDB Atlas

1. Create a free **M0** cluster (recommended region **Mumbai** / `ap-south-1`).
2. Database user + password; allow network **0.0.0.0/0** (needed for Render) or Render’s egress IPs later.
3. Copy the **`mongodb+srv://…`** URI.

## 2. Backend on Render (~5 min)

1. Push this repo to GitHub and **New → Blueprint** (or manual Web Service pointing at **`backend/`**).
2. If using **Blueprint**, open `render.yaml` from the repo root.
3. Set environment variables:

   | Variable | Required | Notes |
   |----------|---------|-------|
   | `MONGO_URL` | ✅ | Atlas connection string |
   | `DB_NAME` | optional | Defaults to **`gharsip_store`** |
   | `ADMIN_API_TOKEN` | ✅ | Long random secret; same value copied to Vercel **server-side** env |
   | `CORS_ORIGINS` | strongly recommended prod | Example: `https://you.vercel.app,https://gharsip.com` |
   | `ORDERS_COLLECTION` | optional | Default **`gharsip_orders`**. If you previously used Prints-only **`prints_orders`**, set this to **`prints_orders`** until you migrate data. |
   | `META_COLLECTION` | optional | Default **`gharsip_meta`** (order id counter lives here). |

4. **Health check path:** `/api/` (returns JSON `app` + `version`).

**Backward compatibility:** if you still have **`PRINTS_ADMIN_TOKEN`** in Render from an older deploy, the API also accepts it until you finish switching to **`ADMIN_API_TOKEN`**.

## 3. Frontend on Vercel

1. Import the repo; **Root Directory:** `frontend`
2. Framework: **Next.js**
3. Node **20.x** (matches `engines` in `frontend/package.json`)
4. Environment variables:

   | Variable | Where | Purpose |
   |----------|--------|---------|
   | `NEXT_PUBLIC_BACKEND_URL` | Vercel (public) | Render base URL, **no** trailing slash, e.g. `https://gharsip-backend.onrender.com` |
   | `ADMIN_API_TOKEN` | Vercel **server only** | Must match Render. Used by **`/api/admin/backend-orders`** so the browser never sees the Bearer token. |
   | `NEXT_PUBLIC_ADMIN_PIN` | optional | PIN for `/admin` UI (default `gharsip2026` if unset) |
   | `PRINTS_OPS_PIN` | optional server | If set, overrides which PIN the Next proxy accepts for listing/patching orders |

If **`NEXT_PUBLIC_BACKEND_URL`** is unset, the site runs in **localStorage demo** mode (no server orders).

## 4. API reference (backend)

All routes are under **`/api`**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/` | — | Health / metadata |
| `POST` | `/api/orders` | — | Create order (rate limited; server recomputes totals) |
| `GET` | `/api/orders/{id}?phone=…` | — | Customer lookup (last 10 digits of phone must match) |
| `GET` | `/api/admin/orders` | `Authorization: Bearer <ADMIN_API_TOKEN>` | List orders |
| `PATCH` | `/api/admin/orders/{id}` | Bearer | Update `tracking`, `qikinkId`, optional `timeline` |

The Next.js app proxies admin list/patch through **`/api/admin/backend-orders`** (PIN + server Bearer).

## 5. Custom domain

Vercel → Domains → add apex + `www`; point DNS as instructed. Add the **https** origin to **`CORS_ORIGINS`** on Render.

---

## Troubleshooting (Vercel)

### Build still expects Create React App / `build` folder

See older notes in git history; with **Root Directory = `frontend`** and **Next.js** preset, overrides for `react-scripts` / `build` must be cleared, then redeploy with **Clear build cache**.

### CORS blocked from browser to Render

Set **`CORS_ORIGINS`** on Render to include your exact Vercel preview and production origins (scheme + host, no path).
