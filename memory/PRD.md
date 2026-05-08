# Local Commerce — Hyperlocal Commerce SaaS PRD

## Original Problem Statement
Production-style hyperlocal commerce SaaS optimized for local MRP/liquor stores, cigarette shops, snack stores, and food delivery. Multi-tenant, web-only (no WhatsApp), with QR-based UPI payment + last-5-digit verification, real-time tracking, and store open/close controls.

## Pivot decision (locked)
WhatsApp/Twilio integration **dropped** to avoid acting as the merchant of record for liquor. 100% web-based: PWA-friendly customer storefronts (slug-based) + tracking pages + role-scoped admin dashboards.

## Personas
- **Master Admin**: platform owner. Onboards/disables vendors, sees platform-wide GMV.
- **Vendor Admin**: store owner. Manages products, orders, store hours, UPI ID, QR. Self-serve image uploads + password change. Gets sound + browser notification on new orders.
- **Customer**: public, no auth. Scans QR → store/<slug> → cart → checkout → /track/<token>.

## Architecture
- **Stack**: React + TailwindCSS + FastAPI + MongoDB + bcrypt + PyJWT + axios
- **Multi-tenant**: vendor slug. Storefront URL: `/store/<slug>`.
- **Auth**: JWT in `localStorage["lc_admin_token"]`; `auth_user` middleware decodes role + vendor_id.
- **Role isolation**: `require_master`, `require_vendor` dependencies; vendor-scoped queries.
- **Order lifecycle (7 states)**: `payment_verification_pending → payment_verified → accepted → out_for_delivery → delivered` (+ `rejected`, `cancelled`).
- **UPI verification**: customer enters last 5 digits of UPI txn ID; vendor matches before flipping to `payment_verified`.
- **Image uploads**: `POST /api/vendor/uploads/image` (multipart, 3 MB max, allowlisted MIME). Bytes stored in `db.images`. Public read at `GET /api/uploads/{id}`.
- **New-order alerts**: vendor `AdminLayout` polls `/api/vendor/orders` every 15 s; `useNewOrderAlerts` triggers Web Audio chime + browser `Notification` on diff.

## Implemented (as of Feb 2026)

### Phase 0 — backend rewrite
- Multi-tenant data model, public + master + vendor routers, atomic per-vendor sequence, UPI 5-digit gate, liquor ₹1000 min server-side, master + demo vendor seeded on startup.

### Phase 1 — frontend rewrite
- Slug-scoped customer flow (Storefront → Menu → Products → Cart → Checkout w/ UPI verify or COD → Confirmation → Track) with slug-bound CartContext.
- Role-aware admin: vendor dashboard with OPEN/CLOSE toggle + 7-state pipeline; vendor orders + products + store-settings; master dashboard + master vendors (onboard/disable + auto-credentials modal).
- 35/35 backend pytest, all frontend Playwright critical flows green.

### Phase 2 — Vendor empowerment (this session)
- ✅ Self-serve image upload (`<ImageUpload>`): used in product CRUD and payment QR; replaces URL fields. Stored in MongoDB, served from `/api/uploads/{id}`. Client + server defense in depth (3 MB max, MIME allowlist).
- ✅ Self-serve password change on `/admin/store` (`PasswordChangeCard`): current/new/confirm + show toggle. Backend validates current pw (401) + 8-char min (400). Bug found in iteration_4 (global 401 interceptor logged user out) was fixed via URL whitelist + `validateStatus` belt-and-suspenders.
- ✅ New-order alerts for vendor admins: Web Audio two-tone chime + browser Notification, with permission CTA banner. Polling lives in `AdminLayout` so alerts work across all vendor pages. Master admins exempt.
- ✅ `resolveUrl` helper to absolute-ize relative `/api/uploads/...` for `<img>` rendering.
- ✅ 49/49 backend pytest + 5/5 frontend regression scenarios (iteration_5).

## Files of Reference
- Backend: `backend/server.py`, `backend/seed_data.py`, `backend/tests/test_multitenant.py`, `backend/tests/test_iter4_features.py`
- Frontend: `frontend/src/App.js`; `context/{Cart,AdminAuth}Context.jsx`; `lib/{apiClient,format,apiError}.js`; `hooks/useNewOrderAlerts.js`; `components/{ImageUpload,Header,ProductCard,QuantityStepper,StickyCartBar}.jsx`; `pages/{Landing,StorefrontHome,Categories,Products,Cart,Checkout,Confirmation,TrackOrder,StoreClosed}.jsx`; `pages/admin/{AdminLogin,AdminLayout,AdminDashboard,AdminOrders,AdminProducts,AdminStore,MasterDashboard,MasterVendors,orderStatus}.{jsx,js}`

## Roadmap

### P1 — DONE (this session)
- ~~Image upload~~ ✅
- ~~Vendor password change~~ ✅
- ~~Sound + browser notification on new orders~~ ✅

### P1 — Carryover
- Server-side image variants/optimization (currently raw bytes stored as-is)

### P2 — Operational
- Day/night dynamic pricing per category
- Geolocation in checkout + Google Maps link in vendor order detail
- Bulk product CSV import
- Web Push (VAPID + service worker) so alerts fire even when vendor tab is closed
- PWA install prompt + offline shell

### P3 — Refactoring
- Migrate `server.py` from `@app.on_event` to FastAPI `lifespan`
- Split into `/app/backend/routes/{public,master,vendor,auth,uploads}.py`
- Replace native `<input type="time">` with shadcn time picker

### P4 — SaaS-grade
- Stripe billing for vendor subscriptions (master can mark `subscription_expires_at`)
- Per-vendor analytics + peak-hour insights
- Customer search, recently-ordered
- Per-product image GridFS (instead of inline bytes) for high-image-count tenants
