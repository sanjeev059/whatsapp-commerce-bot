"""WhatsApp outbound messaging via Twilio.

Gracefully no-ops when Twilio credentials are missing (e.g. demo without keys),
so the rest of the app keeps working. Logs every send for observability.
"""
import logging
import os
from typing import Optional

logger = logging.getLogger("whatsapp")


def _client() -> Optional[object]:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    tok = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    if not sid or not tok or sid.startswith("PLACEHOLDER"):
        return None
    try:
        from twilio.rest import Client  # local import — only when needed
        return Client(sid, tok)
    except Exception as e:
        logger.warning(f"Twilio client init failed: {e}")
        return None


def _normalise(to: str) -> str:
    """Accept '+919..', '919..', 'whatsapp:+91..' and return canonical Twilio form."""
    if not to:
        return ""
    to = to.strip()
    if to.startswith("whatsapp:"):
        return to
    digits_plus = "+" + "".join(ch for ch in to if ch.isdigit())
    return f"whatsapp:{digits_plus}"


def send(to: str, body: str) -> bool:
    """Send a WhatsApp message. Returns True on success, False otherwise.

    Never raises — the order flow must continue even if WhatsApp delivery fails.
    """
    target = _normalise(to)
    if not target or target == "whatsapp:+":
        logger.warning(f"skipping send: invalid 'to' = {to!r}")
        return False

    client = _client()
    if client is None:
        logger.info(f"📲 (Twilio not configured) would send to {target}: {body[:80]}…")
        return False

    sender = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886").strip()
    if not sender.startswith("whatsapp:"):
        sender = f"whatsapp:{sender}"

    try:
        msg = client.messages.create(from_=sender, to=target, body=body)
        logger.info(f"✅ WhatsApp sent to {target} (sid={msg.sid})")
        return True
    except Exception as e:
        logger.warning(f"❌ WhatsApp send to {target} failed: {e}")
        return False


# ---- Pre-baked templates ----------------------------------------------------

def _fmt(p) -> str:
    p = float(p)
    return str(int(p)) if p.is_integer() else f"{p:.2f}"


def order_placed_to_customer(order: dict) -> str:
    return (
        f"🛒 *Order received!*\n\n"
        f"Hi {order['customer_name'].split()[0]}, your order *{order['short_id']}* "
        f"has been placed.\n\n"
        f"💰 Total: ₹{_fmt(order['total'])}\n"
        f"💵 Payment: {order.get('payment_mode', 'COD')}\n"
        f"📍 {order['delivery_address']}\n\n"
        f"You'll get an update once the vendor accepts. 🙌"
    )


def order_placed_to_vendor(order: dict) -> str:
    items_lines = "\n".join(
        f"• {it['name']} x{it['qty']} — ₹{_fmt(it['price'] * it['qty'])}"
        for it in order["items"]
    )
    return (
        f"🔔 *NEW ORDER {order['short_id']}*\n\n"
        f"👤 {order['customer_name']}\n"
        f"📞 {order['customer_phone']}\n"
        f"📍 {order['delivery_address']}\n\n"
        f"{items_lines}\n\n"
        f"💰 *Total: ₹{_fmt(order['total'])}*\n"
        f"💵 {order.get('payment_mode', 'COD')}\n\n"
        f"Open dashboard to accept this order."
    )


def status_change_to_customer(order: dict, new_status: str) -> Optional[str]:
    short = order["short_id"]
    name = order["customer_name"].split()[0] if order.get("customer_name") else "there"
    if new_status == "preparing":
        return (
            f"🍳 *Order {short} accepted!*\n\n"
            f"Hi {name}, the vendor is preparing your order now. "
            f"You'll get another update when it's on the way. 🚀"
        )
    if new_status == "out_for_delivery":
        return (
            f"🛵 *Order {short} on the way!*\n\n"
            f"Hi {name}, your order has been picked up and is being delivered "
            f"to your doorstep. See you soon! 🚪"
        )
    if new_status == "delivered":
        return (
            f"✅ *Order {short} delivered!*\n\n"
            f"Thanks for ordering with us, {name}! Hope you enjoy. "
            f"Reply *menu* anytime to order again. 🙏"
        )
    if new_status == "cancelled":
        return (
            f"❌ *Order {short} cancelled.*\n\n"
            f"Hi {name}, your order has been cancelled. "
            f"If this was unexpected, please reach out to us. "
            f"You can reply *menu* to start a new order."
        )
    return None
