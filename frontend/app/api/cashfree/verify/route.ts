import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_CASHFREE_APP_ID ?? "";
const SECRET = process.env.CASHFREE_SECRET_KEY ?? "";
const ENV    = (process.env.NEXT_PUBLIC_CASHFREE_ENV ?? "sandbox") as "sandbox" | "production";
const BASE   = ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

type CfPayment = {
  payment_status: string;
  cf_payment_id:  string | number;
  payment_amount: number;
  payment_time:   string;
};

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const cfRes = await fetch(`${BASE}/orders/${encodeURIComponent(orderId)}/payments`, {
    headers: {
      "x-client-id":     APP_ID,
      "x-client-secret": SECRET,
      "x-api-version":   "2023-08-01",
    },
    cache: "no-store",
  });

  if (!cfRes.ok) {
    const t = await cfRes.text();
    return NextResponse.json({ error: t || "Verification failed" }, { status: cfRes.status });
  }

  const payments = (await cfRes.json()) as CfPayment[];
  const success  = payments.find((p) => p.payment_status === "SUCCESS");
  const latest   = payments[0];

  return NextResponse.json({
    status:    success ? "SUCCESS" : (latest?.payment_status ?? "PENDING"),
    paymentId: String(success?.cf_payment_id ?? latest?.cf_payment_id ?? ""),
    amount:    success?.payment_amount ?? latest?.payment_amount ?? 0,
  });
}
