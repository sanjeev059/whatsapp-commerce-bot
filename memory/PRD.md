# Local Commerce — Hyperlocal WhatsApp Storefront PRD

## Original Problem Statement
Build a mobile-first hyperlocal commerce platform with WhatsApp `wa.me` deep-link checkout (Blinkit/Zepto-style). Customer scans QR at local store → mobile storefront → cart → checkout → formatted order summary opens in WhatsApp ready to send to vendor. Optional vendor admin dashboard added on top.

## User Personas
- **Customer**: scans QR, browses on phone, places order via WhatsApp.
- **Vendor**: receives orders in WhatsApp AND in vendor admin dashboard for tracking + status management.

## Core Requirements (Static)
- Premium dark mobile-first storefront (max-width 480px phone-frame on desktop)
- 4 categories: Liquor, Cigarettes, Snacks, Food
- Liquor minimum ₹1000 rule (warn + block, server-enforced)
- Cigarettes: Full Pack Only enforcement
- Sticky cart bar with live total, category-grouped cart
- WhatsApp `wa.me` deep-link checkout — no payment gateway
- Vendor admin dashboard with JWT auth (single seeded admin)
- Mock data seeded once on first startup; admin can CRUD products
- Tech: React + Tailwind + FastAPI + MongoDB + bcrypt + PyJWT

## What's Been Implemented

### Iteration 1 (May 7, 2026) — Customer storefront
- ✅ FastAPI `/api/catalog` (mock data)
- ✅ Landing → Categories → Products → Cart → Checkout → Confirmation
- ✅ Sticky cart bar, quantity steppers, liquor min ₹1000 rule, cigarettes Full Pack Only
- ✅ WhatsApp `wa.me` deep link with emoji-grouped order summary
- ✅ localStorage cart persistence, image fallback
- ✅ 100% testing pass (testing_agent_v3 iteration_1.json)

### Iteration 2 (May 7, 2026) — Vendor admin dashboard
- ✅ DB-backed catalog (categories/subgroups/products in MongoDB, seeded once)
- ✅ Orders persisted in MongoDB on Place Order (server enforces liquor min)
- ✅ JWT auth with bcrypt + brute-force protection (5 fails = 15 min lockout per {ip}:{email})
- ✅ Admin pages: `/admin/login`, `/admin` (Dashboard), `/admin/orders`, `/admin/products`
- ✅ Dashboard: today's revenue, today's orders, all-time orders, products count, status pipeline pills, recent orders (polled every 15s)
- ✅ Orders: filter chips, status update select, detail modal with re-share customer WhatsApp + copy details
- ✅ Products: search + category filter, full CRUD with category+subgroup picker, image fallback
- ✅ Sidebar nav (desktop) + bottom nav (mobile), 401 auto-logout via axios interceptor
- ✅ Seeded admin: `admin@store.com` / `admin123`
- ✅ 100% testing pass (testing_agent_v3 iteration_2.json — 22/22 backend + all frontend flows)

## Files of Reference
- `backend/server.py` — auth, admin router, public order endpoint, catalog
- `backend/seed_data.py` — initial catalog data (4 cat, 15 subgroups, 54 products)
- `backend/.env` — `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `frontend/src/App.js` — routes (customer + admin)
- `frontend/src/context/{AdminAuthContext,CartContext}.jsx`
- `frontend/src/pages/{Landing,Categories,Products,Cart,Checkout,Confirmation}.jsx`
- `frontend/src/pages/admin/{AdminLogin,AdminLayout,AdminDashboard,AdminOrders,AdminProducts}.jsx`
- `frontend/src/lib/{whatsapp,format,apiClient,apiError}.js`

## Prioritized Backlog
- **P1**: Order tracking link sent back to customer (status updates pushed via WhatsApp)
- **P1**: Multi-vendor / per-store QR codes deep-linking to a specific vendor catalog
- **P2**: Categories CRUD (currently 4 fixed) + subgroup CRUD UI in admin
- **P2**: Search on storefront + recently ordered for returning customers
- **P3**: Subscriptions, vendor analytics, peak-hour insights
- **P3**: Migrate to FastAPI lifespan() instead of deprecated `on_event` hooks

## Next Tasks (When User Returns)
- Add real WhatsApp number in `frontend/src/config.js` `VENDOR_PHONE` or `REACT_APP_VENDOR_PHONE`
- Optionally enable browser push / sound for new-order alerts in admin
