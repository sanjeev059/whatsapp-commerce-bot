# Gharsip — Custom Prints storefront

Public site: **Gharsip Custom Prints** — “Wear Your Vibe”.  
Next.js app in **`frontend/`** with live tee preview, cart, checkout demo flow, tracking UI, and admin PIN.

## Quick start (local)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

See **[DEPLOY_PRINTS.md](./DEPLOY_PRINTS.md)** for Vercel (root directory **`frontend`**).

## Repo layout

| Path | Contents |
|------|----------|
| **`frontend/`** | Next.js — **production storefront** |
| **`backend/`** | Legacy FastAPI (liquor/multi-vendor). **Not used by the Prints UI**; kept for APIs you may reuse or retire on Render |

## Liquor storefront

The previous Create React App (`/store/:slug`, vendor admin, etc.) has been **removed** and replaced by this Prints experience.

Older deployment notes (`DEPLOY_FREE.md`, Mongo/Render/VAPID, `REACT_APP_*`) describe the legacy stack — use them only if you still run **`backend/`** separately.
