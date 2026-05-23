import { NextRequest, NextResponse } from "next/server";

type BookingPayload = {
  customerName: string;
  customerPhone: string;
  email?: string;
  address: string;
  service: string;
  pickupDate: string;
  amount: number;
  notes?: string;
  paymentMethod: "cod" | "advance";
};

async function saveToBackend(payload: BookingPayload): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  if (!base) return null;
  try {
    const r = await fetch(`${base}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const j = (await r.json()) as { id: string };
      return j.id;
    }
  } catch { /* backend unavailable */ }
  return null;
}

async function sendConfirmationSms(phone: string, name: string, bookingId: string, service: string, pickupDate: string) {
  const authkey = process.env.MSG91_API_KEY?.trim();
  const templateId = process.env.MSG91_SMS_TEMPLATE_ID?.trim();
  if (!authkey || !templateId) return;

  const digits = phone.replace(/\D/g, "").slice(-10);
  await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { authkey, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      recipients: [{
        mobiles: `91${digits}`,
        name,
        booking_id: bookingId,
        service: service.slice(0, 40),
        pickup_date: pickupDate,
      }],
    }),
  }).catch(() => { /* non-fatal */ });
}

async function sendConfirmationEmail(email: string, name: string, bookingId: string, service: string, pickupDate: string, amount: number) {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() ?? "hello@gharsip.com";
  if (!apiKey || !email) return;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email, name }],
        subject: `Gharsip Booking Confirmed — ${bookingId}`,
      }],
      from: { email: fromEmail, name: "Gharsip" },
      content: [{
        type: "text/html",
        value: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="background:#2E7D32;padding:20px 24px;border-radius:12px 12px 0 0">
              <h1 style="color:white;margin:0;font-size:22px">Booking Confirmed!</h1>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <p style="color:#374151">Hi ${name},</p>
              <p style="color:#374151">Your Gharsip saree service booking is confirmed.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Booking ID</td><td style="padding:8px 0;font-weight:700;color:#111827">${bookingId}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Service</td><td style="padding:8px 0;color:#111827;font-size:14px">${service}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Pickup Date</td><td style="padding:8px 0;color:#111827;font-size:14px">${pickupDate}, 10AM–6PM</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total Amount</td><td style="padding:8px 0;font-weight:700;color:#2E7D32;font-size:16px">₹${amount.toLocaleString("en-IN")}</td></tr>
              </table>
              <p style="color:#374151;font-size:14px">Our team will WhatsApp you before pickup. Payment on delivery or UPI: <strong>gharsip@ybl</strong></p>
              <p style="color:#6b7280;font-size:13px">For queries: hello@gharsip.com</p>
            </div>
          </div>
        `,
      }],
    }),
  }).catch(() => { /* non-fatal */ });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as BookingPayload;

  if (!payload.customerName?.trim() || !payload.customerPhone?.trim() || !payload.address?.trim() || !payload.service?.trim() || !payload.pickupDate?.trim()) {
    return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
  }

  const bookingId = await saveToBackend(payload);
  const id = bookingId ?? `GB${Date.now().toString().slice(-6)}`;

  await Promise.allSettled([
    sendConfirmationSms(payload.customerPhone, payload.customerName, id, payload.service, payload.pickupDate),
    sendConfirmationEmail(payload.email ?? "", payload.customerName, id, payload.service, payload.pickupDate, payload.amount),
  ]);

  return NextResponse.json({ bookingId: id });
}
