# Free-Tier Production Deployment Guide

> **Note (2026):** The storefront in this repo is now **Gharsip Custom Prints** (Next.js in **`frontend/`**). Deploy that with **`DEPLOY_PRINTS.md`** — no CRA `vercel.json` at repo root, no **`REACT_APP_BACKEND_URL`** for the Prints site.  
> The sections below describe the **legacy liquor stack** (**`backend/`** + Mongo + vendor admin). Use only if you still run or maintain that API.

**Total cost: ₹0/month** for MVP. Upgrade later when traffic justifies it.

**Stack (historical liquor MVP):**
- Database: **MongoDB Atlas M0** (free, 512 MB)
- Backend: **Render Free** (FastAPI)
- Frontend: ~~Vercel + CRA~~ *(replaced — see **`DEPLOY_PRINTS.md`** for Next.js in **`frontend/`**)*
- Domain: optional — both providers give you free `*.vercel.app` and `*.onrender.com` URLs

---

## 0. Prerequisites
- A GitHub account (free)
- Phone number for OTP on Atlas/Render/Vercel sign-up

---

## 1. Push code to GitHub (~30 seconds)

In this Emergent chat input, click the **"Save to GitHub"** button (top right of the chat). Choose:
- ✅ Create a new repo (e.g. `local-commerce`)
- ✅ Make it **private** (recommended)
- ✅ Confirm

You'll get a GitHub URL like `https://github.com/YOUR_USERNAME/local-commerce`. **Copy this URL — you'll need it 3 times below.**

> ⚠️ Your `/app/backend/.env` is automatically excluded by `.gitignore`. The values you'll re-enter on Render are listed in **Section 4** below.

---

## 2. Create MongoDB Atlas (~5 min)

1. Go to **https://cloud.mongodb.com** → Sign up with Google
2. Create a **Free M0 cluster**
   - Provider: AWS
   - Region: **Mumbai (ap-south-1)** ← closest to your customers
   - Cluster name: `local-commerce-prod`
   - Click "Create deployment"
3. **Database user** (set when prompted):
   - Username: `lc_app`
   - Password: click "Autogenerate Secure Password" → **copy it**
4. **Network access**: choose "Allow access from anywhere" (0.0.0.0/0) — required for Render
5. Click "Connect" → "Drivers" → copy the **connection string**, it looks like:
   ```
   mongodb+srv://lc_app:<password>@local-commerce-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the password from step 3. **Save this whole string somewhere safe — you'll paste it into Render in Section 4.**

---

## 3. Deploy backend on Render (~5 min)

1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New +" → "Blueprint"**
3. Connect your `local-commerce` GitHub repo
4. Render auto-detects `/app/render.yaml` — click **"Apply"**
5. Render will start building. While it builds, click into the service → **Environment** tab and fill in the values it asked you to set:

   | Key | Value (copy-paste exactly) |
   |---|---|
   | `MONGO_URL` | The Atlas connection string from Section 2.5 |
   | `MASTER_ADMIN_EMAIL` | `master@yourbusiness.com` *(use your real email)* |
   | `MASTER_ADMIN_PASSWORD` | Pick a strong password, **NOT** `master123` |
   | `VAPID_PUBLIC_KEY` | `BPetFRAmbz-hf9DLuMymgngv9DSHFLUPyziqvVpDuB-oAV-VhjWhUY1bhAxz934YUVJC6D_ohb21aJx6qEJoQrg` |
   | `VAPID_PRIVATE_KEY_PEM` | (see Section 5 below — multiline value) |
   | `VAPID_CONTACT_EMAIL` | `mailto:admin@yourbusiness.com` |
   | `CORS_ORIGINS` | *(leave blank for now — set in Section 7 once frontend URL exists)* |
   | `PUBLIC_BASE_URL` | *(leave blank for now)* |

6. Click **"Save Changes"** → Render redeploys with the new vars. Wait ~3 min.
7. When green, **copy your Render URL** — it looks like `https://local-commerce-backend.onrender.com`. **Save it.**

> 🐢 **Render free-tier note:** the backend sleeps after 15 min idle and takes ~30s to wake. Customers placing the day's first order will see a slight delay. Acceptable for MVP. Upgrade to Render Starter ($7/mo) to remove this when you're profitable.

---

## 4. Deploy frontend on Vercel (~3 min)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New" → "Project"**
3. Import your `local-commerce` GitHub repo
4. Leave **Framework Preset** on **Other** until you configure, or skip this blueprint for Prints-only — use **`DEPLOY_PRINTS.md`** instead (Root Directory **`frontend`**, Next.js).
5. **Environment Variables** — for **legacy** liquor React only:

   | Key | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | Your Render URL from Section 3.7 (no trailing slash) |

