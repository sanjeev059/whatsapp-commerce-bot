import { NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_CASHFREE_APP_ID ?? "";
const SECRET = process.env.CASHFREE_SECRET_KEY ?? "";
const ENV    = process.env.NEXT_PUBLIC_CASHFREE_ENV ?? "sandbox";
const BASE   = ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

export async function GET() {
  // Masked values so you can verify Vercel picked up the right env vars
  const maskedId     = APP_ID  ? `${APP_ID.slice(0, 4)}...${APP_ID.slice(-4)}`   : "NOT SET";
  const maskedSecret = SECRET  ? `${SECRET.slice(0, 6)}...${SECRET.slice(-6)}`   : "NOT SET";

  if (!APP_ID || !SECRET) {
    return NextResponse.json({
      ok: false,
      env: ENV,
      base: BASE,
      appId: maskedId,
      secret: maskedSecret,
      error: "Env vars missing on Vercel",
    });
  }

  // Try a lightweight Cashfree API call — fetch a single order page
  let cfStatus = 0;
  let cfBody: unknown = null;
  try {
    const res = await fetch(`${BASE}/orders?count=1`, {
      headers: {
        "x-client-id":     APP_ID,
        "x-client-secret": SECRET,
        "x-api-version":   "2023-08-01",
      },
      cache: "no-store",
    });
    cfStatus = res.status;
    cfBody   = await res.json();
  } catch (e) {
    cfBody = String(e);
  }

  return NextResponse.json({
    ok:       cfStatus === 200,
    env:      ENV,
    base:     BASE,
    appId:    maskedId,
    secret:   maskedSecret,
    cfStatus,
    cfBody,
  });
}
