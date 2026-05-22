import { NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_CASHFREE_APP_ID ?? "";
const SECRET = process.env.CASHFREE_SECRET_KEY ?? "";
const ENV    = process.env.NEXT_PUBLIC_CASHFREE_ENV ?? "sandbox";
const BASE   = ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

export async function GET() {
  const maskedId     = APP_ID  ? `${APP_ID.slice(0, 8)}...${APP_ID.slice(-6)}`   : "NOT SET";
  const maskedSecret = SECRET  ? `${SECRET.slice(0, 10)}...${SECRET.slice(-8)}`  : "NOT SET";

  if (!APP_ID || !SECRET) {
    return NextResponse.json({ ok: false, reason: "env vars not set", appId: maskedId, secret: maskedSecret });
  }

  // Test auth by creating a dummy order — Cashfree auth is checked first
  let cfStatus = 0;
  let cfMessage = "";
  let authenticated = false;

  try {
    const res = await fetch(`${BASE}/orders`, {
      method: "POST",
      headers: {
        "x-client-id":     APP_ID,
        "x-client-secret": SECRET,
        "x-api-version":   "2023-08-01",
        "Content-Type":    "application/json",
      },
      body: JSON.stringify({
        order_id:       `ping_test_${Date.now()}`,
        order_amount:   1,
        order_currency: "INR",
        customer_details: {
          customer_id:    "ping_test",
          customer_name:  "Test User",
          customer_email: "test@test.com",
          customer_phone: "9999999999",
        },
      }),
    });

    cfStatus = res.status;
    const body = await res.json() as Record<string, unknown>;
    cfMessage  = (body.message as string) ?? JSON.stringify(body);

    // If auth fails  → 401, message contains "authentication"
    // If auth passes → 200 (order created) or 4xx for other reasons
    authenticated = cfStatus !== 401 && !cfMessage.toLowerCase().includes("authentication");
  } catch (e) {
    cfMessage = String(e);
  }

  return NextResponse.json({
    ok:            authenticated,
    authenticated,
    env:           ENV,
    base:          BASE,
    appId:         maskedId,
    secret:        maskedSecret,
    cfStatus,
    cfMessage,
    hint: authenticated
      ? "✅ Credentials are working!"
      : "❌ Auth failed — wrong secret in Vercel. CASHFREE_SECRET_KEY must start with cfsk_ma_test_",
  });
}
