"""Gharsip Custom Prints API — FastAPI + MongoDB (orders only)."""

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
from bookings import mount_bookings
from orders import mount_orders
from email_otp import mount_email_otp
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("gharsip_api")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ.get("DB_NAME", "gharsip_store")
orders_coll_name = os.environ.get("ORDERS_COLLECTION", "gharsip_orders")
bookings_coll_name = os.environ.get("BOOKINGS_COLLECTION", "gharsip_bookings")
meta_coll_name = os.environ.get("META_COLLECTION", "gharsip_meta")
otp_coll_name = os.environ.get("OTP_COLLECTION", "gharsip_email_otps")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
orders_coll = db[orders_coll_name]
bookings_coll = db[bookings_coll_name]
meta_coll = db[meta_coll_name]
otp_coll = db[otp_coll_name]

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
        "app": os.environ.get("PLATFORM_NAME", "Gharsip Custom Prints API"),
        "version": "2.0",
        "collections": {"orders": orders_coll_name, "meta": meta_coll_name},
    }


mount_orders(api, orders_coll=orders_coll, meta_coll=meta_coll, rate_limit=rate_limit)
mount_bookings(api, bookings_coll=bookings_coll, meta_coll=meta_coll, rate_limit=rate_limit)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await orders_coll.create_index("id", unique=True)
    await orders_coll.create_index([("createdAt", -1)])
    await bookings_coll.create_index("id", unique=True)
    await bookings_coll.create_index([("createdAt", -1)])
    logger.info("Mongo indexes ready — DB=%s orders=%s bookings=%s", db_name, orders_coll_name, bookings_coll_name)
    yield
    client.close()


app = FastAPI(
    title="Gharsip Custom Prints API",
    version="2.0",
    lifespan=lifespan,
)

app.include_router(api)
mount_email_otp(app, otp_collection=otp_coll)

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
