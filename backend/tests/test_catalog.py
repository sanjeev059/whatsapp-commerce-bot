"""Tests for hyperlocal commerce catalog endpoint."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://commerce-bot-2.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def catalog():
    r = requests.get(f"{BASE_URL}/api/catalog", timeout=30)
    assert r.status_code == 200
    return r.json()


def test_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "message" in data


def test_catalog_status_and_structure(catalog):
    assert "categories" in catalog
    assert isinstance(catalog["categories"], list)
    assert len(catalog["categories"]) == 4


def test_catalog_category_ids(catalog):
    ids = [c["id"] for c in catalog["categories"]]
    assert ids == ["liquor", "cigarettes", "snacks", "food"]


def test_liquor_min_order(catalog):
    liquor = next(c for c in catalog["categories"] if c["id"] == "liquor")
    assert liquor["min_order"] == 1000
    sub_ids = [s["id"] for s in liquor["subgroups"]]
    for s in ["beer", "whisky", "vodka", "rum", "gin"]:
        assert s in sub_ids


def test_cigarettes_full_pack_only(catalog):
    cigs = next(c for c in catalog["categories"] if c["id"] == "cigarettes")
    assert cigs.get("full_pack_only") is True
    products = cigs["subgroups"][0]["products"]
    assert len(products) > 0
    for p in products:
        assert p["tag"] == "Full Pack Only"


def test_snacks_and_food_subgroups(catalog):
    snacks = next(c for c in catalog["categories"] if c["id"] == "snacks")
    food = next(c for c in catalog["categories"] if c["id"] == "food")
    assert len(snacks["subgroups"]) >= 1
    assert len(food["subgroups"]) >= 1


def test_product_structure(catalog):
    for cat in catalog["categories"]:
        for sg in cat["subgroups"]:
            for p in sg["products"]:
                for k in ["id", "name", "price", "image"]:
                    assert k in p
                assert isinstance(p["price"], (int, float))
                assert p["price"] > 0
