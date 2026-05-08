"""Backend tests for hyperlocal commerce admin + auth + orders + products.

Covers:
- Public catalog & order placement (incl. liquor minimum)
- Auth login / brute-force / /auth/me
- Admin protected routes (stats, orders list/filter/limit, status update)
- Admin product CRUD + subgroup/category validation
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@store.com"
ADMIN_PASSWORD = "admin123"


# ---------- shared fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_session(session, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ---------- public catalog ----------
class TestCatalog:
    def test_catalog_returns_4_categories(self, session):
        r = session.get(f"{BASE_URL}/api/catalog")
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data
        cats = data["categories"]
        assert len(cats) == 4
        ids = {c["id"] for c in cats}
        # 4 seeded categories
        assert "liquor" in ids and "cigarettes" in ids
        assert len(ids) == 4

    def test_catalog_has_subgroups_and_products(self, session):
        r = session.get(f"{BASE_URL}/api/catalog")
        cats = r.json()["categories"]
        for c in cats:
            assert "subgroups" in c
            assert len(c["subgroups"]) >= 1
            for sg in c["subgroups"]:
                assert "products" in sg
        total_products = sum(len(sg["products"]) for c in cats for sg in c["subgroups"])
        assert total_products > 0


# ---------- public order placement ----------
class TestPlaceOrder:
    def test_place_order_returns_short_id_LC(self, session):
        payload = {
            "customer_name": "TEST_Cust",
            "customer_phone": "9999999999",
            "delivery_address": "Flat 12, Test Apt",
            "notes": "ring bell",
            "items": [
                {"product_id": "p1", "name": "Bread", "price": 50, "qty": 2,
                 "category_id": "groceries"}
            ],
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["short_id"].startswith("LC")
        assert data["status"] == "placed"
        assert data["total"] == 100
        assert data["customer_name"] == "TEST_Cust"
        assert len(data["items"]) == 1

    def test_liquor_minimum_enforced(self, session):
        payload = {
            "customer_name": "TEST_Liq",
            "customer_phone": "9999999999",
            "delivery_address": "X",
            "items": [
                {"product_id": "l1", "name": "Beer", "price": 200, "qty": 1,
                 "category_id": "liquor"}
            ],
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code == 400
        assert "1000" in r.text

    def test_liquor_min_passes_when_1000(self, session):
        payload = {
            "customer_name": "TEST_LiqOK",
            "customer_phone": "9999999999",
            "delivery_address": "X",
            "items": [
                {"product_id": "l2", "name": "Whisky", "price": 1000, "qty": 1,
                 "category_id": "liquor"}
            ],
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code == 200

    def test_empty_cart_rejected(self, session):
        r = session.post(f"{BASE_URL}/api/orders", json={
            "customer_name": "x", "customer_phone": "9", "delivery_address": "y",
            "items": []
        })
        assert r.status_code == 400


# ---------- auth ----------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        assert "password_hash" not in d["user"]

    def test_login_wrong_password_returns_401(self, session):
        # Use a non-admin email so we don't lock admin out
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": "wrong@store.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_brute_force_lockout_429(self, session):
        # Use unique email so we don't affect admin
        bad_email = f"bf_{uuid.uuid4().hex[:6]}@x.com"
        last_status = None
        for i in range(7):
            r = session.post(f"{BASE_URL}/api/auth/login",
                             json={"email": bad_email, "password": "x"})
            last_status = r.status_code
            if r.status_code == 429:
                break
        assert last_status == 429, f"Expected 429 after 5 fails, got {last_status}"

    def test_me_without_auth_401(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_valid_token(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"


# ---------- admin protection ----------
class TestAdminProtection:
    @pytest.mark.parametrize("path", [
        "/api/admin/stats",
        "/api/admin/orders",
        "/api/admin/products",
        "/api/admin/categories",
        "/api/admin/subgroups",
    ])
    def test_endpoint_requires_auth(self, session, path):
        r = session.get(f"{BASE_URL}{path}")
        assert r.status_code == 401, f"{path} should be 401 without auth, got {r.status_code}"


# ---------- admin stats ----------
class TestAdminStats:
    def test_stats_shape(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_orders", "today_orders", "today_revenue", "total_products", "by_status"]:
            assert k in d, f"missing {k}"
        for s in ["placed", "preparing", "out_for_delivery", "delivered", "cancelled"]:
            assert s in d["by_status"]


# ---------- admin orders list + filter + status update ----------
class TestAdminOrders:
    def test_list_orders(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/orders")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_with_filter_and_limit(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/orders?status_filter=placed&limit=3")
        assert r.status_code == 200
        items = r.json()
        assert len(items) <= 3
        for o in items:
            assert o["status"] == "placed"

    def test_status_update_and_invalid(self, admin_session, session):
        # create one order
        r = session.post(f"{BASE_URL}/api/orders", json={
            "customer_name": "TEST_StatusUpd",
            "customer_phone": "9999999999",
            "delivery_address": "addr",
            "items": [{"product_id": "p", "name": "X", "price": 10, "qty": 1,
                       "category_id": "groceries"}],
        })
        assert r.status_code == 200
        oid = r.json()["id"]

        # invalid
        r2 = admin_session.patch(f"{BASE_URL}/api/admin/orders/{oid}",
                                 json={"status": "bogus"})
        assert r2.status_code == 400

        # valid
        r3 = admin_session.patch(f"{BASE_URL}/api/admin/orders/{oid}",
                                 json={"status": "preparing"})
        assert r3.status_code == 200
        assert r3.json()["status"] == "preparing"

        # verify persisted
        r4 = admin_session.get(f"{BASE_URL}/api/admin/orders/{oid}")
        assert r4.status_code == 200
        assert r4.json()["status"] == "preparing"


# ---------- admin products CRUD ----------
class TestAdminProducts:
    def test_categories_and_subgroups(self, admin_session):
        rc = admin_session.get(f"{BASE_URL}/api/admin/categories")
        assert rc.status_code == 200
        cats = rc.json()
        assert len(cats) == 4

        rs = admin_session.get(f"{BASE_URL}/api/admin/subgroups")
        assert rs.status_code == 200
        subs = rs.json()
        assert len(subs) > 0

    def test_product_crud_and_validation(self, admin_session):
        # pick a valid category+subgroup pair
        cats = admin_session.get(f"{BASE_URL}/api/admin/categories").json()
        subs = admin_session.get(f"{BASE_URL}/api/admin/subgroups").json()
        gro = next(c for c in cats if c["id"] != "liquor")
        gro_sub = next(s for s in subs if s["category_id"] == gro["id"])
        other_sub = next(s for s in subs if s["category_id"] != gro["id"])

        # CREATE invalid: subgroup not belonging to category
        bad = admin_session.post(f"{BASE_URL}/api/admin/products", json={
            "category_id": gro["id"],
            "subgroup_id": other_sub["id"],
            "name": "TEST_Bad", "price": 10,
        })
        assert bad.status_code == 400

        # CREATE valid
        ok = admin_session.post(f"{BASE_URL}/api/admin/products", json={
            "category_id": gro["id"],
            "subgroup_id": gro_sub["id"],
            "name": "TEST_NewProduct",
            "price": 99.5,
            "image": "https://x/img.jpg",
            "unit": "1 pc",
            "tag": "New",
            "description": "desc",
            "in_stock": True,
        })
        assert ok.status_code == 200, ok.text
        pid = ok.json()["id"]
        assert ok.json()["name"] == "TEST_NewProduct"

        # READ via list
        lst = admin_session.get(f"{BASE_URL}/api/admin/products").json()
        assert any(p["id"] == pid for p in lst)

        # UPDATE
        upd = admin_session.patch(f"{BASE_URL}/api/admin/products/{pid}",
                                   json={"price": 120.0, "name": "TEST_NewProduct2"})
        assert upd.status_code == 200
        assert upd.json()["price"] == 120.0
        assert upd.json()["name"] == "TEST_NewProduct2"

        # UPDATE invalid mismatch
        bad_upd = admin_session.patch(f"{BASE_URL}/api/admin/products/{pid}",
                                       json={"subgroup_id": other_sub["id"]})
        assert bad_upd.status_code == 400

        # DELETE
        d = admin_session.delete(f"{BASE_URL}/api/admin/products/{pid}")
        assert d.status_code == 200
        # Verify gone
        lst2 = admin_session.get(f"{BASE_URL}/api/admin/products").json()
        assert not any(p["id"] == pid for p in lst2)
