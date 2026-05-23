"""Store order REST API for Gharsip Custom Prints — MongoDB-backed.

Aligned with frontend/lib/pricing.ts (GHARSIP10, delivery tiers).
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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_admin_token() -> str:
    return (
        os.environ.get("ADMIN_API_TOKEN", "").strip()
        or os.environ.get("PRINTS_ADMIN_TOKEN", "").strip()
    )


_PRINT_PLAIN = {"round": 249, "vneck": 269, "oversized": 299, "polo": 319}
_PRINT_WITH = {"round": 399, "vneck": 419, "oversized": 449, "polo": 469}
_DELIVERY_FLAT = 60
_FREE_OVER = 999
_VALID_PT = frozenset(_PRINT_PLAIN.keys())
_VALID_SIZES = frozenset({"XS", "S", "M", "L", "XL", "XXL", "XXXL"})


class CartLineIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lineId: str
    designId: Optional[str] = None
    designName: Optional[str] = None
    designUrl: Optional[str] = None
    productType: str
    colorId: str
    colorLabel: str
    colorHex: str
    size: str
    qty: int = Field(ge=1, le=99)
    previewSide: str = "front"
    unitPrice: int = Field(ge=0, le=100000)


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


class TimelineStepIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    key: str
    label: str
    done: bool
    current: Optional[bool] = None
    at: Optional[str] = None
    detail: Optional[str] = None


class OrderCreateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lines: List[CartLineIn]
    customer: CustomerIn
    coupon: Optional[str] = None
    subtotal: int
    delivery: int
    total: int
    paymentId: Optional[str] = None
    paymentStatus: str = "pending"


class OrderPatchIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tracking: Optional[str] = None
    qikinkId: Optional[str] = None
    timeline: Optional[List[TimelineStepIn]] = None


def _digits_last10(phone: str) -> str:
    d = re.sub(r"\D", "", phone)
    return d[-10:] if len(d) >= 10 else d


def _line_unit(pt: str, has_design: bool) -> int:
    if pt not in _VALID_PT:
        raise HTTPException(400, f"Invalid product type: {pt}")
    table = _PRINT_WITH if has_design else _PRINT_PLAIN
    return table[pt]


def _canonical_cart(lines: List[CartLineIn]) -> tuple[List[Dict[str, Any]], int]:
    out: List[Dict[str, Any]] = []
    sub = 0
    for ln in lines:
        sz = ln.size.strip().upper()
        if sz not in _VALID_SIZES:
            raise HTTPException(400, f"Invalid size: {ln.size}")
        has_design = bool(ln.designId)
        unit = _line_unit(ln.productType, has_design)
        line_total = unit * ln.qty
        sub += line_total
        out.append(
            {
                "lineId": ln.lineId,
                "designId": ln.designId,
                "designName": ln.designName,
                "designUrl": ln.designUrl,
                "productType": ln.productType,
                "colorId": ln.colorId,
                "colorLabel": ln.colorLabel,
                "colorHex": ln.colorHex,
                "size": sz,
                "qty": ln.qty,
                "previewSide": ln.previewSide,
                "unitPrice": unit,
            }
        )
    return out, sub


def _apply_coupon(subtotal: int, coupon: Optional[str]) -> tuple[int, Optional[str]]:
    if not coupon or not str(coupon).strip():
        return 0, None
    c = str(coupon).strip().upper()
    if c == "GHARSIP10":
        disc = min(100, int(subtotal * 0.1))
        return disc, c
    raise HTTPException(400, "Unknown coupon code")


def _delivery_amount(sub_after_discount: int) -> int:
    return 0 if sub_after_discount >= _FREE_OVER else _DELIVERY_FLAT


def mount_orders(
    api: APIRouter,
    *,
    orders_coll: AsyncIOMotorCollection,
    meta_coll: AsyncIOMotorCollection,
    rate_limit: Callable[..., Any],
) -> None:
    """Mount public /orders and Bearer-protected /admin/order routes under /api."""

    def require_admin(
        creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> bool:
        token = resolve_admin_token()
        if not token:
            raise HTTPException(
                503,
                "Admin API disabled — set ADMIN_API_TOKEN",
            )
        if not creds or creds.credentials != token:
            raise HTTPException(401, "Invalid or missing admin token")
        return True

    def default_timeline() -> List[Dict[str, Any]]:
        t = now_iso()
        return [
            {"key": "placed", "label": "Order placed", "done": True, "at": t},
            {"key": "printer", "label": "Design sent to printer", "done": True, "at": t},
            {"key": "printing", "label": "Printing in progress", "done": False, "current": True},
            {"key": "qc", "label": "Quality check", "done": False},
            {
                "key": "shipped",
                "label": "Shipped",
                "done": False,
                "detail": "Tracking will appear here",
            },
            {"key": "ofd", "label": "Out for delivery", "done": False},
            {"key": "delivered", "label": "Delivered", "done": False},
        ]

    orders = APIRouter(prefix="/orders", tags=["orders"])

    @orders.post(
        "",
        dependencies=[
            Depends(rate_limit(window_seconds=60, max_calls=10)),
            Depends(rate_limit(window_seconds=3600, max_calls=80)),
        ],
    )
    async def create_order(payload: OrderCreateIn):
        if not payload.lines:
            raise HTTPException(400, "Cart is empty")
        canon_lines, subtotal = _canonical_cart(payload.lines)
        discount, coup = _apply_coupon(subtotal, payload.coupon)
        adj_sub = max(0, subtotal - discount)
        delivery = _delivery_amount(adj_sub)
        total = adj_sub + delivery
        if abs(total - int(payload.total)) > 2:
            raise HTTPException(
                400,
                f"Price mismatch — refresh and try again (server ₹{total} vs client ₹{payload.total}).",
            )

        seq_doc = await meta_coll.find_one_and_update(
            {"_id": "order_seq"},
            {"$inc": {"v": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        seq = int(seq_doc.get("v", 1))
        order_id = f"GH{10000 + seq}"

        pay_st = payload.paymentStatus
        if pay_st not in ("pending", "paid", "failed"):
            pay_st = "pending"

        doc: Dict[str, Any] = {
            "id": order_id,
            "lines": canon_lines,
            "customer": payload.customer.model_dump(),
            "coupon": coup,
            "subtotal": subtotal,
            "discount": discount,
            "adjustedSubtotal": adj_sub,
            "delivery": delivery,
            "total": total,
            "paymentId": payload.paymentId,
            "paymentStatus": pay_st,
            "tracking": None,
            "qikinkId": None,
            "timeline": default_timeline(),
            "createdAt": now_iso(),
        }
        await orders_coll.insert_one(dict(doc))
        return {"id": order_id, "total": total}

    @orders.get(
        "",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=30))],
    )
    async def list_my_orders(email: str = Query(..., description="Customer email")):
        cur = orders_coll.find(
            {"customer.email": email.strip().lower()}, {"_id": 0}
        ).sort("createdAt", -1).limit(50)
        items = await cur.to_list(50)
        return {"orders": items}

    @orders.get(
        "/{order_id}",
        dependencies=[Depends(rate_limit(window_seconds=60, max_calls=40))],
    )
    async def get_order(
        order_id: str,
        phone: str = Query(..., description="Customer phone (any format; last 10 digits must match)"),
    ):
        pl10 = _digits_last10(phone)
        if len(pl10) != 10:
            raise HTTPException(400, "Enter a valid 10-digit phone number")
        row = await orders_coll.find_one({"id": order_id}, {"_id": 0})
        if not row:
            raise HTTPException(404, "Order not found")
        if _digits_last10(row["customer"].get("phone", "")) != pl10:
            raise HTTPException(404, "Order not found")
        return row

    admin = APIRouter(prefix="/admin", tags=["admin"])

    @admin.get("/orders", dependencies=[Depends(require_admin)])
    async def admin_list_orders(limit: int = 100, skip: int = 0):
        lim = max(1, min(int(limit), 300))
        sk = max(0, int(skip))
        cur = orders_coll.find({}, {"_id": 0}).sort("createdAt", -1).skip(sk).limit(lim)
        items = await cur.to_list(lim)
        return {"orders": items}

    @admin.patch("/orders/{order_id}", dependencies=[Depends(require_admin)])
    async def admin_patch_order(order_id: str, body: OrderPatchIn):
        patch: Dict[str, Any] = {}
        incoming = body.model_dump(exclude_unset=True)

        if "timeline" in incoming and body.timeline is not None:
            patch["timeline"] = [t.model_dump(exclude_none=True) for t in body.timeline]

        if "tracking" in incoming:
            patch["tracking"] = (incoming["tracking"] or "").strip() or None
        if "qikinkId" in incoming:
            patch["qikinkId"] = (incoming["qikinkId"] or "").strip() or None

        if not patch:
            raise HTTPException(400, "No fields to update")
        res = await orders_coll.update_one({"id": order_id}, {"$set": patch})
        if res.matched_count == 0:
            raise HTTPException(404, "Order not found")
        return await orders_coll.find_one({"id": order_id}, {"_id": 0})

    api.include_router(orders)
    api.include_router(admin)
