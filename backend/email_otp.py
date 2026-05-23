"""Email OTP — send & verify via Brevo (Sendinblue) HTTP API."""
from __future__ import annotations

import asyncio
import json
import os
import random
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorCollection

router = APIRouter()
_otp_coll: AsyncIOMotorCollection | None = None

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "sanjeevdesai538@gmail.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Gharsip")


def mount_email_otp(api_router, otp_collection: AsyncIOMotorCollection):
    global _otp_coll
    _otp_coll = otp_collection
    api_router.include_router(router, prefix="/otp")


class SendRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    email: str
    otp: str


def _send_brevo_sync(to: str, otp: str):
    """Blocking HTTP call to Brevo API — run in thread pool."""
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#2E7D32;margin-bottom:8px;">Gharsip</h2>
      <p style="color:#6B7280;font-size:14px;">Your verification code is:</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#111827;margin:24px 0;">{otp}</div>
      <p style="color:#6B7280;font-size:13px;">This code expires in <b>10 minutes</b>.<br>Do not share this with anyone.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9CA3AF;font-size:12px;">Team Gharsip · Wear Your Vibe. Serve Your Style.</p>
    </div>
    """
    payload = json.dumps({
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to}],
        "subject": f"{otp} is your Gharsip verification code",
        "htmlContent": html,
        "textContent": f"Your Gharsip OTP is: {otp}\n\nExpires in 10 minutes. Do not share this code.",
    }).encode()

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise RuntimeError(f"Brevo HTTP {e.code}: {error_body}")


@router.post("/send")
async def send_otp(req: SendRequest):
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await _otp_coll.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "expiry": expiry.isoformat()}},
        upsert=True,
    )

    if not BREVO_API_KEY:
        return {"success": False, "message": "Email service not configured on server"}

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_brevo_sync, req.email, otp)
        return {"success": True}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/verify")
async def verify_otp(req: VerifyRequest):
    record = await _otp_coll.find_one({"email": req.email.lower()})

    if not record:
        return {"success": False, "message": "OTP not found. Please request a new one."}

    if record["otp"] != req.otp:
        return {"success": False, "message": "Invalid OTP."}

    expiry = datetime.fromisoformat(record["expiry"])
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expiry:
        return {"success": False, "message": "OTP expired. Please request a new one."}

    await _otp_coll.delete_one({"email": req.email.lower()})
    return {"success": True}
