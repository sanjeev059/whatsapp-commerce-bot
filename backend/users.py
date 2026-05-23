"""User management — MongoDB-backed."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/users", tags=["users"])
_users_coll: AsyncIOMotorCollection | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def mount_users(api_router, users_collection: AsyncIOMotorCollection):
    global _users_coll
    _users_coll = users_collection
    api_router.include_router(router)


class UserUpsertIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    uid: str
    email: str
    name: str = ""
    phone: str = ""
    role: str = "customer"


class UserPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = None
    phone: Optional[str] = None


@router.post("")
async def upsert_user(payload: UserUpsertIn):
    doc = payload.model_dump()
    doc.setdefault("createdAt", now_iso())
    await _users_coll.update_one(
        {"uid": payload.uid},
        {"$setOnInsert": {"createdAt": now_iso()}, "$set": {k: v for k, v in doc.items() if k != "createdAt"}},
        upsert=True,
    )
    result = await _users_coll.find_one({"uid": payload.uid}, {"_id": 0})
    return result


@router.get("/{uid}")
async def get_user(uid: str):
    doc = await _users_coll.find_one({"uid": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "User not found")
    return doc


@router.patch("/{uid}")
async def patch_user(uid: str, payload: UserPatchIn):
    patch: Dict[str, Any] = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not patch:
        raise HTTPException(400, "No fields to update")
    res = await _users_coll.update_one({"uid": uid}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return await _users_coll.find_one({"uid": uid}, {"_id": 0})
