"""Iteration 9 — Delivery handoff (one-time link + photo proof) regression."""
import io
import os
import re
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://commerce-bot-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PW = "sharma-wines123"


@pytest.fixture(scope="module")
def vendor_token():
    r = requests.post(f"{API}/auth/login", json={"email": VENDOR_EMAIL, "password": VENDOR_PW}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def vendor_headers(vendor_token):
    return {"Authorization": f"Bearer {vendor_token}"}


# ---------- helpers ----------
def _png_bytes():
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\rIDATx\x9cc\xfc\xcf\xc0\xc0\xc0\xc0\x00\x00\x00\x05\x00\x01]\xcc\xdb\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _get_or_create_dispatchable_order(vendor_headers):
    """Find an order in out_for_delivery (preferred) else accepted, else create+dispatch one."""
    # Try out_for_delivery first
    r = requests.get(f"{API}/vendor/orders", headers=vendor_headers, params={"status_filter": "out_for_delivery"}, timeout=10)
    assert r.status_code == 200
    for o in r.json():
        if o.get("delivery_token"):
            return o

    # Find an accepted order and push to out_for_delivery
    r = requests.get(f"{API}/vendor/orders", headers=vendor_headers, params={"status_filter": "accepted"}, timeout=10)
    assert r.status_code == 200
    if r.json():
        o = r.json()[0]
        rr = requests.patch(f"{API}/vendor/orders/{o['id']}", json={"status": "out_for_delivery"}, headers=vendor_headers, timeout=10)
        assert rr.status_code == 200, rr.text
        return rr.json()

    # Create a fresh COD order via storefront, accept, then OFD
    cat = requests.get(f"{API}/storefront/sharma-wines").json()
    vendor_id = cat["vendor"]["id"]
    # pick first product
    cats = requests.get(f"{API}/storefront/sharma-wines/categories").json()
    assert cats, "no categories"
    cat_id = cats[0]["id"]
    prods = requests.get(f"{API}/storefront/sharma-wines/categories/{cat_id}/products").json()
    assert prods, "no products"
    p = prods[0]

    payload = {
        "vendor_id": vendor_id,
        "items": [{"product_id": p["id"], "qty": 1}],
        "customer_name": "TEST_DeliveryBoy QA",
        "customer_phone": "9999999991",
        "delivery_address": "1 QA Street, Bangalore",
        "payment_mode": "cod",
        "notes": "iter9 delivery test",
    }
    r = requests.post(f"{API}/storefront/sharma-wines/orders", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    oid = r.json()["id"]

    for s in ["payment_verified", "accepted", "out_for_delivery"]:
        rr = requests.patch(f"{API}/vendor/orders/{oid}", json={"status": s}, headers=vendor_headers, timeout=10)
        if rr.status_code != 200:
            # COD likely already past payment_verification_pending; try next
            continue
    # fetch fresh
    r = requests.get(f"{API}/vendor/orders/{oid}", headers=vendor_headers, timeout=10)
    assert r.status_code == 200, r.text
    o = r.json()
    if o["status"] != "out_for_delivery":
        # try again with explicit transition
        requests.patch(f"{API}/vendor/orders/{oid}", json={"status": "accepted"}, headers=vendor_headers, timeout=10)
        rr = requests.patch(f"{API}/vendor/orders/{oid}", json={"status": "out_for_delivery"}, headers=vendor_headers, timeout=10)
        assert rr.status_code == 200, rr.text
        o = rr.json()
    return o


# ---------- tests ----------
class TestDeliveryHandoff:
    def test_unknown_token_404(self):
        r = requests.get(f"{API}/delivery/{'0' * 32}", timeout=10)
        assert r.status_code == 404

    def test_post_unknown_token_404(self):
        r = requests.post(
            f"{API}/delivery/{'0' * 32}/delivered",
            files={"file": ("p.png", _png_bytes(), "image/png")},
            timeout=15,
        )
        assert r.status_code == 404

    def test_dispatchable_order_exposes_token(self, vendor_headers):
        o = _get_or_create_dispatchable_order(vendor_headers)
        assert o.get("delivery_token"), "vendor_orders should expose delivery_token"
        assert re.match(r"^[a-f0-9]{16,}$", o["delivery_token"]), "delivery_token should be hex"

    def test_get_delivery_actionable_payload(self, vendor_headers):
        o = _get_or_create_dispatchable_order(vendor_headers)
        token = o["delivery_token"]
        r = requests.get(f"{API}/delivery/{token}", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("short_id", "status", "is_actionable", "items", "total", "customer_name", "delivery_address", "vendor_name"):
            assert k in data, f"missing field {k}"
        assert data["status"] == "out_for_delivery"
        assert data["is_actionable"] is True

    def test_mark_delivered_happy_path_then_409(self, vendor_headers):
        o = _get_or_create_dispatchable_order(vendor_headers)
        token = o["delivery_token"]

        # POST proof
        r = requests.post(
            f"{API}/delivery/{token}/delivered",
            files={"file": ("proof.png", _png_bytes(), "image/png")},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "delivered"
        assert body.get("proof_image_id")
        proof_id = body["proof_image_id"]

        # GET shows delivered with proof image id, is_actionable False
        r2 = requests.get(f"{API}/delivery/{token}", timeout=10)
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "delivered"
        assert d["is_actionable"] is False
        assert d["delivery_proof_image_id"] == proof_id
        assert d.get("delivered_at")

        # Proof image fetchable
        r3 = requests.get(f"{API}/uploads/{proof_id}", timeout=10)
        assert r3.status_code == 200
        assert r3.headers.get("content-type", "").startswith("image/")

        # Second POST → 409 (one-time link)
        r4 = requests.post(
            f"{API}/delivery/{token}/delivered",
            files={"file": ("proof2.png", _png_bytes(), "image/png")},
            timeout=15,
        )
        assert r4.status_code == 409, r4.text

    def test_get_for_non_dispatchable_status_returns_actionable_false(self, vendor_headers):
        # Find any order that is in payment_verified/accepted (NOT out_for_delivery)
        for status in ("accepted", "payment_verified", "payment_verification_pending"):
            r = requests.get(f"{API}/vendor/orders", headers=vendor_headers, params={"status_filter": status}, timeout=10)
            if r.status_code == 200 and r.json():
                target = next((o for o in r.json() if o.get("delivery_token")), None)
                if target:
                    rr = requests.get(f"{API}/delivery/{target['delivery_token']}", timeout=10)
                    assert rr.status_code == 200
                    assert rr.json()["is_actionable"] is False
                    # POST should be blocked with 409
                    rp = requests.post(
                        f"{API}/delivery/{target['delivery_token']}/delivered",
                        files={"file": ("p.png", _png_bytes(), "image/png")},
                        timeout=15,
                    )
                    assert rp.status_code == 409
                    return
        pytest.skip("no non-dispatchable order with delivery_token found in this snapshot")
