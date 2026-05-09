"""
Iteration-11: Master Payments audit log (A), Vendor T&C (B), Multi-vendor pricing
isolation (D), enabled_categories filter (E), Offers / Coupons CRUD + validate +
order-application (G).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

MASTER_EMAIL = "master@localcommerce.in"
MASTER_PW = "master123"
SHARMA_EMAIL = "sharma-wines@vendor.local"
SHARMA_PW = "sharma-wines123"
KING_EMAIL = "kingfisher-spot@vendor.local"
KING_PW = "kingfisher-spot123"


# ---------- shared fixtures ----------
@pytest.fixture(scope="module")
def master_token():
    r = requests.post(f"{API}/auth/login", json={"email": MASTER_EMAIL, "password": MASTER_PW}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sharma_token():
    r = requests.post(f"{API}/auth/login", json={"email": SHARMA_EMAIL, "password": SHARMA_PW}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def king_token():
    r = requests.post(f"{API}/auth/login", json={"email": KING_EMAIL, "password": KING_PW}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _get_vendor(master_token, slug):
    r = requests.get(f"{API}/master/vendors", headers=H(master_token), timeout=15)
    r.raise_for_status()
    for v in r.json():
        if v.get("slug") == slug:
            return v
    raise AssertionError(f"vendor with slug {slug} not found")


# ==================== A) Master payments audit log ====================
class TestMasterPayments:
    def test_record_payment_extends_expiry_and_persists(self, master_token):
        v = _get_vendor(master_token, "sharma-wines")
        prev_exp = v.get("subscription_expires_at")

        # Record a payment for ₹5000 / 30d
        r = requests.post(
            f"{API}/master/vendors/{v['id']}/payments",
            json={"amount_inr": 5000, "days_extended": 30, "txn_note": "TEST_iter11_payment"},
            headers=H(master_token),
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "payment" in body and "new_expiry_at" in body
        p = body["payment"]
        assert p["amount_inr"] == 5000
        assert p["days_extended"] == 30
        assert p["vendor_name"]
        assert p["txn_note"] == "TEST_iter11_payment"

        # Vendor expiry got updated to >= today + 30d (or current expiry + 30d)
        v2 = _get_vendor(master_token, "sharma-wines")
        assert v2["subscription_expires_at"]
        assert v2.get("subscription_active") is True

        # The new expiry MUST equal body.new_expiry_at
        assert v2["subscription_expires_at"] == body["new_expiry_at"]

        # Append a second to verify "later of (expiry, today)" math
        r2 = requests.post(
            f"{API}/master/vendors/{v['id']}/payments",
            json={"amount_inr": 5000, "days_extended": 30, "txn_note": "TEST_iter11_stack"},
            headers=H(master_token),
            timeout=20,
        )
        assert r2.status_code == 200
        # 2nd new_expiry should be ~30d after the first
        from datetime import datetime
        d1 = datetime.fromisoformat(body["new_expiry_at"].replace("Z", "+00:00"))
        d2 = datetime.fromisoformat(r2.json()["new_expiry_at"].replace("Z", "+00:00"))
        delta_days = (d2 - d1).days
        assert 29 <= delta_days <= 31, f"second payment should add ~30d, got {delta_days}"

    def test_list_payments(self, master_token):
        r = requests.get(f"{API}/master/payments", headers=H(master_token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        # Verify required fields incl. vendor_name
        sample = rows[0]
        for f in ("id", "vendor_id", "vendor_name", "amount_inr", "days_extended", "recorded_at", "new_expiry_at"):
            assert f in sample

        # filter by vendor_id
        vid = sample["vendor_id"]
        r2 = requests.get(f"{API}/master/payments?vendor_id={vid}", headers=H(master_token), timeout=15)
        assert r2.status_code == 200
        for row in r2.json():
            assert row["vendor_id"] == vid

    def test_vendor_role_403_on_payments(self, sharma_token):
        v_self = requests.get(f"{API}/vendor/me", headers=H(sharma_token), timeout=10).json()
        vid = v_self.get("id")
        r1 = requests.post(
            f"{API}/master/vendors/{vid}/payments",
            json={"amount_inr": 100, "days_extended": 1},
            headers=H(sharma_token),
            timeout=10,
        )
        assert r1.status_code == 403
        r2 = requests.get(f"{API}/master/payments", headers=H(sharma_token), timeout=10)
        assert r2.status_code == 403


# ==================== B) Vendor T&C signature ====================
class TestVendorTos:
    def test_create_vendor_requires_signature(self, master_token):
        # Missing signature -> 400
        r = requests.post(
            f"{API}/master/vendors",
            json={
                "name": "TEST_iter11_TosVendor",
                "owner_name": "Test Owner",
                "owner_phone": "9999999999",
                "accepts_tos": True,
                "tos_signature_name": "",
            },
            headers=H(master_token),
            timeout=20,
        )
        assert r.status_code == 400
        assert "signature" in r.text.lower() or "legal name" in r.text.lower()

    def test_create_vendor_with_signature_persists(self, master_token):
        slug = "test-iter11-tos"
        # Cleanup first if exists
        existing = requests.get(f"{API}/master/vendors", headers=H(master_token), timeout=15).json()
        for v in existing:
            if v.get("slug") == slug:
                requests.delete(f"{API}/master/vendors/{v['id']}", headers=H(master_token), timeout=10)

        r = requests.post(
            f"{API}/master/vendors",
            json={
                "name": "TEST_iter11 TosVendor",
                "slug": slug,
                "owner_name": "Test Owner",
                "owner_phone": "9999999999",
                "address": "TEST",
                "accepts_tos": True,
                "tos_signature_name": "John Q Tester",
            },
            headers=H(master_token),
            timeout=20,
        )
        assert r.status_code == 200, r.text
        v = r.json()["vendor"]
        assert v["tos_accepted"] is True
        assert v["tos_signature_name"] == "John Q Tester"
        assert v["tos_accepted_at"]
        assert "tos_accepted_ip" in v

        # Cleanup
        requests.delete(f"{API}/master/vendors/{v['id']}", headers=H(master_token), timeout=10)


# ==================== D) Multi-vendor pricing isolation ====================
class TestMultiVendorIsolation:
    def test_storefronts_return_distinct_products(self, sharma_token, king_token):
        # Pick a category id from sharma's storefront for kingfisher product creation
        sf_sharma = requests.get(f"{API}/storefront/sharma-wines", timeout=15).json()
        assert sf_sharma["vendor"]["slug"] == "sharma-wines"

        # Find a liquor category + subgroup id used in sharma so we can mirror category for kingfisher
        cat_id, sub_id = None, None
        for c in sf_sharma["categories"]:
            if c["id"] == "liquor":
                cat_id = "liquor"
                if c["subgroups"]:
                    sub_id = c["subgroups"][0]["id"]
                break
        assert cat_id and sub_id, "sharma must have a liquor category w/ at least 1 subgroup"

        # Create a TEST_ product for kingfisher-spot at a DIFFERENT price than any sharma product
        prod_payload = {
            "category_id": cat_id,
            "subgroup_id": sub_id,
            "name": "TEST_iter11_KF_Beer",
            "price": 12345,  # Distinctive price that won't collide
            "image": "",
            "unit": "650ml",
            "tag": "",
            "description": "isolation test",
            "in_stock": True,
        }
        r = requests.post(f"{API}/vendor/products", json=prod_payload, headers=H(king_token), timeout=15)
        assert r.status_code == 200, r.text
        kf_prod = r.json()
        try:
            # Storefronts now should be isolated
            sf_kf = requests.get(f"{API}/storefront/kingfisher-spot", timeout=15).json()
            kf_names = [p["name"] for c in sf_kf["categories"] for s in c["subgroups"] for p in s["products"]]
            sf_sharma2 = requests.get(f"{API}/storefront/sharma-wines", timeout=15).json()
            sw_names = [p["name"] for c in sf_sharma2["categories"] for s in c["subgroups"] for p in s["products"]]

            assert "TEST_iter11_KF_Beer" in kf_names, "kingfisher should expose its own product"
            assert "TEST_iter11_KF_Beer" not in sw_names, "sharma should NOT see kingfisher products"

            # And sharma's products are NOT exposed by kingfisher
            assert sw_names, "sharma must have products"
            sample_sharma = sw_names[0]
            assert sample_sharma not in kf_names, f"product '{sample_sharma}' leaked into kingfisher"

            # night_pricing payload exists per-vendor
            assert "night_pricing_active" in sf_kf
            assert "night_pricing_active" in sf_sharma2
        finally:
            requests.delete(f"{API}/vendor/products/{kf_prod['id']}", headers=H(king_token), timeout=10)


# ==================== E) enabled_categories filter ====================
class TestEnabledCategoriesFilter:
    def test_storefront_filters_when_only_liquor_enabled(self, master_token):
        v = _get_vendor(master_token, "sharma-wines")
        original_cats = v.get("enabled_categories")

        try:
            # Restrict to just liquor
            r = requests.patch(
                f"{API}/master/vendors/{v['id']}",
                json={"enabled_categories": ["liquor"]},
                headers=H(master_token),
                timeout=15,
            )
            assert r.status_code == 200, r.text

            sf = requests.get(f"{API}/storefront/sharma-wines", timeout=15).json()
            cat_ids = [c["id"] for c in sf["categories"]]
            assert cat_ids == ["liquor"], f"expected only liquor, got {cat_ids}"

            # Empty list -> back to ALL
            r2 = requests.patch(
                f"{API}/master/vendors/{v['id']}",
                json={"enabled_categories": []},
                headers=H(master_token),
                timeout=15,
            )
            assert r2.status_code == 200
            sf2 = requests.get(f"{API}/storefront/sharma-wines", timeout=15).json()
            cat_ids2 = [c["id"] for c in sf2["categories"]]
            assert len(cat_ids2) >= 2, f"empty list should default to ALL categories, got {cat_ids2}"
        finally:
            # Restore original
            requests.patch(
                f"{API}/master/vendors/{v['id']}",
                json={"enabled_categories": original_cats if original_cats else []},
                headers=H(master_token),
                timeout=15,
            )


# ==================== G) Offers / Coupons ====================
class TestOffers:
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_offers(self, master_token):
        """Cleanup TEST_ offers after the class runs."""
        yield
        rows = requests.get(f"{API}/master/offers", headers=H(master_token), timeout=15).json()
        for o in rows:
            if o.get("code", "").startswith("TEST") or o.get("title", "").startswith("TEST_"):
                requests.delete(f"{API}/master/offers/{o['id']}", headers=H(master_token), timeout=10)

    def _ensure_clean_offer(self, master_token, vendor_id, code):
        rows = requests.get(f"{API}/master/offers?vendor_id={vendor_id}", headers=H(master_token), timeout=15).json()
        for o in rows:
            if o.get("code") == code:
                requests.delete(f"{API}/master/offers/{o['id']}", headers=H(master_token), timeout=10)

    def test_vendor_creates_offer_and_duplicate_rejected(self, master_token, sharma_token):
        v = _get_vendor(master_token, "sharma-wines")
        self._ensure_clean_offer(master_token, v["id"], "TESTWELCOME10")

        body = {
            "code": "TESTWELCOME10",
            "title": "TEST_10% off",
            "discount_type": "percent",
            "discount_value": 10,
            "min_order_amount": 500,
            "is_active": True,
        }
        r = requests.post(f"{API}/vendor/offers", json=body, headers=H(sharma_token), timeout=15)
        assert r.status_code == 200, r.text
        offer = r.json()
        assert offer["code"] == "TESTWELCOME10"
        assert offer["uses"] == 0
        assert offer["is_active"] is True

        # Duplicate -> 400
        r2 = requests.post(f"{API}/vendor/offers", json=body, headers=H(sharma_token), timeout=15)
        assert r2.status_code == 400
        assert "already exists" in r2.text.lower()

    def test_offer_validation_invalid_percent_and_flat(self, sharma_token):
        # percent > 100
        r = requests.post(
            f"{API}/vendor/offers",
            json={"code": "TESTBADPCT", "title": "TEST_bad", "discount_type": "percent", "discount_value": 150},
            headers=H(sharma_token),
            timeout=10,
        )
        assert r.status_code == 400
        # flat <=0
        r2 = requests.post(
            f"{API}/vendor/offers",
            json={"code": "TESTBADFLAT", "title": "TEST_bad", "discount_type": "flat", "discount_value": 0},
            headers=H(sharma_token),
            timeout=10,
        )
        assert r2.status_code == 400

    def test_storefront_validate_offer(self, master_token):
        # Validate the percent code created above
        r_ok = requests.post(
            f"{API}/storefront/sharma-wines/offers/validate",
            json={"code": "TESTWELCOME10", "cart_total": 1500},
            timeout=15,
        )
        assert r_ok.status_code == 200, r_ok.text
        body = r_ok.json()
        assert body["discount_amount"] == 150
        assert body["new_total"] == 1350
        assert body["code"] == "TESTWELCOME10"

        # Below min order
        r_bad = requests.post(
            f"{API}/storefront/sharma-wines/offers/validate",
            json={"code": "TESTWELCOME10", "cart_total": 300},
            timeout=15,
        )
        assert r_bad.status_code == 400
        assert "minimum order" in r_bad.text.lower() or "₹500" in r_bad.text or "500" in r_bad.text

        # Unknown code
        r_unk = requests.post(
            f"{API}/storefront/sharma-wines/offers/validate",
            json={"code": "TESTUNKNOWN", "cart_total": 1500},
            timeout=15,
        )
        assert r_unk.status_code == 404

    def test_master_offers_crud(self, master_token):
        v = _get_vendor(master_token, "sharma-wines")
        # list_all (no vendor_id) -> joined vendor_name
        r_all = requests.get(f"{API}/master/offers", headers=H(master_token), timeout=15)
        assert r_all.status_code == 200
        for o in r_all.json():
            assert "vendor_name" in o

        # Master creates an offer on behalf of sharma
        self._ensure_clean_offer(master_token, v["id"], "TESTMSTR15")
        r_create = requests.post(
            f"{API}/master/vendors/{v['id']}/offers",
            json={
                "code": "TESTMSTR15", "title": "TEST_master 15%",
                "discount_type": "percent", "discount_value": 15, "min_order_amount": 0,
            },
            headers=H(master_token), timeout=15,
        )
        assert r_create.status_code == 200, r_create.text
        oid = r_create.json()["id"]

        # PATCH
        r_patch = requests.patch(
            f"{API}/master/offers/{oid}",
            json={"is_active": False, "title": "TEST_master 15% OFF"},
            headers=H(master_token), timeout=15,
        )
        assert r_patch.status_code == 200
        assert r_patch.json()["is_active"] is False
        assert r_patch.json()["title"] == "TEST_master 15% OFF"

        # DELETE
        r_del = requests.delete(f"{API}/master/offers/{oid}", headers=H(master_token), timeout=10)
        assert r_del.status_code == 200

    def test_vendor_role_cannot_use_master_offers(self, sharma_token):
        r = requests.get(f"{API}/master/offers", headers=H(sharma_token), timeout=10)
        assert r.status_code == 403


# ==================== G) Offer applied at order placement ====================
class TestOrderWithOffer:
    def test_order_applies_offer_and_increments_uses(self, master_token, sharma_token):
        # Create a fresh offer for this order (flat ₹100 off, min 500)
        v = _get_vendor(master_token, "sharma-wines")
        # cleanup existing
        for o in requests.get(f"{API}/vendor/offers", headers=H(sharma_token), timeout=10).json():
            if o["code"] == "TESTORDER100":
                requests.delete(f"{API}/vendor/offers/{o['id']}", headers=H(sharma_token), timeout=10)

        r = requests.post(
            f"{API}/vendor/offers",
            json={
                "code": "TESTORDER100", "title": "TEST_₹100 off",
                "discount_type": "flat", "discount_value": 100, "min_order_amount": 500, "is_active": True,
            },
            headers=H(sharma_token), timeout=15,
        )
        assert r.status_code == 200
        offer_id = r.json()["id"]
        initial_uses = r.json()["uses"]

        # Find a liquor product with price >=1000 (so liquor min ₹1000 server gate passes)
        sf = requests.get(f"{API}/storefront/sharma-wines", timeout=15).json()
        product = None
        for c in sf["categories"]:
            if c["id"] != "liquor":
                continue
            for s in c["subgroups"]:
                for p in s["products"]:
                    if p["price"] >= 1000:
                        product = (p, c["id"])
                        break
                if product:
                    break
            if product:
                break
        assert product, "Need at least one liquor product priced ≥1000 in sharma-wines for this test"
        prod, cat_id = product

        order_body = {
            "vendor_slug": "sharma-wines",
            "customer_name": "TEST_Coupon Buyer",
            "customer_phone": "9000000000",
            "delivery_address": "TEST",
            "notes": "TEST_iter11",
            "payment_mode": "cod",
            "offer_code": "TESTORDER100",
            "items": [
                {"product_id": prod["id"], "name": prod["name"], "price": prod["price"],
                 "qty": 1, "category_id": cat_id}
            ],
        }
        # Allow rate limit to pass — sleep 2s before posting if needed
        r_ord = requests.post(f"{API}/orders", json=order_body, timeout=20)
        # Rate-limit retry
        if r_ord.status_code == 429:
            time.sleep(61)
            r_ord = requests.post(f"{API}/orders", json=order_body, timeout=20)
        assert r_ord.status_code == 200, r_ord.text
        body = r_ord.json()
        # discounted total
        assert body["total"] == round(prod["price"] - 100, 2), f"expected {prod['price']-100}, got {body['total']}"

        # Check offer.uses incremented
        offers = requests.get(f"{API}/vendor/offers", headers=H(sharma_token), timeout=10).json()
        match = next(o for o in offers if o["id"] == offer_id)
        assert match["uses"] == initial_uses + 1

        # Re-validate via storefront returns same shape
        r_val = requests.post(
            f"{API}/storefront/sharma-wines/offers/validate",
            json={"code": "TESTORDER100", "cart_total": int(prod["price"])}, timeout=15,
        )
        assert r_val.status_code == 200
        assert r_val.json()["discount_amount"] == 100

        # Cleanup the offer
        requests.delete(f"{API}/vendor/offers/{offer_id}", headers=H(sharma_token), timeout=10)


# ==================== Restore state — runs last ====================
def test_zz_restore_state(master_token, sharma_token):
    """Cleanup: clear test offers, ensure sharma enabled_categories restored."""
    # Delete any leftover TEST offers
    rows = requests.get(f"{API}/master/offers", headers=H(master_token), timeout=15).json()
    for o in rows:
        if (o.get("code") or "").startswith("TEST") or (o.get("title") or "").startswith("TEST_"):
            requests.delete(f"{API}/master/offers/{o['id']}", headers=H(master_token), timeout=10)

    v = _get_vendor(master_token, "sharma-wines")
    cur = v.get("enabled_categories") or []
    if len(cur) != 4:
        # restore to all 4 (default platform)
        requests.patch(
            f"{API}/master/vendors/{v['id']}",
            json={"enabled_categories": ["liquor", "cigarettes", "snacks", "food"]},
            headers=H(master_token), timeout=15,
        )

    # Cleanup any TEST products in kingfisher
    king_user = requests.post(f"{API}/auth/login", json={"email": KING_EMAIL, "password": KING_PW}, timeout=15).json()
    kf_token = king_user["access_token"]
    kf_prods = requests.get(f"{API}/vendor/products", headers=H(kf_token), timeout=10).json()
    for p in kf_prods:
        if p["name"].startswith("TEST_"):
            requests.delete(f"{API}/vendor/products/{p['id']}", headers=H(kf_token), timeout=10)
