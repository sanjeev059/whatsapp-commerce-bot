"""Iteration-4 backend tests:

- /api/auth/change-password (validation, auth, persistence)
- /api/vendor/uploads/image + /api/uploads/{id} (multipart, mime allowlist, size cap, public GET)

Always restores the vendor password back to the canonical value at teardown.
"""
import io
import os
import struct
import zlib
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MASTER_EMAIL = "master@localcommerce.in"
MASTER_PASSWORD = "master123"
VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PASSWORD = "sharma-wines123"


# ---------- helpers ----------
def _login(email, pw):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": pw})
    return r


def _token(email, pw):
    r = _login(email, pw)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["access_token"]


def _make_png(size_bytes: int = 0) -> bytes:
    """Return a valid 1x1 PNG, optionally padded so total length >= size_bytes."""
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = b"\x00\xff\x00\x00"  # 1 scanline filter byte + RGB
    idat = zlib.compress(raw)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    if size_bytes and len(png) < size_bytes:
        # Pad via an ancillary chunk (tEXt) — still a valid PNG.
        pad_len = size_bytes - len(png) - 12  # 12 = chunk overhead
        if pad_len < 0:
            pad_len = 0
        text = b"X" * pad_len
        png = png[:-12] + chunk(b"tEXt", text) + png[-12:]
    return png


@pytest.fixture(scope="module")
def vendor_token():
    return _token(VENDOR_EMAIL, VENDOR_PASSWORD)


@pytest.fixture(scope="module")
def master_token():
    return _token(MASTER_EMAIL, MASTER_PASSWORD)


def auth_headers(t):
    return {"Authorization": f"Bearer {t}"}


# ====================== Change-password ======================
class TestChangePassword:
    def test_unauthenticated_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": "x", "new_password": "yyyyyyyy"})
        assert r.status_code == 401

    def test_short_new_password_400(self, vendor_token):
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": VENDOR_PASSWORD, "new_password": "short"},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 400, r.text
        assert "8" in r.text or "8 chars" in r.text.lower() or "characters" in r.text.lower()

    def test_wrong_current_password_401(self, vendor_token):
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "definitely-not-it",
                  "new_password": "newgoodpw1"},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 401, r.text
        assert "incorrect" in r.text.lower() or "current" in r.text.lower()

    def test_valid_change_then_old_fails_then_revert(self, vendor_token):
        new_pw = "TempPass_1234"
        # 1) change
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": VENDOR_PASSWORD, "new_password": new_pw},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

        # 2) old password no longer works
        old = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        assert old.status_code == 401, f"Old pw still works: {old.status_code}"

        # 3) login with new password
        r2 = _login(VENDOR_EMAIL, new_pw)
        assert r2.status_code == 200, r2.text
        new_token = r2.json()["access_token"]

        # 4) revert (CRITICAL — restores test_credentials.md sanctity)
        rev = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": new_pw, "new_password": VENDOR_PASSWORD},
            headers=auth_headers(new_token),
        )
        assert rev.status_code == 200, rev.text

        # 5) confirm canonical password works again
        confirm = _login(VENDOR_EMAIL, VENDOR_PASSWORD)
        assert confirm.status_code == 200


