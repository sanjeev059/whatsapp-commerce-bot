# Gharsip Custom Prints — API

- **Runtime:** FastAPI (`server.py`), Motor + MongoDB
- **Purpose:** Persist **custom-print tee** orders aligned with `frontend/lib/pricing.ts`
- **Entry:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Config:** `.env` in this folder (`MONGO_URL`, `ADMIN_API_TOKEN`, optional `ORDERS_COLLECTION`, …) — copy from **`../DEPLOY_PRINTS.md`**

Core modules:

| File | Role |
|------|------|
| `server.py` | App, CORS, rate limiting, lifespan / indexes |
| `orders.py` | `POST /api/orders`, `GET /api/orders/{id}`, admin list/patch |
