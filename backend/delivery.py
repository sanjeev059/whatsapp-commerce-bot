"""Delivery time slots and admin batching view.

Customers (subscriptions and à la carte orders alike) pick a 1-hour delivery
slot per meal type so the delivery rider can batch drops to the same
apartment/society in one trip.
"""

from __future__ import annotations

from datetime import date as date_cls
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorCollection

from subscriptions import resolve_admin_token
from time_slots import MEAL_TIME_SLOTS

_bearer = HTTPBearer(auto_error=False)


def mount_delivery(
    api: APIRouter,
    *,
    plans_coll: AsyncIOMotorCollection,
    subscriptions_coll: AsyncIOMotorCollection,
    orders_coll: AsyncIOMotorCollection,
) -> None:
    def require_admin(
        creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> bool:
        token = resolve_admin_token()
        if not token:
            raise HTTPException(503, "Admin API disabled — set ADMIN_API_TOKEN")
        if not creds or creds.credentials != token:
            raise HTTPException(401, "Invalid or missing admin token")
        return True

    delivery = APIRouter(prefix="/delivery", tags=["delivery"])

    @delivery.get("/time-slots")
    async def time_slots():
        return {"timeSlots": MEAL_TIME_SLOTS}

    @delivery.get("/admin/groups", dependencies=[Depends(require_admin)])
    async def delivery_groups(
        mealType: str = Query(..., description="breakfast | lunch | dinner"),
        date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    ):
        if mealType not in MEAL_TIME_SLOTS:
            raise HTTPException(400, f"mealType must be one of: {', '.join(MEAL_TIME_SLOTS)}")
        day = date or date_cls.today().isoformat()

        groups: Dict[tuple, Dict[str, Any]] = {}

        def group_for(apartment: str, slot: str) -> Dict[str, Any]:
            key = (apartment, slot)
            return groups.setdefault(
                key,
                {"apartment": apartment, "timeSlot": slot, "subscriptions": [], "orders": []},
            )

        plans = {p["id"]: p async for p in plans_coll.find({}, {"_id": 0})}

        async for sub in subscriptions_coll.find({"status": "active"}, {"_id": 0}):
            plan = plans.get(sub.get("planId"))
            if not plan or mealType not in plan.get("mealTypes", []):
                continue
            slot = (sub.get("mealTimeSlots") or {}).get(mealType)
            if not slot:
                continue
            customer = sub.get("customer", {})
            delivered_today = any(
                e.get("date") == day and e.get("mealType") == mealType and e.get("status") == "delivered"
                for e in sub.get("deliveryLog", [])
            )
            g = group_for(customer.get("apartment", "—"), slot)
            g["subscriptions"].append(
                {
                    "id": sub["id"],
                    "name": customer.get("name", ""),
                    "phone": customer.get("phone", ""),
                    "address": customer.get("address1", ""),
                    "locationUrl": customer.get("locationUrl"),
                    "planName": sub.get("planName", ""),
                    "deliveredToday": delivered_today,
                }
            )

        async for order in orders_coll.find(
            {"mealType": mealType, "deliveryDate": day, "status": {"$ne": "cancelled"}}, {"_id": 0}
        ):
            customer = order.get("customer", {})
            g = group_for(customer.get("apartment", "—"), order.get("timeSlot", ""))
            g["orders"].append(
                {
                    "id": order["id"],
                    "name": customer.get("name", ""),
                    "phone": customer.get("phone", ""),
                    "address": customer.get("address1", ""),
                    "locationUrl": customer.get("locationUrl"),
                    "items": order.get("items", []),
                    "status": order.get("status", "placed"),
                }
            )

        result = sorted(groups.values(), key=lambda g: (g["apartment"], g["timeSlot"]))
        return {"date": day, "mealType": mealType, "timeSlots": MEAL_TIME_SLOTS[mealType], "groups": result}

    @delivery.get("/admin/prep", dependencies=[Depends(require_admin)])
    async def kitchen_prep(
        mealType: str = Query(..., description="breakfast | lunch | dinner"),
        date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    ):
        """Aggregate dish/item quantities the kitchen needs to prepare for a
        meal type + date, from both à la carte orders and active
        subscriptions, so cooking can start before the delivery rush."""
        if mealType not in MEAL_TIME_SLOTS:
            raise HTTPException(400, f"mealType must be one of: {', '.join(MEAL_TIME_SLOTS)}")
        day = date or date_cls.today().isoformat()

        item_counts: Dict[tuple, Dict[str, Any]] = {}
        order_count = 0
        async for order in orders_coll.find(
            {"mealType": mealType, "deliveryDate": day, "status": {"$ne": "cancelled"}}, {"_id": 0}
        ):
            order_count += 1
            for line in order.get("items", []):
                key = (line.get("kind"), line.get("id"))
                entry = item_counts.setdefault(
                    key, {"name": line.get("name"), "kind": line.get("kind"), "qty": 0}
                )
                entry["qty"] += line.get("qty", 0)

        plans = {p["id"]: p async for p in plans_coll.find({}, {"_id": 0})}
        plan_counts: Dict[str, Dict[str, Any]] = {}
        sub_count = 0
        async for sub in subscriptions_coll.find({"status": "active"}, {"_id": 0}):
            plan = plans.get(sub.get("planId"))
            if not plan or mealType not in plan.get("mealTypes", []):
                continue
            if not (sub.get("mealTimeSlots") or {}).get(mealType):
                continue
            sub_count += 1
            plan_name = sub.get("planName", "Plan")
            entry = plan_counts.setdefault(plan_name, {"planName": plan_name, "qty": 0, "dietPreference": {}})
            entry["qty"] += 1
            diet = sub.get("dietPreference") or "—"
            entry["dietPreference"][diet] = entry["dietPreference"].get(diet, 0) + 1

        return {
            "date": day,
            "mealType": mealType,
            "orderItems": sorted(item_counts.values(), key=lambda x: -x["qty"]),
            "orderCount": order_count,
            "subscriptionMeals": sorted(plan_counts.values(), key=lambda x: -x["qty"]),
            "subscriptionCount": sub_count,
        }

    api.include_router(delivery)
