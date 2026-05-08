"""Phase 1 multi-tenant SaaS backend.

Three roles:
  master_admin — onboards vendors, controls subscriptions
  vendor_admin — manages their own store/orders/products (scoped to vendor_id)
  customer    — public, no auth

Customer flow (no WhatsApp):
  scan QR → /store/<slug> → cart → checkout → UPI QR + last-5 verify → /track/<token>
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, status
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from seed_data import seed_initial_catalog

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL = 60 * 12  # minutes

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("server")

app = FastAPI(title="Local Commerce SaaS API", version="3.0")
api = APIRouter(prefix="/api")


# ==================== utils ====================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_token(user: Dict[str, Any]) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "vendor_id": user.get("vendor_id"),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:48] or uuid.uuid4().hex[:8]


bearer = HTTPBearer(auto_error=False)


async def auth_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def require_master(user=Depends(auth_user)):
    if user.get("role") != "master_admin":
        raise HTTPException(403, "Master admin only")
    return user


async def require_vendor(user=Depends(auth_user)):
    if user.get("role") != "vendor_admin" or not user.get("vendor_id"):
        raise HTTPException(403, "Vendor admin only")
    vendor = await db.vendors.find_one({"id": user["vendor_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    user["vendor"] = vendor
    return user


# ==================== models ====================
ORDER_STATES = [
    "payment_verification_pending",
    "payment_verified",
    "accepted",
    "out_for_delivery",
    "delivered",
    "rejected",
    "cancelled",
]


class LoginIn(BaseModel):
    email: str
    password: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class VendorCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    owner_name: str
    owner_phone: str
    address: str = ""
    upi_id: str = ""
    subscription_expires_at: Optional[str] = None
    license_info: str = ""
    accepts_tos: bool


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    upi_id: Optional[str] = None
    payment_qr_url: Optional[str] = None
    store_status: Optional[str] = None  # open | closed
    opening_time: Optional[str] = None  # "10:00"
    closing_time: Optional[str] = None  # "23:00"
    subscription_active: Optional[bool] = None
    subscription_expires_at: Optional[str] = None


class ProductCreate(BaseModel):
    category_id: str
    subgroup_id: str
    name: str
    price: float
    image: str = ""
    unit: str = ""
    tag: str = ""
    description: str = ""
    in_stock: bool = True


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    subgroup_id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    unit: Optional[str] = None
    tag: Optional[str] = None
    in_stock: Optional[bool] = None


class OrderItemIn(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int
    category_id: str


class OrderCreate(BaseModel):
    vendor_slug: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    customer_lat: Optional[float] = None
    customer_lng: Optional[float] = None
    notes: str = ""
    payment_mode: str = "upi"  # upi | cod
    upi_last5: Optional[str] = None
    items: List[OrderItemIn]

    @field_validator("upi_last5")
    @classmethod
    def validate_last5(cls, v, info):
        # If payment_mode is upi, must be exactly 5 digits
        return v


class OrderStatusUpdate(BaseModel):
    status: str


# ==================== public storefront ====================
@api.get("/")
async def root():
    return {"app": os.environ.get("PLATFORM_NAME", "Local Commerce"), "version": "3.0"}


@api.get("/storefront/{slug}")
async def storefront(slug: str):
    """Public catalog for one vendor — used by customer storefront."""
    v = await db.vendors.find_one({"slug": slug}, {"_id": 0, "users": 0})
    if not v:
        raise HTTPException(404, "Store not found")

    # Check subscription/availability gates
    sub_active = v.get("subscription_active", True)
    if not sub_active:
        return {
            "vendor": _public_vendor(v),
            "available": False,
            "reason": "Store temporarily unavailable",
            "categories": [],
        }

    cats = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    subs = await db.subgroups.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    products = await db.products.find(
        {"vendor_id": v["id"], "in_stock": True}, {"_id": 0}
    ).to_list(2000)

    by_sub: Dict[str, List[Dict[str, Any]]] = {}
    for p in products:
        by_sub.setdefault(p["subgroup_id"], []).append(p)

    cat_payload = []
    for c in cats:
        cat_subs = [s for s in subs if s["category_id"] == c["id"]]
        cat_payload.append({
            **c,
            "subgroups": [
                {"id": s["id"], "name": s["name"], "products": by_sub.get(s["id"], [])}
                for s in cat_subs
            ],
        })

    return {
        "vendor": _public_vendor(v),
        "available": v.get("store_status", "open") == "open",
        "reason": "Store currently closed" if v.get("store_status") == "closed" else None,
        "categories": cat_payload,
    }


def _public_vendor(v: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": v["id"],
        "slug": v["slug"],
        "name": v["name"],
        "address": v.get("address", ""),
        "upi_id": v.get("upi_id", ""),
        "payment_qr_url": v.get("payment_qr_url", ""),
        "store_status": v.get("store_status", "open"),
        "opening_time": v.get("opening_time", ""),
        "closing_time": v.get("closing_time", ""),
    }


# ==================== orders (public POST + tracking GET) ====================
@api.post("/orders")
async def place_order(payload: OrderCreate):
    v = await db.vendors.find_one({"slug": payload.vendor_slug}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Vendor not found")
    if not v.get("subscription_active", True):
        raise HTTPException(403, "Store temporarily unavailable")
    if v.get("store_status", "open") != "open":
        raise HTTPException(403, "Store currently closed")
    if not payload.items:
        raise HTTPException(400, "Cart is empty")

    # UPI verification gate
    if payload.payment_mode == "upi":
        if not payload.upi_last5 or not re.fullmatch(r"\d{5}", payload.upi_last5):
            raise HTTPException(400, "Enter exactly 5 digits of UPI transaction ID")

    # Liquor min ₹1000 (server-side enforcement)
    liquor_total = sum(i.price * i.qty for i in payload.items if i.category_id == "liquor")
    if liquor_total > 0 and liquor_total < 1000:
        raise HTTPException(400, "Liquor minimum order is ₹1000")

    total = round(sum(i.price * i.qty for i in payload.items), 2)

    # Atomic per-vendor sequential counter
    seq_doc = await db.vendors.find_one_and_update(
        {"id": v["id"]}, {"$inc": {"next_order_seq": 1}}, return_document=True
    )
    seq = (seq_doc or {}).get("next_order_seq", 1)
    short_id = f"ORD-{1000 + seq}"

    new_id = str(uuid.uuid4())
    tracking_token = uuid.uuid4().hex[:16]
    initial_status = "payment_verification_pending" if payload.payment_mode == "upi" else "accepted"

    order = {
        "id": new_id,
        "short_id": short_id,
        "tracking_token": tracking_token,
        "vendor_id": v["id"],
        "customer_name": payload.customer_name.strip(),
        "customer_phone": payload.customer_phone.strip(),
        "delivery_address": payload.delivery_address.strip(),
        "customer_lat": payload.customer_lat,
        "customer_lng": payload.customer_lng,
        "notes": (payload.notes or "").strip(),
        "payment_mode": payload.payment_mode,
        "upi_last5": payload.upi_last5,
        "items": [i.model_dump() for i in payload.items],
        "total": total,
        "status": initial_status,
        "status_history": [{"status": initial_status, "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))
    return {"short_id": short_id, "tracking_token": tracking_token, "status": initial_status}


@api.get("/track/{token}")
async def track_order(token: str):
    o = await db.orders.find_one({"tracking_token": token}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    v = await db.vendors.find_one({"id": o["vendor_id"]}, {"_id": 0})
    return {
        "short_id": o["short_id"],
        "status": o["status"],
        "status_history": o.get("status_history", []),
        "total": o["total"],
        "items": o["items"],
        "delivery_address": o["delivery_address"],
        "customer_name": o["customer_name"],
        "payment_mode": o["payment_mode"],
        "vendor": _public_vendor(v) if v else None,
        "created_at": o["created_at"],
    }


# ==================== auth ====================
@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user)
    safe = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return {"access_token": token, "token_type": "bearer", "user": safe}


@api.get("/auth/me")
async def me(user=Depends(auth_user)):
    return user


@api.post("/auth/change-password")
async def change_password(payload: PasswordChangeIn, user=Depends(auth_user)):
    if len(payload.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_pw(payload.current_password, full["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_pw(payload.new_password)}}
    )
    return {"ok": True}


# ==================== Uploads ====================
MAX_UPLOAD_BYTES = 3 * 1024 * 1024  # 3 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@api.get("/uploads/{file_id}")
async def get_upload(file_id: str):
    """Public: serve an uploaded image."""
    img = await db.images.find_one({"id": file_id}, {"_id": 0})
    if not img:
        raise HTTPException(404, "Not found")
    return Response(
        content=img["data"],
        media_type=img.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ==================== Master Admin ====================
master = APIRouter(prefix="/master", dependencies=[Depends(require_master)])


@master.get("/stats")
async def master_stats():
    vendors_total = await db.vendors.count_documents({})
    vendors_active = await db.vendors.count_documents({"subscription_active": True})
    orders_total = await db.orders.count_documents({})
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    orders_today = await db.orders.count_documents({"created_at": {"$gte": today_start}})
    pipeline = [{"$group": {"_id": None, "gmv": {"$sum": "$total"}}}]
    gmv_doc = await db.orders.aggregate(pipeline).to_list(1)
    gmv = round((gmv_doc[0]["gmv"] if gmv_doc else 0), 2)
    return {
        "vendors_total": vendors_total,
        "vendors_active": vendors_active,
        "orders_total": orders_total,
        "orders_today": orders_today,
        "gmv": gmv,
    }


@master.get("/vendors")
async def list_vendors():
    vs = await db.vendors.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Add user email to each
    for v in vs:
        u = await db.users.find_one({"vendor_id": v["id"], "role": "vendor_admin"}, {"_id": 0, "email": 1})
        v["admin_email"] = u["email"] if u else None
    return vs


@master.post("/vendors")
async def create_vendor(payload: VendorCreate):
    if not payload.accepts_tos:
        raise HTTPException(400, "Vendor must accept Terms of Service")

    slug = (payload.slug or slugify(payload.name)).lower()
    if await db.vendors.find_one({"slug": slug}):
        raise HTTPException(400, f"Slug '{slug}' already taken")

    vendor_id = str(uuid.uuid4())
    vendor = {
        "id": vendor_id,
        "slug": slug,
        "name": payload.name.strip(),
        "owner_name": payload.owner_name.strip(),
        "owner_phone": payload.owner_phone.strip(),
        "address": payload.address.strip(),
        "upi_id": payload.upi_id.strip(),
        "payment_qr_url": "",
        "store_status": "open",
        "opening_time": "10:00",
        "closing_time": "23:00",
        "subscription_active": True,
        "subscription_expires_at": payload.subscription_expires_at,
        "license_info": payload.license_info.strip(),
        "next_order_seq": 0,
        "created_at": now_iso(),
    }
    await db.vendors.insert_one(dict(vendor))

    # Create vendor admin user — username = slug, default password = slug + "123"
    default_pw = f"{slug}123"
    admin_email = f"{slug}@vendor.local"
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": admin_email,
        "password_hash": hash_pw(default_pw),
        "name": payload.owner_name.strip(),
        "role": "vendor_admin",
        "vendor_id": vendor_id,
        "created_at": now_iso(),
    })

    return {"vendor": vendor, "admin_email": admin_email, "default_password": default_pw}


@master.patch("/vendors/{vid}")
async def update_vendor(vid: str, payload: VendorUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.vendors.find_one_and_update(
        {"id": vid}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Vendor not found")
    return res


@master.delete("/vendors/{vid}")
async def deactivate_vendor(vid: str):
    """Soft-disable: turns subscription off (storefront becomes unavailable)."""
    res = await db.vendors.update_one(
        {"id": vid}, {"$set": {"subscription_active": False}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Vendor not found")
    return {"ok": True}


@master.get("/orders")
async def all_orders(limit: int = 200):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # Add vendor names
    vs = {v["id"]: v["name"] for v in await db.vendors.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
    for o in orders:
        o["vendor_name"] = vs.get(o["vendor_id"], "—")
    return orders


# ==================== Vendor Admin ====================
vendor_r = APIRouter(prefix="/vendor", dependencies=[Depends(require_vendor)])


@vendor_r.get("/me")
async def vendor_me(user=Depends(require_vendor)):
    return user["vendor"]


@vendor_r.post("/uploads/image")
async def vendor_upload_image(file: UploadFile = File(...), user=Depends(require_vendor)):
    """Vendor uploads an image (product photo, payment QR, etc.)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Image must be JPEG, PNG, WEBP, or GIF")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, f"Image too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)")
    if len(data) == 0:
        raise HTTPException(400, "Empty file")
    file_id = uuid.uuid4().hex
    await db.images.insert_one({
        "id": file_id,
        "vendor_id": user["vendor_id"],
        "content_type": file.content_type,
        "data": data,
        "size": len(data),
        "filename": file.filename,
        "created_at": now_iso(),
    })
    return {"id": file_id, "url": f"/api/uploads/{file_id}", "size": len(data)}


