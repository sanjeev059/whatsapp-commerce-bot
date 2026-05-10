"""Backend tests for the multi-tenant hyperlocal commerce SaaS.

Coverage:
- Public storefront (/api/storefront/{slug}) with subscription/closed gates
- Public order placement (/api/orders) with UPI 5-digit + liquor min 1000 + COD
- Tracking (/api/track/{token})
- Auth login + /auth/me + role enforcement
- Master admin: stats, vendors CRUD (create/list/deactivate), orders
- Vendor admin: me, store update + open/close, products CRUD, orders + status update
- Cross-role 403 enforcement
"""
import os
import re
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MASTER_EMAIL = "master@localcommerce.in"
MASTER_PASSWORD = "master123"
VENDOR_EMAIL = "sharma-wines@vendor.local"
VENDOR_PASSWORD = "sharma-wines123"
DEMO_SLUG = "sharma-wines"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(s, email, pw):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def master_token(s):
    return _login(s, MASTER_EMAIL, MASTER_PASSWORD)["access_token"]


@pytest.fixture(scope="session")
def vendor_token(s):
    return _login(s, VENDOR_EMAIL, VENDOR_PASSWORD)["access_token"]


@pytest.fixture(scope="session")
def master_s(master_token):
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json",
                         "Authorization": f"Bearer {master_token}"})
    return sess


@pytest.fixture(scope="session")
def vendor_s(vendor_token):
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json",
                         "Authorization": f"Bearer {vendor_token}"})
    return sess


# ---------- root ----------
def test_root(s):
    r = s.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "app" in r.json() or "message" in r.json()