6. Click **"Deploy"** (CRA only).

> **Prints storefront:** Deploy from **`frontend/`** as Next.js — see **`DEPLOY_PRINTS.md`**. Do not use repo-root `vercel.json` (removed).

## 5. Get your VAPID private key

In the chat with Emergent, paste this command and send it. The agent will print your existing VAPID private key (the multiline `-----BEGIN PRIVATE KEY-----` block). Copy the entire block (including BEGIN/END lines) and paste it into Render's `VAPID_PRIVATE_KEY_PEM` env var.

```
Show me my VAPID_PRIVATE_KEY_PEM exactly as it is in /app/backend/.env so I can paste it into Render
```

---

## 6. Loop back: link the two

Now that Render and Vercel both have URLs, finish the wiring:

**On Render** → Environment tab:
- `CORS_ORIGINS` = your Vercel URL, e.g. `https://local-commerce.vercel.app`
- `PUBLIC_BASE_URL` = your Vercel URL (or your custom domain once added)

Click "Save" — Render auto-redeploys.

---

## 7. Smoke-test (5 min)

> **Gharsip Custom Prints (current storefront):** Use **`DEPLOY_PRINTS.md`** — open `/`, `/customize`, complete a demo order. Skip the liquor checklist unless you still run **`backend/`** + CRA.

Legacy liquor smoke-test (historical):

Open your **Vercel URL** in a browser (when that project was CRA + `/store/`):

- [ ] `https://YOURVERCEL/` — landing page renders
- [ ] `https://YOURVERCEL/store/sharma-wines` — demo storefront loads, products visible
- [ ] `https://YOURVERCEL/admin/login` — sign in with master email + the password you set in Section 3
- [ ] Red "default password" banner is GONE (you set a non-default password)
- [ ] `/admin/master/vendors` → Add a real vendor for your business → credentials modal shows QR + print
- [ ] As that new vendor: log in → password-change banner appears → change password → /admin/store shows your QR card

If all green, you're **live**. 🎉

---

## 8. (Optional) Custom domain

When you're ready (any time later — your Vercel URL works as long as you want):

1. Buy domain at **Cloudflare Registrar** (~₹700/yr `.in`, no markup)
2. In Vercel project → Settings → Domains → Add `yourdomain.com`
3. Vercel shows you 2 DNS records to set in Cloudflare
4. In Cloudflare → DNS tab → add those records (proxied: ON)
5. Cloudflare → SSL/TLS → mode: **Full (strict)**
6. Update Render env vars `CORS_ORIGINS` and `PUBLIC_BASE_URL` to `https://yourdomain.com`
7. Print fresh QR posters via `/admin/store` (URLs will now use your custom domain)

Recommended Cloudflare cache rules:
- **Bypass cache**: `/api/*`, `/store/*`, `/admin/*`, `/track/*`
- **Cache aggressively**: `/static/*`, `/assets/*`

---

## 9. Cost projection

| Stage | Monthly cost |
|---|---|
| MVP (free tiers, < 50 active customers) | ₹0 |
| ~100-500 customers (Render Starter) | ₹600 (~$7) |
| ~1k customers (Render Standard + Atlas M10) | ₹3,500 (~$42) |
| Domain (one-time annual) | ₹700/yr |

---

## 10. What to do when something breaks

**Render shows "no open ports" or build fails:**
→ Click "Manual Deploy" → "Clear build cache & deploy"

**Vercel build fails with "yarn: command not found":**
→ Vercel Settings → General → Build & Development → Install Command: `npm install -g yarn && cd frontend && yarn install`

**Backend returns 500 on /api/storefront/sharma-wines:**
→ Render Logs tab — look for "MongoServerError" → likely your Atlas IP whitelist isn't 0.0.0.0/0

**Frontend works but admin login fails with CORS error:**
→ `CORS_ORIGINS` on Render must EXACTLY match your Vercel URL (no trailing slash)

**Push notifications never arrive:**
→ Verify `VAPID_PUBLIC_KEY` on Render matches what `/api/push/vapid-public-key` returns

---

## 11. Sign-off

Before flipping any QR poster to a real customer:
- [ ] Master password changed from default
- [ ] At least 1 real vendor onboarded with real UPI ID + QR
- [ ] Real phone QA done per `/app/REAL_DEVICE_QA.md`
- [ ] Cloudflare domain (optional but recommended)
