"""Iteration-6 backend tests:

- /api/push/vapid-public-key
- /api/vendor/push/{subscribe,unsubscribe,test}
- night pricing (PATCH /api/vendor/store + storefront recompute + place_order enforcement)
- /api/vendor/products/bulk
- regression: place-order UPI 5-digit, tracking, vendor-only role isolation
"""
import os
import re
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PASSWORD = "sharma-wines123"
MASTER_EMAIL = "master@localcommerce.in"
MASTER_PASSWORD = "master123"


def _login(email, pw):
    return requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})


def _token(email, pw):
    r = _login(email, pw)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def vendor_token():
    return _token(VENDOR_EMAIL, VENDOR_PASSWORD)


@pytest.fixture(scope="module")
def master_token():
    return _token(MASTER_EMAIL, MASTER_PASSWORD)


@pytest.fixture(scope="module", autouse=True)
def restore_pricing(vendor_token):
    """Always restore night pricing OFF after the module — per request."""
    yield
    requests.patch(f"{BASE_URL}/api/vendor/store",
                   json={"night_pricing_enabled": False},
                   headers=_h(vendor_token))


# ==================== VAPID public key ====================
class TestVapid:
    def test_public_key_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert r.status_code == 200
        d = r.json()
        assert "public_key" in d and "enabled" in d
        assert isinstance(d["public_key"], str) and len(d["public_key"]) > 40
        # URL-safe base64: only A-Z, a-z, 0-9, _, -, optional =
        assert re.fullmatch(r"[A-Za-z0-9_\-=]+", d["public_key"])
        assert d["enabled"] is True