# ====================== Uploads ======================
class TestVendorUploads:
    def test_unauth_post_401(self):
        png = _make_png()
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("a.png", png, "image/png")},
        )
        assert r.status_code == 401

    def test_master_role_blocked_403(self, master_token):
        png = _make_png()
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("a.png", png, "image/png")},
            headers=auth_headers(master_token),
        )
        assert r.status_code == 403

    def test_bad_mime_400(self, vendor_token):
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("note.txt", b"hello", "text/plain")},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 400, r.text

    def test_oversize_400(self, vendor_token):
        big = _make_png(size_bytes=3 * 1024 * 1024 + 1024)  # > 3MB
        assert len(big) > 3 * 1024 * 1024
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("big.png", big, "image/png")},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 400, r.text
        assert "large" in r.text.lower() or "3" in r.text

    def test_empty_file_400(self, vendor_token):
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("empty.png", b"", "image/png")},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 400

    def test_valid_png_round_trip(self, vendor_token):
        png = _make_png()
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("ok.png", png, "image/png")},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and "url" in d
        assert d["url"].startswith("/api/uploads/")
        assert d["url"].endswith(d["id"])

        # Public GET
        g = requests.get(f"{BASE_URL}{d['url']}")
        assert g.status_code == 200
        assert g.headers.get("content-type", "").startswith("image/png")
        assert g.content == png
        # NOTE: backend sets Cache-Control: public, max-age=86400, but the preview
        # ingress (Cloudflare) rewrites it to no-store. Skip the cache assertion in
        # this env — unit verifies content+content-type round trip is intact.

    def test_valid_jpeg_accepted(self, vendor_token):
        # Minimal JPEG SOI/EOI is not a "real" image but server only checks MIME + size.
        body = b"\xff\xd8\xff\xe0" + b"\x00" * 32 + b"\xff\xd9"
        r = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("p.jpg", body, "image/jpeg")},
            headers=auth_headers(vendor_token),
        )
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        g = requests.get(f"{BASE_URL}{url}")
        assert g.status_code == 200
        assert g.headers.get("content-type", "").startswith("image/jpeg")

    def test_unknown_id_404(self):
        r = requests.get(f"{BASE_URL}/api/uploads/doesnotexist123")
        assert r.status_code == 404


# ====================== End-to-end: upload then attach to product ======================
class TestUploadIntegratedWithProducts:
    def test_create_product_with_uploaded_image(self, vendor_token):
        png = _make_png()
        up = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("p.png", png, "image/png")},
            headers=auth_headers(vendor_token),
        )
        assert up.status_code == 200
        url = up.json()["url"]

        cats = requests.get(f"{BASE_URL}/api/vendor/categories",
                            headers=auth_headers(vendor_token)).json()
        subs = requests.get(f"{BASE_URL}/api/vendor/subgroups",
                            headers=auth_headers(vendor_token)).json()
        cat = next(c for c in cats if c["id"] != "liquor")
        sub = next(s for s in subs if s["category_id"] == cat["id"])

        cr = requests.post(
            f"{BASE_URL}/api/vendor/products",
            json={
                "category_id": cat["id"], "subgroup_id": sub["id"],
                "name": "TEST_UploadedImg", "price": 12.5,
                "image": url, "unit": "1pc", "tag": "",
                "description": "", "in_stock": True,
            },
            headers={**auth_headers(vendor_token), "Content-Type": "application/json"},
        )
        assert cr.status_code == 200, cr.text
        pid = cr.json()["id"]
        assert cr.json()["image"] == url

        # Cleanup
        requests.delete(f"{BASE_URL}/api/vendor/products/{pid}",
                        headers=auth_headers(vendor_token))

    def test_update_store_qr_with_uploaded_image(self, vendor_token):
        png = _make_png()
        up = requests.post(
            f"{BASE_URL}/api/vendor/uploads/image",
            files={"file": ("qr.png", png, "image/png")},
            headers=auth_headers(vendor_token),
        )
        url = up.json()["url"]
        # Save current value for revert
        before = requests.get(f"{BASE_URL}/api/vendor/me",
                              headers=auth_headers(vendor_token)).json()
        prev_qr = before.get("payment_qr_url", "")

        r = requests.patch(
            f"{BASE_URL}/api/vendor/store",
            json={"payment_qr_url": url},
            headers={**auth_headers(vendor_token), "Content-Type": "application/json"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["payment_qr_url"] == url

        # Storefront exposes it
        sf = requests.get(f"{BASE_URL}/api/storefront/sharma-wines").json()
        assert sf["vendor"]["payment_qr_url"] == url

        # Revert
        requests.patch(
            f"{BASE_URL}/api/vendor/store",
            json={"payment_qr_url": prev_qr},
            headers={**auth_headers(vendor_token), "Content-Type": "application/json"},
        )
