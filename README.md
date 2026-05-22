# Gharsip — Custom Prints

Public site: **Gharsip Custom Prints** — “Wear Your Vibe”.

## Stack

| Part | Tech |
|------|------|
| **Storefront** | Next.js (`frontend/`): customizer, cart, checkout demo, Razorpay placeholder, `/admin` PIN |
| **API** | FastAPI (`backend/`): **`/api/orders`** + **`/api/admin/orders`** (MongoDB only) |

## Quick start

```bash
cd frontend && npm install && npm run dev
```

For local API: set **`backend/.env`** (`MONGO_URL`, `ADMIN_API_TOKEN`, optionally `ORDERS_COLLECTION`) and:

```bash
cd backend && pip install -r requirements.txt && uvicorn server:app --reload --port 8000
```

Point **`NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`** in `frontend/.env.local`.

## Deploy

**[DEPLOY_PRINTS.md](./DEPLOY_PRINTS.md)** — Vercel (**`frontend`**) + Render (**`backend`**) + MongoDB Atlas.

`DEPLOY_FREE.md` kept only as a pointer; the liquor multi-tenant codebase is gone.
