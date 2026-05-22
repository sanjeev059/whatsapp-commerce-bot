import { NextRequest, NextResponse } from "next/server";

const KEY_ID     = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export async function POST(req: NextRequest) {
  if (!KEY_ID || !KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay keys not configured — add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Vercel." },
      { status: 500 }
    );
  }

  const { amount, receipt, notes } = (await req.json()) as {
    amount:  number; // in ₹ — we convert to paise here
    receipt: string;
    notes?:  Record<string, string>;
  };

  const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount:   Math.round(amount * 100), // paise
      currency: "INR",
      receipt:  receipt.slice(0, 40),     // max 40 chars
      notes:    notes ?? {},
    }),
  });

  const data = await rzpRes.json() as Record<string, unknown>;
  if (!rzpRes.ok) {
    return NextResponse.json(
      { error: (data.error as Record<string, string>)?.description ?? "Razorpay order creation failed" },
      { status: rzpRes.status }
    );
  }

  return NextResponse.json({ orderId: data.id, amount: data.amount });
}
