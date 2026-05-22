import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_CASHFREE_APP_ID ?? "";
const SECRET = process.env.CASHFREE_SECRET_KEY ?? "";
const ENV    = (process.env.NEXT_PUBLIC_CASHFREE_ENV ?? "sandbox") as "sandbox" | "production";
const BASE   = ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

type Body = {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  returnUrl: string;
};

export async function POST(req: NextRequest) {
  if (!APP_ID || !SECRET) {
    return NextResponse.json(
      { error: "Cashfree keys not configured — add NEXT_PUBLIC_CASHFREE_APP_ID and CASHFREE_SECRET_KEY to Vercel env vars." },
      { status: 500 }
    );
  }

  const body = (await req.json()) as Body;
  const phone = body.customerPhone.replace(/\D/g, "").slice(-10);

  const cfRes = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: {
      "x-client-id":     APP_ID,
      "x-client-secret": SECRET,
      "x-api-version":   "2023-08-01",
      "Content-Type":    "application/json",
    },
    body: JSON.stringify({
      order_id:       body.orderId,
      order_amount:   body.amount,
      order_currency: "INR",
      customer_details: {
        customer_id:    phone,
        customer_name:  body.customerName,
        customer_email: body.customerEmail || `${phone}@gharsip.in`,
        customer_phone: phone,
      },
      order_meta: {
        return_url:  body.returnUrl,
      },
      order_tags: { source: "gharsip_web" },
    }),
  });

  const data = await cfRes.json() as Record<string, unknown>;

  if (!cfRes.ok) {
    return NextResponse.json(
      { error: (data.message as string) ?? "Cashfree order creation failed" },
      { status: cfRes.status }
    );
  }

  return NextResponse.json({
    payment_session_id: data.payment_session_id,
    cf_order_id:        data.cf_order_id,
    order_id:           data.order_id,
  });
}
