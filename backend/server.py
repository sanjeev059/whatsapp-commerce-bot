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
from typing import List, Optional, Dict, Any, Literal

import bcrypt
import jwt
import httpx
import qrcode
import io
from collections import defaultdict, deque
from threading import Lock
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, status
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pywebpush import webpush, WebPushException
import json as json_mod
import asyncio

from seed_data import seed_initial_catalog
from aisensy_notify import notify_order_placed, notify_order_status

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


def _validate_aadhaar_verhoeff(digits: str) -> bool:
    """Verhoeff checksum for 12-digit Aadhaar-style numbers (format check only; not UIDAI e-KYC)."""
    if len(digits) != 12 or not digits.isdigit():
        return False
    multiplication_table = (
        (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
        (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
        (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
        (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
        (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
        (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
        (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
        (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
        (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
        (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
    )
    permutation_table = (
        (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
        (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
        (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
        (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
        (9, 4, 5, 7, 1, 3, 0, 6, 8, 2),
        (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
        (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
        (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
    )
    c = 0
    for i, ch in enumerate(reversed(digits)):
        c = multiplication_table[c][permutation_table[i % 8][int(ch)]]
    return c == 0


_VENDOR_SENSITIVE_KEYS = frozenset({"owner_aadhar"})


def _vendor_for_vendor_admin_response(v: Dict[str, Any]) -> Dict[str, Any]:
    """Never expose owner Aadhaar to the vendor console API."""
    return {k: val for k, val in v.items() if k not in _VENDOR_SENSITIVE_KEYS}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:48] or uuid.uuid4().hex[:8]


# ==================== pricing ====================
def _hhmm_to_minutes(s: Optional[str]) -> Optional[int]:
    if not s or not isinstance(s, str):
        return None
    try:
        hh, mm = s.split(":")
        return (int(hh) % 24) * 60 + (int(mm) % 60)
    except Exception:
        return None


def is_night_active(vendor: Dict[str, Any], at: Optional[datetime] = None) -> bool:
    """Whether the vendor's night-pricing window is currently active."""
    if not vendor.get("night_pricing_enabled"):
        return False
    start = _hhmm_to_minutes(vendor.get("night_start"))
    end = _hhmm_to_minutes(vendor.get("night_end"))
    if start is None or end is None:
        return False
    at = at or datetime.now(timezone.utc)
    # Use IST (UTC+5:30) — vendors are India-local
    ist = at + timedelta(hours=5, minutes=30)
    cur = ist.hour * 60 + ist.minute
    if start == end:
        return False
    if start < end:
        return start <= cur < end
    # spans midnight (e.g. 22:00 → 06:00)
    return cur >= start or cur < end


def effective_price(base_price: float, vendor: Dict[str, Any], category_id: str,
                    night_active: Optional[bool] = None) -> float:
    """Compute the price to charge given vendor pricing rules."""
    if night_active is None:
        night_active = is_night_active(vendor)
    if not night_active:
        return round(float(base_price), 2)
    cats = vendor.get("night_categories") or []
    if cats and category_id not in cats:
        return round(float(base_price), 2)
    mult = float(vendor.get("night_multiplier") or 1.0)
    return round(float(base_price) * mult, 2)


# ==================== push (web-push / VAPID) ====================
VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_PEM = os.environ.get("VAPID_PRIVATE_KEY_PEM", "").replace("\\n", "\n")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@localcommerce.in")


def _send_one_push(sub: Dict[str, Any], payload: Dict[str, Any]) -> Optional[str]:
    """Send one web push. Returns endpoint to delete on 410/404."""
    if not VAPID_PRIVATE_PEM:
        return None
    try:
        webpush(
            subscription_info=sub["subscription"],
            data=json_mod.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_PEM,
            vapid_claims={"sub": VAPID_CONTACT},
            ttl=120,
        )
        return None
    except WebPushException as e:
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code in (404, 410):
            return sub["subscription"].get("endpoint")
        logger.warning("Push failed: %s", e)
        return None
    except Exception as e:
        logger.warning("Push exception: %s", e)
        return None


async def push_to_vendor(vendor_id: str, payload: Dict[str, Any]) -> int:
    """Best-effort fan-out push to all of a vendor's subscriptions."""
    if not VAPID_PRIVATE_PEM:
        return 0
    cur = db.push_subscriptions.find({"vendor_id": vendor_id}, {"_id": 0})
    subs = await cur.to_list(length=200)
    if not subs:
        return 0
    loop = asyncio.get_event_loop()
    sent = 0
    stale_endpoints: List[str] = []
    for s in subs:
        ep = await loop.run_in_executor(None, _send_one_push, s, payload)
        if ep:
            stale_endpoints.append(ep)
        else:
            sent += 1
    if stale_endpoints:
        await db.push_subscriptions.delete_many({"subscription.endpoint": {"$in": stale_endpoints}})
    return sent


# ==================== rate limiter (in-memory, per IP) ====================
_RATE_BUCKETS: Dict[str, deque] = defaultdict(deque)
_RATE_LOCK = Lock()


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(window_seconds: int, max_calls: int):
    """Simple sliding-window in-memory rate limit. Keyed per-IP per-endpoint per-(window,limit)."""
    bucket_id = f"w{window_seconds}m{max_calls}"
    def dep(request: Request):
        key = f"{request.url.path}:{bucket_id}:{_client_ip(request)}"
        now = datetime.now(timezone.utc).timestamp()
        with _RATE_LOCK:
            bucket = _RATE_BUCKETS[key]
            while bucket and now - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= max_calls:
                retry_after = int(window_seconds - (now - bucket[0])) + 1
                raise HTTPException(
                    429,
                    f"Too many requests — try again in {retry_after}s",
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)
        return True
    return dep


# ==================== reverse geocoding (OpenStreetMap Nominatim) ====================
async def reverse_geocode(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    """Best-effort reverse geocode via Nominatim. Returns None on any failure."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 18, "addressdetails": 1},
                headers={"User-Agent": "LocalCommerce/3.0 (+https://localcommerce.in)"},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            return {
                "display_name": data.get("display_name", ""),
                "address": data.get("address") or {},
            }
    except Exception as e:
        logger.warning("reverse geocode failed: %s", e)
        return None


bearer = HTTPBearer(auto_error=False)


async def auth_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    return await _auth_user_from_token(creds.credentials)


async def _auth_user_from_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
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
    # store = merchant sign-in (master accounts rejected); ops = operations sign-in (vendors rejected)
    portal: Optional[Literal["store", "ops"]] = None


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
    license_photo_id: Optional[str] = None
    aadhar_photo_id: Optional[str] = None
    owner_aadhar: Optional[str] = None  # 12-digit UID; checksum validated, not UIDAI e-KYC
    accepts_tos: bool
    tos_signature_name: Optional[str] = None  # vendor types their full legal name as e-signature
    enabled_categories: Optional[List[str]] = None  # subset of platform category ids


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
    enabled_categories: Optional[List[str]] = None
    # Geo / delivery radius
    lat: Optional[float] = None
    lng: Optional[float] = None
    delivery_radius_km: Optional[float] = None  # default 5km on the storefront if unset
    # Day/night dynamic pricing
    night_pricing_enabled: Optional[bool] = None
    night_start: Optional[str] = None      # "22:00" (IST)
    night_end: Optional[str] = None        # "06:00"
    night_multiplier: Optional[float] = None  # e.g. 1.15
    night_categories: Optional[List[str]] = None  # ["liquor", "cigarettes"]


class PaymentRecordIn(BaseModel):
    amount_inr: int
    days_extended: int = 30
    txn_note: str = ""


class OfferCreate(BaseModel):
    code: str  # uppercase, alphanumeric
    title: str
    description: str = ""
    discount_type: str  # "percent" | "flat"
    discount_value: float  # percent (1-100) or flat ₹
    min_order_amount: int = 0
    max_discount_amount: Optional[int] = None  # cap on % discounts
    starts_at: Optional[str] = None  # ISO; null = immediate
    expires_at: Optional[str] = None  # ISO; null = no expiry
    usage_limit_total: Optional[int] = None  # how many times across all customers
    is_active: bool = True


class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[int] = None
    max_discount_amount: Optional[int] = None
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None
    usage_limit_total: Optional[int] = None
    is_active: Optional[bool] = None


class OfferValidateIn(BaseModel):
    code: str
    cart_total: int


class PushSubscriptionIn(BaseModel):
    subscription: Dict[str, Any]  # {endpoint, keys:{p256dh, auth}}
    user_agent: Optional[str] = ""


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
    stock_count: Optional[int] = None  # null = untracked. Number = current stock.


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    subgroup_id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    unit: Optional[str] = None
    tag: Optional[str] = None
    in_stock: Optional[bool] = None
    stock_count: Optional[int] = None


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
    offer_code: Optional[str] = None  # uppercase coupon code
    items: List[OrderItemIn]

    @field_validator("upi_last5")
    @classmethod
    def validate_last5(cls, v, info):
        # If payment_mode is upi, must be exactly 5 digits
        return v


class OrderStatusUpdate(BaseModel):
    status: str
class BulkProductsIn(BaseModel):
    products: List[ProductCreate]
    replace_existing: bool = False  # if true, soft-delete current products first


class PlatformBillingUpdate(BaseModel):
    upi_id: Optional[str] = None
    upi_name: Optional[str] = None
    whatsapp: Optional[str] = None
    monthly_fee_inr: Optional[int] = None
    note_to_vendor: Optional[str] = None


# ==================== public storefront ====================
@api.get("/")
async def root():
    return {"app": os.environ.get("PLATFORM_NAME", "GharSip"), "version": "3.0"}


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

    # Vendor can disable specific categories — if they have not picked any (legacy/null),
    # default to ALL platform categories so existing vendors keep working.
    enabled_cat_ids = v.get("enabled_categories")
    if enabled_cat_ids is None or len(enabled_cat_ids) == 0:
        enabled_cat_ids = [c["id"] for c in cats]

    by_sub: Dict[str, List[Dict[str, Any]]] = {}
    night_active = is_night_active(v)
    for p in products:
        # Apply effective pricing for the customer view.
        cat_id = next((s["category_id"] for s in subs if s["id"] == p["subgroup_id"]), "")
        base = float(p["price"])
        eff = effective_price(base, v, cat_id, night_active)
        p["base_price"] = base
        p["price"] = eff
        p["night_pricing"] = night_active and eff != base
        by_sub.setdefault(p["subgroup_id"], []).append(p)

    cat_payload = []
    for c in cats:
        if c["id"] not in enabled_cat_ids:
            continue
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
        "night_pricing_active": night_active,
        "night_multiplier": float(v.get("night_multiplier") or 1.0),
        "night_categories": v.get("night_categories") or [],
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
        "enabled_categories": v.get("enabled_categories") or [],
        "lat": v.get("lat"),
        "lng": v.get("lng"),
        "delivery_radius_km": float(v.get("delivery_radius_km") or 5.0),
    }


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    import math
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@api.get("/push/vapid-public-key")
async def get_vapid_public_key():
    return {"public_key": VAPID_PUBLIC, "enabled": bool(VAPID_PUBLIC and VAPID_PRIVATE_PEM)}


@api.get(
    "/geocode/reverse",
    dependencies=[Depends(rate_limit(window_seconds=60, max_calls=20))],
)
async def public_reverse_geocode(lat: float, lng: float):
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(400, "Invalid coordinates")
    res = await reverse_geocode(lat, lng)
    if not res:
        raise HTTPException(503, "Address lookup failed — please try again")
    return res


def _public_base_url(request: Request) -> str:
    """
    Resolve the customer-facing base URL for QR codes / manifests.
    Order of preference:
      1. PUBLIC_BASE_URL env var (the recommended way — set this on Render to https://www.gharsip.com).
      2. If request host looks like a backend-only host (onrender / herokuapp / railway / fly.dev /
         emergentagent preview), fall back to GHARSIP_PROD_URL or hardcoded https://www.gharsip.com.
         This protects QRs even when env is forgotten in production.
      3. Otherwise (local dev, custom domain on backend), echo the incoming host.
    """
    explicit = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    if explicit:
        return explicit
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host", "")).lower()
    backend_only_hosts = ("onrender.com", "herokuapp.com", "railway.app", "fly.dev",
                         "preview.emergentagent.com", "preview.emergent.host")
    if any(h in host for h in backend_only_hosts):
        return os.environ.get("GHARSIP_PROD_URL", "https://www.gharsip.com").rstrip("/")
    return f"{proto}://{host}"


@api.get("/storefront/{slug}/qr.png")
async def storefront_qr(slug: str, request: Request, size: int = 512):
    """Public PNG QR code that, when scanned, opens the vendor's storefront."""
    v = await db.vendors.find_one({"slug": slug, "subscription_active": True}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Store not found")
    size = max(180, min(int(size), 1024))

    base = _public_base_url(request)
    target_url = f"{base}/store/{slug}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").resize((size, size))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, must-revalidate",
            "X-Storefront-URL": target_url,
        },
    )


@api.get("/storefront/{slug}/manifest.json")
async def vendor_manifest(slug: str, request: Request):
    """Per-vendor PWA manifest. Customers landing on /store/<slug> point at this so 'Add to Home Screen' opens directly to that vendor."""
    v = await db.vendors.find_one({"slug": slug, "subscription_active": True}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Store not found")
    return {
        "name": v["name"],
        "short_name": v["name"][:12],
        "description": f"Order from {v['name']} — fast delivery.",
        "start_url": f"/store/{slug}",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait",
        "theme_color": "#22d27a",
        "background_color": "#07080b",
        "icons": [
            {"src": "/favicon.ico", "sizes": "64x64 32x32 24x24 16x16", "type": "image/x-icon"}
        ],
    }


# ==================== orders (public POST + tracking GET) ====================
@api.post(
    "/orders",
    dependencies=[
        Depends(rate_limit(window_seconds=60, max_calls=3)),
        Depends(rate_limit(window_seconds=3600, max_calls=12)),
    ],
)
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

    # Delivery radius enforcement (only if vendor has pinned location)
    if v.get("lat") is not None and v.get("lng") is not None:
        if payload.customer_lat is None or payload.customer_lng is None:
            raise HTTPException(
                400,
                "We need your location to confirm we deliver to your address. Please enable location and try again.",
            )
        radius = float(v.get("delivery_radius_km") or 5.0)
        dist = _haversine_km(
            float(v["lat"]), float(v["lng"]),
            float(payload.customer_lat), float(payload.customer_lng),
        )
        if dist > radius:
            raise HTTPException(
                400,
                f"You are {dist:.1f} km away — outside this store's {radius:.0f} km delivery range. We can't deliver here.",
            )

    # UPI verification gate
    if payload.payment_mode == "upi":
        if not payload.upi_last5 or not re.fullmatch(r"\d{5}", payload.upi_last5):
            raise HTTPException(400, "Enter exactly 5 digits of UPI transaction ID")

    # Server-side authoritative pricing: ignore client `price`, look up the product
    # and apply current vendor pricing rules.
    pids = [i.product_id for i in payload.items]
    db_products = {p["id"]: p async for p in db.products.find(
        {"id": {"$in": pids}, "vendor_id": v["id"]}, {"_id": 0}
    )}
    night_active = is_night_active(v)
    canonical_items: List[Dict[str, Any]] = []
    for i in payload.items:
        p = db_products.get(i.product_id)
        if not p or not p.get("in_stock", True):
            raise HTTPException(400, f"'{i.name}' is no longer available")
        eff = effective_price(float(p["price"]), v, p.get("category_id", i.category_id), night_active)
        canonical_items.append({
            "product_id": i.product_id,
            "name": p["name"],
            "price": eff,
            "qty": int(i.qty),
            "category_id": p.get("category_id", i.category_id),
        })

    # Liquor min ₹1000 (server-side enforcement) — based on canonical pricing
    liquor_total = sum(it["price"] * it["qty"] for it in canonical_items if it["category_id"] == "liquor")
    if liquor_total > 0 and liquor_total < 1000:
        raise HTTPException(400, "Liquor minimum order is ₹1000")

    total = round(sum(it["price"] * it["qty"] for it in canonical_items), 2)

    # Optional offer code — re-validated server-side (don't trust client)
    applied_offer = None
    if payload.offer_code:
        code = _normalize_code(payload.offer_code)
        if code:
            offer = await db.offers.find_one(
                {"vendor_id": v["id"], "code": code}, {"_id": 0}
            )
            if not offer:
                raise HTTPException(404, "Coupon code not found")
            _validate_offer_for_use(offer, int(total))
            disc = _compute_discount(offer, int(total))
            total = max(0, round(total - disc, 2))
            applied_offer = {
                "code": offer["code"],
                "title": offer["title"],
                "discount_amount": disc,
                "discount_type": offer["discount_type"],
                "discount_value": offer["discount_value"],
            }
            # Bump usage counter
            await db.offers.update_one({"id": offer["id"]}, {"$inc": {"uses": 1}})

    # Atomic per-vendor sequential counter
    seq_doc = await db.vendors.find_one_and_update(
        {"id": v["id"]}, {"$inc": {"next_order_seq": 1}}, return_document=True
    )
    seq = (seq_doc or {}).get("next_order_seq", 1)
    short_id = f"ORD-{1000 + seq}"

    new_id = str(uuid.uuid4())
    tracking_token = uuid.uuid4().hex[:16]
    delivery_token = uuid.uuid4().hex[:16]
    initial_status = "payment_verification_pending" if payload.payment_mode == "upi" else "accepted"

    order = {
        "id": new_id,
        "short_id": short_id,
        "tracking_token": tracking_token,
        "delivery_token": delivery_token,
        "vendor_id": v["id"],
        "customer_name": payload.customer_name.strip(),
        "customer_phone": payload.customer_phone.strip(),
        "delivery_address": payload.delivery_address.strip(),
        "customer_lat": payload.customer_lat,
        "customer_lng": payload.customer_lng,
        "notes": (payload.notes or "").strip(),
        "payment_mode": payload.payment_mode,
        "upi_last5": payload.upi_last5,
        "items": canonical_items,
        "total": total,
        "applied_offer": applied_offer,
        "night_pricing_applied": night_active and total != round(sum(i.price * i.qty for i in payload.items), 2),
        "status": initial_status,
        "status_history": [{"status": initial_status, "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))

    # Fire push to vendor (best-effort, don't block on failure)
    try:
        await push_to_vendor(v["id"], {
            "type": "new_order",
            "short_id": short_id,
            "total": total,
            "customer": payload.customer_name.strip(),
            "payment_mode": payload.payment_mode,
            "vendor_slug": v["slug"],
        })
    except Exception as e:
        logger.warning("push_to_vendor failed: %s", e)

    # AiSensy WhatsApp — customer + vendor (best-effort)
    try:
        await notify_order_placed(order, v)
    except Exception as e:
        logger.warning("notify_order_placed (AiSensy) failed: %s", e)

    return {"short_id": short_id, "tracking_token": tracking_token, "status": initial_status, "total": total}


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


# ==================== delivery handoff (token-gated, no auth) ====================
@api.get("/delivery/{token}")
async def delivery_get(token: str):
    """Public: delivery boy view of one order. Available only while status==out_for_delivery."""
    o = await db.orders.find_one({"delivery_token": token}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Delivery link invalid")
    v = await db.vendors.find_one({"id": o["vendor_id"]}, {"_id": 0})
    return {
        "short_id": o["short_id"],
        "status": o["status"],
        "is_actionable": o["status"] == "out_for_delivery",
        "items": o["items"],
        "total": o["total"],
        "payment_mode": o["payment_mode"],
        "customer_name": o["customer_name"],
        "customer_phone": o["customer_phone"],
        "delivery_address": o["delivery_address"],
        "customer_lat": o.get("customer_lat"),
        "customer_lng": o.get("customer_lng"),
        "notes": o.get("notes", ""),
        "vendor_name": v["name"] if v else "",
        "delivered_at": o.get("delivered_at"),
        "delivery_proof_image_id": o.get("delivery_proof_image_id"),
    }


@api.post(
    "/delivery/{token}/delivered",
    dependencies=[Depends(rate_limit(window_seconds=60, max_calls=10))],
)
async def delivery_mark_delivered(token: str, file: UploadFile = File(...)):
    """Public: delivery boy marks the order delivered with a proof photo."""
    o = await db.orders.find_one({"delivery_token": token}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Delivery link invalid")
    if o["status"] != "out_for_delivery":
        # Already delivered, cancelled, or never dispatched — link is "one-time" by design.
        raise HTTPException(409, f"Order is already '{o['status']}', not deliverable")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Photo must be JPEG, PNG, WEBP, or GIF")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, f"Photo too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)")
    if not data:
        raise HTTPException(400, "Empty photo")

    image_id = uuid.uuid4().hex
    await db.images.insert_one({
        "id": image_id,
        "vendor_id": o["vendor_id"],
        "content_type": file.content_type,
        "data": data,
        "size": len(data),
        "filename": file.filename,
        "purpose": "delivery_proof",
        "order_id": o["id"],
        "created_at": now_iso(),
    })

    now_ts = now_iso()
    new_history = list(o.get("status_history", [])) + [
        {"status": "delivered", "at": now_ts, "by": "delivery_link"}
    ]
    await db.orders.update_one(
        {"id": o["id"]},
        {"$set": {
            "status": "delivered",
            "status_history": new_history,
            "delivered_at": now_ts,
            "delivery_proof_image_id": image_id,
        }},
    )

    # Notify the vendor (push + log)
    try:
        await push_to_vendor(o["vendor_id"], {
            "type": "delivered",
            "short_id": o["short_id"],
            "total": o["total"],
            "customer": o["customer_name"],
        })
    except Exception as e:
        logger.warning("delivered push failed: %s", e)

    if v:
        try:
            o_after = {**o, "status": "delivered", "status_history": new_history, "delivered_at": now_ts}
            await notify_order_status(o_after, v, "delivered")
        except Exception as e:
            logger.warning("notify_order_status delivered (AiSensy) failed: %s", e)

    return {"ok": True, "status": "delivered", "delivered_at": now_ts, "proof_image_id": image_id}


# ==================== auth ====================
@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    portal = payload.portal
    if portal == "store" and user.get("role") == "master_admin":
        raise HTTPException(401, "Invalid email or password")
    if portal == "ops" and user.get("role") == "vendor_admin":
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user)
    safe = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return {"access_token": token, "token_type": "bearer", "user": safe}


@api.get("/auth/me")
async def me(user=Depends(auth_user)):
    # Minimal vendor embed for white-label admin UI (no extra round-trip from the browser).
    if user.get("role") == "vendor_admin" and user.get("vendor_id"):
        v = await db.vendors.find_one(
            {"id": user["vendor_id"]}, {"_id": 0, "name": 1, "slug": 1}
        )
        if v:
            out = dict(user)
            out["vendor"] = {"name": v.get("name", ""), "slug": v.get("slug", "")}
            return out
    return user


@api.post("/auth/change-password")
async def change_password(payload: PasswordChangeIn, user=Depends(auth_user)):
    if len(payload.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_pw(payload.current_password, full["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_pw(payload.new_password), "password_must_change": False}},
    )
    return {"ok": True}


# ==================== Uploads ====================
MAX_UPLOAD_BYTES = 3 * 1024 * 1024  # 3 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@api.get("/uploads/{file_id}")
async def get_upload(file_id: str):
    """Serve an uploaded image. Onboarding/KYC uploads are not available here — use master route."""
    img = await db.images.find_one({"id": file_id}, {"_id": 0})
    if not img:
        raise HTTPException(404, "Not found")
    if img.get("onboarding"):
        raise HTTPException(404, "Not found")
    return Response(
        content=img["data"],
        media_type=img.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ==================== Master Admin ====================
master = APIRouter(prefix="/master", dependencies=[Depends(require_master)])


async def _assert_master_onboarding_image_id(fid: Optional[str]) -> Optional[str]:
    """Ensure upload exists and is still unassigned (master onboarding bucket)."""
    if fid is None or not str(fid).strip():
        return None
    fid = str(fid).strip()
    img = await db.images.find_one({"id": fid})
    if not img:
        raise HTTPException(400, "Invalid licence or Aadhaar photo upload")
    if img.get("vendor_id") is not None:
        raise HTTPException(400, "That photo is already linked to a vendor")
    return fid


@master.post("/uploads/onboarding")
async def master_onboarding_upload(file: UploadFile = File(...)):
    """Master: optional licence / Aadhaar scans before POST /master/vendors."""
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
        "vendor_id": None,
        "onboarding": True,
        "content_type": file.content_type,
        "data": data,
        "size": len(data),
        "filename": file.filename,
        "created_at": now_iso(),
    })
    return {"id": file_id, "url": f"/api/master/onboarding-uploads/{file_id}", "size": len(data)}


@master.get("/onboarding-uploads/{file_id}")
async def master_get_onboarding_upload(file_id: str):
    """Serve licence/Aadhaar images collected during vendor onboarding (master-only, no-store)."""
    img = await db.images.find_one({"id": file_id, "onboarding": True}, {"_id": 0})
    if not img:
        raise HTTPException(404, "Not found")
    return Response(
        content=img["data"],
        media_type=img.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "private, no-store"},
    )


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
async def create_vendor(payload: VendorCreate, request: Request):
    if not payload.accepts_tos:
        raise HTTPException(400, "Vendor must accept Terms of Service")
    if not (payload.tos_signature_name and payload.tos_signature_name.strip()):
        raise HTTPException(400, "Vendor's typed full legal name is required as e-signature for the Terms of Service")

    lic_id = await _assert_master_onboarding_image_id(payload.license_photo_id)
    aadhar_img_id = await _assert_master_onboarding_image_id(payload.aadhar_photo_id)

    owner_aadhar_clean: Optional[str] = None
    if payload.owner_aadhar is not None and str(payload.owner_aadhar).strip():
        owner_aadhar_clean = re.sub(r"\D", "", str(payload.owner_aadhar).strip())
        if len(owner_aadhar_clean) != 12:
            raise HTTPException(400, "Owner Aadhaar must be exactly 12 digits")
        if not _validate_aadhaar_verhoeff(owner_aadhar_clean):
            raise HTTPException(
                400,
                "Aadhaar number failed checksum — recheck digits. "
                "(Checksum only; this is not UIDAI online verification.)",
            )

    slug = (payload.slug or slugify(payload.name)).lower()
    if await db.vendors.find_one({"slug": slug}):
        raise HTTPException(400, f"Slug '{slug}' already taken")

    vendor_id = str(uuid.uuid4())
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
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
        "enabled_categories": payload.enabled_categories or [],
        "tos_accepted": True,
        "tos_signature_name": payload.tos_signature_name.strip(),
        "tos_accepted_at": now_iso(),
        "tos_accepted_ip": client_ip,
        "next_order_seq": 0,
        "created_at": now_iso(),
    }
    if lic_id:
        vendor["license_photo_id"] = lic_id
    if aadhar_img_id:
        vendor["aadhar_photo_id"] = aadhar_img_id
    if owner_aadhar_clean:
        vendor["owner_aadhar"] = owner_aadhar_clean
        vendor["owner_aadhar_verified_at"] = now_iso()
    await db.vendors.insert_one(dict(vendor))

    for fid in (lic_id, aadhar_img_id):
        if fid:
            await db.images.update_one({"id": fid}, {"$set": {"vendor_id": vendor_id}})

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
        "password_must_change": True,
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


# ==================== Platform billing (master configures, vendor sees) ====================
DEFAULT_PLATFORM_BILLING = {
    "id": "platform_billing",
    "upi_id": "",
    "upi_name": "GharSip",
    "whatsapp": "",
    "monthly_fee_inr": 5000,
    "note_to_vendor": "Pay your monthly subscription to keep your store live. After paying, send the screenshot to the WhatsApp number above and the platform team will activate your store within 30 minutes.",
}


async def _get_platform_billing() -> Dict[str, Any]:
    doc = await db.settings.find_one({"id": "platform_billing"}, {"_id": 0})
    if not doc:
        await db.settings.insert_one(dict(DEFAULT_PLATFORM_BILLING))
        return dict(DEFAULT_PLATFORM_BILLING)
    return doc


@master.get("/billing")
async def master_get_billing(user=Depends(require_master)):
    return await _get_platform_billing()


@master.patch("/billing")
async def master_update_billing(payload: PlatformBillingUpdate, user=Depends(require_master)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    if "monthly_fee_inr" in update:
        update["monthly_fee_inr"] = max(0, int(update["monthly_fee_inr"]))
    await db.settings.update_one(
        {"id": "platform_billing"},
        {"$set": update, "$setOnInsert": {"id": "platform_billing"}},
        upsert=True,
    )
    return await _get_platform_billing()


@api.get("/billing/qr.png")
async def platform_billing_qr(size: int = 512):
    """Public PNG UPI-intent QR for platform subscription payment. Embedded in vendor paywall + master billing page."""
    cfg = await _get_platform_billing()
    upi_id = (cfg.get("upi_id") or "").strip()
    if not upi_id:
        raise HTTPException(404, "Platform UPI not configured")
    upi_name = (cfg.get("upi_name") or "GharSip").strip()
    fee = int(cfg.get("monthly_fee_inr") or 0)
    size = max(180, min(int(size), 1024))
    # UPI deep-link spec: upi://pay?pa=<upi>&pn=<name>&am=<amount>&cu=INR&tn=<note>
    from urllib.parse import quote
    note = quote("GharSip subscription")
    upi_url = f"upi://pay?pa={quote(upi_id)}&pn={quote(upi_name)}&am={fee}&cu=INR&tn={note}"
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").resize((size, size))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


# ==================== Payments audit log (master) ====================
@master.post("/vendors/{vid}/payments")
async def master_record_payment(vid: str, payload: PaymentRecordIn, user=Depends(require_master)):
    """Marks a vendor as paid for N days; auto-extends subscription_expires_at; logs audit row."""
    v = await db.vendors.find_one({"id": vid}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Vendor not found")
    days = max(1, min(int(payload.days_extended), 365))

    # Compute new expiry: from later of (current expiry, today)
    now = datetime.now(timezone.utc)
    cur_iso = v.get("subscription_expires_at")
    base_dt = now
    if cur_iso:
        try:
            cur_dt = datetime.fromisoformat(str(cur_iso).replace("Z", "+00:00"))
            if cur_dt.tzinfo is None:
                cur_dt = cur_dt.replace(tzinfo=timezone.utc)
            if cur_dt > now:
                base_dt = cur_dt
        except Exception:
            pass
    new_expiry = base_dt + timedelta(days=days)
    new_expiry_iso = new_expiry.isoformat()

    # Persist update + audit row atomically (best-effort; not a real transaction)
    await db.vendors.update_one(
        {"id": vid},
        {"$set": {"subscription_active": True, "subscription_expires_at": new_expiry_iso}},
    )
    log_id = str(uuid.uuid4())
    log = {
        "id": log_id,
        "vendor_id": vid,
        "vendor_name": v["name"],
        "amount_inr": max(0, int(payload.amount_inr)),
        "days_extended": days,
        "txn_note": (payload.txn_note or "").strip(),
        "recorded_by": user.get("email", "master"),
        "recorded_at": now_iso(),
        "new_expiry_at": new_expiry_iso,
    }
    await db.payments.insert_one(dict(log))
    return {"payment": log, "new_expiry_at": new_expiry_iso}


@master.get("/payments")
async def master_list_payments(vendor_id: Optional[str] = None, limit: int = 200, user=Depends(require_master)):
    q = {"vendor_id": vendor_id} if vendor_id else {}
    rows = await db.payments.find(q, {"_id": 0}).sort("recorded_at", -1).to_list(limit)
    return rows


# ==================== Offers / Discounts ====================
def _normalize_code(c: str) -> str:
    return "".join(ch for ch in (c or "").upper() if ch.isalnum())


def _validate_offer_payload(p: Dict[str, Any]) -> None:
    dt = p.get("discount_type")
    if dt not in ("percent", "flat"):
        raise HTTPException(400, "discount_type must be 'percent' or 'flat'")
    dv = float(p.get("discount_value") or 0)
    if dt == "percent" and not (0 < dv <= 100):
        raise HTTPException(400, "Percent discount must be between 0 and 100")
    if dt == "flat" and dv <= 0:
        raise HTTPException(400, "Flat discount must be > 0")


async def _create_offer(vendor_id: str, payload: OfferCreate, created_by: str) -> Dict[str, Any]:
    code = _normalize_code(payload.code)
    if not code:
        raise HTTPException(400, "Code must be alphanumeric")
    existing = await db.offers.find_one({"vendor_id": vendor_id, "code": code}, {"_id": 0})
    if existing:
        raise HTTPException(400, f"Code '{code}' already exists for this vendor")
    body = payload.model_dump()
    body["code"] = code
    _validate_offer_payload(body)
    offer = {
        "id": str(uuid.uuid4()),
        "vendor_id": vendor_id,
        "code": code,
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "discount_type": payload.discount_type,
        "discount_value": float(payload.discount_value),
        "min_order_amount": int(payload.min_order_amount or 0),
        "max_discount_amount": int(payload.max_discount_amount) if payload.max_discount_amount is not None else None,
        "starts_at": payload.starts_at,
        "expires_at": payload.expires_at,
        "usage_limit_total": int(payload.usage_limit_total) if payload.usage_limit_total else None,
        "uses": 0,
        "is_active": bool(payload.is_active),
        "created_by": created_by,
        "created_at": now_iso(),
    }
    await db.offers.insert_one(dict(offer))
    return offer


def _compute_discount(offer: Dict[str, Any], cart_total: int) -> int:
    if offer["discount_type"] == "percent":
        d = int(round(cart_total * offer["discount_value"] / 100))
    else:
        d = int(offer["discount_value"])
    cap = offer.get("max_discount_amount")
    if cap is not None:
        d = min(d, int(cap))
    return max(0, min(d, cart_total))


def _validate_offer_for_use(offer: Dict[str, Any], cart_total: int) -> None:
    if not offer.get("is_active", True):
        raise HTTPException(400, "Offer is no longer active")
    now = datetime.now(timezone.utc)
    starts_at = offer.get("starts_at")
    expires_at = offer.get("expires_at")
    if starts_at:
        try:
            sdt = datetime.fromisoformat(str(starts_at).replace("Z", "+00:00"))
            if sdt.tzinfo is None:
                sdt = sdt.replace(tzinfo=timezone.utc)
            if sdt > now:
                raise HTTPException(400, "Offer is not active yet")
        except ValueError:
            pass
    if expires_at:
        try:
            edt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if edt.tzinfo is None:
                edt = edt.replace(tzinfo=timezone.utc)
            if edt < now:
                raise HTTPException(400, "Offer has expired")
        except ValueError:
            pass
    if offer.get("min_order_amount") and cart_total < int(offer["min_order_amount"]):
        raise HTTPException(400, f"Minimum order ₹{offer['min_order_amount']} required for this code")
    if offer.get("usage_limit_total") and offer.get("uses", 0) >= int(offer["usage_limit_total"]):
        raise HTTPException(400, "Offer usage limit reached")


@api.post("/storefront/{slug}/offers/validate")
async def storefront_validate_offer(slug: str, payload: OfferValidateIn):
    """Customer types coupon code on Cart/Checkout — server validates and returns the discount preview."""
    v = await db.vendors.find_one({"slug": slug, "subscription_active": True}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Store not found")
    code = _normalize_code(payload.code)
    if not code:
        raise HTTPException(400, "Enter a coupon code")
    offer = await db.offers.find_one(
        {"vendor_id": v["id"], "code": code}, {"_id": 0}
    )
    if not offer:
        raise HTTPException(404, "Coupon code not found")
    cart_total = max(0, int(payload.cart_total))
    _validate_offer_for_use(offer, cart_total)
    discount = _compute_discount(offer, cart_total)
    return {
        "code": offer["code"],
        "title": offer["title"],
        "discount_amount": discount,
        "new_total": cart_total - discount,
        "discount_type": offer["discount_type"],
        "discount_value": offer["discount_value"],
    }


# ==================== Vendor Admin ====================
vendor_r = APIRouter(prefix="/vendor", dependencies=[Depends(require_vendor)])


@vendor_r.get("/me")
async def vendor_me(user=Depends(require_vendor)):
    return _vendor_for_vendor_admin_response(user["vendor"])


@vendor_r.get("/billing")
async def vendor_billing(user=Depends(require_vendor)):
    """Vendor sees the platform's UPI/QR + their own subscription status (active flag, expiry date, days remaining)."""
    cfg = await _get_platform_billing()
    v = user["vendor"]
    expires_at = v.get("subscription_expires_at")
    days_remaining = None
    is_expired = False
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            delta = exp_dt - datetime.now(timezone.utc)
            days_remaining = int(delta.total_seconds() // 86400)
            is_expired = delta.total_seconds() < 0
        except Exception:
            pass
    return {
        "platform": {
            "upi_id": cfg.get("upi_id") or "",
            "upi_name": cfg.get("upi_name") or "GharSip",
            "whatsapp": cfg.get("whatsapp") or "",
            "monthly_fee_inr": int(cfg.get("monthly_fee_inr") or 0),
            "note_to_vendor": cfg.get("note_to_vendor") or "",
            "qr_available": bool((cfg.get("upi_id") or "").strip()),
        },
        "subscription": {
            "active": bool(v.get("subscription_active", True)),
            "expires_at": expires_at,
            "days_remaining": days_remaining,
            "is_expired": is_expired,
        },
    }


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
    if not res:
        raise HTTPException(404, "Vendor not found")
    return _vendor_for_vendor_admin_response(res)


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


@vendor_r.get("/analytics")
async def vendor_analytics(days: int = 30, user=Depends(require_vendor)):
    """Peak hours, day-of-week distribution, night-pricing uplift, top products."""
    days = max(1, min(int(days), 90))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cur = db.orders.find(
        {"vendor_id": user["vendor_id"], "created_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0},
    )
    orders = await cur.to_list(5000)

    # Only count fulfilled / in-progress orders for revenue (exclude rejected/cancelled)
    PAID_STATES = {"payment_verified", "accepted", "out_for_delivery", "delivered"}

    hourly = [{"hour": h, "revenue": 0.0, "orders": 0} for h in range(24)]
    dow = [{"day": d, "revenue": 0.0, "orders": 0} for d in range(7)]  # 0=Mon
    cat_rev: Dict[str, float] = {}
    product_rev: Dict[str, Dict[str, Any]] = {}
    night_revenue = 0.0
    base_revenue_when_night = 0.0
    total_orders = 0
    paid_orders = 0
    paid_revenue = 0.0

    vendor = user["vendor"]
    base_prices: Dict[str, float] = {}
    if any(o.get("night_pricing_applied") for o in orders):
        # cache product base prices for uplift calc
        prods = await db.products.find(
            {"vendor_id": user["vendor_id"]}, {"_id": 0, "id": 1, "price": 1}
        ).to_list(5000)
        base_prices = {p["id"]: float(p["price"]) for p in prods}

    for o in orders:
        total_orders += 1
        try:
            ts = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            ist = ts + timedelta(hours=5, minutes=30)
        except Exception:
            continue
        h = ist.hour
        d = ist.weekday()
        rev = float(o.get("total", 0))
        is_paid = o.get("status") in PAID_STATES
        hourly[h]["orders"] += 1
        dow[d]["orders"] += 1
        if is_paid:
            paid_orders += 1
            paid_revenue += rev
            hourly[h]["revenue"] += rev
            dow[d]["revenue"] += rev
            for it in o.get("items", []):
                line = float(it.get("price", 0)) * int(it.get("qty", 0))
                cat = it.get("category_id", "other")
                cat_rev[cat] = cat_rev.get(cat, 0) + line
                pid = it.get("product_id", "")
                pname = it.get("name", "Unknown")
                if pid not in product_rev:
                    product_rev[pid] = {"id": pid, "name": pname, "qty": 0, "revenue": 0.0}
                product_rev[pid]["qty"] += int(it.get("qty", 0))
                product_rev[pid]["revenue"] += line
            if o.get("night_pricing_applied"):
                night_revenue += rev
                # estimate uplift = (effective − base) summed
                applied_cats = vendor.get("night_categories") or []
                mult = float(vendor.get("night_multiplier") or 1.0)
                if mult > 0:
                    for it in o.get("items", []):
                        if applied_cats and it.get("category_id") not in applied_cats:
                            continue
                        base = base_prices.get(it.get("product_id"), float(it.get("price", 0)) / mult)
                        base_revenue_when_night += base * int(it.get("qty", 0))

    top_products = sorted(product_rev.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    # peak hour = highest revenue hour with at least 1 order
    peak_hour = max(hourly, key=lambda x: (x["revenue"], x["orders"]))
    peak_dow_idx = max(range(7), key=lambda i: dow[i]["revenue"])

    night_uplift_amount = round(night_revenue - base_revenue_when_night, 2)
    night_uplift_pct = (
        round((night_revenue / base_revenue_when_night - 1) * 100, 1)
        if base_revenue_when_night > 0 else 0.0
    )

    DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return {
        "window_days": days,
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "paid_revenue": round(paid_revenue, 2),
        "avg_order_value": round(paid_revenue / paid_orders, 2) if paid_orders else 0.0,
        "hourly": hourly,
        "day_of_week": [{**dow[i], "day": DAY_NAMES[i]} for i in range(7)],
        "peak_hour": peak_hour["hour"] if peak_hour["orders"] > 0 else None,
        "peak_day": DAY_NAMES[peak_dow_idx] if dow[peak_dow_idx]["orders"] > 0 else None,
        "category_revenue": [{"category": k, "revenue": round(v, 2)} for k, v in
                             sorted(cat_rev.items(), key=lambda x: -x[1])],
        "top_products": [
            {**p, "revenue": round(p["revenue"], 2)} for p in top_products
        ],
        "night_revenue": round(night_revenue, 2),
        "night_base_revenue": round(base_revenue_when_night, 2),
        "night_uplift_amount": night_uplift_amount,
        "night_uplift_pct": night_uplift_pct,
        "night_pricing_enabled": bool(vendor.get("night_pricing_enabled")),
    }


@vendor_r.patch("/orders/{oid}")
async def vendor_update_order(oid: str, payload: OrderStatusUpdate, user=Depends(require_vendor)):
    if payload.status not in ORDER_STATES:
        raise HTTPException(400, f"Invalid status. Allowed: {ORDER_STATES}")
    o = await db.orders.find_one({"id": oid, "vendor_id": user["vendor_id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    prev_status = o.get("status")
    history = o.get("status_history", []) + [{"status": payload.status, "at": now_iso()}]
    res = await db.orders.find_one_and_update(
        {"id": oid},
        {"$set": {"status": payload.status, "status_history": history, "updated_at": now_iso()}},
        return_document=True,
        projection={"_id": 0},
    )
    if res and payload.status != prev_status:
        try:
            await notify_order_status(res, user["vendor"], payload.status)
        except Exception as e:
            logger.warning("notify_order_status (AiSensy) failed: %s", e)
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


# ==================== Vendor offers ====================
@vendor_r.get("/offers")
async def vendor_list_offers(user=Depends(require_vendor)):
    return await db.offers.find(
        {"vendor_id": user["vendor_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@vendor_r.post("/offers")
async def vendor_create_offer(payload: OfferCreate, user=Depends(require_vendor)):
    return await _create_offer(user["vendor_id"], payload, created_by="vendor")


@vendor_r.patch("/offers/{oid}")
async def vendor_update_offer(oid: str, payload: OfferUpdate, user=Depends(require_vendor)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    if "discount_type" in update or "discount_value" in update:
        # We need a merged view to validate
        cur = await db.offers.find_one({"id": oid, "vendor_id": user["vendor_id"]}, {"_id": 0})
        if not cur:
            raise HTTPException(404, "Offer not found")
        merged = {**cur, **update}
        _validate_offer_payload(merged)
    res = await db.offers.find_one_and_update(
        {"id": oid, "vendor_id": user["vendor_id"]},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(404, "Offer not found")
    return res


@vendor_r.delete("/offers/{oid}")
async def vendor_delete_offer(oid: str, user=Depends(require_vendor)):
    r = await db.offers.delete_one({"id": oid, "vendor_id": user["vendor_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Offer not found")
    return {"ok": True}


# ==================== Master offers (manage any vendor) ====================
@master.get("/offers")
async def master_list_offers(vendor_id: Optional[str] = None, user=Depends(require_master)):
    q = {"vendor_id": vendor_id} if vendor_id else {}
    rows = await db.offers.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not vendor_id:
        # join vendor names for the all-offers view
        vmap = {v["id"]: v["name"] for v in await db.vendors.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)}
        for r in rows:
            r["vendor_name"] = vmap.get(r["vendor_id"], "—")
    return rows


@master.post("/vendors/{vid}/offers")
async def master_create_offer(vid: str, payload: OfferCreate, user=Depends(require_master)):
    if not await db.vendors.find_one({"id": vid}, {"_id": 1}):
        raise HTTPException(404, "Vendor not found")
    return await _create_offer(vid, payload, created_by=f"master:{user.get('email')}")


@master.patch("/offers/{oid}")
async def master_update_offer(oid: str, payload: OfferUpdate, user=Depends(require_master)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    if "discount_type" in update or "discount_value" in update:
        cur = await db.offers.find_one({"id": oid}, {"_id": 0})
        if not cur:
            raise HTTPException(404, "Offer not found")
        _validate_offer_payload({**cur, **update})
    res = await db.offers.find_one_and_update(
        {"id": oid}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not res:
        raise HTTPException(404, "Offer not found")
    return res


@master.delete("/offers/{oid}")
async def master_delete_offer(oid: str, user=Depends(require_master)):
    r = await db.offers.delete_one({"id": oid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Offer not found")
    return {"ok": True}


@vendor_r.get("/categories")
async def vendor_categories(user=Depends(require_vendor)):
    return await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)


@vendor_r.get("/subgroups")
async def vendor_subgroups(user=Depends(require_vendor)):
    return await db.subgroups.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)


# ==================== bulk products ====================
@vendor_r.post("/products/bulk")
async def vendor_bulk_products(payload: BulkProductsIn, user=Depends(require_vendor)):
    """Bulk-import products. Each row is a ProductCreate; invalid rows are skipped and reported."""
    if len(payload.products) > 1000:
        raise HTTPException(400, "Too many products in one request (max 1000)")
    valid_subs = {
        s["id"]: s["category_id"]
        for s in await db.subgroups.find({}, {"_id": 0}).to_list(200)
    }
    if payload.replace_existing:
        await db.products.delete_many({"vendor_id": user["vendor_id"]})

    created: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for idx, p in enumerate(payload.products):
        if p.subgroup_id not in valid_subs or valid_subs[p.subgroup_id] != p.category_id:
            errors.append({"row": idx + 1, "name": p.name, "error": "Invalid category/subgroup"})
            continue
        if not p.name or float(p.price) <= 0:
            errors.append({"row": idx + 1, "name": p.name, "error": "Name + positive price required"})
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "vendor_id": user["vendor_id"],
            "sort_order": 0,
            **p.model_dump(),
        }
        created.append(doc)
    if created:
        await db.products.insert_many([dict(d) for d in created])
    return {"created": len(created), "errors": errors, "replace_existing": payload.replace_existing}


# ==================== push subscriptions ====================
@vendor_r.post("/push/subscribe")
async def push_subscribe(payload: PushSubscriptionIn, user=Depends(require_vendor)):
    sub_obj = payload.subscription or {}
    endpoint = sub_obj.get("endpoint")
    keys = sub_obj.get("keys") or {}
    if not endpoint or not isinstance(endpoint, str):
        raise HTTPException(400, "Missing endpoint in subscription")
    if not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(400, "Subscription missing required keys (p256dh / auth)")
    doc = {
        "id": str(uuid.uuid4()),
        "vendor_id": user["vendor_id"],
        "user_id": user["id"],
        "subscription": payload.subscription,
        "user_agent": payload.user_agent or "",
        "created_at": now_iso(),
    }
    # Upsert by endpoint to avoid duplicates per device
    await db.push_subscriptions.update_one(
        {"subscription.endpoint": endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@vendor_r.post("/push/unsubscribe")
async def push_unsubscribe(payload: PushSubscriptionIn, user=Depends(require_vendor)):
    endpoint = (payload.subscription or {}).get("endpoint")
    if not endpoint:
        return {"ok": True}
    await db.push_subscriptions.delete_many({"subscription.endpoint": endpoint})
    return {"ok": True}


@vendor_r.post("/push/test")
async def push_test(user=Depends(require_vendor)):
    """Send a test push to all of this vendor's subscriptions."""
    sent = await push_to_vendor(user["vendor_id"], {
        "type": "test",
        "short_id": "TEST",
        "total": 0,
        "customer": os.environ.get("PLATFORM_NAME", "GharSip"),
    })
    return {"sent": sent}


# Mount routers
api.include_router(master)
api.include_router(vendor_r)
app.include_router(api)

# CORS — allow_origins="*" + allow_credentials=True is rejected by browsers, so:
#   - in dev (CORS_ORIGINS unset): allow all origins, no credentials
#   - in prod (CORS_ORIGINS="https://yourdomain.com,..."): tight whitelist + credentials
_cors_env = os.environ.get("CORS_ORIGINS", "").strip()
if _cors_env:
    _origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS locked to: %s", _origins)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=False,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS open to all origins (set CORS_ORIGINS in prod)")


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
    await db.orders.create_index("delivery_token")
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
            "password_must_change": True,
            "created_at": now_iso(),
        })

    # Backfill: any pre-existing seeded user without the password_must_change field
    # gets it set to True so the launch banner shows until they rotate.
    # One-time migration — guarded by a record in db.migrations so a master who
    # deliberately resets their password back to the default isn't auto-flagged.
    MIGRATION_ID = "20250508_password_must_change_backfill"
    already_run = await db.migrations.find_one({"id": MIGRATION_ID})
    if not already_run:
        result = await db.users.update_many(
            {
                "password_must_change": {"$exists": False},
                "email": {"$in": [me_email, "sharma-wines@vendor.local"]},
            },
            {"$set": {"password_must_change": True}},
        )
        await db.migrations.insert_one({
            "id": MIGRATION_ID,
            "matched": result.matched_count,
            "modified": result.modified_count,
            "ran_at": now_iso(),
        })
        logger.info(
            "Migration %s: matched=%d modified=%d",
            MIGRATION_ID, result.matched_count, result.modified_count,
        )

    # Backfill delivery_token on any pre-existing orders that don't have one,
    # so legacy orders can also be handed off via the public delivery link.
    DELIVERY_MIGRATION = "20250509_delivery_token_backfill"
    if not await db.migrations.find_one({"id": DELIVERY_MIGRATION}):
        legacy = db.orders.find({"delivery_token": {"$exists": False}}, {"id": 1, "_id": 0})
        count = 0
        async for o in legacy:
            await db.orders.update_one(
                {"id": o["id"]},
                {"$set": {"delivery_token": uuid.uuid4().hex[:16]}},
            )
            count += 1
        await db.migrations.insert_one({
            "id": DELIVERY_MIGRATION,
            "modified": count,
            "ran_at": now_iso(),
        })
        logger.info("Migration %s: modified=%d orders", DELIVERY_MIGRATION, count)

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
