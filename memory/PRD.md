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

### Phase 3 — Channels & growth
- **Web Push (VAPID + service worker)**: vendor admins receive notifications even with the tab closed; click → `/admin/orders`. Auto-cleanup of stale 410/404 endpoints. `POST /api/vendor/push/{subscribe,unsubscribe,test}`. Backend validates `endpoint + keys.p256dh + keys.auth`.
- **PWA**: manifest + service worker; installable, theme color, offline shell.
- **Day/Night dynamic pricing**: vendor UI (`NightPricingCard`) + server-authoritative pricing in `place_order` (ignores client `price`, recomputes from DB).
- **Geolocation**: capture-location button at checkout; Google Maps link in vendor order modal.
- **Bulk CSV import**: dropzone modal + parser + preview + replace-existing toggle + 1000-row cap.

### Phase 4 — Insights & abuse-prevention
- **Vendor analytics** (`/admin/analytics`): peak-hour bar chart (IST), day-of-week chart, night-pricing GMV uplift (₹ + %), top-5 products, category mix. Range chips 7/30/90 days.
- **Reverse geocoding**: customer Checkout's "share live location" auto-fills the empty address (OpenStreetMap Nominatim, no API key, rate-limited 20/min/IP server-side).
- **Anonymous order rate-limit**: 3/min + 12/hr per IP, sliding window in-memory, 429 with Retry-After. Customer Checkout handles 429 gracefully.

### Phase 5 — Launch hardening + Customer QR/PWA (this session)
- **CORS** is now env-driven: when `CORS_ORIGINS` is set, allow_credentials=True with the whitelist; otherwise dev-fallback `*` without credentials. Documented in `/app/memory/test_credentials.md`.
- **JWT_SECRET** rotated to a strong 86-char URL-safe random value. Documented for prod rotation in Emergent env.
- **Default-password enforcement**: `password_must_change` flag on master + seed vendor + every new vendor onboarded by master. Exposed via `/auth/me` and cleared on `/auth/change-password`. AdminLayout shows a red `seed-password-banner` that routes to `/admin/store` (vendor) or `/admin/master/security` (master). Master security page is a new route at `/admin/master/security`.
- **Per-vendor QR code**: `GET /api/storefront/<slug>/qr.png?size=N` returns a server-generated PNG. `<StorefrontQRCard>` on `/admin/store` shows it with **Download / Print / Share** buttons. Master onboarding modal also embeds a QR preview + Print button so the master can hand the printable poster to the vendor at sign-up.
- **Customer Add-to-Home-Screen**: `<PerVendorPWA>` injects a per-vendor manifest into `<head>` on `/store/<slug>` (server-rendered at `/api/storefront/<slug>/manifest.json` so no FOUC) + iOS apple-* meta tags. `<InstallAppHint>` shows a bottom bar that catches Android `beforeinstallprompt` for one-tap install or shows the iOS Safari Share→Add-to-Home modal — exactly like Codespaces.
- ✅ Verified by testing agent (iteration_8.json): 11/11 backend tests pass + all frontend testids verified including blob/server manifest, QR PNG, master security route, credentials modal QR. Test cleanup also removed 8 leftover test vendors from prior iterations.