# ---------- public storefront ----------
class TestStorefront:
    def test_storefront_exists_and_open(self, s):
        r = s.get(f"{BASE_URL}/api/storefront/{DEMO_SLUG}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["vendor"]["slug"] == DEMO_SLUG
        assert d["available"] is True
        assert isinstance(d["categories"], list)
        assert len(d["categories"]) == 4
        # 4 expected categories
        ids = {c["id"] for c in d["categories"]}
        assert "liquor" in ids and "cigarettes" in ids
        # ensure products present in some subgroup
        product_count = sum(
            len(sg["products"]) for c in d["categories"] for sg in c["subgroups"]
        )
        assert product_count > 0

    def test_unknown_slug_404(self, s):
        r = s.get(f"{BASE_URL}/api/storefront/nope-{uuid.uuid4().hex[:6]}")
        assert r.status_code == 404


# helper to pick a non-liquor product from public storefront
def _pick_non_liquor(storefront):
    for c in storefront["categories"]:
        if c["id"] == "liquor":
            continue
        for sg in c["subgroups"]:
            if sg["products"]:
                p = sg["products"][0]
                return {"product_id": p["id"], "name": p["name"], "price": p["price"],
                        "qty": 1, "category_id": c["id"]}
    pytest.skip("No non-liquor product in catalog")


def _pick_liquor(storefront):
    liq = next((c for c in storefront["categories"] if c["id"] == "liquor"), None)
    if not liq:
        pytest.skip("No liquor cat")
    for sg in liq["subgroups"]:
        if sg["products"]:
            p = sg["products"][0]
            return {"product_id": p["id"], "name": p["name"], "price": p["price"],
                    "qty": 1, "category_id": "liquor"}
    pytest.skip("No liquor product")


# ---------- public orders ----------
class TestOrders:
    @pytest.fixture(scope="class")
    def storefront(self, s):
        r = s.get(f"{BASE_URL}/api/storefront/{DEMO_SLUG}")
        assert r.status_code == 200
        return r.json()

    def test_upi_missing_last5_400(self, s, storefront):
        item = _pick_non_liquor(storefront)
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "TEST_NoUpi",
            "customer_phone": "9999999999",
            "delivery_address": "Addr",
            "payment_mode": "upi",
            "items": [item],
        })
        assert r.status_code == 400
        assert "5" in r.text

    def test_upi_bad_length_400(self, s, storefront):
        item = _pick_non_liquor(storefront)
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "TEST_Bad5",
            "customer_phone": "9999999999",
            "delivery_address": "Addr",
            "payment_mode": "upi",
            "upi_last5": "12",
            "items": [item],
        })
        assert r.status_code == 400

    def test_upi_valid_returns_short_id_and_token(self, s, storefront):
        item = _pick_non_liquor(storefront)
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "TEST_UpiOK",
            "customer_phone": "9999999999",
            "delivery_address": "Addr",
            "payment_mode": "upi",
            "upi_last5": "12345",
            "items": [item],
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["short_id"].startswith("ORD-")
        assert len(d["tracking_token"]) == 16
        assert d["status"] == "payment_verification_pending"
        # track works
        t = s.get(f"{BASE_URL}/api/track/{d['tracking_token']}")
        assert t.status_code == 200
        td = t.json()
        assert td["short_id"] == d["short_id"]
        assert td["payment_mode"] == "upi"
        assert td["status"] == "payment_verification_pending"

    def test_cod_starts_accepted(self, s, storefront):
        item = _pick_non_liquor(storefront)
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "TEST_COD",
            "customer_phone": "9999999999",
            "delivery_address": "Addr",
            "payment_mode": "cod",
            "items": [item],
        })
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "accepted"

    def test_liquor_min_1000_enforced(self, s, storefront):
        # Liquor product < 1000 alone should fail
        liq = _pick_liquor(storefront)
        liq_low = dict(liq)
        liq_low["price"] = 200
        liq_low["qty"] = 1
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "TEST_LiqLow",
            "customer_phone": "9999999999",
            "delivery_address": "Addr",
            "payment_mode": "cod",
            "items": [liq_low],
        })
        assert r.status_code == 400
        assert "1000" in r.text

    def test_empty_cart_400(self, s):
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG,
            "customer_name": "x", "customer_phone": "9", "delivery_address": "y",
            "payment_mode": "cod", "items": []
        })
        assert r.status_code == 400

    def test_unknown_vendor_404(self, s, storefront):
        item = _pick_non_liquor(storefront)
        r = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": f"nope-{uuid.uuid4().hex[:5]}",
            "customer_name": "x", "customer_phone": "9", "delivery_address": "y",
            "payment_mode": "cod", "items": [item]
        })
        assert r.status_code == 404

    def test_track_unknown_token_404(self, s):
        r = s.get(f"{BASE_URL}/api/track/notatoken")
        assert r.status_code == 404


