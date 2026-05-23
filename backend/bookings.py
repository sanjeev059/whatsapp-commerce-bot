"""Gharsip saree service bookings — MongoDB-backed."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, ConfigDict
from pymongo import ReturnDocument

from orders import resolve_admin_token

_bearer = HTTPBearer(auto_error=False)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BookingIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: str = ""
    email: str = ""
    name: str
    phone: str
    address: str
    pincode: str = ""
    services: List[str]
    pickupDate: str
    timeSlot: str = ""
    notes: Optional[str] = None


class BookingStatusIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: Optional[str] = None
    notes: Optional[str] = None


def mount_bookings(
    api: APIRouter,
    *,
    bookings_coll: AsyncIOMotorCollection,
    meta_coll: AsyncIOMotorCollection,
    rate_limit: Callable[..., Any],
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

    bookings = APIRouter(prefix="/bookings", tags=["bookings"])
    admin = APIRouter(prefix="/admin", tags=["admin"])

    @bookings.post(
        "",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=5))],
    )
    async def create_booking(payload: BookingIn):
        seq_doc = await meta_coll.find_one_and_update(
            {"_id": "booking_seq"},
            {"$inc": {"v": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        seq = int(seq_doc.get("v", 1))
        booking_id = f"GB{1000 + seq}"

        doc: Dict[str, Any] = {
            "id": booking_id,
            "userId": payload.userId,
            "email": payload.email.lower(),
            "name": payload.name,
            "phone": payload.phone,
            "address": payload.address,
            "pincode": payload.pincode,
            "services": payload.services,
            "pickupDate": payload.pickupDate,
            "timeSlot": payload.timeSlot,
            "notes": payload.notes or "",
            "status": "new",
            "createdAt": now_iso(),
        }
        await bookings_coll.insert_one(dict(doc))
        return {"id": booking_id}

    @bookings.get(
        "",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=20))],
    )
    async def list_my_bookings(email: str = Query(..., description="Customer email")):
        cur = bookings_coll.find(
            {"email": email.strip().lower()}, {"_id": 0}
        ).sort("createdAt", -1).limit(50)
        items = await cur.to_list(50)
        return {"bookings": items}

    @admin.get("/bookings", dependencies=[Depends(require_admin)])
    async def list_bookings(limit: int = 100, skip: int = 0):
        lim = max(1, min(int(limit), 300))
        sk = max(0, int(skip))
        cur = bookings_coll.find({}, {"_id": 0}).sort("createdAt", -1).skip(sk).limit(lim)
        items = await cur.to_list(lim)
        return {"bookings": items}

    @admin.patch("/bookings/{booking_id}", dependencies=[Depends(require_admin)])
    async def update_booking(booking_id: str, body: BookingStatusIn):
        patch: Dict[str, Any] = {}
        if body.status is not None:
            patch["status"] = body.status
        if body.notes is not None:
            patch["notes"] = body.notes
        if not patch:
            raise HTTPException(400, "No fields to update")
        res = await bookings_coll.update_one({"id": booking_id}, {"$set": patch})
        if res.matched_count == 0:
            raise HTTPException(404, "Booking not found")
        return await bookings_coll.find_one({"id": booking_id}, {"_id": 0})

    api.include_router(bookings)
    api.include_router(admin)
