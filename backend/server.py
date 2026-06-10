"""Gharsip Meal Subscriptions API — FastAPI + MongoDB."""

from __future__ import annotations

import logging
import os
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
from menu import mount_menu, seed_menu
from meal_plans import mount_meal_plans, seed_plans
from subscriptions import mount_subscriptions
from email_otp import mount_email_otp
from users import mount_users
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("gharsip_api")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ.get("DB_NAME", "gharsip_store")
meta_coll_name = os.environ.get("META_COLLECTION", "gharsip_meta")
otp_coll_name = os.environ.get("OTP_COLLECTION", "gharsip_email_otps")
users_coll_name = os.environ.get("USERS_COLLECTION", "gharsip_users")
menu_items_coll_name = os.environ.get("MENU_ITEMS_COLLECTION", "gharsip_menu_items")
combos_coll_name = os.environ.get("COMBOS_COLLECTION", "gharsip_combos")
plans_coll_name = os.environ.get("PLANS_COLLECTION", "gharsip_plans")
subscriptions_coll_name = os.environ.get("SUBSCRIPTIONS_COLLECTION", "gharsip_subscriptions")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
meta_coll = db[meta_coll_name]
otp_coll = db[otp_coll_name]
users_coll = db[users_coll_name]
menu_items_coll = db[menu_items_coll_name]
combos_coll = db[combos_coll_name]
plans_coll = db[plans_coll_name]
subscriptions_coll = db[subscriptions_coll_name]

# -------- rate limiting (sliding window, in-memory per instance) --------
_RATE_BUCKETS: Dict[str, deque] = defaultdict(deque)
_RATE_LOCK = Lock()


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(window_seconds: int, max_calls: int):
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


api = APIRouter(prefix="/api")


@api.get("/")
async def api_root():
    return {
        "app": os.environ.get("PLATFORM_NAME", "Gharsip Meal Subscriptions API"),
        "version": "3.0",
        "collections": {"subscriptions": subscriptions_coll_name, "plans": plans_coll_name, "meta": meta_coll_name},
    }


mount_menu(api, menu_items_coll=menu_items_coll, combos_coll=combos_coll)
mount_meal_plans(api, plans_coll=plans_coll)
mount_subscriptions(
    api,
    subscriptions_coll=subscriptions_coll,
    plans_coll=plans_coll,
    meta_coll=meta_coll,
    rate_limit=rate_limit,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await subscriptions_coll.create_index("id", unique=True)
    await subscriptions_coll.create_index([("createdAt", -1)])
    await subscriptions_coll.create_index("phoneDigits")
    await menu_items_coll.create_index("id", unique=True)
    await combos_coll.create_index("id", unique=True)
    await plans_coll.create_index("id", unique=True)
    await seed_menu(menu_items_coll, combos_coll)
    await seed_plans(plans_coll)
    logger.info(
        "Mongo indexes ready — DB=%s subscriptions=%s plans=%s",
        db_name, subscriptions_coll_name, plans_coll_name,
    )
    yield
    client.close()


app = FastAPI(
    title="Gharsip Meal Subscriptions API",
    version="3.0",
    lifespan=lifespan,
)

mount_email_otp(api, otp_collection=otp_coll)
mount_users(api, users_collection=users_coll)


@api.get("/admin/stats")
async def admin_stats():
    from datetime import date
    today = date.today().isoformat()
    all_subs = await subscriptions_coll.count_documents({})
    active_subs = await subscriptions_coll.count_documents({"status": "active"})
    pending_subs = await subscriptions_coll.count_documents({"status": "pending_confirmation"})
    today_subs = await subscriptions_coll.count_documents({"createdAt": {"$gte": today}})
    return {
        "totalSubscriptions": all_subs,
        "activeSubscriptions": active_subs,
        "pendingSubscriptions": pending_subs,
        "todaySubscriptions": today_subs,
    }


app.include_router(api)

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