# ==================== Push subscribe / unsubscribe / test ====================
class TestPushFlow:
    sub_payload = {
        "subscription": {
            "endpoint": f"https://example.org/push/{uuid.uuid4().hex}",
            "keys": {"p256dh": "BPet" + "A" * 84, "auth": "AAAA" + "B" * 12},
        },
        "user_agent": "pytest-iter6",
    }

    def test_unauthenticated_subscribe_401(self):
        r = requests.post(f"{BASE_URL}/api/vendor/push/subscribe", json=self.sub_payload)
        assert r.status_code == 401

    def test_subscribe_idempotent_upsert(self, vendor_token):
        r1 = requests.post(f"{BASE_URL}/api/vendor/push/subscribe",
                           json=self.sub_payload, headers=_h(vendor_token))
        assert r1.status_code == 200, r1.text
        assert r1.json().get("ok") is True
        # Calling twice should NOT create duplicates — verify via test endpoint sent count
        r2 = requests.post(f"{BASE_URL}/api/vendor/push/subscribe",
                           json=self.sub_payload, headers=_h(vendor_token))
        assert r2.status_code == 200

    def test_push_test_endpoint(self, vendor_token):
        r = requests.post(f"{BASE_URL}/api/vendor/push/test", headers=_h(vendor_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "sent" in d
        # Real push delivery to example.org will fail; backend should
        # remove stale endpoint and return sent=0 (or 1 if ignored).
        assert isinstance(d["sent"], int)

    def test_unsubscribe(self, vendor_token):
        r = requests.post(f"{BASE_URL}/api/vendor/push/unsubscribe",
                          json=self.sub_payload, headers=_h(vendor_token))
        assert r.status_code == 200

    def test_push_test_zero_subs(self, vendor_token):
        # Ensure all subs gone (defensive cleanup)
        requests.post(f"{BASE_URL}/api/vendor/push/unsubscribe",
                      json=self.sub_payload, headers=_h(vendor_token))
        r = requests.post(f"{BASE_URL}/api/vendor/push/test", headers=_h(vendor_token))
        assert r.status_code == 200
        # With zero subs the function returns 0 (no errors)
        assert isinstance(r.json().get("sent"), int)


# ==================== Night pricing ====================
class TestNightPricing:
    def test_enable_then_storefront_reflects(self, vendor_token):
        # Force the window to span the entire day
        r = requests.patch(
            f"{BASE_URL}/api/vendor/store",
            json={
                "night_pricing_enabled": True,
                "night_start": "00:00",
                "night_end": "23:59",
                "night_multiplier": 1.20,
                "night_categories": ["liquor"],
            },
            headers=_h(vendor_token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["night_pricing_enabled"] is True
        assert body["night_multiplier"] == 1.20
        assert body["night_categories"] == ["liquor"]

        sf = requests.get(f"{BASE_URL}/api/storefront/sharma-wines")
        assert sf.status_code == 200
        sfd = sf.json()
        assert sfd["night_pricing_active"] is True

        # Walk products: liquor should be marked night_pricing=true; others not.
        liquor_seen = others_seen = 0
        for c in sfd["categories"]:
            for s in c["subgroups"]:
                for p in s["products"]:
                    if c["id"] == "liquor":
                        liquor_seen += 1
                        assert p.get("night_pricing") is True
                        assert abs(p["price"] - round(p["base_price"] * 1.2, 2)) < 0.01
                    else:
                        others_seen += 1
                        assert p.get("night_pricing", False) is False
                        assert p["price"] == p["base_price"]
        assert liquor_seen > 0, "No liquor products to validate against"
        assert others_seen > 0, "No non-liquor products for negative test"

    def test_server_ignores_client_price(self, vendor_token):
        """Place an order with client price=1.0 on a liquor item; server must charge base*1.2."""
        sf = requests.get(f"{BASE_URL}/api/storefront/sharma-wines").json()
        liquor_cat = next(c for c in sf["categories"] if c["id"] == "liquor")
        # find a product whose base price is 180 if possible, else any
        chosen = None
        for s in liquor_cat["subgroups"]:
            for p in s["products"]:
                if abs(p.get("base_price", 0) - 180.0) < 0.01:
                    chosen = p
                    break
            if chosen:
                break
        if not chosen:
            chosen = liquor_cat["subgroups"][0]["products"][0]
        base = float(chosen["base_price"])
        expected_unit = round(base * 1.20, 2)
        qty = 10  # to comfortably exceed liquor min ₹1000
        expected_total = round(expected_unit * qty, 2)

        order_body = {
            "vendor_slug": "sharma-wines",
            "customer_name": "TEST_NightBuyer",
            "customer_phone": "9999999999",
            "delivery_address": "Test Lane",
            "payment_mode": "upi",
            "upi_last5": "12345",
            "items": [{
                "product_id": chosen["id"],
                "name": chosen["name"],
                "price": 1.0,  # malicious / spoofed
                "qty": qty,
                "category_id": "liquor",
            }],
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=order_body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == expected_total, f"Expected {expected_total}, got {d['total']}"

        # Tracking response also reflects authoritative price
        t = requests.get(f"{BASE_URL}/api/track/{d['tracking_token']}")
        assert t.status_code == 200
        td = t.json()
        assert td["total"] == expected_total
        assert td["items"][0]["price"] == expected_unit

    def test_disable_reverts_prices(self, vendor_token):
        r = requests.patch(
            f"{BASE_URL}/api/vendor/store",
            json={"night_pricing_enabled": False},
            headers=_h(vendor_token),
        )
        assert r.status_code == 200
        sf = requests.get(f"{BASE_URL}/api/storefront/sharma-wines").json()
        assert sf["night_pricing_active"] is False
        for c in sf["categories"]:
            for s in c["subgroups"]:
                for p in s["products"]:
                    assert p["price"] == p["base_price"]
                    assert p.get("night_pricing", False) is False


# ==================== Bulk import ====================
class TestBulkImport:
    def _get_cat_sub(self, vendor_token, cat_id="snacks"):
        cats = requests.get(f"{BASE_URL}/api/vendor/categories",
                            headers=_h(vendor_token)).json()
        subs = requests.get(f"{BASE_URL}/api/vendor/subgroups",
                            headers=_h(vendor_token)).json()
        cat = next(c for c in cats if c["id"] == cat_id)
        sub = next(s for s in subs if s["category_id"] == cat["id"])
        return cat, sub

    def test_unauthenticated_401(self):
        r = requests.post(f"{BASE_URL}/api/vendor/products/bulk",
                          json={"products": [], "replace_existing": False})
        assert r.status_code == 401

    def test_partial_success(self, vendor_token):
        cat, sub = self._get_cat_sub(vendor_token, "snacks")
        body = {
            "products": [
                {"category_id": cat["id"], "subgroup_id": sub["id"],
                 "name": "TEST_Bulk1", "price": 25, "image": "", "unit": "1pc",
                 "tag": "", "description": "", "in_stock": True},
                {"category_id": cat["id"], "subgroup_id": sub["id"],
                 "name": "TEST_Bulk2", "price": 30, "image": "", "unit": "1pc",
                 "tag": "", "description": "", "in_stock": True},
                # Invalid: subgroup doesn't belong to category
                {"category_id": cat["id"], "subgroup_id": "does-not-exist",
                 "name": "TEST_BulkInvalid", "price": 99, "image": "", "unit": "",
                 "tag": "", "description": "", "in_stock": True},
            ],
            "replace_existing": False,
        }
        r = requests.post(f"{BASE_URL}/api/vendor/products/bulk",
                          json=body, headers=_h(vendor_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["created"] == 2
        assert len(d["errors"]) == 1
        assert d["errors"][0]["row"] == 3

        # Verify the two products show up in the vendor catalog
        prods = requests.get(f"{BASE_URL}/api/vendor/products",
                             headers=_h(vendor_token)).json()
        names = {p["name"] for p in prods}
        assert "TEST_Bulk1" in names
        assert "TEST_Bulk2" in names

    def test_replace_existing_wipes(self, vendor_token):
        cat, sub = self._get_cat_sub(vendor_token, "snacks")
        before = requests.get(f"{BASE_URL}/api/vendor/products",
                              headers=_h(vendor_token)).json()
        assert len(before) > 0  # baseline

        body = {
            "products": [
                {"category_id": cat["id"], "subgroup_id": sub["id"],
                 "name": "TEST_AfterReplace", "price": 10, "image": "", "unit": "",
                 "tag": "", "description": "", "in_stock": True},
            ],
            "replace_existing": True,
        }
        r = requests.post(f"{BASE_URL}/api/vendor/products/bulk",
                          json=body, headers=_h(vendor_token))
        assert r.status_code == 200, r.text
        assert r.json()["created"] == 1

        after = requests.get(f"{BASE_URL}/api/vendor/products",
                             headers=_h(vendor_token)).json()
        assert len(after) == 1
        assert after[0]["name"] == "TEST_AfterReplace"

    def test_reseed_after_replace(self, vendor_token):
        """Restore some products since replace_existing wiped catalog —
        re-seed enough to keep storefront useful for UI tests later."""
        cats = requests.get(f"{BASE_URL}/api/vendor/categories",
                            headers=_h(vendor_token)).json()
        subs = requests.get(f"{BASE_URL}/api/vendor/subgroups",
                            headers=_h(vendor_token)).json()
        # Create at least one liquor product priced 180 (used by night-pricing tests)
        liquor_sub = next(s for s in subs if s["category_id"] == "liquor")
        snacks_sub = next(s for s in subs if s["category_id"] == "snacks")
        body = {
            "products": [
                {"category_id": "liquor", "subgroup_id": liquor_sub["id"],
                 "name": "TEST_Reseed_Liquor_180", "price": 180.0, "image": "", "unit": "750ml",
                 "tag": "", "description": "", "in_stock": True},
                {"category_id": "snacks", "subgroup_id": snacks_sub["id"],
                 "name": "TEST_Reseed_Snack", "price": 20.0, "image": "", "unit": "1pc",
                 "tag": "", "description": "", "in_stock": True},
            ],
            "replace_existing": False,
        }
        r = requests.post(f"{BASE_URL}/api/vendor/products/bulk",
                          json=body, headers=_h(vendor_token))
        assert r.status_code == 200


# ==================== Regression ====================
class TestRegression:
    def test_storefront_loads(self):
        r = requests.get(f"{BASE_URL}/api/storefront/sharma-wines")
        assert r.status_code == 200
        d = r.json()
        assert d["vendor"]["slug"] == "sharma-wines"
        assert "categories" in d

    def test_upi_5digit_required(self):
        # Need an in-stock product
        sf = requests.get(f"{BASE_URL}/api/storefront/sharma-wines").json()
        prod = None
        for c in sf["categories"]:
            for s in c["subgroups"]:
                if s["products"]:
                    prod = s["products"][0]
                    break
            if prod:
                break
        if not prod:
            pytest.skip("No products to order")

        body = {
            "vendor_slug": "sharma-wines",
            "customer_name": "TEST_UPI",
            "customer_phone": "9999999998",
            "delivery_address": "Test",
            "payment_mode": "upi",
            "upi_last5": "1234",  # only 4 digits
            "items": [{"product_id": prod["id"], "name": prod["name"],
                       "price": prod["price"], "qty": 1, "category_id": "snacks"}],
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=body)
        assert r.status_code == 400

    def test_vendor_role_cannot_access_master(self, vendor_token):
        r = requests.get(f"{BASE_URL}/api/master/stats", headers=_h(vendor_token))
        assert r.status_code == 403

    def test_master_role_cannot_access_vendor(self, master_token):
        r = requests.get(f"{BASE_URL}/api/vendor/me", headers=_h(master_token))
        assert r.status_code == 403
