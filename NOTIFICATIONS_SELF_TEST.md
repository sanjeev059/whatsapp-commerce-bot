# 🔔 Notifications self-test (Web Push + sound)

This is a 90-second checklist you can run on your phone to confirm new-order
alerts are wired correctly. Two channels are tested:

1. **In-app sound** — plays whenever the vendor admin tab is open and a new order arrives (uses `/admin/orders` polling at 15s + a small WebAudio chime).
2. **Web Push** — the OS-level notification that fires even when the tab is in the background or the phone is locked, via the service worker + VAPID keys.

---

## ✅ Pre-flight

- Open `https://www.gharsip.com/admin/login` on your phone.
- Log in as the vendor admin (`<slug>@vendor.local` / `<slug>123`).
- Tap **Add to Home Screen** if you haven't (Safari → Share → "Add to Home Screen", or Chrome → ⋮ → "Install app"). Push notifications are most reliable from the installed PWA on iOS.

---

## 1️⃣ In-app sound test (10 sec)

1. Open the installed PWA.
2. Tap **Orders** in the bottom nav.
3. From any *other device* (or browser incognito), open `https://www.gharsip.com/store/<your-slug>` and place a small ₹10 test order (1 cheap product, COD).
4. Within ~15 seconds the Orders screen should:
   - Show the new order at the top of the list.
   - Play a short two-note chime.

❌ **No chime?**
- Make sure your phone is not on silent / DND.
- Some browsers require **one user tap** on the page before they let audio play. Tap anywhere on the Orders screen once and place another test order.

---

## 2️⃣ Web Push test (background, 30 sec)

1. Inside the PWA, go to **Store → Notifications** (or whichever screen has the **Enable notifications** button — it appears as a top banner the first time you log in).
2. Tap **Enable notifications**. Allow the OS prompt.
3. **Lock your phone** OR send the PWA to the background.
4. Place another test order from the customer device.
5. Within ~10 seconds you should get an OS notification banner with:
   - Title: `New order #ORD-XXXX`
   - Body: customer name + total

❌ **No push received?** — quickest checks:

| Symptom | Fix |
|---|---|
| Browser blocked the prompt | Long-press notification setting in iOS / Android settings → Allow. |
| Permission says "granted" but no push | Re-tap **Enable notifications** to refresh subscription; then re-test. |
| iOS < 16.4 | Web Push not supported. Update iOS or use Android. |
| Android with battery saver | Disable battery optimisation for the PWA. |

---

## 3️⃣ Curl verification (only if step 2 still fails)

This sends a synthetic order directly so you don't have to rely on the storefront. Replace `<TOKEN>` with your vendor JWT.

```bash
# Get a vendor token
TOKEN=$(curl -s -X POST https://www.gharsip.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<slug>@vendor.local","password":"<slug>123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Trigger the test push endpoint (sends a debug push to all subscriptions)
curl -X POST https://www.gharsip.com/api/vendor/push/test \
  -H "Authorization: Bearer $TOKEN"
```

Expected: a push notification within 5 seconds on every device that has
notifications enabled for this vendor.

If `/api/vendor/push/test` returns `{"sent": 0}` → the device hasn't subscribed
yet. Re-run step 2.

---

## 🧯 If everything passes

You're done. Real customer orders will produce both the in-app chime AND the
background push automatically. No additional setup needed.
