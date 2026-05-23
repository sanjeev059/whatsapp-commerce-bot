"""Email OTP — send & verify via Gmail SMTP."""
from __future__ import annotations

import os
import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorCollection

router = APIRouter()
_otp_coll: AsyncIOMotorCollection | None = None

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_APP_PASSWORD", "")


def mount_email_otp(app, otp_collection: AsyncIOMotorCollection):
    global _otp_coll
    _otp_coll = otp_collection
    app.include_router(router, prefix="/api/otp")


class SendRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    email: str
    otp: str


def _send_gmail(to: str, otp: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{otp} is your Gharsip verification code"
    msg["From"] = f"Gharsip <{GMAIL_USER}>"
    msg["To"] = to

    text = f"Your Gharsip OTP is: {otp}\n\nExpires in 10 minutes. Do not share this code."
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
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, to, msg.as_string())


@router.post("/send")
async def send_otp(req: SendRequest):
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await _otp_coll.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "expiry": expiry.isoformat()}},
        upsert=True,
    )

    if not GMAIL_USER or not GMAIL_PASS:
        return {"success": False, "message": "Email not configured on server"}

    try:
        _send_gmail(req.email, otp)
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
