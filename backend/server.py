from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from seed_data import SEED_CATEGORIES, SEED_SUBGROUPS, expanded_seed_products

# ============== Setup ==============
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 12  # 12 hours

LOGIN_LOCKOUT_MAX_FAILS = 5
LOGIN_LOCKOUT_MINUTES = 15

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Hyperlocal Commerce API")
api_router = APIRouter(prefix="/api")


# ============== Helpers ==============
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if not creds or not creds.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
        if user.get("role") != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


# ============== Models ==============
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    tagline: str = ""
    icon: str = ""
    image: str = ""
    min_order: int = 0
    full_pack_only: bool = False
    sort_order: int = 0


class Subgroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    name: str
    sort_order: int = 0


class SubgroupCreate(BaseModel):
    category_id: str
    name: str
    sort_order: int = 0


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    subgroup_id: str
    name: str
    price: float
    image: str = ""
    unit: str = ""
    tag: str = ""
    description: str = ""
    in_stock: bool = True
    sort_order: int = 0


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
    description: Optional[str] = None
    in_stock: Optional[bool] = None


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int
    category_id: str


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_address: str
    notes: str = ""
    items: List[OrderItem]


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    short_id: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    notes: str = ""
    items: List[OrderItem]
    total: float
    status: str = "placed"
    created_at: str


class OrderStatusUpdate(BaseModel):
    status: str


ALLOWED_STATUSES = {"placed", "preparing", "out_for_delivery", "delivered", "cancelled"}


# ============== Public Routes ==============
@api_router.get("/")
async def root():
    return {"message": "Hyperlocal Commerce API", "version": "2.0"}


@api_router.get("/catalog")
async def get_catalog():
    """Public catalog grouped for the storefront UI."""
    categories = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    subgroups = await db.subgroups.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    products = await db.products.find({"in_stock": True}, {"_id": 0}).to_list(2000)

    products_by_sub: Dict[str, List[Dict[str, Any]]] = {}
    for p in products:
        products_by_sub.setdefault(p["subgroup_id"], []).append(p)

    out = []
    for cat in categories:
        cat_subs = [s for s in subgroups if s["category_id"] == cat["id"]]
        out.append({
            **cat,
            "subgroups": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "products": products_by_sub.get(s["id"], []),
                }
                for s in cat_subs
            ],
        })

    # Maintain backward-compat shape: { "categories": [...] }
    return {"categories": out}


@api_router.post("/orders", response_model=Order)
async def place_order(payload: OrderCreate):
    """Customer-facing endpoint: persists the order, then frontend opens wa.me link."""
    if not payload.items:
        raise HTTPException(400, "Cart is empty")

    total = round(sum(i.price * i.qty for i in payload.items), 2)

    # Liquor minimum rule (server-side enforcement)
    liquor_total = sum(i.price * i.qty for i in payload.items if i.category_id == "liquor")
    if liquor_total > 0 and liquor_total < 1000:
        raise HTTPException(400, "Liquor minimum order is ₹1000")

    new_id = str(uuid.uuid4())
    short_id = "LC" + new_id[:6].upper()
    order = {
        "id": new_id,
        "short_id": short_id,
        "customer_name": payload.customer_name.strip(),
        "customer_phone": payload.customer_phone.strip(),
        "delivery_address": payload.delivery_address.strip(),
        "notes": (payload.notes or "").strip(),
        "items": [i.model_dump() for i in payload.items],
        "total": total,
        "status": "placed",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))
    return Order(**order)


# ============== Auth ==============
@api_router.post("/auth/login", response_model=LoginOut)
async def login(payload: LoginIn, request: Request):
    email = payload.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force protection
    rec = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if rec and rec.get("locked_until"):
        locked_until = datetime.fromisoformat(rec["locked_until"])
        if locked_until > now_utc():
            raise HTTPException(429, "Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        # Record failure
        fails = (rec or {}).get("fails", 0) + 1
        update = {"identifier": identifier, "fails": fails, "updated_at": now_iso()}
        if fails >= LOGIN_LOCKOUT_MAX_FAILS:
            update["locked_until"] = (now_utc() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()
            update["fails"] = 0
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(401, "Invalid email or password")

    # Success: clear attempts
    await db.login_attempts.delete_one({"identifier": identifier})

    token = create_access_token(user["id"], user["email"], user.get("role", "admin"))
    safe_user = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return LoginOut(access_token=token, user=safe_user)


@api_router.get("/auth/me")
async def get_me(admin=Depends(get_current_admin)):
    return admin


# ============== Admin: Orders ==============
admin_router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_admin)])