@vendor_r.patch("/store")
async def update_store(payload: VendorUpdate, user=Depends(require_vendor)):
    """Vendor self-service: store status, hours, UPI, QR."""
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    # Block fields only Master can change
    update.pop("subscription_active", None)
    update.pop("subscription_expires_at", None)
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.vendors.find_one_and_update(
        {"id": user["vendor_id"]}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    return res


@vendor_r.get("/stats")
async def vendor_stats(user=Depends(require_vendor)):
    vid = user["vendor_id"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_orders = await db.orders.find(
        {"vendor_id": vid, "created_at": {"$gte": today_start}}, {"_id": 0}
    ).to_list(1000)
    total_orders = await db.orders.count_documents({"vendor_id": vid})
    total_products = await db.products.count_documents({"vendor_id": vid})
    today_revenue = sum(o["total"] for o in today_orders if o["status"] not in ("rejected", "cancelled"))
    by_status: Dict[str, int] = {}
    for s in ORDER_STATES:
        by_status[s] = await db.orders.count_documents({"vendor_id": vid, "status": s})
    return {
        "total_orders": total_orders,
        "today_orders": len(today_orders),
        "today_revenue": round(today_revenue, 2),
        "total_products": total_products,
        "by_status": by_status,
    }


@vendor_r.get("/orders")
async def vendor_orders(status_filter: Optional[str] = None, limit: int = 200, user=Depends(require_vendor)):
    q = {"vendor_id": user["vendor_id"]}
    if status_filter and status_filter in ORDER_STATES:
        q["status"] = status_filter
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)


@vendor_r.patch("/orders/{oid}")
async def vendor_update_order(oid: str, payload: OrderStatusUpdate, user=Depends(require_vendor)):
    if payload.status not in ORDER_STATES:
        raise HTTPException(400, f"Invalid status. Allowed: {ORDER_STATES}")
    o = await db.orders.find_one({"id": oid, "vendor_id": user["vendor_id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    history = o.get("status_history", []) + [{"status": payload.status, "at": now_iso()}]
    res = await db.orders.find_one_and_update(
        {"id": oid},
        {"$set": {"status": payload.status, "status_history": history, "updated_at": now_iso()}},
        return_document=True,
        projection={"_id": 0},
    )
    return res


@vendor_r.get("/products")
async def vendor_products(user=Depends(require_vendor)):
    return await db.products.find({"vendor_id": user["vendor_id"]}, {"_id": 0}).to_list(2000)


@vendor_r.post("/products")
async def vendor_create_product(payload: ProductCreate, user=Depends(require_vendor)):
    sub = await db.subgroups.find_one({"id": payload.subgroup_id}, {"_id": 0})
    if not sub or sub["category_id"] != payload.category_id:
        raise HTTPException(400, "Invalid category/subgroup")
    new = {"id": str(uuid.uuid4()), "vendor_id": user["vendor_id"], "sort_order": 0, **payload.model_dump()}
    await db.products.insert_one(dict(new))
    return new


@vendor_r.patch("/products/{pid}")
async def vendor_update_product(pid: str, payload: ProductUpdate, user=Depends(require_vendor)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    res = await db.products.find_one_and_update(
        {"id": pid, "vendor_id": user["vendor_id"]}, {"$set": update},
        return_document=True, projection={"_id": 0},
    )
    if not res:
        raise HTTPException(404, "Product not found")
    return res


@vendor_r.delete("/products/{pid}")
async def vendor_delete_product(pid: str, user=Depends(require_vendor)):
    r = await db.products.delete_one({"id": pid, "vendor_id": user["vendor_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"ok": True}


@vendor_r.get("/categories")
async def vendor_categories(user=Depends(require_vendor)):
    return await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)


@vendor_r.get("/subgroups")
async def vendor_subgroups(user=Depends(require_vendor)):
    return await db.subgroups.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)


# Mount routers
api.include_router(master)
api.include_router(vendor_r)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== startup ====================
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.vendors.create_index("slug", unique=True)
    await db.vendors.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index([("vendor_id", 1), ("subgroup_id", 1)])
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("tracking_token", unique=True)
    await db.orders.create_index([("vendor_id", 1), ("created_at", -1)])

    # Seed master admin
    me_email = os.environ["MASTER_ADMIN_EMAIL"].strip().lower()
    me_pw = os.environ["MASTER_ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": me_email})
    if not existing:
        logger.info(f"Seeding master admin {me_email}")
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": me_email,
            "password_hash": hash_pw(me_pw),
            "name": "Master Admin",
            "role": "master_admin",
            "vendor_id": None,
            "created_at": now_iso(),
        })

    # Seed shared categories/subgroups (always — these are platform-wide constants)
    if await db.categories.count_documents({}) == 0:
        await seed_initial_catalog(db)

    # Seed one demo vendor + their products
    if await db.vendors.count_documents({}) == 0:
        logger.info("Seeding demo vendor 'sharma-wines'")
        from seed_data import seed_demo_vendor
        await seed_demo_vendor(db, hash_pw)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
