# Local Commerce — Hyperlocal Commerce SaaS PRD

## Original Problem Statement
Production-style hyperlocal commerce SaaS optimized for local MRP/liquor stores, cigarette shops, snack stores, and food delivery. Multi-tenant, web-only (no WhatsApp), with QR-based UPI payment + last-5-digit verification, real-time tracking, and store open/close controls.

## Pivot decision (locked)
WhatsApp/Twilio integration **dropped** to avoid acting as the merchant of record for liquor. 100% web-based: PWA-installable customer storefronts (slug-based) + tracking pages + role-scoped admin dashboards.

## Personas
- **Master Admin**: platform owner. Onboards/disables vendors, sees platform-wide GMV.
- **Vendor Admin**: store owner. Manages products (manual + bulk CSV), orders, store hours, UPI ID, QR. Self-serve image uploads + password change. Gets sound + browser notification + Web Push (works when tab closed) on new orders. Configures day/night dynamic pricing.
- **Customer**: public, no auth. Scans QR → store/<slug> → cart → checkout (with optional one-tap geolocation) → /track/<token>.

## Architecture
- **Stack**: React + TailwindCSS + FastAPI + MongoDB + bcrypt + PyJWT + axios + pywebpush (VAPID).
- **Multi-tenant**: vendor slug. Storefront URL: `/store/<slug>`.
- **Auth**: JWT in `localStorage["lc_admin_token"]`; `auth_user` middleware decodes role + vendor_id.
- **Role isolation**: `require_master`, `require_vendor` deps; vendor-scoped queries.
- **Order lifecycle (7 states)**: `payment_verification_pending → payment_verified → accepted → out_for_delivery → delivered` (+ `rejected`, `cancelled`).
- **UPI verification**: customer enters last 5 digits of UPI txn ID; vendor matches before flipping to `payment_verified`.
- **Image uploads**: `POST /api/vendor/uploads/image` (multipart, 3 MB max, allowlisted MIME). Bytes stored in `db.images`. Public read at `GET /api/uploads/{id}`.
- **New-order alerts (multi-channel)**:
  - Tab open: Web Audio chime + browser `Notification` (via `useNewOrderAlerts`).
  - Tab closed: VAPID Web Push (service worker → OS notification → click opens `/admin/orders`).
- **Day/Night dynamic pricing**: per-vendor rules (`night_pricing_enabled`, `night_start`/`night_end` in IST, `night_multiplier`, `night_categories`). Server is the source of truth — `place_order` recomputes prices from DB regardless of client-submitted values.
- **Geolocation**: customer Checkout uses `navigator.geolocation.getCurrentPosition`; lat/lng stored on order; vendor modal renders Google Maps deep link.
- **Bulk CSV import**: `POST /api/vendor/products/bulk` (max 1000 rows; partial-success returns `{created, errors}`); optional `replace_existing` wipes prior catalog.
- **PWA**: `manifest.json` (display=standalone) + `service-worker.js` (network-first navigations, offline shell, push handler).

## Implemented (as of Feb 2026)

### Phase 0 — backend rewrite
- Multi-tenant data model, public + master + vendor routers, atomic per-vendor sequence, UPI 5-digit gate, liquor ₹1000 min server-side, master + demo vendor seeded on startup.

### Phase 1 — frontend rewrite
- Slug-scoped customer flow (Storefront → Menu → Products → Cart → Checkout w/ UPI verify or COD → Confirmation → Track) with slug-bound CartContext.
- Role-aware admin: vendor dashboard with OPEN/CLOSE toggle + 7-state pipeline; vendor orders + products + store-settings; master dashboard + master vendors (onboard/disable + auto-credentials modal).

### Phase 2 — Vendor empowerment
- Self-serve image upload (`<ImageUpload>` for products + payment QR).
- Self-serve password change on `/admin/store`.
- In-tab sound + browser notification on new orders.

### Phase 3 — Channels & growth (this session)
- **Web Push (VAPID + service worker)**: vendor admins receive notifications even with the tab closed; click → `/admin/orders`. Auto-cleanup of stale 410/404 endpoints. `POST /api/vendor/push/{subscribe,unsubscribe,test}`. Backend validates `endpoint + keys.p256dh + keys.auth`.
- **PWA**: manifest + service worker; installable, theme color, offline shell.
- **Day/Night dynamic pricing**: vendor UI (`NightPricingCard`) + server-authoritative pricing in `place_order` (ignores client `price`, recomputes from DB).
- **Geolocation**: capture-location button at checkout; Google Maps link in vendor order modal.
- **Bulk CSV import**: dropzone modal + parser + preview + replace-existing toggle + 1000-row cap.

### Verified by testing agent (iteration_6.json)
- Backend: 17/17 new + 5/5 iter4 + 28/29 multitenant (1 demo-product-count assert reset by replace_existing test → reseeded).
- Frontend: PWA + SW + AdminStore NightPricing + AdminProducts BulkImport all verified end-to-end. Vendor push UI banner only partially testable in headless Chromium (env limitation; data-testids exist; backend pytest verifies the API).

## Files of Reference
- Backend: `backend/server.py`, `backend/seed_data.py`, `backend/.env` (VAPID keys), `backend/tests/{test_multitenant,test_iter4_features,test_iter6_features}.py`
- Frontend:
  - `frontend/src/App.js`
  - `context/{Cart,AdminAuth}Context.jsx`
  - `lib/{apiClient,format,apiError,push}.js`
  - `hooks/useNewOrderAlerts.js`
  - `components/{ImageUpload,Header,ProductCard,QuantityStepper,StickyCartBar}.jsx`
  - `pages/{Landing,StorefrontHome,Categories,Products,Cart,Checkout,Confirmation,TrackOrder,StoreClosed}.jsx`
  - `pages/admin/{AdminLogin,AdminLayout,AdminDashboard,AdminOrders,AdminProducts,AdminStore,MasterDashboard,MasterVendors,orderStatus}.{jsx,js}`
  - `public/{manifest.json,service-worker.js,index.html}`

## Roadmap

### P1 — DONE
- Image upload, password change, sound/browser notifications, Web Push, PWA, dynamic pricing, geolocation + maps, bulk CSV.

### P2 — Polish
- Customer-side address auto-fill from geolocation (reverse geocode)
- Vendor analytics: peak hours, night-pricing GMV uplift
- Rate-limit anonymous `/api/orders` to prevent abuse
- Capacity-aware bulk import (chunked > 200 rows)
- Bulk import: require explicit `confirm_replace:'YES'` for destructive replace_existing
- Parallelize push fanout via `asyncio.gather`

### P3 — Refactoring
- Migrate `server.py` from `@app.on_event` to FastAPI `lifespan`
- Split into `/app/backend/routes/{public,master,vendor,auth,uploads,push}.py` (server.py is now ~970 lines)
- Replace native `<input type="time">` with shadcn time picker

### P4 — SaaS-grade
- Stripe billing for vendor subscriptions (master can mark `subscription_expires_at`)
- Per-vendor analytics + peak-hour insights
- Customer search, recently-ordered
- Per-product image GridFS for high-image-count tenants
- Multi-region pricing (replace hardcoded IST in `is_night_active`)
