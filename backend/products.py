"""Products API — admin-managed catalog for Gharsip storefront."""

from __future__ import annotations

import os
import urllib.request
import urllib.parse
import json
import base64
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel, ConfigDict

_bearer = HTTPBearer(auto_error=False)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _next_id(prefix: str) -> str:
    import random, string
    chars = string.ascii_lowercase + string.digits
    return prefix + ''.join(random.choices(chars, k=10))


def resolve_admin_token() -> str:
    return (
        os.environ.get("ADMIN_API_TOKEN", "").strip()
        or os.environ.get("PRINTS_ADMIN_TOKEN", "").strip()
    )


CATEGORIES = {"tshirts", "hoodies", "raincoats", "sarees", "accessories", "others"}


class ProductIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: str = ""
    category: str
    images: List[str] = []
    mrp: int
    price: int
    sizes: List[str] = []
    colors: List[Dict[str, Any]] = []
    stock: int = 0
    tags: List[str] = []
    active: bool = True


class ProductPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    mrp: Optional[int] = None
    price: Optional[int] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[Dict[str, Any]]] = None
    stock: Optional[int] = None
    tags: Optional[List[str]] = None
    active: Optional[bool] = None


def _upload_to_imgbb(image_bytes: bytes) -> str:
    api_key = os.environ.get("IMGBB_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(503, "Image upload not configured — set IMGBB_API_KEY")
    b64 = base64.b64encode(image_bytes).decode()
    data = urllib.parse.urlencode({"key": api_key, "image": b64}).encode()
    req = urllib.request.Request("https://api.imgbb.com/1/upload", data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    if not body.get("success"):
        raise HTTPException(502, "Image upload failed")
    return body["data"]["url"]


def mount_products(
    api: APIRouter,
    *,
    products_coll: AsyncIOMotorCollection,
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

    products = APIRouter(prefix="/products", tags=["products"])

    @products.get("")
    async def list_products(category: Optional[str] = None, active: Optional[bool] = True):
        q: Dict[str, Any] = {}
        if active is not None:
            q["active"] = active
        if category and category != "all":
            q["category"] = category
        cur = products_coll.find(q, {"_id": 0}).sort("createdAt", -1).limit(200)
        docs = await cur.to_list(200)
        return {"products": docs}

    @products.get("/featured")
    async def featured_products():
        cur = products_coll.find({"active": True}, {"_id": 0}).sort("createdAt", -1).limit(10)
        docs = await cur.to_list(10)
        return {"products": docs}

    @products.get("/{product_id}")
    async def get_product(product_id: str):
        doc = await products_coll.find_one({"id": product_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Product not found")
        return doc

    @products.post("", dependencies=[Depends(require_admin)])
    async def create_product(body: ProductIn):
        if body.category not in CATEGORIES:
            raise HTTPException(400, f"category must be one of: {', '.join(sorted(CATEGORIES))}")
        doc: Dict[str, Any] = body.model_dump()
        doc["id"] = _next_id("prod_")
        doc["createdAt"] = now_iso()
        await products_coll.insert_one({**doc, "_id": doc["id"]})
        return doc

    @products.patch("/{product_id}", dependencies=[Depends(require_admin)])
    async def update_product(product_id: str, body: ProductPatch):
        data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
        if not data:
            raise HTTPException(400, "Nothing to update")
        res = await products_coll.update_one({"id": product_id}, {"$set": data})
        if res.matched_count == 0:
            raise HTTPException(404, "Product not found")
        return await products_coll.find_one({"id": product_id}, {"_id": 0})

    @products.delete("/{product_id}", dependencies=[Depends(require_admin)])
    async def delete_product(product_id: str):
        res = await products_coll.delete_one({"id": product_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Product not found")
        return {"ok": True}

    @products.post("/upload-image", dependencies=[Depends(require_admin)])
    async def upload_image(file: UploadFile = File(...)):
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(400, "File must be an image")
        data = await file.read()
        if len(data) > 5 * 1024 * 1024:
            raise HTTPException(400, "Image too large (max 5MB)")
        url = _upload_to_imgbb(data)
        return {"url": url}

    api.include_router(products)
