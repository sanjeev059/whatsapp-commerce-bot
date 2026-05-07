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
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from xml.sax.saxutils import escape as xml_escape

from seed_data import SEED_CATEGORIES, SEED_SUBGROUPS, expanded_seed_products
import whatsapp_service as wa

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
    payment_mode: str = "Cash on Delivery"
    items: List[OrderItem]


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    short_id: str
    customer_name: str
    customer_phone: str
    delivery_address: str
    notes: str = ""
    payment_mode: str = "Cash on Delivery"
    items: List[OrderItem]
    total: float
    status: str = "placed"
    created_at: str


class OrderStatusUpdate(BaseModel):
    status: str


ALLOWED_STATUSES = {"placed", "preparing", "out_for_delivery", "delivered", "cancelled"}


# ============== WhatsApp Bot Conversation State Machine ==============
def _fmt_inr(p) -> str:
    p = float(p)
    return str(int(p)) if p.is_integer() else f"{p:.2f}"


async def _get_conv(sender: str) -> Dict[str, Any]:
    conv = await db.conversations.find_one({"sender": sender}, {"_id": 0})
    if not conv:
        conv = {
            "sender": sender,
            "state": "start",
            "selected_category_id": None,
            "selected_subgroup_id": None,
            "cart": [],
            "draft_address": None,
            "draft_name": None,
            "updated_at": now_iso(),
        }
        await db.conversations.insert_one(dict(conv))
    return conv


async def _save_conv(conv: Dict[str, Any]) -> None:
    conv["updated_at"] = now_iso()
    payload = {k: v for k, v in conv.items() if k != "_id"}
    await db.conversations.update_one(
        {"sender": conv["sender"]}, {"$set": payload}, upsert=True
    )


def _help_text() -> str:
    return (
        "*Commands:*\n"
        "• *menu* — show categories\n"
        "• *cart* — view cart\n"
        "• *checkout* — place order\n"
        "• *clear* — empty cart\n"
        "• *help* — this help"
    )


async def _build_main_menu(sender: str) -> str:
    cats = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    if not cats:
        return "Welcome! Catalog is empty right now. Try again in a bit."
    vendor_name = os.environ.get("VENDOR_NAME", "Demo Store")
    sf = os.environ.get("STOREFRONT_URL", "").strip()
    lines = [f"👋 *Welcome to {vendor_name}!*", "", "Hungry or thirsty? You're in the right place 🍻🍔"]
    if sf:
        lines += [
            "",
            "🌐 *Tap to browse our full menu:*",
            sf,
            "",
            "_(or order right here in chat — see options below)_",
            "",
        ]
    else:
        lines.append("")
    lines.append("*Categories:*")
    for i, c in enumerate(cats, 1):
        lines.append(f"{i}. {c.get('icon', '')} {c['name']}".strip())
    lines += ["", "_Reply with a number to order via chat._"]
    return "\n".join(lines)


async def _build_subgroup_menu(category_id: str) -> str:
    cat = await db.categories.find_one({"id": category_id}, {"_id": 0})
    subs = (
        await db.subgroups.find({"category_id": category_id}, {"_id": 0})
        .sort("sort_order", 1)
        .to_list(50)
    )
    if not cat or not subs:
        return "Category not found. Type *menu* to start over."
    lines = [f"*{cat.get('icon','')} {cat['name']}*".strip(), ""]
    for i, s in enumerate(subs, 1):
        lines.append(f"{i}. {s['name']}")
    if cat["id"] == "cigarettes":
        lines += ["", "⚠️ _Full Pack Only_"]
    if cat["id"] == "liquor":
        lines += ["", f"_Liquor minimum order ₹{cat.get('min_order', 1000)}_"]
    lines += ["", "_Reply with a number, or *menu* to go back._"]
    return "\n".join(lines)


async def _build_product_list(subgroup_id: str) -> str:
    sub = await db.subgroups.find_one({"id": subgroup_id}, {"_id": 0})
    products = (
        await db.products.find(
            {"subgroup_id": subgroup_id, "in_stock": True}, {"_id": 0}
        )
        .sort("sort_order", 1)
        .to_list(200)
    )
    if not sub:
        return "Subgroup not found. Type *menu* to start over."
    if not products:
        return f"No products in {sub['name']} right now.\nType *menu* to go back."
    lines = [f"*{sub['name']}*", ""]
    for i, p in enumerate(products, 1):
        line = f"{i}. {p['name']} — ₹{_fmt_inr(p['price'])}"
        if p.get("unit"):
            line += f" _({p['unit']})_"
        lines.append(line)
    lines += [
        "",
        "_Reply with the product number to add to cart._",
        "_Type *menu* to go back, *cart* to view cart._",
    ]
    return "\n".join(lines)


