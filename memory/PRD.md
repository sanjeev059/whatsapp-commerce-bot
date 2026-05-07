# Local Commerce — Hyperlocal WhatsApp Storefront PRD

## Original Problem Statement
Build a mobile-first hyperlocal commerce platform optimized for the WhatsApp ordering flow. Customer scans QR code at local liquor/MRP store → WhatsApp opens → customer taps "Open Store" → beautiful mobile storefront → cart → checkout → formatted order summary opens in WhatsApp directly with vendor. Inspirations: Blinkit, Swiggy Instamart, Zepto. Mock data only. No auth. No payments.

## User Personas
- **Customer**: walks up to a local store, scans QR, browses items on phone, places order via WhatsApp.
- **Vendor (future)**: receives orders directly in their WhatsApp Business inbox.

## Core Requirements (Static)
- Premium dark mobile-first UI (max-width 480px phone-frame on desktop)
- 4 categories: Liquor, Cigarettes, Snacks, Food
- Liquor minimum subtotal ₹1000 rule (warn + block)
- Cigarettes: Full Pack Only enforcement (badge + notice)
- Sticky cart bar with live total and item count
- WhatsApp `wa.me` deep-link checkout — no payment gateway
- Mock data only, FastAPI serves `/api/catalog`
- Tech: React + Tailwind + FastAPI

## What's Been Implemented (May 7, 2026)
- ✅ Backend `/api/catalog` returning 4 categories, 13 subgroups, 54 mock products with images, prices, units, tags
- ✅ Landing page with hero, gradient blobs, "Open Store" CTA, feature pills
- ✅ Categories grid with hero images and tagline cards
- ✅ Products page with subgroup chips (Beer/Whisky/Vodka/Rum/Gin etc.), product cards, ADD-to-stepper swap
- ✅ Cigarettes page shows "Full Pack Only" notice + per-product tags
- ✅ Cart page: category-grouped, quantity steppers, remove, FREE delivery line, bill summary
- ✅ Liquor min ₹1000 rule: red warning, disabled checkout button when below
- ✅ Sticky cart bar visible on landing/store/products, hidden on /cart /checkout /confirmation
- ✅ Checkout: name, phone, address, notes form with validation (toast errors)
- ✅ Place Order opens wa.me link with emoji-grouped order summary, then routes to /confirmation
- ✅ Confirmation page: ref ID, summary, re-open WhatsApp, copy summary, back-to-store
- ✅ Cart persistence in localStorage (lc_cart_v1)
- ✅ Image fallback (SVG initial) for broken Unsplash URLs
- ✅ Design: Plus Jakarta Sans + Manrope, emerald-amber accent gradients, premium dark surfaces
- ✅ All interactive elements have `data-testid`
- ✅ Tested: 100% backend + 100% frontend (testing_agent_v3 iteration 1)

## Prioritized Backlog
- **P1**: Vendor admin dashboard (login, orders list, status updates)
- **P1**: Real database persistence with order audit trail
- **P2**: Order tracking link back to customer (status updates via WhatsApp)
- **P2**: Search + recently ordered
- **P2**: Multi-vendor / multi-store support keyed off QR
- **P3**: Subscriptions (e.g., weekly beer pack)
- **P3**: Analytics for vendor (top products, peak hours)

## Files of Reference
- `backend/server.py` — `/api/catalog`
- `frontend/src/App.js` — routes
- `frontend/src/pages/{Landing,Categories,Products,Cart,Checkout,Confirmation}.jsx`
- `frontend/src/context/CartContext.jsx` — cart state, totals, byCat for liquor rule
- `frontend/src/lib/whatsapp.js` — buildOrderMessage, buildWhatsAppLink
- `frontend/src/config.js` — VENDOR_PHONE, CATEGORY_RULES
- `frontend/src/components/{StickyCartBar,ProductCard,QuantityStepper,Header}.jsx`

## Next Tasks
- Hand off to user for vendor phone configuration
- Optional: add vendor admin panel (P1)
