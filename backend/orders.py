"""À la carte meal orders — MongoDB-backed.

Captures cart items plus delivery apartment/time-slot for one-off /menu
orders, separate from monthly/weekly subscriptions (see subscriptions.py),
so the admin "today's deliveries" view can batch them with subscription
deliveries by apartment + time slot.
"""

from __future__ import annotations

import os
import re
from datetime import date as date_cls, datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, ConfigDict
from pymongo import ReturnDocument

from subscriptions import resolve_admin_token
from time_slots import MEAL_TIME_SLOTS

_bearer = HTTPBearer(auto_error=False)

_VALID_STATUSES = frozenset({"placed", "confirmed", "delivered", "cancelled"})
_VALID_PAYMENT_STATUSES = frozenset({"pending", "paid", "failed"})


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _digits_last10(phone: str) -> str:
    d = re.sub(r"\D", "", phone)
    return d[-10:] if len(d) >= 10 else d


class OrderCustomerIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    phone: str
    apartment: str
    address1: str
    city: str
    locationUrl: Optional[str] = None


class OrderLineIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    kind: str  # "combo" | "item"
    id: str
    name: str
    price: float
    qty: int


class OrderCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    customer: OrderCustomerIn
    items: List[OrderLineIn]
    mealType: str
    timeSlot: str
    deliveryDate: Optional[str] = None
    notes: Optional[str] = None


class OrderPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Optional[str] = None
    paymentStatus: Optional[str] = None


def mount_orders(
    api: APIRouter,
    *,
    orders_coll: AsyncIOMotorCollection,
    meta_coll: AsyncIOMotorCollection,
    rate_limit: Callable[..., Any],
) -> None:
    """Mount public /orders and Bearer-protected /admin/orders routes under /api."""

    def require_admin(
        creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> bool:
        token = resolve_admin_token()
        if not token:
            raise HTTPException(503, "Admin API disabled — set ADMIN_API_TOKEN")
        if not creds or creds.credentials != token:
            raise HTTPException(401, "Invalid or missing admin token")
        return True

    orders = APIRouter(prefix="/orders", tags=["orders"])
    admin = APIRouter(prefix="/admin", tags=["admin"])

    @orders.post(
        "",
        dependencies=[
            Depends(rate_limit(window_seconds=60, max_calls=10)),
            Depends(rate_limit(window_seconds=3600, max_calls=80)),
        ],
    )
    async def create_order(payload: OrderCreateIn):
        if not payload.items:
            raise HTTPException(400, "Order must include at least one item")
        if payload.mealType not in MEAL_TIME_SLOTS:
            raise HTTPException(400, f"mealType must be one of: {', '.join(MEAL_TIME_SLOTS)}")
        if payload.timeSlot not in MEAL_TIME_SLOTS[payload.mealType]:
            raise HTTPException(400, "Invalid time slot for this meal type")

        seq_doc = await meta_coll.find_one_and_update(
            {"_id": "order_seq"},
            {"$inc": {"v": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        seq = int(seq_doc.get("v", 1))
        order_id = f"GO{1000 + seq}"
        total = sum(line.price * line.qty for line in payload.items)

        doc: Dict[str, Any] = {
            "id": order_id,
            "items": [line.model_dump() for line in payload.items],
            "total": total,
            "customer": payload.customer.model_dump(),
            "phoneDigits": _digits_last10(payload.customer.phone),
            "mealType": payload.mealType,
            "timeSlot": payload.timeSlot,
            "deliveryDate": payload.deliveryDate or date_cls.today().isoformat(),
            "notes": payload.notes or "",
            "status": "placed",
            "paymentStatus": "pending",
            "createdAt": now_iso(),
        }
        await orders_coll.insert_one(dict(doc))
        return {"id": order_id, "order": {k: v for k, v in doc.items() if k != "_id"}}

    @orders.get(
        "",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=30))],
    )
    async def list_my_orders(phone: str = Query(..., description="Customer phone")):
        p10 = _digits_last10(phone)
        if len(p10) != 10:
            raise HTTPException(400, "Enter a valid 10-digit phone number")
        cur = orders_coll.find({"phoneDigits": p10}, {"_id": 0}).sort("createdAt", -1).limit(20)
        return {"orders": await cur.to_list(20)}

    @admin.get("/orders", dependencies=[Depends(require_admin)])
    async def admin_list_orders(limit: int = 100, skip: int = 0):
        lim = max(1, min(int(limit), 300))
        sk = max(0, int(skip))
        cur = orders_coll.find({}, {"_id": 0}).sort("createdAt", -1).skip(sk).limit(lim)
        return {"orders": await cur.to_list(lim)}

    @admin.patch("/orders/{order_id}", dependencies=[Depends(require_admin)])
    async def admin_patch_order(order_id: str, body: OrderPatchIn):
        patch: Dict[str, Any] = {}
        incoming = body.model_dump(exclude_unset=True)

        if "status" in incoming and body.status is not None:
            if body.status not in _VALID_STATUSES:
                raise HTTPException(400, f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}")
            patch["status"] = body.status

        if "paymentStatus" in incoming and body.paymentStatus is not None:
            if body.paymentStatus not in _VALID_PAYMENT_STATUSES:
                raise HTTPException(400, f"paymentStatus must be one of: {', '.join(sorted(_VALID_PAYMENT_STATUSES))}")
            patch["paymentStatus"] = body.paymentStatus

        if not patch:
            raise HTTPException(400, "No fields to update")
        res = await orders_coll.update_one({"id": order_id}, {"$set": patch})
        if res.matched_count == 0:
            raise HTTPException(404, "Order not found")
        return await orders_coll.find_one({"id": order_id}, {"_id": 0})

    api.include_router(orders)
    api.include_router(admin)
