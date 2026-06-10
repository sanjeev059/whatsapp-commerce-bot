"""Gharsip meal menu — items, combos and macros (protein/carbs/energy)."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorCollection

# -------- seed data --------------------------------------------------------

SEED_MENU_ITEMS: List[Dict[str, Any]] = [
    # Breakfast
    {"id": "ragi_idli", "name": "Ragi Idli", "category": "breakfast", "servingDesc": "2 pcs (120g)", "energyKcal": 150, "proteinG": 4, "carbsG": 30, "fatG": 1, "price": 40},
    {"id": "jowar_idli", "name": "Jowar (Sorghum) Idli", "category": "breakfast", "servingDesc": "2 pcs (120g)", "energyKcal": 160, "proteinG": 4, "carbsG": 32, "fatG": 1.5, "price": 40},
    {"id": "rice_idli", "name": "Rice Idli", "category": "breakfast", "servingDesc": "2 pcs (100g)", "energyKcal": 140, "proteinG": 3, "carbsG": 28, "fatG": 0.5, "price": 35},
    {"id": "plain_dosa", "name": "Dosa (Plain)", "category": "breakfast", "servingDesc": "1 pc (80g)", "energyKcal": 120, "proteinG": 2.5, "carbsG": 18, "fatG": 3.5, "price": 35},
    {"id": "masala_dosa", "name": "Masala Dosa", "category": "breakfast", "servingDesc": "1 pc (150g)", "energyKcal": 250, "proteinG": 5, "carbsG": 35, "fatG": 9, "price": 70},
    {"id": "set_dosa", "name": "Set Dosa", "category": "breakfast", "servingDesc": "3 pcs (150g)", "energyKcal": 200, "proteinG": 5, "carbsG": 33, "fatG": 4, "price": 60},
    {"id": "ghee_dosa", "name": "Ghee Dosa", "category": "breakfast", "servingDesc": "1 pc (100g)", "energyKcal": 180, "proteinG": 3, "carbsG": 22, "fatG": 8, "price": 60},
    {"id": "paddu", "name": "Paddu", "category": "breakfast", "servingDesc": "6 pcs (120g)", "energyKcal": 200, "proteinG": 5, "carbsG": 30, "fatG": 6, "price": 50},
    {"id": "puri", "name": "Puri", "category": "breakfast", "servingDesc": "3 pcs (90g)", "energyKcal": 280, "proteinG": 5, "carbsG": 30, "fatG": 15, "price": 50},
    # Rice
    {"id": "white_rice", "name": "White Rice", "category": "rice", "servingDesc": "1 cup (150g)", "energyKcal": 200, "proteinG": 4, "carbsG": 45, "fatG": 0.5, "price": 40},
    {"id": "basmati_rice", "name": "Basmati Rice", "category": "rice", "servingDesc": "1 cup (150g)", "energyKcal": 190, "proteinG": 4, "carbsG": 43, "fatG": 0.5, "price": 50},
    {"id": "white_rice_pulav", "name": "White Rice Pulav", "category": "rice", "servingDesc": "1 plate (200g)", "energyKcal": 250, "proteinG": 5, "carbsG": 40, "fatG": 8, "price": 90},
    {"id": "basmati_pulav", "name": "Basmati Rice Pulav", "category": "rice", "servingDesc": "1 plate (200g)", "energyKcal": 260, "proteinG": 5, "carbsG": 42, "fatG": 8, "price": 100},
    {"id": "chicken_fried_rice", "name": "Chicken Fried Rice", "category": "rice", "servingDesc": "1 plate (250g)", "energyKcal": 400, "proteinG": 18, "carbsG": 50, "fatG": 14, "price": 140},
    {"id": "egg_fried_rice", "name": "Egg Fried Rice", "category": "rice", "servingDesc": "1 plate (250g)", "energyKcal": 380, "proteinG": 14, "carbsG": 52, "fatG": 12, "price": 110},
    {"id": "masala_rice", "name": "Masala Rice", "category": "rice", "servingDesc": "1 plate (200g)", "energyKcal": 280, "proteinG": 5, "carbsG": 45, "fatG": 9, "price": 80},
    {"id": "ghee_rice", "name": "Ghee Rice", "category": "rice", "servingDesc": "1 plate (200g)", "energyKcal": 280, "proteinG": 4, "carbsG": 42, "fatG": 10, "price": 90},
    {"id": "veg_fried_rice", "name": "Vegetable Fried Rice", "category": "rice", "servingDesc": "1 plate (250g)", "energyKcal": 300, "proteinG": 6, "carbsG": 48, "fatG": 9, "price": 100},
    {"id": "jeera_rice", "name": "Jeera Rice", "category": "rice", "servingDesc": "1 cup (180g)", "energyKcal": 220, "proteinG": 4, "carbsG": 40, "fatG": 5, "price": 70},
    # Roti / breads
    {"id": "jolada_roti", "name": "Jolada Roti", "category": "roti", "servingDesc": "1 pc (60g)", "energyKcal": 110, "proteinG": 3, "carbsG": 22, "fatG": 1, "price": 15},
    {"id": "chapati", "name": "Chapati", "category": "roti", "servingDesc": "2 pcs (80g)", "energyKcal": 200, "proteinG": 6, "carbsG": 36, "fatG": 5, "price": 30},
    {"id": "aloo_paratha", "name": "Aloo Parata", "category": "roti", "servingDesc": "1 pc (120g)", "energyKcal": 250, "proteinG": 5, "carbsG": 35, "fatG": 10, "price": 50},
    {"id": "ragi_mudde", "name": "Ragi Mudde", "category": "roti", "servingDesc": "1 ball (150g)", "energyKcal": 180, "proteinG": 4, "carbsG": 38, "fatG": 1, "price": 40},
    # Non-veg curries
    {"id": "chicken_curry", "name": "Chicken Curry", "category": "nonveg_curry", "servingDesc": "200g", "energyKcal": 300, "proteinG": 22, "carbsG": 8, "fatG": 20, "price": 120},
    {"id": "chicken_masala", "name": "Chicken Masala", "category": "nonveg_curry", "servingDesc": "200g", "energyKcal": 320, "proteinG": 24, "carbsG": 10, "fatG": 20, "price": 130},
    {"id": "chicken_fry", "name": "Chicken Fry", "category": "nonveg_curry", "servingDesc": "150g", "energyKcal": 350, "proteinG": 25, "carbsG": 6, "fatG": 24, "price": 140},
    {"id": "chilli_chicken", "name": "Chilli Chicken", "category": "nonveg_curry", "servingDesc": "150g", "energyKcal": 320, "proteinG": 22, "carbsG": 14, "fatG": 18, "price": 140},
    {"id": "egg_curry", "name": "Egg Curry", "category": "nonveg_curry", "servingDesc": "200g (2 eggs)", "energyKcal": 250, "proteinG": 13, "carbsG": 8, "fatG": 18, "price": 70},
    {"id": "egg_masala", "name": "Egg Masala", "category": "nonveg_curry", "servingDesc": "200g (2 eggs)", "energyKcal": 260, "proteinG": 13, "carbsG": 9, "fatG": 19, "price": 75},
    {"id": "egg_fry", "name": "Egg Fry", "category": "nonveg_curry", "servingDesc": "100g (2 eggs)", "energyKcal": 200, "proteinG": 13, "carbsG": 2, "fatG": 16, "price": 60},
    {"id": "egg_bhurji", "name": "Egg Burji", "category": "nonveg_curry", "servingDesc": "120g (2 eggs)", "energyKcal": 220, "proteinG": 13, "carbsG": 4, "fatG": 17, "price": 65},
    {"id": "mutton_curry", "name": "Mutton Curry", "category": "nonveg_curry", "servingDesc": "150g", "energyKcal": 350, "proteinG": 22, "carbsG": 8, "fatG": 25, "price": 190},
    {"id": "mutton_masala", "name": "Mutton Masala", "category": "nonveg_curry", "servingDesc": "150g", "energyKcal": 370, "proteinG": 23, "carbsG": 10, "fatG": 26, "price": 200},
    # Dairy / drinks
    {"id": "curd", "name": "Curd", "category": "dairy", "servingDesc": "100g bowl", "energyKcal": 60, "proteinG": 3, "carbsG": 4, "fatG": 3, "price": 20},
    {"id": "curd_raita", "name": "Curd Raita", "category": "dairy", "servingDesc": "100g", "energyKcal": 70, "proteinG": 3, "carbsG": 6, "fatG": 3.5, "price": 25},
    {"id": "curd_lassi", "name": "Curd Lassi", "category": "dairy", "servingDesc": "250ml glass", "energyKcal": 150, "proteinG": 5, "carbsG": 18, "fatG": 6, "price": 40},
    {"id": "buttermilk", "name": "Buttermilk", "category": "dairy", "servingDesc": "250ml glass", "energyKcal": 40, "proteinG": 2, "carbsG": 4, "fatG": 1.5, "price": 15},
]

SEED_COMBOS: List[Dict[str, Any]] = [
    # Breakfast combos
    {
        "id": "combo_ragi_idli", "name": "Ragi Idli Combo", "mealType": "breakfast", "dietType": "veg",
        "items": ["Ragi Idli (2 pcs)", "Sambar", "Coconut Chutney"],
        "energyKcal": 250, "proteinG": 7, "carbsG": 38, "fatG": 6, "price": 80,
    },
    {
        "id": "combo_masala_dosa", "name": "Masala Dosa Combo", "mealType": "breakfast", "dietType": "veg",
        "items": ["Masala Dosa", "Coconut Chutney", "Sambar"],
        "energyKcal": 330, "proteinG": 8, "carbsG": 42, "fatG": 12, "price": 100,
    },
    {
        "id": "combo_set_dosa", "name": "Set Dosa Combo", "mealType": "breakfast", "dietType": "veg",
        "items": ["Set Dosa (3 pcs)", "Coconut Chutney", "Sambar"],
        "energyKcal": 280, "proteinG": 8, "carbsG": 40, "fatG": 7, "price": 90,
    },
    {
        "id": "combo_paddu", "name": "Paddu Combo", "mealType": "breakfast", "dietType": "veg",
        "items": ["Paddu (6 pcs)", "Coconut Chutney"],
        "energyKcal": 240, "proteinG": 6, "carbsG": 33, "fatG": 7, "price": 80,
    },
    {
        "id": "combo_puri_saagu", "name": "Puri-Saagu Combo", "mealType": "breakfast", "dietType": "veg",
        "items": ["Puri (3 pcs)", "Veg Saagu"],
        "energyKcal": 380, "proteinG": 7, "carbsG": 38, "fatG": 19, "price": 90,
    },
    # Lunch / dinner — veg
    {
        "id": "combo_veg_thali", "name": "Veg Thali", "mealType": "lunch_dinner", "dietType": "veg",
        "items": ["White Rice", "Chapati (2 pcs)", "Dal", "Mixed Veg Curry", "Curd"],
        "energyKcal": 600, "proteinG": 18, "carbsG": 95, "fatG": 12, "price": 150,
    },
    {
        "id": "combo_pulav_raita", "name": "Pulav & Raita Combo", "mealType": "lunch_dinner", "dietType": "veg",
        "items": ["Veg Pulav", "Curd Raita"],
        "energyKcal": 320, "proteinG": 8, "carbsG": 46, "fatG": 11, "price": 150,
    },
    {
        "id": "combo_jeera_dal", "name": "Jeera Rice & Dal Combo", "mealType": "lunch_dinner", "dietType": "veg",
        "items": ["Jeera Rice", "Dal", "Buttermilk"],
        "energyKcal": 330, "proteinG": 11, "carbsG": 48, "fatG": 7, "price": 150,
    },
    # Lunch / dinner — non-veg
    {
        "id": "combo_chicken_curry_meal", "name": "Chicken Curry Meal", "mealType": "lunch_dinner", "dietType": "nonveg",
        "items": ["White Rice / Jolada Roti (2 pcs)", "Chicken Curry", "Curd Raita"],
        "energyKcal": 590, "proteinG": 28, "carbsG": 60, "fatG": 25, "price": 200,
    },
    {
        "id": "combo_egg_curry_meal", "name": "Egg Curry Meal", "mealType": "lunch_dinner", "dietType": "nonveg",
        "items": ["White Rice", "Egg Curry", "Buttermilk"],
        "energyKcal": 490, "proteinG": 19, "carbsG": 57, "fatG": 19, "price": 180,
    },
    {
        "id": "combo_mutton_curry_meal", "name": "Mutton Curry Meal", "mealType": "lunch_dinner", "dietType": "nonveg",
        "items": ["White Rice", "Mutton Curry", "Curd Raita"],
        "energyKcal": 620, "proteinG": 28, "carbsG": 59, "fatG": 29, "price": 200,
    },
    {
        "id": "combo_chicken_fried_rice", "name": "Chicken Fried Rice Combo", "mealType": "lunch_dinner", "dietType": "nonveg",
        "items": ["Chicken Fried Rice", "Buttermilk"],
        "energyKcal": 440, "proteinG": 20, "carbsG": 54, "fatG": 16, "price": 190,
    },
    {
        "id": "combo_egg_bhurji_power", "name": "Egg Burji Power Combo", "mealType": "lunch_dinner", "dietType": "nonveg",
        "items": ["Ragi Mudde", "Egg Burji", "Buttermilk"],
        "energyKcal": 440, "proteinG": 19, "carbsG": 46, "fatG": 19, "price": 180,
    },
]


async def seed_menu(menu_items_coll: AsyncIOMotorCollection, combos_coll: AsyncIOMotorCollection) -> None:
    """Upsert seed data so re-deploys backfill new fields (e.g. price) on existing docs."""
    for d in SEED_MENU_ITEMS:
        await menu_items_coll.update_one(
            {"id": d["id"]}, {"$set": d, "$setOnInsert": {"_id": d["id"]}}, upsert=True
        )
    for d in SEED_COMBOS:
        await combos_coll.update_one(
            {"id": d["id"]}, {"$set": d, "$setOnInsert": {"_id": d["id"]}}, upsert=True
        )


def mount_menu(
    api: APIRouter,
    *,
    menu_items_coll: AsyncIOMotorCollection,
    combos_coll: AsyncIOMotorCollection,
) -> None:
    menu = APIRouter(prefix="/menu", tags=["menu"])

    @menu.get("/items")
    async def list_menu_items(category: str | None = None):
        q: Dict[str, Any] = {}
        if category and category != "all":
            q["category"] = category
        cur = menu_items_coll.find(q, {"_id": 0}).sort("name", 1)
        return {"items": await cur.to_list(200)}

    @menu.get("/combos")
    async def list_combos(mealType: str | None = None, dietType: str | None = None):
        q: Dict[str, Any] = {}
        if mealType and mealType != "all":
            q["mealType"] = mealType
        if dietType and dietType != "all":
            q["dietType"] = dietType
        cur = combos_coll.find(q, {"_id": 0}).sort("price", 1)
        return {"combos": await cur.to_list(200)}

    api.include_router(menu)
