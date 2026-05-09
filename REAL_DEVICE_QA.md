# Real-Device QA — Pre-Launch Checklist

Run this on a real Android phone + a real iPhone before you flip DNS to your domain. The Chromium headless test runner can't reproduce these reliably; real devices can.

**Pre-requisite:** App is deployed to a publicly-reachable HTTPS URL (Emergent's `*.emergent.sh` works, or your linked domain). Service workers + PWA install only fire on HTTPS or `localhost`.

## Test URLs
- Customer storefront: `https://YOURDOMAIN/store/sharma-wines`
- Customer QR: `https://YOURDOMAIN/api/storefront/sharma-wines/qr.png`
- Vendor admin: `https://YOURDOMAIN/admin/login` → `sharma-wines@vendor.local / sharma-wines123`

## ✅ Android Chrome (Pixel / OnePlus / any Chrome ≥ 89)

### 1. Install banner via QR
- [ ] Open camera app → scan QR poster
- [ ] Storefront opens in Chrome
- [ ] **Within ~3 seconds**, the green "Save Sharma Wines as an app" bottom bar appears (`InstallAppHint`)
- [ ] Tap **Install** → Chrome's native install dialog appears
- [ ] Tap **Install** → app icon lands on home screen with vendor name

### 2. Standalone launch
- [ ] Tap the new home-screen icon
- [ ] App opens **without browser chrome** (no URL bar)
- [ ] URL behind the scenes is `/store/sharma-wines` (not the platform root)
- [ ] Splash screen briefly shows green theme + vendor name
- [ ] Bottom install bar does NOT re-appear (you've already installed)

### 3. Order flow inside the installed app
- [ ] Browse menu → add a snack → checkout → submit a COD order
- [ ] Confirmation page renders, "Track" button works
- [ ] Tracking page shows the order

### 4. Web Push (vendor admin)
- [ ] On the same phone, sign in as vendor at `/admin/login`
- [ ] Tap **Enable** on the notification banner → Chrome permission prompt → Allow
- [ ] "push-active-banner" appears with a "Send test" button
- [ ] Tap **Send test** → Android system notification slides down within ~5s
- [ ] **Lock the phone**, place an order from another browser/device
- [ ] Notification fires through the lock screen + plays sound + vibrates
- [ ] Tap notification → app opens to `/admin/orders`

## ✅ iOS Safari (iPhone, iOS ≥ 16.4)

> Note: iOS does NOT fire `beforeinstallprompt` — instead `InstallAppHint` shows the manual 3-step modal after ~4 s.

### 1. Add to Home Screen
- [ ] Open Camera → scan QR poster
- [ ] Storefront opens in Safari
- [ ] After ~4 s, the bottom bar appears
- [ ] Tap **Install** → modal opens with "Tap Share → Add to Home Screen → Add" steps
- [ ] Follow the steps via Safari's share button → home screen icon lands

### 2. Standalone launch
- [ ] Tap the home-screen icon
- [ ] App opens **fullscreen** (no Safari address bar)
- [ ] Title bar shows the **vendor name** (from `apple-mobile-web-app-title`)
- [ ] Status bar is dark/translucent (from `apple-mobile-web-app-status-bar-style`)
- [ ] Subsequent visits don't show the install bar (suppressed when in standalone mode)

### 3. Order + tracking
- [ ] Same as Android #3 above

### 4. Web Push on iOS (16.4+, only after install to Home Screen)
- [ ] iOS only allows web push for sites added to Home Screen — confirm vendor admin push works:
- [ ] Add the **admin** site to Home Screen separately (sign in first → install)
- [ ] Open the admin app → enable notifications → grant permission
- [ ] Test push from another device → iOS notification arrives

## ❌ Common gotchas

| Symptom | Likely cause | Fix |
|---|---|---|
| Install bar never appears on Android | Manifest 404 or HTTPS missing | Check `/api/storefront/<slug>/manifest.json` returns 200, site served on HTTPS |
| Install bar appears but tap does nothing | Service worker not registered | Hard-reload, check DevTools → Application → SW |
| Home-screen icon launches platform root, not vendor | Old manifest cached | Long-press icon → Remove → reinstall via QR |
| Push never arrives on Android | VAPID keys mismatch | Verify `/api/push/vapid-public-key` returns the same key the SW subscribed with |
| iOS push silently fails | Site not on Home Screen | iOS REQUIRES Add-to-Home-Screen first |

## Sign-off

- [ ] Android Chrome: all 4 sections pass
- [ ] iOS Safari: all 4 sections pass
- [ ] Tested on at least 2 different vendors' QR posters
- [ ] Real customer placed at least 1 real test order end-to-end

Once all boxes are checked, you're cleared to flip DNS.