@admin_router.get("/stats")
async def stats():
    today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_orders = await db.orders.find(
        {"created_at": {"$gte": today_start}}, {"_id": 0}
    ).to_list(1000)
    total_orders = await db.orders.count_documents({})
    total_products = await db.products.count_documents({})
    today_revenue = sum(o.get("total", 0) for o in today_orders if o.get("status") != "cancelled")

    by_status: Dict[str, int] = {}
    for s in ALLOWED_STATUSES:
        by_status[s] = await db.orders.count_documents({"status": s})

    return {
        "total_orders": total_orders,
        "today_orders": len(today_orders),
        "today_revenue": round(today_revenue, 2),
        "total_products": total_products,
        "by_status": by_status,
    }


@admin_router.get("/orders", response_model=List[Order])
async def list_orders(status_filter: Optional[str] = None, limit: int = 200):
    q: Dict[str, Any] = {}
    if status_filter and status_filter in ALLOWED_STATUSES:
        q["status"] = status_filter
    orders = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Order(**o) for o in orders]


@admin_router.get("/orders/{oid}", response_model=Order)
async def get_order(oid: str):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return Order(**o)


@admin_router.patch("/orders/{oid}", response_model=Order)
async def update_order_status(oid: str, payload: OrderStatusUpdate):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")
    res = await db.orders.find_one_and_update(
        {"id": oid},
        {"$set": {"status": payload.status, "updated_at": now_iso()}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(404, "Order not found")
    return Order(**res)


# ============== Admin: Products ==============
@admin_router.get("/products", response_model=List[Product])
async def list_products():
    items = await db.products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(2000)
    return [Product(**p) for p in items]


@admin_router.post("/products", response_model=Product)
async def create_product(payload: ProductCreate):
    sub = await db.subgroups.find_one({"id": payload.subgroup_id}, {"_id": 0})
    if not sub:
        raise HTTPException(400, "Invalid subgroup_id")
    if sub["category_id"] != payload.category_id:
        raise HTTPException(400, "subgroup_id does not belong to category_id")
    cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(400, "Invalid category_id")
    new = {"id": str(uuid.uuid4()), "sort_order": 0, **payload.model_dump()}
    await db.products.insert_one(dict(new))
    return Product(**new)


@admin_router.patch("/products/{pid}", response_model=Product)
async def update_product(pid: str, payload: ProductUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    if "subgroup_id" in update or "category_id" in update:
        existing = await db.products.find_one({"id": pid}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "Product not found")
        merged = {**existing, **update}
        sub = await db.subgroups.find_one({"id": merged["subgroup_id"]}, {"_id": 0})
        if not sub or sub["category_id"] != merged["category_id"]:
            raise HTTPException(400, "subgroup/category mismatch")
    res = await db.products.find_one_and_update(
        {"id": pid}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Product not found")
    return Product(**res)


@admin_router.delete("/products/{pid}")
async def delete_product(pid: str):
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"ok": True}


# ============== Admin: Categories & Subgroups ==============
@admin_router.get("/categories", response_model=List[Category])
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return [Category(**c) for c in cats]


@admin_router.get("/subgroups", response_model=List[Subgroup])
async def list_subgroups():
    items = await db.subgroups.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return [Subgroup(**s) for s in items]


@admin_router.post("/subgroups", response_model=Subgroup)
async def create_subgroup(payload: SubgroupCreate):
    cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(400, "Invalid category_id")
    new = {
        "id": payload.name.lower().replace(" ", "-")[:32] + "-" + uuid.uuid4().hex[:4],
        **payload.model_dump(),
    }
    await db.subgroups.insert_one(dict(new))
    return Subgroup(**new)


@admin_router.delete("/subgroups/{sid}")
async def delete_subgroup(sid: str):
    if await db.products.count_documents({"subgroup_id": sid}) > 0:
        raise HTTPException(400, "Subgroup has products. Delete or reassign them first.")
    res = await db.subgroups.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Subgroup not found")
    return {"ok": True}


api_router.include_router(admin_router)
app.include_router(api_router)


# ============== CORS ==============
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Startup: indexes + seed ==============
@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.subgroups.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("created_at")
    await db.login_attempts.create_index("identifier", unique=True)

    # Seed catalog
    if await db.categories.count_documents({}) == 0:
        logger.info("Seeding categories…")
        await db.categories.insert_many([dict(c) for c in SEED_CATEGORIES])
    if await db.subgroups.count_documents({}) == 0:
        logger.info("Seeding subgroups…")
        await db.subgroups.insert_many([dict(s) for s in SEED_SUBGROUPS])
    if await db.products.count_documents({}) == 0:
        logger.info("Seeding products…")
        await db.products.insert_many([dict(p) for p in expanded_seed_products()])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@store.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        logger.info(f"Seeding admin user {admin_email}…")
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Vendor Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        logger.info("Updating admin password from .env…")
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
