"""Meal-subscription orders — MongoDB-backed.

Replaces the old t-shirt cart/order flow: customers subscribe to a monthly
meal plan (see meal_plans.py) for delivery to an address, paid for either
online or on a pending/COD basis.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ReturnDocument

_bearer = HTTPBearer(auto_error=False)

_VALID_STATUSES = frozenset(
    {"pending_confirmation", "active", "paused", "cancelled", "completed"}
)
_VALID_PAYMENT_STATUSES = frozenset({"pending", "paid", "failed"})


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_admin_token() -> str:
    return (
        os.environ.get("ADMIN_API_TOKEN", "").strip()
        or os.environ.get("PRINTS_ADMIN_TOKEN", "").strip()
    )


def _digits_last10(phone: str) -> str:
    d = re.sub(r"\D", "", phone)
    return d[-10:] if len(d) >= 10 else d


class CustomerIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    phone: str
    email: str
    address1: str
    address2: Optional[str] = ""
    city: str
    state: str
    pincode: str


class SubscriptionCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    planId: str
    customer: CustomerIn
    dietPreference: Optional[str] = None
    startDate: str
    notes: Optional[str] = None


class DeliveryLogEntryIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date: str
    status: str
    note: Optional[str] = None


class SubscriptionPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Optional[str] = None
    paymentStatus: Optional[str] = None
    deliveryLog: Optional[List[DeliveryLogEntryIn]] = None


def mount_subscriptions(
    api: APIRouter,
    *,
    subscriptions_coll: AsyncIOMotorCollection,
    plans_coll: AsyncIOMotorCollection,
    meta_coll: AsyncIOMotorCollection,
    rate_limit: Callable[..., Any],
) -> None:
    """Mount public /subscriptions and Bearer-protected /admin/subscriptions routes under /api."""

    def require_admin(
        creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> bool:
        token = resolve_admin_token()
        if not token:
            raise HTTPException(503, "Admin API disabled — set ADMIN_API_TOKEN")
        if not creds or creds.credentials != token:
            raise HTTPException(401, "Invalid or missing admin token")
        return True

    subs = APIRouter(prefix="/subscriptions", tags=["subscriptions"])
    admin = APIRouter(prefix="/admin", tags=["admin"])

    @subs.post(
        "",
        dependencies=[
            Depends(rate_limit(window_seconds=60, max_calls=10)),
            Depends(rate_limit(window_seconds=3600, max_calls=80)),
        ],
    )
    async def create_subscription(payload: SubscriptionCreateIn):
        plan = await plans_coll.find_one({"id": payload.planId}, {"_id": 0})
        if not plan:
            raise HTTPException(400, "Invalid plan")

        seq_doc = await meta_coll.find_one_and_update(
            {"_id": "subscription_seq"},
            {"$inc": {"v": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        seq = int(seq_doc.get("v", 1))
        sub_id = f"GS{1000 + seq}"

        doc: Dict[str, Any] = {
            "id": sub_id,
            "planId": payload.planId,
            "planName": plan["name"],
            "priceMonthly": plan["priceMonthly"],
            "billingCycle": plan.get("billingCycle", "monthly"),
            "customer": payload.customer.model_dump(),
            "phoneDigits": _digits_last10(payload.customer.phone),
            "dietPreference": payload.dietPreference or plan.get("dietType"),
            "startDate": payload.startDate,
            "notes": payload.notes or "",
            "status": "pending_confirmation",
            "paymentStatus": "pending",
            "deliveryLog": [],
            "createdAt": now_iso(),
        }
        await subscriptions_coll.insert_one(dict(doc))
        return {"id": sub_id, "plan": plan}

    @subs.get(
        "",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=30))],
    )
    async def list_my_subscriptions(phone: str = Query(..., description="Customer phone")):
        p10 = _digits_last10(phone)
        if len(p10) != 10:
            raise HTTPException(400, "Enter a valid 10-digit phone number")
        cur = subscriptions_coll.find(
            {"phoneDigits": p10}, {"_id": 0}
        ).sort("createdAt", -1).limit(20)
        return {"subscriptions": await cur.to_list(20)}

    @subs.get(
        "/{sub_id}",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=40))],
    )
    async def get_subscription(
        sub_id: str,
        phone: str = Query(..., description="Customer phone (last 10 digits must match)"),
    ):
        p10 = _digits_last10(phone)
        if len(p10) != 10:
            raise HTTPException(400, "Enter a valid 10-digit phone number")
        row = await subscriptions_coll.find_one({"id": sub_id}, {"_id": 0})
        if not row or row.get("phoneDigits") != p10:
            raise HTTPException(404, "Subscription not found")
        return row

    @admin.get("/subscriptions", dependencies=[Depends(require_admin)])
    async def admin_list_subscriptions(limit: int = 100, skip: int = 0):
        lim = max(1, min(int(limit), 300))
        sk = max(0, int(skip))
        cur = subscriptions_coll.find({}, {"_id": 0}).sort("createdAt", -1).skip(sk).limit(lim)
        return {"subscriptions": await cur.to_list(lim)}

    @admin.patch("/subscriptions/{sub_id}", dependencies=[Depends(require_admin)])
    async def admin_patch_subscription(sub_id: str, body: SubscriptionPatchIn):
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

        if "deliveryLog" in incoming and body.deliveryLog is not None:
            patch["deliveryLog"] = [d.model_dump(exclude_none=True) for d in body.deliveryLog]

        if not patch:
            raise HTTPException(400, "No fields to update")
        res = await subscriptions_coll.update_one({"id": sub_id}, {"$set": patch})
        if res.matched_count == 0:
            raise HTTPException(404, "Subscription not found")
        return await subscriptions_coll.find_one({"id": sub_id}, {"_id": 0})

    api.include_router(subs)
    api.include_router(admin)
