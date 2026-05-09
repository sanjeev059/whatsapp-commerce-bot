"""Iter-10: Manual subscription billing & vendor paywall — backend regression.

Covers:
  - Master billing config GET/PATCH (with auth gate)
  - /api/billing/qr.png (200 image/png when upi_id set, format check)
  - Vendor /api/vendor/billing payload shape
  - PATCH /api/master/vendors/{vid} for subscription_expires_at + subscription_active
  - Restore state at end (so smoke flow keeps working)
"""
import os
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

MASTER_EMAIL = "master@localcommerce.in"
MASTER_PWD = "master123"
VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PWD = "sharma-wines123"
VENDOR_SLUG = "sharma-wines"


def _login(email, pwd):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": pwd},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def master_token():
    return _login(MASTER_EMAIL, MASTER_PWD)


@pytest.fixture(scope="module")
def vendor_token():
    return _login(VENDOR_EMAIL, VENDOR_PWD)


@pytest.fixture(scope="module")
def master_h(master_token):
    return {"Authorization": f"Bearer {master_token}"}


@pytest.fixture(scope="module")
def vendor_h(vendor_token):
    return {"Authorization": f"Bearer {vendor_token}"}


@pytest.fixture(scope="module")
def vendor_id(master_h):
    r = requests.get(f"{BASE_URL}/api/master/vendors", headers=master_h, timeout=15)
    r.raise_for_status()
    for v in r.json():
        if v.get("slug") == VENDOR_SLUG:
            return v["id"]
    pytest.fail(f"vendor {VENDOR_SLUG} not found")


# ---------------------------------------------------------------- billing cfg
class TestMasterBilling:
    def test_get_master_billing(self, master_h):
        r = requests.get(f"{BASE_URL}/api/master/billing", headers=master_h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # must contain core fields
        for k in ("upi_id", "upi_name", "monthly_fee_inr", "whatsapp", "note_to_vendor"):
            assert k in d, f"missing {k} in {d}"
        assert isinstance(d["monthly_fee_inr"], (int, float))

    def test_patch_master_billing_persists(self, master_h):
        payload = {
            "upi_id": "gharsip@okaxis",
            "upi_name": "GharSip Owner",
            "whatsapp": "919999999999",
            "monthly_fee_inr": 5000,
            "note_to_vendor": "Pay & WhatsApp screenshot to renew.",
        }
        r = requests.patch(
            f"{BASE_URL}/api/master/billing", json=payload, headers=master_h, timeout=15
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["upi_id"] == payload["upi_id"]
        assert d["upi_name"] == payload["upi_name"]
        assert int(d["monthly_fee_inr"]) == 5000
        # GET to verify persistence
        r2 = requests.get(
            f"{BASE_URL}/api/master/billing", headers=master_h, timeout=15
        )
        d2 = r2.json()
        assert d2["upi_id"] == "gharsip@okaxis"
        assert d2["whatsapp"] == "919999999999"

    def test_master_billing_403_for_vendor(self, vendor_h):
        r1 = requests.get(
            f"{BASE_URL}/api/master/billing", headers=vendor_h, timeout=15
        )
        assert r1.status_code in (401, 403), r1.status_code
        r2 = requests.patch(
            f"{BASE_URL}/api/master/billing",
            headers=vendor_h,
            json={"upi_id": "x@y"},
            timeout=15,
        )
        assert r2.status_code in (401, 403), r2.status_code


# ------------------------------------------------------------------- QR PNG
class TestBillingQR:
    def test_qr_png_when_set(self, master_h):
        # ensure upi set
        requests.patch(
            f"{BASE_URL}/api/master/billing",
            json={"upi_id": "gharsip@okaxis", "upi_name": "GharSip Owner",
                  "monthly_fee_inr": 5000},
            headers=master_h, timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/billing/qr.png", timeout=15)
        assert r.status_code == 200, r.text
        ctype = r.headers.get("content-type", "")
        assert "image/png" in ctype, ctype
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "not a real PNG"
        assert len(r.content) > 200

    def test_qr_png_404_when_empty(self, master_h):
        # blank upi_id
        requests.patch(
            f"{BASE_URL}/api/master/billing",
            json={"upi_id": "", "upi_name": "", "monthly_fee_inr": 5000},
            headers=master_h, timeout=15,
        )
        # bust the 5-min server cache via query param (server should still 404)
        r = requests.get(f"{BASE_URL}/api/billing/qr.png?v={int(time.time())}", timeout=15)
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text[:200]}"
        # restore
        requests.patch(
            f"{BASE_URL}/api/master/billing",
            json={"upi_id": "gharsip@okaxis", "upi_name": "GharSip Owner",
                  "whatsapp": "919999999999", "monthly_fee_inr": 5000,
                  "note_to_vendor": "Pay & WhatsApp screenshot to renew."},
            headers=master_h, timeout=15,
        )


# ---------------------------------------------------------- vendor billing API
class TestVendorBilling:
    def test_vendor_billing_active(self, master_h, vendor_h, vendor_id):
        # ensure clean state: active, no expiry
        requests.patch(
            f"{BASE_URL}/api/master/vendors/{vendor_id}",
            headers=master_h,
            json={"subscription_active": True, "subscription_expires_at": None},
            timeout=15,
        )
        r = requests.get(f"{BASE_URL}/api/vendor/billing", headers=vendor_h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "platform" in d and "subscription" in d
        p = d["platform"]
        for k in ("upi_id", "monthly_fee_inr", "qr_available"):
            assert k in p, f"platform missing {k}: {p}"
        s = d["subscription"]
        assert s.get("active") is True, s
        assert s.get("is_expired") in (False, None), s

    def test_vendor_billing_expired_after_master_patch(self, master_h, vendor_h, vendor_id):
        past_iso = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        rp = requests.patch(
            f"{BASE_URL}/api/master/vendors/{vendor_id}",
            headers=master_h,
            json={"subscription_expires_at": past_iso},
            timeout=15,
        )
        assert rp.status_code == 200, rp.text
        r = requests.get(f"{BASE_URL}/api/vendor/billing", headers=vendor_h, timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()["subscription"]
        assert s.get("is_expired") is True, s

    def test_vendor_billing_active_false(self, master_h, vendor_h, vendor_id):
        rp = requests.patch(
            f"{BASE_URL}/api/master/vendors/{vendor_id}",
            headers=master_h,
            json={"subscription_active": False},
            timeout=15,
        )
        assert rp.status_code == 200, rp.text
        r = requests.get(f"{BASE_URL}/api/vendor/billing", headers=vendor_h, timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()["subscription"]
        assert s.get("active") is False, s


# ---------------------------------------------------------------- restore env
def test_zz_restore_state(master_h, vendor_id):
    """Final cleanup: re-activate vendor, clear expiry, reset platform billing."""
    rp = requests.patch(
        f"{BASE_URL}/api/master/vendors/{vendor_id}",
        headers=master_h,
        json={"subscription_active": True, "subscription_expires_at": None},
        timeout=15,
    )
    assert rp.status_code == 200, rp.text

    rb = requests.patch(
        f"{BASE_URL}/api/master/billing",
        headers=master_h,
        json={
            "upi_id": "gharsip@okaxis",
            "upi_name": "GharSip Owner",
            "whatsapp": "919999999999",
            "monthly_fee_inr": 5000,
            "note_to_vendor": "Pay & WhatsApp screenshot to renew.",
        },
        timeout=15,
    )
    assert rb.status_code == 200, rb.text
