# Local Commerce — Hyperlocal Commerce SaaS PRD

## Original Problem Statement
Production-style hyperlocal commerce SaaS optimized for local MRP/liquor stores, cigarette shops, snack stores, and food delivery. Multi-tenant, web-only (no WhatsApp), with QR-based UPI payment + last-5-digit verification, real-time tracking, and store open/close controls.

## Pivot decision (locked)
WhatsApp/Twilio integration **dropped** to avoid acting as the merchant of record for liquor. Architecture is now 100% web-based: PWA-friendly customer storefronts (slug-based) + tracking pages + role-scoped admin dashboards.

## Personas
- **Master Admin**: platform owner. Onboards/disables vendors, sees platform-wide GMV.
- **Vendor Admin**: store owner. Manages products, orders, store hours, UPI ID, QR.
- **Customer**: public, no auth. Scans QR → store/<slug> → cart → checkout → /track/<token>.

## Architecture
- **Stack**: React + TailwindCSS + FastAPI + MongoDB + bcrypt + PyJWT
- **Multi-tenant**: vendor slug (e.g. `sharma-wines`). Storefront URL: `/store/<slug>`.
- **Auth**: JWT in `localStorage["lc_admin_token"]`; `auth_user` middleware decodes role + vendor_id.
- **Role isolation**: `require_master` and `require_vendor` dependencies; vendors are scoped to their own `vendor_id` for products/orders/stats.
- **Order lifecycle (7 states)**: `payment_verification_pending → payment_verified → accepted → out_for_delivery → delivered` (+ `rejected`, `cancelled`).
- **UPI verification**: customer enters last 5 digits of UPI txn ID; vendor matches against UPI app history before flipping to `payment_verified`.

## Implemented (as of Feb 2026)

### Phase 0 — backend rewrite (previous session)
- Multi-tenant data model: `vendors`, `users`, `categories`, `subgroups`, `products`, `orders`
- Public storefront API, master/vendor/admin role-scoped routers
- Atomic per-vendor order sequence, tracking_token (16 hex), UPI 5-digit gate, liquor ₹1000 min server-side
- Master admin + demo vendor seeded on startup

### Phase 1 — frontend rewrite (this session)
- ✅ Slug-scoped customer flow: Landing → /store/:slug (StorefrontHome) → /menu (Categories) → /c/:catId (Products) → /cart → /checkout → /confirmation → /track/:token
- ✅ Slug-aware CartContext that resets when slug changes
- ✅ Checkout: UPI mode with auto-generated QR (or vendor-uploaded QR URL) + 5-digit verification block; COD fallback
- ✅ Confirmation page with state-aware copy ("Payment under review" vs "Order placed")
- ✅ TrackOrder polling + 7-state pipeline visual
- ✅ Role-aware AdminLogin (auto-redirects to `/admin/master` or `/admin`)
- ✅ AdminLayout switches sidebar/bottom-nav between master and vendor
- ✅ Vendor dashboard: stats, 7-state pipeline, recent orders, OPEN/CLOSE toggle, UPI-not-set CTA
- ✅ Vendor orders: filter chips for all 7 states, UPI•last5 + COD badges, payment-verify CTA, transition-aware next-state buttons
- ✅ Vendor products CRUD against `/api/vendor/products`
- ✅ Vendor store settings: name, address, UPI ID, payment QR URL, hours, open/close, license info, copy-storefront-link
- ✅ Master dashboard: vendors_total, GMV, recent orders, vendors quick list
- ✅ Master vendors: list + onboard modal (name/owner/phone/UPI/license/ToS) + post-create credentials modal + soft-deactivate / reactivate
- ✅ Cleanup: removed obsolete WhatsApp lib + VENDOR_PHONE config

### Verified by testing agent (iteration_3.json)
- 35/35 backend pytest pass
- All frontend Playwright flows green
- Role isolation 403/401 contracts verified

## Files of Reference
- `backend/server.py` — public + master + vendor routers, role middleware
- `backend/seed_data.py` — categories/subgroups + demo vendor `sharma-wines`
- `backend/tests/test_multitenant.py` — canonical regression suite
- `frontend/src/App.js` — slug-scoped routes
- `frontend/src/context/CartContext.jsx` — slug-bound cart
- `frontend/src/pages/{StorefrontHome,Categories,Products,Cart,Checkout,Confirmation,TrackOrder,StoreClosed,Landing}.jsx`
- `frontend/src/pages/admin/{AdminLogin,AdminLayout,AdminDashboard,AdminOrders,AdminProducts,AdminStore,MasterDashboard,MasterVendors,orderStatus}.{jsx,js}`

## Roadmap

### P1 — Polish & Vendor empowerment
- Vendor product image upload to Cloudinary (currently URL-only)
- Vendor QR image upload (currently URL-only; auto-QR fallback in place)
- PWA + Web Push (VAPID) for new-order browser notifications + sound for vendor

### P2 — Operational
- Day/night dynamic pricing per category
- Geolocation capture in checkout + Google Maps link in vendor order detail
- Bulk product CSV import for vendors
- Vendor self-serve password change

### P3 — Refactoring
- Migrate `server.py` from `@app.on_event` to FastAPI `lifespan`
- Split `server.py` into `/app/backend/routes/{public,master,vendor,auth}.py`
- Replace `<input type="time">` with shadcn time picker for visual consistency

### P4 — Future / SaaS-grade
- Stripe billing for vendor subscriptions (master can mark subscription_expires_at)
- Per-vendor analytics + peak-hour insights
- Customer-side recently-ordered + search
