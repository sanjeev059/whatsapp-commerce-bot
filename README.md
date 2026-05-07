# Local Commerce — Hyperlocal WhatsApp Storefront

A mobile-first hyperlocal commerce MVP. Customers browse a Blinkit-style storefront, build a cart, and on **Place Order** the formatted order summary opens directly in WhatsApp (`wa.me` deep link) ready to send to the vendor.

> **Demo flow**: QR code at the store → WhatsApp opens → customer taps "Open Store" link → mobile storefront → checkout → order summary auto-pre-filled in WhatsApp → tap **Send**.

---

## ✨ Features

- **Mobile-first dark UI** styled like Blinkit / Swiggy Instamart / Zepto
- **4 categories** — Liquor (Beer, Whisky, Vodka, Rum, Gin), Cigarettes, Snacks, Food
- **Sticky live cart bar** with quantity steppers, category-grouped cart
- **Business rules**
  - 🍻 Liquor: minimum subtotal **₹1000** (warning + checkout blocked if below)
  - 🚬 Cigarettes: **Full Pack Only** badges + notice
- **WhatsApp deep-link checkout** — emoji-grouped order summary, no payment gateway needed
- **Confirmation screen** with reference ID, copy summary, re-open WhatsApp
- **No auth, no DB writes** — pure mock data, demo-ready in seconds
- **localStorage cart persistence** so refresh doesn't lose items

## 🧱 Tech Stack

| Layer    | Tech                                    |
| -------- | --------------------------------------- |
| Frontend | React 19 · Tailwind · React Router · lucide-react |
| Backend  | FastAPI · uvicorn (just serves `/api/catalog`) |
| Tooling  | Yarn · Craco                             |

## 🚀 Quick Start (local)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (in another terminal)
cd frontend
yarn install
yarn start    # http://localhost:3000
```

Set `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_VENDOR_PHONE=919999999999   # vendor WhatsApp number, no '+'
```

## 🛒 Order Format (WhatsApp)

When the customer taps **Place Order**, this message is generated and pre-filled in WhatsApp:

```
🛒 *New Order*

*Customer:* Rahul
*Phone:* +91XXXXXXXXXX

🍻 *Liquor*
• Blender's Pride x1
• Kingfisher Strong x2

🚬 *Cigarettes*
• Marlboro Advance x1

🍔 *Food*
• Loaded Chicken Burger x1

💰 *Total:* ₹2,450

📍 *Delivery Address:*
HSR Layout Sector 2

📝 *Notes:*
Extra spicy wings

💵 *Payment Mode:* Cash on Delivery
```

## ⚙️ Configuration

Edit `frontend/src/config.js`:
```js
export const VENDOR_PHONE = "919999999999";   // override via REACT_APP_VENDOR_PHONE
export const CATEGORY_RULES = {
  liquor: { minSubtotal: 1000 },
  cigarettes: { fullPackOnly: true },
};
```

## 🌐 Deployment Notes

- **Vercel (frontend)** — root-set `REACT_APP_BACKEND_URL` to your backend URL.
- **Render / Railway (backend)** — `uvicorn server:app --host 0.0.0.0 --port $PORT`.
- **GitHub Codespaces** — both work out of the box; expose ports 3000/8001.

## 🗺️ Roadmap

- Vendor dashboard (orders, status, analytics)
- Subscriptions / recurring orders
- Real DB persistence + multi-vendor (currently single-vendor MVP)
- Order tracking link sent back to customer
- Search + recently-ordered

---

Built as a demo-ready MVP for local liquor / kirana / food vendors who want a "Blinkit-on-WhatsApp" experience without setting up a payment gateway.