### Phase 5 — Delivery boy handoff (Feb 2026)
- **One-time delivery link** with **mandatory photo proof** to close the trust gap on dispatched orders, without requiring the delivery boy to install anything.
- Backend: `delivery_token` (16-char hex) auto-generated on every order. Backfill migration ran for legacy orders.
  - `GET /api/delivery/{token}` → returns sanitized order payload + `is_actionable` (true only when status = `out_for_delivery`).
  - `POST /api/delivery/{token}/delivered` (multipart `file`) → enforces photo upload (≤3MB, image/* MIME), persists `proof_image_id`, flips status to `delivered`, returns 409 on duplicate attempts (one-time-link guarantee).
- Frontend: `/d/:token` route mounted in `App.js`, page = `DeliveryHandoff.jsx` — strips Authorization header, shows order details, drop-off info, COD-collect alert, hidden file input wired to camera (`capture="environment"`), preview + retake, full-width "Mark Delivered" CTA disabled until photo present, success view shows the proof image.
- Vendor flow: `AdminOrders.jsx` modal renders **Send to delivery boy** section (only when order status = `out_for_delivery`) with **Share on WhatsApp** (`wa.me` deep link with pre-filled order summary + delivery URL) + **Copy link** buttons.
- ✅ Verified by testing agent (iteration_9.json): 6/6 backend pytest pass + 7/7 frontend flows including invalid-token, dispatch UI, photo upload via multipart, completed view, and one-time-link reopen guarantee.

### Phase 6 — Manual subscription billing (Feb 2026)
- **Manual UPI subscription model** (no Stripe — master-controlled). Master sets a single platform UPI QR; vendors see it on a paywall when their subscription is inactive or expired.
- Backend additions:
  - `db.settings` doc `{id:"platform_billing", upi_id, upi_name, whatsapp, monthly_fee_inr=5000, note_to_vendor}`.
  - `GET/PATCH /api/master/billing` (master-only) for editing.
  - `GET /api/billing/qr.png` (public) generates a UPI-intent QR (`upi://pay?pa=<upi>&pn=<name>&am=<fee>&cu=INR&tn=GharSip subscription`). Cached 5 min.
  - `GET /api/vendor/billing` (vendor-only) returns `{platform: {...}, subscription: {active, expires_at, days_remaining, is_expired}}`.
  - `subscription_active` and `subscription_expires_at` already present on vendor schema; master can edit both via existing `PATCH /api/master/vendors/{id}`.
- Frontend additions:
  - **Master Billing page** `/admin/master/billing` (`MasterBilling.jsx`): UPI ID + name + fee + WhatsApp + note editor with **live QR preview** (cache-busted) and **download QR** button. New "Billing" link in the master sidebar (Wallet icon).
  - **Master Vendors page** (`MasterVendors.jsx`): new **Sub. Expiry** column showing date + "N days left" / "expired Nd ago"; calendar-icon button per row opens `window.prompt('YYYY-MM-DD')` to set/clear expiry (sets to 23:59 IST so the day counts).
  - **Vendor Paywall** (`VendorBillingPaywall.jsx`): full-screen lock when `subscription.is_expired || !active` — shows reason, fee, scannable platform QR, copy-UPI button, WhatsApp prefilled message ("paid for &lt;vendor&gt;, please reactivate"), and sign-out. AdminLayout gates `<Outlet/>` behind it across all vendor routes.
  - **Vendor warning banner** when `days_remaining <= 7` (amber `[data-testid=sub-warning-banner]`).
  - AdminLayout polls `/api/vendor/billing` every 60s so master flipping `subscription_active=true` reflects without re-login.
- Other launch-ready tweaks shipped this iteration:
  - Stripped Emergent badge + `emergent-main.js` + PostHog tracker from `index.html`.
  - Document title → `GharSip — Hyperlocal Liquor Delivery`.
  - Landing CTA renamed `Try the demo store` → `Liquor Store`.
- ✅ Verified by testing agent (iteration_10.json): 9/9 backend pytest pass + 12/12 frontend flows including paywall trigger/lift, expiry persistence, warning banner, badge removal, title.

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
- Image upload, password change, sound/browser notifications, Web Push, PWA, dynamic pricing, geolocation + maps, bulk CSV, vendor analytics, reverse geocoding, /api/orders rate-limit.

### P2 — Polish
- LRU cache the Nominatim reverse-geocode results (~5min TTL, key=(round(lat,3), round(lng,3)))
- Configurable `NOMINATIM_USER_AGENT` from env (currently hardcoded)
- Skip rate-limit bucket increment on 4xx body-validation failures (so a customer mistyping their order doesn't lock themselves out for 60s)
- Vendor analytics: switch from in-Python aggregation to MongoDB `$group` pipeline
- Customer-side address auto-fill: chip showing "Use captured location" instead of overwriting
- Bulk import: require explicit `confirm_replace:'YES'` for destructive wipes
- Parallelize push fanout via `asyncio.gather`

### P3 — Refactoring
- **server.py is now ~1160 lines** — split into `/app/backend/routes/{public,master,vendor,auth,uploads,push,analytics}.py` and pull helpers (`rate_limit`, `reverse_geocode`, push, pricing) into modules.
- Migrate `server.py` from `@app.on_event` to FastAPI `lifespan`
- Replace native `<input type="time">` with shadcn time picker
- Move rate limiter from in-memory to Redis when scaling beyond 1 backend pod

### P4 — SaaS-grade
- ✅ Manual UPI subscription with master-controlled paywall (DONE iter-10).
- Per-vendor analytics + peak-hour insights
- Customer search, recently-ordered
- Per-product image GridFS for high-image-count tenants
- Multi-region pricing (replace hardcoded IST in `is_night_active`)

### Explicitly de-scoped by user (Feb 2026)
- ❌ Vendor self-onboarding `/apply` page — user prefers to onboard vendors manually via marketing team.
- ❌ `/find-near-me` customer discovery page — not needed at this stage; vendors share their per-store QR directly.
- ❌ Stripe automated subscription billing — replaced with manual UPI QR + master toggle (iter-10).
