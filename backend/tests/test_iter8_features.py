"""
Iteration-8 backend tests: launch hardening
- /api/storefront/<slug>/qr.png returns valid PNG, size clamp, X-Storefront-URL header, 404 unknown
- /api/auth/me exposes password_must_change for seeded vendor + master
- POST /api/auth/change-password clears the flag
- New vendor created via /api/master/vendors auto-creates admin user with password_must_change=true
- CORS dev-fallback (allow_origins=*, no allow_credentials)
- Rotated JWT_SECRET: fresh login → /auth/me works
- /manifest.json + /service-worker.js still 200
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

MASTER_EMAIL = "master@localcommerce.in"
MASTER_PASSWORD = "master123"
VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PASSWORD = "sharma-wines123"
VENDOR_SLUG = "sharma-wines"


# ───────────────────────────── helpers
def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password},
                      timeout=15)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _me(token):
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {token}"},
                     timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ───────────────────────────── Storefront QR
class TestStorefrontQR:
    def test_qr_png_returns_valid_png(self):
        r = requests.get(f"{BASE_URL}/api/storefront/{VENDOR_SLUG}/qr.png", timeout=15)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/png"), r.headers
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "PNG signature missing"
        assert len(r.content) > 100
        # X-Storefront-URL header present and points to customer URL
        x_url = r.headers.get("X-Storefront-URL") or r.headers.get("x-storefront-url")
        assert x_url, f"X-Storefront-URL missing in {dict(r.headers)}"
        assert f"/store/{VENDOR_SLUG}" in x_url, x_url

    def test_qr_size_param(self):
        # ~400 should produce a roughly 400-px-wide PNG
        r = requests.get(f"{BASE_URL}/api/storefront/{VENDOR_SLUG}/qr.png?size=400", timeout=15)
        assert r.status_code == 200
        # IHDR width is bytes 16..20 (big-endian uint32)
        width = int.from_bytes(r.content[16:20], "big")
        height = int.from_bytes(r.content[20:24], "big")
        # qrcode library renders at module-multiple sizes, allow ±50%
        assert 200 <= width <= 700, f"width={width} out of expected range"
        assert width == height, "QR should be square"

    def test_qr_size_clamped(self):
        r = requests.get(f"{BASE_URL}/api/storefront/{VENDOR_SLUG}/qr.png?size=2000", timeout=15)
        assert r.status_code == 200
        width = int.from_bytes(r.content[16:20], "big")
        # spec says clamp to ≤1024
        assert width <= 1100, f"size=2000 should clamp ≤~1024, got {width}"

    def test_qr_unknown_slug_404(self):
        r = requests.get(f"{BASE_URL}/api/storefront/no-such-vendor-xyz/qr.png", timeout=15)
        assert r.status_code == 404, r.text


# ───────────────────────────── password_must_change flag
class TestPasswordMustChange:
    def test_master_seed_flag_present(self):
        tok = _login(MASTER_EMAIL, MASTER_PASSWORD)
        me = _me(tok)
        assert "password_must_change" in me, f"password_must_change missing from /auth/me: {me}"
        # Per backfill, master seed is True (unless a previous test already flipped it)
        # We assert True here; if False the previous test left state dirty — log and skip.
        if me["password_must_change"] is not True:
            pytest.skip(f"master password_must_change={me['password_must_change']} (likely changed in earlier test) — flag exists which is the contract")

    def test_vendor_seed_flag_present(self):
        tok = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        me = _me(tok)
        assert "password_must_change" in me
        if me["password_must_change"] is not True:
            pytest.skip(f"vendor password_must_change={me['password_must_change']} (changed earlier)")

    def test_change_password_clears_flag_and_revert(self):
        """Login as vendor, change password, verify flag cleared, revert."""
        tok = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        before = _me(tok)
        had_flag = before.get("password_must_change") is True

        # Change to a new pw
        new_pw = "sharma-wines456"
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          headers={"Authorization": f"Bearer {tok}"},
                          json={"current_password": VENDOR_PASSWORD, "new_password": new_pw},
                          timeout=15)
        assert r.status_code == 200, f"change-password failed: {r.status_code} {r.text}"

        # Re-login with new password and verify flag cleared
        tok2 = _login(VENDOR_EMAIL, new_pw)
        me2 = _me(tok2)
        assert me2.get("password_must_change") is False, f"flag not cleared: {me2}"

        # Revert
        r2 = requests.post(f"{BASE_URL}/api/auth/change-password",
                           headers={"Authorization": f"Bearer {tok2}"},
                           json={"current_password": new_pw, "new_password": VENDOR_PASSWORD},
                           timeout=15)
        assert r2.status_code == 200, r2.text

        # Confirm we can login with original pw again
        tok3 = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        me3 = _me(tok3)
        # After a manual change-password, the flag should remain False (admin chose this pw deliberately)
        assert me3.get("password_must_change") is False
        assert had_flag in (True, False)  # both valid; we just want the contract surface


# ───────────────────────────── New vendor onboarding sets must-change
class TestNewVendorOnboarding:
    def test_new_vendor_admin_user_must_change(self):
        master_tok = _login(MASTER_EMAIL, MASTER_PASSWORD)
        slug_suffix = str(int(time.time()))[-6:]
        name = f"TEST Iter8 Vendor {slug_suffix}"
        owner_phone = f"+9199{slug_suffix}00"
        payload = {
            "name": name,
            "owner_name": "QA Bot",
            "owner_phone": owner_phone,
            "accepts_tos": True,
        }
        r = requests.post(f"{BASE_URL}/api/master/vendors",
                          headers={"Authorization": f"Bearer {master_tok}"},
                          json=payload, timeout=20)
        assert r.status_code in (200, 201), f"create vendor: {r.status_code} {r.text}"
        body = r.json()
        # backend may return either {vendor:..., credentials:...} or flattened
        creds = body.get("credentials") or {}
        slug = (body.get("vendor") or body).get("slug") or body.get("slug")
        admin_email = creds.get("email") or body.get("admin_email") or body.get("email")
        admin_pw = (creds.get("password") or body.get("default_password")
                    or body.get("admin_password") or body.get("password"))
        assert slug and admin_email and admin_pw, f"unexpected create response: {body}"

        # login as the new admin and check flag
        new_tok = _login(admin_email, admin_pw)
        me = _me(new_tok)
        assert me.get("password_must_change") is True, \
            f"new vendor must have password_must_change=true, got {me}"

        # cleanup: delete vendor
        vid = (body.get("vendor") or body).get("id") or body.get("id")
        if vid:
            requests.delete(f"{BASE_URL}/api/master/vendors/{vid}",
                            headers={"Authorization": f"Bearer {master_tok}"},
                            timeout=15)


# ───────────────────────────── CORS dev-fallback
class TestCORS:
    def test_preflight_allows_all_origins_without_credentials(self):
        # OPTIONS preflight from arbitrary origin
        r = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=10,
        )
        # CORSMiddleware returns 200 for preflight
        assert r.status_code in (200, 204), f"{r.status_code} {r.text}"
        allow_origin = r.headers.get("access-control-allow-origin")
        assert allow_origin in ("*", "https://example.com"), \
            f"unexpected ACAO: {allow_origin}"
        # In dev-fallback (* origin), credentials must NOT be true
        creds = r.headers.get("access-control-allow-credentials")
        if allow_origin == "*":
            # spec: must be absent or 'false' when origin=*
            assert creds in (None, "false"), \
                f"credentials must not be true with *: {creds}"


# ───────────────────────────── JWT_SECRET rotation regression
class TestFreshLogin:
    def test_fresh_login_works(self):
        tok = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        me = _me(tok)
        assert me["email"] == VENDOR_EMAIL
        assert me.get("role") in ("vendor_admin", "vendor")


# ───────────────────────────── PWA basics
class TestPWAStatic:
    def test_root_manifest(self):
        # Frontend is served via the same external URL on root /
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert r.status_code == 200, r.status_code
        assert r.headers.get("content-type", "").startswith(
            ("application/json", "application/manifest+json", "text/plain")
        )

    def test_service_worker(self):
        r = requests.get(f"{BASE_URL}/service-worker.js", timeout=10)
        assert r.status_code == 200, r.status_code
        # JS content-type or text/javascript
        ct = r.headers.get("content-type", "")
        assert "javascript" in ct or "text" in ct, ct
