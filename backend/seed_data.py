"""Seed helpers for fresh DBs.

Categories/subgroups are platform-wide. Products are vendor-scoped.
"""
import uuid
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


CATEGORIES = [
    {"id": "liquor", "name": "Liquor", "tagline": "Premium spirits & beers", "icon": "🍻",
     "image": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
     "min_order": 1000, "full_pack_only": False, "sort_order": 1},
    {"id": "cigarettes", "name": "Cigarettes", "tagline": "Full packs only · 21+", "icon": "🚬",
     "image": "https://images.unsplash.com/photo-1527015175922-36a306cf0e20?auto=format&fit=crop&w=900&q=80",
     "min_order": 0, "full_pack_only": True, "sort_order": 2},
    {"id": "snacks", "name": "Snacks", "tagline": "Munchies for the night", "icon": "🍿",
     "image": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=80",
     "min_order": 0, "full_pack_only": False, "sort_order": 3},
    {"id": "food", "name": "Food", "tagline": "Hot & ready · 30 min delivery", "icon": "🍔",
     "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
     "min_order": 0, "full_pack_only": False, "sort_order": 4},
]

SUBGROUPS = [
    {"id": "beer", "category_id": "liquor", "name": "Beer", "sort_order": 1},
    {"id": "whisky", "category_id": "liquor", "name": "Whisky", "sort_order": 2},
    {"id": "vodka", "category_id": "liquor", "name": "Vodka", "sort_order": 3},
    {"id": "rum", "category_id": "liquor", "name": "Rum", "sort_order": 4},
    {"id": "gin", "category_id": "liquor", "name": "Gin", "sort_order": 5},
    {"id": "cigs", "category_id": "cigarettes", "name": "Full Packs", "sort_order": 1},
    {"id": "chips", "category_id": "snacks", "name": "Chips", "sort_order": 1},
    {"id": "nuts", "category_id": "snacks", "name": "Nuts", "sort_order": 2},
    {"id": "chocolates", "category_id": "snacks", "name": "Chocolates", "sort_order": 3},
    {"id": "drinks", "category_id": "snacks", "name": "Soft Drinks", "sort_order": 4},
    {"id": "burgers", "category_id": "food", "name": "Burgers", "sort_order": 1},
    {"id": "wings", "category_id": "food", "name": "Wings", "sort_order": 2},
    {"id": "pizza", "category_id": "food", "name": "Pizza", "sort_order": 3},
    {"id": "fries", "category_id": "food", "name": "Fries", "sort_order": 4},
    {"id": "rolls", "category_id": "food", "name": "Rolls", "sort_order": 5},
]

