# 🚀 Going Live — full WhatsApp + UPI flow

Once you push and pull these changes into your Codespace, everything below is one-time setup. After this, the full QR → Bot → Storefront → UPI → WhatsApp notification → Vendor accepts → Customer notified loop is live.

---

## 1. Get Twilio credentials

1. Sign up / log in: https://console.twilio.com
2. Top-right of dashboard, copy:
   - **Account SID** (starts with `AC…`)
   - **Auth Token** (32 chars, click "show")
3. Sandbox WhatsApp number is `whatsapp:+14155238886` (printed on the sandbox page)

> Both **vendor** and **demo customer** must "join the sandbox" first by texting the join code to `+1 415 523 8886` from their WhatsApp. The Twilio console shows the join phrase, e.g. `join lazy-tiger`.

## 2. Fill `backend/.env`

In your Codespace terminal:
```bash
cd /workspaces/whatsapp-commerce-bot/backend
nano .env
```

Set the values (replace the `PLACEHOLDER_…`):
```
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

VENDOR_NAME="Demo Store"
VENDOR_WHATSAPP_TO="+916305468471"
VENDOR_UPI_ID="sanjeev@axl"          # your real UPI ID for the QR

# Set this AFTER you make port 3000 Public in the Codespace Ports tab:
STOREFRONT_URL="https://urban-space-chainsaw-7vxgqr9qvr43pw4q-3000.app.github.dev"
```

Restart the backend (Ctrl+C the running `./start.sh` then `./start.sh` again).

## 3. Wire the Twilio Sandbox webhook (inbound)

So that customer messages texted *to* the sandbox come back to your bot:

1. https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Find **"Sandbox Configuration"** → **"WHEN A MESSAGE COMES IN"**
3. Paste your **public** backend URL ending in `/api/webhook`:
   ```
   https://<your-codespace>-8001.app.github.dev/api/webhook
   ```
4. Method: **HTTP POST** → **Save**

> **Crucial**: in the Codespaces *PORTS* tab, both **3000** AND **8001** must be **Public** (right-click → Port Visibility → Public).

## 4. Make the Vendor QR sticker

The QR you put at your store should open WhatsApp pre-filled with "Hi" to the **Twilio sandbox** number (during demo). Use this URL — encode as QR via any free generator (qr-code-generator.com, or just paste in Google):

```
https://wa.me/14155238886?text=join%20<your-sandbox-code>%20Hi
```

So the customer's **first scan** automatically joins them to your sandbox AND triggers the bot's "Hi" greeting in the same tap. After that, all bot/order messages flow.

For production (post-sandbox, paid WABA) the QR becomes simply:
```
https://wa.me/916305468471?text=Hi
```

## 5. Test the full loop

Use **two phones** (or same phone twice with different chats):

### Phone 1 — vendor (you)
- Open `/admin/login` on a laptop
- Login: `admin@store.com` / `admin123`

### Phone 2 — customer (also you, same number for demo since both = `6305468471`)
1. Scan the vendor QR → WhatsApp opens pre-filled → tap Send
2. Bot replies: "Welcome! Tap to browse → `<storefront URL>`"
3. Tap the link → storefront opens in mobile browser
4. Browse → add Jameson (₹2,900) → Cart → Checkout
5. Fill name/phone (`+916305468471`) /address → choose **Pay via UPI**
6. Scan the on-page UPI QR with PhonePe (or just tap "I've paid" for demo)
7. Tap **Confirm Order**
8. **You receive 2 WhatsApp messages**:
   - "🔔 NEW ORDER LCxxxxxx" (as vendor)
   - "🛒 Order received!" (as customer)
9. On laptop, refresh `/admin/orders` → new order appears
10. Click order → set status to **Preparing**
11. **WhatsApp ping**: "🍳 Order accepted!"
12. Set status to **Out for delivery**
13. **WhatsApp ping**: "🛵 Order on the way!"
14. Set status to **Delivered**
15. **WhatsApp ping**: "✅ Order delivered!"

That's the full E2E loop. 🎉

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Backend logs say `(Twilio not configured) would send to…` | `backend/.env` still has placeholder values OR backend wasn't restarted after editing .env |
| Twilio dashboard shows messages with status `failed` and error 63007 | Recipient hasn't joined the sandbox. Send `join <code>` to `+14155238886` from that WhatsApp first |
| Customer doesn't receive messages but vendor does | Customer's number not joined to sandbox. Same fix as above |
| `/api/webhook` returns 404 in Twilio's sandbox debug | Port 8001 isn't Public, OR webhook URL has a typo (must end in `/api/webhook`) |
| "Sender from non-allowed number" | Your `TWILIO_WHATSAPP_FROM` is wrong — must be exactly `whatsapp:+14155238886` for sandbox |

---

## What changed in this iteration (for review)

- Added `backend/whatsapp_service.py` — `wa.send()` + templates (gracefully no-ops if creds missing)
- `POST /api/orders` now fires **vendor + customer** notifications on placement
- `PATCH /api/admin/orders/{id}` fires **customer** notification on every status change
- `/api/vendor` (public) returns vendor name + UPI ID + WhatsApp for the storefront UI
- `/api/webhook` (Twilio inbound) bot now: greets, surfaces storefront link, walks chat menu, **persists final orders to admin DB**, notifies vendor
- Checkout: payment selector (UPI default / COD), live UPI QR via `qrcode.react`, "I've Paid" confirm
- Confirmation: messaging changed to reflect "vendor will be notified" instead of "tap Send in WhatsApp"
