# Local Commerce — Hyperlocal WhatsApp Storefront

Mobile-first hyperlocal commerce MVP. Customers browse a Blinkit-style storefront, build a cart, and on **Place Order** the formatted order summary opens directly in WhatsApp (`wa.me` deep link) ready to send to the vendor. Includes a **vendor admin dashboard** to track orders + manage products.

> **Vendor WhatsApp number is currently set to** `+91 6305468471`.
> Change it in `frontend/.env` (`REACT_APP_VENDOR_PHONE`) any time.

---

## ⚡ Run on GitHub Codespaces (1-click)

1. Push this repo to GitHub (use the **"Save to GitHub"** button in the chat input).
2. On GitHub, click **Code → Codespaces → Create codespace on main**.
3. Wait for the devcontainer to build (~2 min on first run — installs Python, Node 20, MongoDB, all deps).
4. In the Codespaces terminal:
   ```bash
   ./start.sh
   ```
5. Two ports forward automatically. Click the toast to open **port 3000 — Storefront**.
   - Storefront: `https://<your-codespace>-3000.app.github.dev`
   - Vendor admin: `…/admin/login`  →  `admin@store.com` / `admin123`

The script auto-detects your Codespace URL and writes the right `REACT_APP_BACKEND_URL` so the frontend can talk to the backend.

> Make sure ports **3000** and **8001** are set to **Public** in the Ports tab — otherwise WhatsApp on your phone (a different network) can't load the storefront.

---

## 💻 Run locally

```bash
# 1. Start MongoDB (locally or via Docker)
docker run -d -p 27017:27017 --name lc-mongo mongo:7

# 2. Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env  # or hand-create as below
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 3. Frontend (new terminal)
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
echo "REACT_APP_VENDOR_PHONE=916305468471" >> .env
yarn start
```

Open `http://localhost:3000`.

### Required env vars

`backend/.env`:
```
MONGO_URL="mongodb://127.0.0.1:27017"
DB_NAME="local_commerce"
CORS_ORIGINS="*"
JWT_SECRET="<run python -c 'import secrets;print(secrets.token_hex(32))'>"
ADMIN_EMAIL="admin@store.com"
ADMIN_PASSWORD="admin123"
```

`frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001    # or your public backend URL
REACT_APP_VENDOR_PHONE=916305468471            # international format, no '+'
```

---

## 🛒 Demo flow

### Customer
1. Open storefront URL on a phone.
2. **Open Store** → pick a category → **ADD** a product.
3. Tap the green sticky cart bar → **Proceed to Checkout**.
4. Fill name/phone/address → **Place Order via WhatsApp**.
5. WhatsApp opens with the order pre-filled to the vendor → tap **Send**.

### Vendor (admin)
1. Open `/admin/login` → `admin@store.com` / `admin123`.
2. **Dashboard** shows today's revenue, orders pipeline, recent orders.
3. **Orders** tab — filter by status, click a row to open detail modal, change status, message customer back via WhatsApp.
4. **Products** tab — full CRUD with category + subgroup picker.

The customer order is persisted in MongoDB the moment they tap *Place Order*, so the vendor sees it in the dashboard within ~15 seconds (auto-poll), even if the customer never hits Send in WhatsApp.

---

## 📨 WhatsApp order format

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
📍 *Delivery Address:* HSR Layout Sector 2
📝 *Notes:* Extra spicy wings
💵 *Payment Mode:* Cash on Delivery
```

---

## 🧱 Tech Stack

| Layer    | Tech                                                    |
| -------- | ------------------------------------------------------- |
| Frontend | React 19 · Tailwind · React Router · lucide-react       |
| Backend  | FastAPI · Motor · bcrypt · PyJWT                        |
| Database | MongoDB                                                 |
| Tooling  | Yarn · Craco · Codespaces devcontainer                  |

---

## 🌐 Deploy

- **Vercel (frontend)** — set `REACT_APP_BACKEND_URL` and `REACT_APP_VENDOR_PHONE` env vars to your prod backend URL + vendor number.
- **Render / Railway (backend)** — start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`. Set `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- **MongoDB Atlas** for managed DB — drop the connection string into `MONGO_URL`.

---

## 🗺️ Roadmap

- Order tracking link sent back to customer (status pushed via WhatsApp)
- Multi-vendor / per-store QR codes deep-linking to a specific catalog
- Customer-side search, returning-customer history
- Subscriptions, vendor analytics
- Browser push / sound alerts on new order in admin

---

Built as a demo-ready MVP for local liquor / kirana / food vendors who want a *Blinkit-on-WhatsApp* experience without a payment gateway.
