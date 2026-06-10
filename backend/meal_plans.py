"""Gharsip monthly meal-subscription plans — composition, daily macros, pricing."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorCollection

# -------- seed data --------------------------------------------------------

SEED_PLANS: List[Dict[str, Any]] = [
    {
        "id": "breakfast_club",
        "name": "Breakfast Club",
        "description": "30 days of home-style Karnataka breakfasts — idli, dosa, paddu and puri on rotation.",
        "mealTypes": ["breakfast"],
        "dietType": "veg",
        "durationDays": 30,
        "dailyMacros": {"energyKcal": 270, "proteinG": 6, "carbsG": 36},
        "priceMonthly": 2000,
    },
    {
        "id": "lunch_saver_veg",
        "name": "Lunch Saver — Veg",
        "description": "26 days of veg lunch thalis delivered to your door.",
        "mealTypes": ["lunch"],
        "dietType": "veg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 580, "proteinG": 16, "carbsG": 90},
        "priceMonthly": 3300,
    },
    {
        "id": "lunch_dinner_veg",
        "name": "Lunch + Dinner — Veg",
        "description": "26 days of veg lunch and dinner thalis on rotation.",
        "mealTypes": ["lunch", "dinner"],
        "dietType": "veg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 1150, "proteinG": 30, "carbsG": 175},
        "priceMonthly": 6500,
    },
    {
        "id": "nonveg_power",
        "name": "Non-Veg Power",
        "description": "26 days of lunch + dinner with chicken, egg and mutton curries on rotation.",
        "mealTypes": ["lunch", "dinner"],
        "dietType": "nonveg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 1150, "proteinG": 50, "carbsG": 110},
        "priceMonthly": 8400,
    },
    {
        "id": "full_day_veg",
        "name": "Full Day — Veg",
        "description": "Breakfast, lunch and dinner — full veg coverage for the month.",
        "mealTypes": ["breakfast", "lunch", "dinner"],
        "dietType": "veg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 1450, "proteinG": 38, "carbsG": 200},
        "priceMonthly": 8500,
    },
    {
        "id": "full_day_nonveg",
        "name": "Full Day — Non-Veg",
        "description": "Breakfast, lunch and dinner — one non-veg curry meal included daily.",
        "mealTypes": ["breakfast", "lunch", "dinner"],
        "dietType": "nonveg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 1700, "proteinG": 60, "carbsG": 195},
        "priceMonthly": 9300,
    },
    {
        "id": "fitness_high_protein",
        "name": "Fitness / High-Protein",
        "description": "Egg- and chicken-forward meals with larger portions for active lifestyles.",
        "mealTypes": ["breakfast", "lunch", "dinner"],
        "dietType": "nonveg",
        "durationDays": 26,
        "dailyMacros": {"energyKcal": 1800, "proteinG": 95, "carbsG": 180},
        "priceMonthly": 11000,
    },
]


async def seed_plans(plans_coll: AsyncIOMotorCollection) -> None:
    if await plans_coll.count_documents({}) == 0:
        await plans_coll.insert_many([{**d, "_id": d["id"]} for d in SEED_PLANS])


def mount_meal_plans(api: APIRouter, *, plans_coll: AsyncIOMotorCollection) -> None:
    plans = APIRouter(prefix="/plans", tags=["plans"])

    @plans.get("")
    async def list_plans():
        cur = plans_coll.find({}, {"_id": 0}).sort("priceMonthly", 1)
        return {"plans": await cur.to_list(50)}

    @plans.get("/{plan_id}")
    async def get_plan(plan_id: str):
        doc = await plans_coll.find_one({"id": plan_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Plan not found")
        return doc

    api.include_router(plans)
