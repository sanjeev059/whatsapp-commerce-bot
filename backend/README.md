# Gharsip Meal Subscriptions — API

- **Runtime:** FastAPI (`server.py`), Motor + MongoDB
- **Purpose:** Serve the meal menu/combos, subscription plans, and customer subscriptions
- **Entry:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Config:** `.env` in this folder (`MONGO_URL`, `ADMIN_API_TOKEN`, optional `SUBSCRIPTIONS_COLLECTION`, …) — copy from **`../DEPLOY_PRINTS.md`**

Core modules:

| File | Role |
|------|------|
| `server.py` | App, CORS, rate limiting, lifespan / indexes |
| `menu.py` | `GET /api/menu/items`, `GET /api/menu/combos` |
| `meal_plans.py` | `GET /api/plans`, `GET /api/plans/{id}` |
| `subscriptions.py` | `POST /api/subscriptions`, `GET /api/subscriptions`, admin list/patch |
| `bookings.py` | Saree service bookings (unchanged) |
