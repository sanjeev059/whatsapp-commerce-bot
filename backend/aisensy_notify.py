"""
Best-effort WhatsApp notifications via AiSensy API Campaigns.

Dashboard / keys: https://www.app.aisensy.com (project → Developer / API key)

Tutorial: https://aisensy.com/tutorials/api-reference-docs
Default POST URL: https://backend.aisensy.com/campaign/t1/api/v2

Per campaign, create an approved WhatsApp template whose {{n}} placeholders match the
length and order of templateParams below, then create a **live API Campaign** with that
template and use its **campaign name** in the env var.

Template parameter order:
  AISENSY_CAMPAIGN_CUSTOMER_NEW_ORDER (5 vars):
    1 order short id (e.g. ORD-1001)
    2 store name
    3 order total
    4 status label (humanized, e.g. "payment verification pending")
    5 tracking page URL (or "-" if PUBLIC_BASE_URL unset)
  AISENSY_CAMPAIGN_VENDOR_NEW_ORDER (6 vars):
    1 order short id
    2 customer name
    3 customer phone
    4 total
    5 payment_mode
    6 vendor storefront slug
  AISENSY_CAMPAIGN_ORDER_STATUS (4 vars), same for AISENSY_CAMPAIGN_VENDOR_ORDER_STATUS:
    1 order short id
    2 store name
    3 new status label
    4 tracking URL or "-"

Env:
  AISENSY_API_KEY           — required to send anything
  AISENSY_API_URL           — optional override
  PUBLIC_BASE_URL or GHARSIP_PROD_URL — for /track/{token} links in messages
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("server")

DEFAULT_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2"


def configured() -> bool:
    return bool(os.environ.get("AISENSY_API_KEY", "").strip())


def normalize_destination(phone: str) -> Optional[str]:
    """AiSensy expects destination like +9198xxxxxxx."""
    raw = (phone or "").strip()
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if len(digits) == 10:
        return "+91" + digits
    if digits.startswith("91") and len(digits) == 12:
        return "+" + digits
    if raw.startswith("+"):
        return "+" + digits
    return "+" + digits


def _public_base() -> str:
    b = os.environ.get("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if b:
        return b
    return os.environ.get("GHARSIP_PROD_URL", "").strip().rstrip("/")


def _status_label(status: str) -> str:
    return (status or "").replace("_", " ").strip() or status


async def send_campaign(
    *,
    campaign_name: str,
    destination: str,
    user_name: str,
    template_params: List[str],
) -> bool:
    api_key = os.environ.get("AISENSY_API_KEY", "").strip()
    if not api_key or not campaign_name or not destination:
        return False
    url = os.environ.get("AISENSY_API_URL", DEFAULT_API_URL).strip()
    body: Dict[str, Any] = {
        "apiKey": api_key,
        "campaignName": campaign_name,
        "destination": destination,
        "userName": (user_name or "Customer")[:80],
        "templateParams": [str(p) for p in template_params],
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, json=body)
            if r.status_code >= 300:
                logger.warning("AiSensy campaign %s HTTP %s: %s", campaign_name, r.status_code, (r.text or "")[:800])
                return False
            return True
    except Exception as e:
        logger.warning("AiSensy campaign %s failed: %s", campaign_name, e)
        return False


async def notify_order_placed(order: Dict[str, Any], vendor: Dict[str, Any]) -> None:
    """Customer + vendor alerts when a new order is persisted."""
    if not configured():
        return
    base = _public_base()
    track = f"{base}/track/{order.get('tracking_token', '')}" if base else ""

    cust_campaign = os.environ.get("AISENSY_CAMPAIGN_CUSTOMER_NEW_ORDER", "").strip()
    dest_c = normalize_destination(order.get("customer_phone", ""))
    if cust_campaign and dest_c:
        await send_campaign(
            campaign_name=cust_campaign,
            destination=dest_c,
            user_name=str(order.get("customer_name", "Customer")),
            template_params=[
                order.get("short_id", ""),
                vendor.get("name", "Store"),
                str(order.get("total", "")),
                _status_label(str(order.get("status", ""))),
                track or "-",
            ],
        )

    vend_campaign = os.environ.get("AISENSY_CAMPAIGN_VENDOR_NEW_ORDER", "").strip()
    dest_v = normalize_destination(vendor.get("owner_phone", ""))
    if vend_campaign and dest_v:
        await send_campaign(
            campaign_name=vend_campaign,
            destination=dest_v,
            user_name=str(vendor.get("owner_name", vendor.get("name", "Vendor"))),
            template_params=[
                order.get("short_id", ""),
                str(order.get("customer_name", "")),
                str(order.get("customer_phone", "")),
                str(order.get("total", "")),
                str(order.get("payment_mode", "")),
                vendor.get("slug", ""),
            ],
        )


async def notify_order_status(order: Dict[str, Any], vendor: Dict[str, Any], new_status: str) -> None:
    """Customer alert when vendor changes order status; optional vendor (store owner) copy."""
    if not configured():
        return
    campaign = os.environ.get("AISENSY_CAMPAIGN_ORDER_STATUS", "").strip()
    dest = normalize_destination(order.get("customer_phone", ""))
    base = _public_base()
    track = f"{base}/track/{order.get('tracking_token', '')}" if base else ""
    params_shared = [
        order.get("short_id", ""),
        vendor.get("name", "Store"),
        _status_label(new_status),
        track or "-",
    ]
    if campaign and dest:
        await send_campaign(
            campaign_name=campaign,
            destination=dest,
            user_name=str(order.get("customer_name", "Customer")),
            template_params=params_shared,
        )

    vcamp = os.environ.get("AISENSY_CAMPAIGN_VENDOR_ORDER_STATUS", "").strip()
    vdest = normalize_destination(vendor.get("owner_phone", ""))
    if vcamp and vdest:
        await send_campaign(
            campaign_name=vcamp,
            destination=vdest,
            user_name=str(vendor.get("owner_name", vendor.get("name", "Vendor"))),
            template_params=params_shared,
        )