# ---------- auth + role scoping ----------
class TestAuth:
    def test_master_login(self, s):
        d = _login(s, MASTER_EMAIL, MASTER_PASSWORD)
        assert d["user"]["role"] == "master_admin"
        assert "password_hash" not in d["user"]

    def test_vendor_login(self, s):
        d = _login(s, VENDOR_EMAIL, VENDOR_PASSWORD)
        assert d["user"]["role"] == "vendor_admin"
        assert d["user"].get("vendor_id")

    def test_invalid_password(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": MASTER_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_store_portal_rejects_master(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MASTER_EMAIL, "password": MASTER_PASSWORD, "portal": "store"},
        )
        assert r.status_code == 401

    def test_ops_portal_rejects_vendor(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": VENDOR_EMAIL, "password": VENDOR_PASSWORD, "portal": "ops"},
        )
        assert r.status_code == 401

    def test_store_portal_accepts_vendor(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": VENDOR_EMAIL, "password": VENDOR_PASSWORD, "portal": "store"},
        )
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "vendor_admin"

    def test_ops_portal_accepts_master(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MASTER_EMAIL, "password": MASTER_PASSWORD, "portal": "ops"},
        )
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "master_admin"

    def test_create_vendor_rejects_bad_aadhaar_checksum(self, master_s):
        r = master_s.post(f"{BASE_URL}/api/master/vendors", json={
            "name": "TEST Bad Aadhaar", "owner_name": "X", "owner_phone": "9",
            "address": "a", "upi_id": "x@u", "license_info": "",
            "accepts_tos": True, "tos_signature_name": "Test Legal Name",
            "owner_aadhar": "111111111111",
        })
        assert r.status_code == 400

    def test_create_vendor_accepts_valid_aadhaar_checksum(self, master_s, s):
        slug = f"aadhaar-{uuid.uuid4().hex[:6]}"
        r = master_s.post(f"{BASE_URL}/api/master/vendors", json={
            "name": f"TEST {slug}", "slug": slug, "owner_name": "Owner",
            "owner_phone": "9999999999", "address": "addr",
            "upi_id": "x@upi", "license_info": "FL-TEST",
            "accepts_tos": True, "tos_signature_name": "Owner Legal Full Name",
            "owner_aadhar": "543719411889",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["vendor"]["owner_aadhar"] == "543719411889"
        assert body["vendor"].get("owner_aadhar_verified_at")
        login_new = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": body["admin_email"], "password": body["default_password"], "portal": "store"},
        )
        assert login_new.status_code == 200
        tok = login_new.json()["access_token"]
        me = requests.get(
            f"{BASE_URL}/api/vendor/me",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert me.status_code == 200
        assert "owner_aadhar" not in me.json()

    def test_me_master(self, master_s):
        r = master_s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "master_admin"

    def test_me_vendor(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "vendor_admin"

    def test_no_auth_returns_401(self, s):
        for path in ["/api/master/stats", "/api/vendor/stats", "/api/auth/me"]:
            r = s.get(f"{BASE_URL}{path}")
            assert r.status_code == 401, f"{path} expected 401 got {r.status_code}"

    def test_vendor_cannot_hit_master_403(self, vendor_s):
        for path in ["/api/master/stats", "/api/master/vendors", "/api/master/orders"]:
            r = vendor_s.get(f"{BASE_URL}{path}")
            assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"

    def test_master_cannot_hit_vendor_403(self, master_s):
        for path in ["/api/vendor/me", "/api/vendor/stats", "/api/vendor/products",
                     "/api/vendor/orders"]:
            r = master_s.get(f"{BASE_URL}{path}")
            assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"

    def test_onboarding_kyc_upload_master_only(self, master_token, vendor_s, s):
        import base64
        png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        up = requests.post(
            f"{BASE_URL}/api/master/uploads/onboarding",
            files={"file": ("x.png", png, "image/png")},
            headers={"Authorization": f"Bearer {master_token}"},
            timeout=30,
        )
        assert up.status_code == 200, up.text
        fid = up.json()["id"]
        assert "master/onboarding-uploads" in (up.json().get("url") or "")
        pub = s.get(f"{BASE_URL}/api/uploads/{fid}")
        assert pub.status_code == 404
        ok = requests.get(
            f"{BASE_URL}/api/master/onboarding-uploads/{fid}",
            headers={"Authorization": f"Bearer {master_token}"},
            timeout=15,
        )
        assert ok.status_code == 200
        assert ok.headers.get("content-type", "").startswith("image/")
        denied = vendor_s.get(f"{BASE_URL}/api/master/onboarding-uploads/{fid}")
        assert denied.status_code == 403

# ---------- master admin ----------
class TestMaster:
    def test_master_stats(self, master_s):
        r = master_s.get(f"{BASE_URL}/api/master/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["vendors_total", "vendors_active", "orders_total", "orders_today", "gmv"]:
            assert k in d
        assert d["vendors_total"] >= 1

    def test_master_list_vendors_includes_demo(self, master_s):
        r = master_s.get(f"{BASE_URL}/api/master/vendors")
        assert r.status_code == 200
        vs = r.json()
        assert any(v["slug"] == DEMO_SLUG for v in vs)
        for v in vs:
            assert "_id" not in v

    def test_master_orders_has_vendor_name(self, master_s):
        r = master_s.get(f"{BASE_URL}/api/master/orders")
        assert r.status_code == 200
        for o in r.json():
            assert "vendor_name" in o

    def test_master_reset_store_admin_password(self, master_s, s):
        slug = f"rstpw-{uuid.uuid4().hex[:6]}"
        cr = master_s.post(
            f"{BASE_URL}/api/master/vendors",
            json={
                "name": f"TEST Reset {slug}",
                "slug": slug,
                "owner_name": "Owner",
                "owner_phone": "9999999999",
                "address": "a",
                "upi_id": "x@upi",
                "license_info": "",
                "accepts_tos": True,
                "tos_signature_name": "Legal Name",
            },
        )
        assert cr.status_code == 200, cr.text
        vid = cr.json()["vendor"]["id"]
        email = cr.json()["admin_email"]
        old_pw = cr.json()["default_password"]
        r = master_s.post(f"{BASE_URL}/api/master/vendors/{vid}/reset-admin-password")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["admin_email"] == email
        assert d["new_password"] != old_pw
        assert len(d["new_password"]) >= 8
        assert s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": old_pw, "portal": "store"},
        ).status_code == 401
        ok = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": d["new_password"], "portal": "store"},
        )
        assert ok.status_code == 200
        assert ok.json()["user"].get("password_must_change") is True

    def test_vendor_cannot_reset_other_admin_password(self, vendor_s, master_s):
        demo_vid = next(
            v["id"]
            for v in master_s.get(f"{BASE_URL}/api/master/vendors").json()
            if v["slug"] == DEMO_SLUG
        )
        r = vendor_s.post(f"{BASE_URL}/api/master/vendors/{demo_vid}/reset-admin-password")
        assert r.status_code == 403

    def test_create_vendor_requires_tos(self, master_s):
        r = master_s.post(f"{BASE_URL}/api/master/vendors", json={
            "name": "TEST Brewers", "owner_name": "Z", "owner_phone": "1",
            "address": "x", "upi_id": "x@upi", "license_info": "",
            "accepts_tos": False
        })
        assert r.status_code == 400

    def test_create_then_deactivate_then_reactivate(self, master_s, s):
        slug = f"test-{uuid.uuid4().hex[:6]}"
        # CREATE
        r = master_s.post(f"{BASE_URL}/api/master/vendors", json={
            "name": f"TEST {slug}", "slug": slug, "owner_name": "Owner",
            "owner_phone": "9999999999", "address": "addr",
            "upi_id": "x@upi", "license_info": "", "accepts_tos": True,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["admin_email"] == f"{slug}@vendor.local"
        assert d["default_password"] == f"{slug}123"
        vid = d["vendor"]["id"]

        # auto-created vendor admin can login
        login_r = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": d["admin_email"], "password": d["default_password"]
        })
        assert login_r.status_code == 200

        # storefront accessible
        sf = s.get(f"{BASE_URL}/api/storefront/{slug}")
        assert sf.status_code == 200
        assert sf.json()["available"] is True

        # DEACTIVATE
        de = master_s.delete(f"{BASE_URL}/api/master/vendors/{vid}")
        assert de.status_code == 200
        sf2 = s.get(f"{BASE_URL}/api/storefront/{slug}")
        assert sf2.status_code == 200
        assert sf2.json()["available"] is False

        # REACTIVATE via PATCH
        re_r = master_s.patch(f"{BASE_URL}/api/master/vendors/{vid}",
                              json={"subscription_active": True})
        assert re_r.status_code == 200
        assert re_r.json()["subscription_active"] is True

        # cleanup not strictly necessary; vendor remains as TEST_

    def test_deactivate_one_vendor_does_not_affect_another(self, master_s, s):
        slug_a = f"iso-a-{uuid.uuid4().hex[:6]}"
        slug_b = f"iso-b-{uuid.uuid4().hex[:6]}"
        try:
            for slug in (slug_a, slug_b):
                r = master_s.post(
                    f"{BASE_URL}/api/master/vendors",
                    json={
                        "name": f"TEST ISO {slug}",
                        "slug": slug,
                        "owner_name": "O",
                        "owner_phone": "9999999999",
                        "address": "a",
                        "upi_id": "x@upi",
                        "license_info": "",
                        "accepts_tos": True,
                    },
                )
                assert r.status_code == 200, r.text

            vendors = master_s.get(f"{BASE_URL}/api/master/vendors").json()
            vid_a = next(v["id"] for v in vendors if v["slug"] == slug_a)
            vid_b = next(v["id"] for v in vendors if v["slug"] == slug_b)

            assert master_s.delete(f"{BASE_URL}/api/master/vendors/{vid_a}").status_code == 200

            sf_b = s.get(f"{BASE_URL}/api/storefront/{slug_b}")
            assert sf_b.status_code == 200
            assert sf_b.json()["vendor"]["slug"] == slug_b
            assert sf_b.json()["available"] is True

            vendors_after = master_s.get(f"{BASE_URL}/api/master/vendors").json()
            b_row = next(v for v in vendors_after if v["slug"] == slug_b)
            a_row = next(v for v in vendors_after if v["slug"] == slug_a)
            assert b_row["subscription_active"] is True
            assert a_row["subscription_active"] is False
        finally:
            for slug in (slug_a, slug_b):
                try:
                    row = next(
                        (v for v in master_s.get(f"{BASE_URL}/api/master/vendors").json() if v["slug"] == slug),
                        None,
                    )
                    if row:
                        master_s.patch(
                            f"{BASE_URL}/api/master/vendors/{row['id']}",
                            json={"subscription_active": True},
                        )
                except Exception:
                    pass

    def test_create_vendor_duplicate_slug_400(self, master_s):
        r = master_s.post(f"{BASE_URL}/api/master/vendors", json={
            "name": "Dup", "slug": DEMO_SLUG, "owner_name": "X",
            "owner_phone": "9", "address": "a", "upi_id": "x@u",
            "license_info": "", "accepts_tos": True,
        })
        assert r.status_code == 400


# ---------- vendor admin ----------
class TestVendor:
    def test_vendor_me(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/vendor/me")
        assert r.status_code == 200
        assert r.json()["slug"] == DEMO_SLUG

    def test_vendor_stats_shape(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/vendor/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_orders", "today_orders", "today_revenue", "total_products", "by_status"]:
            assert k in d
        # 7 states must all be in by_status
        for st in ["payment_verification_pending", "payment_verified", "accepted",
                   "out_for_delivery", "delivered", "rejected", "cancelled"]:
            assert st in d["by_status"]

    def test_vendor_list_orders_only_own(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/vendor/orders")
        assert r.status_code == 200
        vid = vendor_s.get(f"{BASE_URL}/api/vendor/me").json()["id"]
        for o in r.json():
            assert o["vendor_id"] == vid

    def test_vendor_filter_orders(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/vendor/orders?status_filter=payment_verification_pending")
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "payment_verification_pending"

    def test_vendor_categories_subgroups(self, vendor_s):
        rc = vendor_s.get(f"{BASE_URL}/api/vendor/categories")
        rs = vendor_s.get(f"{BASE_URL}/api/vendor/subgroups")
        assert rc.status_code == 200 and rs.status_code == 200
        assert len(rc.json()) == 4
        assert len(rs.json()) >= 5

    def test_vendor_products_list_count(self, vendor_s):
        r = vendor_s.get(f"{BASE_URL}/api/vendor/products")
        assert r.status_code == 200
        ps = r.json()
        # seed creates 54 products for sharma-wines
        assert len(ps) >= 50

    def test_vendor_products_crud(self, vendor_s):
        cats = vendor_s.get(f"{BASE_URL}/api/vendor/categories").json()
        subs = vendor_s.get(f"{BASE_URL}/api/vendor/subgroups").json()
        cat = next(c for c in cats if c["id"] != "liquor")
        sub = next(s for s in subs if s["category_id"] == cat["id"])
        bad_sub = next(s for s in subs if s["category_id"] != cat["id"])

        # invalid pair
        bad = vendor_s.post(f"{BASE_URL}/api/vendor/products", json={
            "category_id": cat["id"], "subgroup_id": bad_sub["id"],
            "name": "TEST_Bad", "price": 10, "image": "", "unit": "1",
            "tag": "", "description": "", "in_stock": True,
        })
        assert bad.status_code == 400

        # valid create
        ok = vendor_s.post(f"{BASE_URL}/api/vendor/products", json={
            "category_id": cat["id"], "subgroup_id": sub["id"],
            "name": "TEST_VendorProd", "price": 49.5,
            "image": "https://example.com/x.jpg", "unit": "1pc",
            "tag": "", "description": "d", "in_stock": True,
        })
        assert ok.status_code == 200, ok.text
        pid = ok.json()["id"]

        # update
        upd = vendor_s.patch(f"{BASE_URL}/api/vendor/products/{pid}",
                             json={"price": 75.0, "name": "TEST_VendorProd2"})
        assert upd.status_code == 200
        assert upd.json()["price"] == 75.0

        # delete
        d = vendor_s.delete(f"{BASE_URL}/api/vendor/products/{pid}")
        assert d.status_code == 200
        # verify gone
        lst = vendor_s.get(f"{BASE_URL}/api/vendor/products").json()
        assert not any(p["id"] == pid for p in lst)

    def test_vendor_store_toggle_open_close(self, vendor_s, s):
        # close
        r = vendor_s.patch(f"{BASE_URL}/api/vendor/store",
                           json={"store_status": "closed"})
        assert r.status_code == 200
        assert r.json()["store_status"] == "closed"
        sf = s.get(f"{BASE_URL}/api/storefront/{DEMO_SLUG}")
        assert sf.json()["available"] is False
        # placing order while closed should fail
        item = {"product_id": "x", "name": "x", "price": 10, "qty": 1,
                "category_id": "snacks"}
        po = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG, "customer_name": "x",
            "customer_phone": "9", "delivery_address": "a",
            "payment_mode": "cod", "items": [item],
        })
        assert po.status_code == 403
        # reopen
        r2 = vendor_s.patch(f"{BASE_URL}/api/vendor/store",
                            json={"store_status": "open"})
        assert r2.status_code == 200
        assert r2.json()["store_status"] == "open"

    def test_vendor_cannot_set_subscription(self, vendor_s):
        # subscription_active should be silently dropped
        r = vendor_s.patch(f"{BASE_URL}/api/vendor/store",
                           json={"subscription_active": False, "upi_id": "test@upi"})
        assert r.status_code == 200
        assert r.json()["subscription_active"] is True  # unchanged
        assert r.json()["upi_id"] == "test@upi"

    def test_vendor_order_status_transition(self, vendor_s, s):
        # place a UPI order
        sf = s.get(f"{BASE_URL}/api/storefront/{DEMO_SLUG}").json()
        item = _pick_non_liquor(sf)
        po = s.post(f"{BASE_URL}/api/orders", json={
            "vendor_slug": DEMO_SLUG, "customer_name": "TEST_Trans",
            "customer_phone": "9", "delivery_address": "a",
            "payment_mode": "upi", "upi_last5": "11111",
            "items": [item],
        })
        assert po.status_code == 200
        # find it via vendor_orders
        orders = vendor_s.get(f"{BASE_URL}/api/vendor/orders").json()
        target = next(o for o in orders if o["short_id"] == po.json()["short_id"])
        oid = target["id"]
        for next_status in ["payment_verified", "accepted", "out_for_delivery", "delivered"]:
            r = vendor_s.patch(f"{BASE_URL}/api/vendor/orders/{oid}",
                               json={"status": next_status})
            assert r.status_code == 200, r.text
            assert r.json()["status"] == next_status
        # bogus status
        r2 = vendor_s.patch(f"{BASE_URL}/api/vendor/orders/{oid}",
                            json={"status": "bogus"})
        assert r2.status_code == 400
