# Gharsip Custom Prints

**Brand:** Gharsip Custom Prints · **Tagline:** Wear Your Vibe  
Next.js storefront with **live tee preview**, cart, checkout, demo payment flow, tracking UI, and a simple **admin** dashboard.

## Deploy on Vercel

1. In the **monorepo**, set Vercel **Root Directory** to **`frontend`** (this folder).
2. Framework preset: **Next.js**.
3. Optional env: **`NEXT_PUBLIC_ADMIN_PIN`** for `/admin` (see repo root **`DEPLOY_PRINTS.md`**).
4. Default admin PIN is `gharsip2026` unless you set `NEXT_PUBLIC_ADMIN_PIN`.

## Pricing (canonical)

| Type        | Printed | Plain |
|------------|---------|-------|
| Round neck | ₹399    | ₹249  |
| V-Neck     | ₹419    | ₹269  |
| Oversized  | ₹449    | ₹299  |
| Polo       | ₹469    | ₹319  |

Printed price = plain + ₹150 design line (shown in UI).  
Delivery: **₹60** below **₹999**, free above.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home + hero |
| `/customize` | Live customizer (gallery + SVG tee + overlays) |
| `/gallery` | Full design gallery |
| `/cart` | Cart |
| `/checkout` | Address + coupon `GHARSIP10` (−10% capped ₹100 demo) |
| `/payment` | **Simulate paid order** until Razorpay is wired |
| `/order-confirmed` | Success + WhatsApp deeplink |
| `/track` | Timeline (stored per-browser for demo) |
| `/admin` | Ops table + Qikink JSON copy |

## Next steps (your Phase 2+)

1. **Razorpay:** Create orders + verify signature server-side (`app/api/` route), never trust client-only success.
2. **Firestore:** Replace `localStorage` order index with `orders` / `designs` collections (schema in your brief).
3. **Qikink:** Call real API from the verified-payment webhook; store `tracking_number` / `qikink_order_id`.
4. **WhatsApp:** Cloud API templates for shipped / confirmed.
5. **Images:** Swap `placehold.co` URLs in `lib/designs.ts` for uploads (Firebase Storage + Cloudinary optional).

## Local dev

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API stub

`POST /api/fulfillment/qikink` logs the JSON body and returns a fake reference — swap for vendor integration.