def _cart_summary(cart: List[Dict[str, Any]]) -> str:
    if not cart:
        return "Your cart is empty.\n\nType *menu* to start shopping."
    lines = ["🛒 *Your Cart*", ""]
    total = 0.0
    for it in cart:
        line_total = it["price"] * it["qty"]
        total += line_total
        lines.append(f"• {it['name']} x{it['qty']} — ₹{_fmt_inr(line_total)}")
    lines += [
        "",
        f"*Total: ₹{_fmt_inr(total)}*",
        "",
        "Type *checkout* to confirm or *menu* to add more.",
    ]
    return "\n".join(lines)


async def whatsapp_handle(sender: str, body_raw: str) -> str:
    """Drive a per-customer state machine over WhatsApp.

    `sender` is what Twilio passes (e.g. 'whatsapp:+919876543210').
    """
    body = (body_raw or "").strip()
    body_lower = body.lower()
    conv = await _get_conv(sender)

    # Global commands ------------------------------------------------------
    if body_lower in {"hi", "hello", "hey", "menu", "start", "/start", "main"}:
        conv["state"] = "category"
        conv["selected_category_id"] = None
        conv["selected_subgroup_id"] = None
        await _save_conv(conv)
        return await _build_main_menu(sender)

    if body_lower in {"help", "?"}:
        return _help_text()

    if body_lower in {"cart", "view cart"}:
        return _cart_summary(conv.get("cart", []))

    if body_lower in {"clear", "clear cart", "empty", "empty cart"}:
        conv["cart"] = []
        conv["state"] = "start"
        await _save_conv(conv)
        return "Cart cleared. Type *menu* to start over."

    # Begin checkout: collect address ------------------------------------
    if body_lower in {"checkout", "confirm", "place order"} and conv.get("cart"):
        cart_items = conv["cart"]
        liquor_total = sum(
            i["price"] * i["qty"]
            for i in cart_items
            if i.get("category_id") == "liquor"
        )
        if liquor_total > 0 and liquor_total < 1000:
            short = 1000 - liquor_total
            return (
                f"⚠️ Liquor minimum order is ₹1000.\n"
                f"Add ₹{_fmt_inr(short)} more to checkout.\n\n"
                f"Type *menu* to add more."
            )
        conv["state"] = "awaiting_address"
        await _save_conv(conv)
        return "📍 Please share your *delivery address* (flat, building, area)."

    state = conv.get("state", "start")

    # State: collecting address ------------------------------------------
    if state == "awaiting_address":
        if len(body) < 8:
            return "That looks too short. Please share a complete address."
        conv["draft_address"] = body
        conv["state"] = "awaiting_name"
        await _save_conv(conv)
        return "👤 Got it! What's your *name*?"

    # State: collecting name → place order -------------------------------
    if state == "awaiting_name":
        if len(body) < 2:
            return "Please share your name (at least 2 characters)."
        conv["draft_name"] = body
        cart_items = conv.get("cart", [])
        if not cart_items:
            conv["state"] = "start"
            await _save_conv(conv)
            return "Your cart is empty. Type *menu* to start."
        # Place order
        total = round(sum(i["price"] * i["qty"] for i in cart_items), 2)
        new_id = str(uuid.uuid4())
        short_id = "LC" + new_id[:6].upper()
        # Extract clean phone from sender (e.g. 'whatsapp:+919...' -> '+919...')
        phone = sender.split(":", 1)[-1].strip() if ":" in sender else sender
        order = {
            "id": new_id,
            "short_id": short_id,
            "customer_name": conv["draft_name"],
            "customer_phone": phone,
            "delivery_address": conv["draft_address"] or "",
            "notes": "Placed via WhatsApp bot",
            "payment_mode": "Cash on Delivery",
            "items": [
                {
                    "product_id": i["product_id"],
                    "name": i["name"],
                    "price": i["price"],
                    "qty": i["qty"],
                    "category_id": i["category_id"],
                }
                for i in cart_items
            ],
            "total": total,
            "status": "placed",
            "created_at": now_iso(),
        }
        await db.orders.insert_one(dict(order))
        # Notify vendor (customer is the sender — they'll see this reply directly)
        vendor_to = os.environ.get("VENDOR_WHATSAPP_TO", "").strip()
        if vendor_to:
            wa.send(vendor_to, wa.order_placed_to_vendor(order))
        # Reset conversation
        conv["cart"] = []
        conv["state"] = "start"
        conv["draft_address"] = None
        conv["draft_name"] = None
        conv["selected_category_id"] = None
        conv["selected_subgroup_id"] = None
        await _save_conv(conv)
        return (
            f"✅ *Order Placed!*\n\n"
            f"Order ID: *{short_id}*\n"
            f"Total: *₹{_fmt_inr(total)}*\n\n"
            f"We'll deliver soon. Type *menu* to shop more."
        )

    # State: pick category -----------------------------------------------
    if state in {"start", "category"}:
        if body.isdigit():
            idx = int(body) - 1
            cats = (
                await db.categories.find({}, {"_id": 0})
                .sort("sort_order", 1)
                .to_list(50)
            )
            if 0 <= idx < len(cats):
                cat = cats[idx]
                conv["selected_category_id"] = cat["id"]
                # If only one subgroup, jump to products
                subs = (
                    await db.subgroups.find(
                        {"category_id": cat["id"]}, {"_id": 0}
                    )
                    .sort("sort_order", 1)
                    .to_list(50)
                )
                if len(subs) == 1:
                    conv["selected_subgroup_id"] = subs[0]["id"]
                    conv["state"] = "product"
                    await _save_conv(conv)
                    return await _build_product_list(subs[0]["id"])
                conv["state"] = "subgroup"
                await _save_conv(conv)
                return await _build_subgroup_menu(cat["id"])
            return "Invalid option. Reply with a number from the menu, or type *menu*."
        return "Type *hi* or *menu* to begin."

    # State: pick subgroup -----------------------------------------------
    if state == "subgroup":
        if not body.isdigit():
            return "Reply with the *number* of the subgroup, or type *menu*."
        idx = int(body) - 1
        subs = (
            await db.subgroups.find(
                {"category_id": conv["selected_category_id"]}, {"_id": 0}
            )
            .sort("sort_order", 1)
            .to_list(50)
        )
        if not (0 <= idx < len(subs)):
            return "Invalid option. Type *menu* to start over."
        conv["selected_subgroup_id"] = subs[idx]["id"]
        conv["state"] = "product"
        await _save_conv(conv)
        return await _build_product_list(subs[idx]["id"])

    # State: pick product ------------------------------------------------
    if state == "product":
        sub_id = conv.get("selected_subgroup_id")
        products = (
            await db.products.find(
                {"subgroup_id": sub_id, "in_stock": True}, {"_id": 0}
            )
            .sort("sort_order", 1)
            .to_list(200)
        ) if sub_id else []
        chosen = None
        if body.isdigit():
            idx = int(body) - 1
            if 0 <= idx < len(products):
                chosen = products[idx]
        else:
            for p in products:
                if (
                    p["name"].lower() == body_lower
                    or body_lower in p["name"].lower()
                ):
                    chosen = p
                    break
        if not chosen:
            return "Product not found. Reply with the number, or type *menu*."

        cart = conv.get("cart", [])
        existing = next((c for c in cart if c["product_id"] == chosen["id"]), None)
        if existing:
            existing["qty"] += 1
        else:
            cart.append(
                {
                    "product_id": chosen["id"],
                    "name": chosen["name"],
                    "price": chosen["price"],
                    "qty": 1,
                    "category_id": chosen["category_id"],
                    "subgroup_id": chosen["subgroup_id"],
                }
            )
        conv["cart"] = cart
        await _save_conv(conv)
        total = sum(i["price"] * i["qty"] for i in cart)
        return (
            f"✅ Added *{chosen['name']}* 🛒\n"
            f"Cart total: ₹{_fmt_inr(total)}\n\n"
            f"Reply with another product number to add more, "
            f"*cart* to view, *checkout* to place order, or *menu* for categories."
        )

    return "Type *hi* or *menu* to start."


