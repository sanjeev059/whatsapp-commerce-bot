# Auth Testing Playbook (admin dashboard)

## Setup
- Bearer JWT auth (no cookies). Token stored client-side in `localStorage`.
- Single seeded admin user: `admin@store.com` / `admin123` (configurable via `backend/.env`).

## Backend endpoints
- `POST /api/auth/login` → `{ access_token, user }`
- `GET  /api/auth/me`    (Bearer)
- `POST /api/orders`     (public, customer places order)
- `GET  /api/admin/orders`           (Bearer admin)
- `PATCH /api/admin/orders/{id}`     (Bearer admin)
- `GET  /api/admin/products`         (Bearer admin)
- `POST /api/admin/products`         (Bearer admin)
- `PATCH /api/admin/products/{id}`   (Bearer admin)
- `DELETE /api/admin/products/{id}`  (Bearer admin)
- `GET  /api/admin/stats`            (Bearer admin)
- `GET  /api/admin/categories`, `GET/POST/DELETE /api/admin/subgroups`

## Brute force
After 5 failed logins from same `{ip}:{email}`, locked out 15 min (HTTP 429).

## Quick curl test
```
API=http://localhost:8001/api
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@store.com","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo $TOKEN
curl -s $API/auth/me -H "Authorization: Bearer $TOKEN"
curl -s $API/admin/stats -H "Authorization: Bearer $TOKEN"
curl -s $API/admin/orders -H "Authorization: Bearer $TOKEN"
```

## Frontend flow
- `/admin/login` — login form (email + password)
- `/admin` — dashboard with sidebar: Orders, Products, Stats
- 401 on protected calls → redirect to `/admin/login`
- Token stored under `localStorage["lc_admin_token"]`
- Polling every 15s on Orders page for new ones