# Per-subgroup demo products (used to seed first vendor's catalog)
DEMO_PRODUCTS = {
    "beer": [
        ("Kingfisher Strong", 180, "650ml", "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600"),
        ("Kingfisher Ultra", 220, "650ml", "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600"),
        ("Budweiser Magnum", 260, "650ml", "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=600"),
        ("Heineken", 290, "500ml", "https://images.unsplash.com/photo-1613521973937-efbb6a3f02b1?w=600"),
        ("Corona Extra", 350, "355ml", "https://images.unsplash.com/photo-1600788907416-456578634209?w=600"),
    ],
    "whisky": [
        ("Blender's Pride", 1250, "750ml", "https://images.unsplash.com/photo-1582819509237-d6c46ee03f7d?w=600"),
        ("Royal Stag", 850, "750ml", "https://images.unsplash.com/photo-1574767606693-4ca27a967072?w=600"),
        ("Jameson Irish", 2900, "750ml", "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600"),
        ("Jack Daniel's", 3200, "750ml", "https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?w=600"),
        ("Glenfiddich 12", 5400, "750ml", "https://images.unsplash.com/photo-1564675181161-ea9d92a6e188?w=600"),
    ],
    "vodka": [
        ("Magic Moments", 750, "750ml", "https://images.unsplash.com/photo-1614113598860-3eda3aa7df7c?w=600"),
        ("Smirnoff Red", 1100, "750ml", "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=600"),
        ("Absolut", 1900, "750ml", "https://images.unsplash.com/photo-1620219365994-f334c3e9a9a3?w=600"),
        ("Grey Goose", 5800, "750ml", "https://images.unsplash.com/photo-1608885898957-91d2c66b1be3?w=600"),
    ],
    "rum": [
        ("Old Monk", 480, "750ml", "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600"),
        ("Bacardi White", 1100, "750ml", "https://images.unsplash.com/photo-1605270012917-bf357a1fae9e?w=600"),
        ("Captain Morgan", 1450, "750ml", "https://images.unsplash.com/photo-1560508601-5dd47fcebafe?w=600"),
    ],
    "gin": [
        ("Blue Riband", 700, "750ml", "https://images.unsplash.com/photo-1551734413-83e7e96f7ca0?w=600"),
        ("Bombay Sapphire", 2400, "750ml", "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600"),
        ("Hapusa Himalayan", 3700, "750ml", "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600"),
    ],
    "cigs": [
        ("Marlboro Advance", 360, "Pack of 20", "https://images.unsplash.com/photo-1570166651579-f86adb1c1d2e?w=600"),
        ("Marlboro Gold", 380, "Pack of 20", "https://images.unsplash.com/photo-1573575155376-b5010099301b?w=600"),
        ("Classic Mild", 340, "Pack of 20", "https://images.unsplash.com/photo-1562552052-c5d4f4d3b1d8?w=600"),
        ("Gold Flake Kings", 360, "Pack of 20", "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600"),
        ("Benson & Hedges", 420, "Pack of 20", "https://images.unsplash.com/photo-1528396518501-b53b21d2cd83?w=600"),
    ],
    "chips": [
        ("Lay's Classic Salted", 30, "52g", "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600"),
        ("Lay's Magic Masala", 30, "52g", "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=600"),
        ("Kurkure Masala Munch", 20, "40g", "https://images.unsplash.com/photo-1614813619404-b4d4c8f1b15e?w=600"),
        ("Doritos Sweet Chilli", 60, "60g", "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600"),
    ],
    "nuts": [
        ("Haldiram Peanuts", 60, "200g", "https://images.unsplash.com/photo-1599599810694-57a2ca8276a8?w=600"),
        ("Roasted Almonds", 220, "200g", "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600"),
        ("Salted Cashews", 320, "200g", "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=600"),
    ],
    "chocolates": [
        ("Dairy Milk", 50, "55g", "https://images.unsplash.com/photo-1623461487986-9400110de28e?w=600"),
        ("Snickers", 70, "50g", "https://images.unsplash.com/photo-1551944073-d1f3a3f9b1fe?w=600"),
        ("Kitkat 4-Finger", 40, "38g", "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600"),
    ],
    "drinks": [
        ("Coca-Cola", 40, "500ml", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600"),
        ("Thums Up", 40, "500ml", "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600"),
        ("Red Bull", 125, "250ml", "https://images.unsplash.com/photo-1613470207891-21f2f0d2c80f?w=600"),
        ("Sprite", 40, "500ml", "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600"),
    ],
    "burgers": [
        ("Classic Cheeseburger", 199, "", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"),
        ("Crispy Paneer Burger", 179, "", "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=600"),
        ("Loaded Chicken Burger", 249, "", "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600"),
    ],
    "wings": [
        ("Peri Peri Wings (8 pcs)", 329, "", "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600"),
        ("BBQ Wings (8 pcs)", 349, "", "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600"),
        ("Hot Buffalo Wings", 349, "", "https://images.unsplash.com/photo-1626078436204-cc8c0042135a?w=600"),
    ],
    "pizza": [
        ("Margherita (Medium)", 299, "", "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600"),
        ("Pepperoni (Medium)", 449, "", "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=600"),
        ("Veggie Supreme", 379, "", "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600"),
    ],
    "fries": [
        ("Salted Fries", 99, "", "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600"),
        ("Peri Peri Fries", 129, "", "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600"),
        ("Cheese Loaded Fries", 179, "", "https://images.unsplash.com/photo-1639024471283-03518883512d?w=600"),
    ],
    "rolls": [
        ("Paneer Tikka Roll", 149, "", "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600"),
        ("Chicken Seekh Roll", 169, "", "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600"),
        ("Egg Roll", 119, "", "https://images.unsplash.com/photo-1601050690294-46f8b9e7e7e3?w=600"),
    ],
}


async def seed_initial_catalog(db):
    """Insert shared categories + subgroups."""
    await db.categories.insert_many([dict(c) for c in CATEGORIES])
    await db.subgroups.insert_many([dict(s) for s in SUBGROUPS])


async def seed_demo_vendor(db, hash_pw):
    """One demo vendor + their full product catalog. Login: sharma-wines@vendor.local / sharma-wines123"""
    sub_to_cat = {s["id"]: s["category_id"] for s in SUBGROUPS}

    vendor_id = str(uuid.uuid4())
    vendor = {
        "id": vendor_id,
        "slug": "sharma-wines",
        "name": "Sharma Wines & More",
        "owner_name": "Rajesh Sharma",
        "owner_phone": "+916305468471",
        "address": "17th Main, HSR Layout Sector 2, Bangalore",
        "upi_id": "sharma@axl",
        "payment_qr_url": "",
        "store_status": "open",
        "opening_time": "10:00",
        "closing_time": "23:00",
        "subscription_active": True,
        "subscription_expires_at": None,
        "license_info": "Excise: KA-EX-2026-0815 / FSSAI: 12345678",
        "next_order_seq": 0,
        "created_at": _now(),
    }
    await db.vendors.insert_one(dict(vendor))

    # Vendor admin user
    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": "sharma-wines@vendor.local",
        "password_hash": hash_pw("sharma-wines123"),
        "name": "Rajesh Sharma",
        "role": "vendor_admin",
        "vendor_id": vendor_id,
        "password_must_change": True,
        "created_at": _now(),
    })

    # Products
    products = []
    for sub_id, items in DEMO_PRODUCTS.items():
        cat_id = sub_to_cat[sub_id]
        for name, price, unit, image in items:
            products.append({
                "id": str(uuid.uuid4()),
                "vendor_id": vendor_id,
                "category_id": cat_id,
                "subgroup_id": sub_id,
                "name": name,
                "price": price,
                "image": image,
                "unit": unit,
                "tag": "Full Pack Only" if cat_id == "cigarettes" else "",
                "description": "",
                "in_stock": True,
                "sort_order": 0,
            })
    if products:
        await db.products.insert_many(products)