@api_router.post("/webhook")
async def twilio_webhook(request: Request):
    """Twilio Sandbox WhatsApp webhook. Returns TwiML."""
    form = await request.form()
    body = form.get("Body", "")
    sender = form.get("From", "unknown")
    logger.info(f"WhatsApp <- {sender}: {body!r}")
    try:
        reply = await whatsapp_handle(sender, body)
    except Exception as e:
        logger.exception(f"webhook error: {e}")
        reply = "⚠️ Something went wrong. Please type *menu* to start over."
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Message>{xml_escape(reply)}</Message></Response>"
    )
    return Response(content=twiml, media_type="application/xml")




# ============== Public Routes ==============
@api_router.get("/")
async def root():
    return {"message": "Hyperlocal Commerce API", "version": "2.1"}


@api_router.get("/vendor")
async def vendor_info():
    """Public vendor info used by the storefront (UPI/QR, name, WhatsApp)."""
    return {
        "name": os.environ.get("VENDOR_NAME", "Demo Store"),
        "upi_id": os.environ.get("VENDOR_UPI_ID", ""),
        "whatsapp": os.environ.get("VENDOR_WHATSAPP_TO", ""),
    }


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
        "payment_mode": (payload.payment_mode or "Cash on Delivery").strip(),
        "items": [i.model_dump() for i in payload.items],
        "total": total,
        "status": "placed",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))

    # Fire WhatsApp notifications (non-blocking — best effort)
    vendor_to = os.environ.get("VENDOR_WHATSAPP_TO", "").strip()
    if vendor_to:
        wa.send(vendor_to, wa.order_placed_to_vendor(order))
    if order["customer_phone"]:
        wa.send(order["customer_phone"], wa.order_placed_to_customer(order))

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
    # Notify customer of status change (best-effort)
    msg = wa.status_change_to_customer(res, payload.status)
    if msg and res.get("customer_phone"):
        wa.send(res["customer_phone"], msg)
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
    await db.conversations.create_index("sender", unique=True)
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
