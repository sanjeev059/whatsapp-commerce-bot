import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export async function POST(req: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    (await req.json()) as {
      razorpay_order_id:   string;
      razorpay_payment_id: string;
      razorpay_signature:  string;
    };

  if (!KEY_SECRET) {
    return NextResponse.json({ error: "RAZORPAY_KEY_SECRET not set" }, { status: 500 });
  }

  const body   = `${razorpay_order_id}|${razorpay_payment_id}`;
  const digest = createHmac("sha256", KEY_SECRET).update(body).digest("hex");

  if (digest !== razorpay_signature) {
    return NextResponse.json({ valid: false, error: "Signature mismatch — payment not verified" }, { status: 400 });
  }

  return NextResponse.json({ valid: true, paymentId: razorpay_payment_id });
}
