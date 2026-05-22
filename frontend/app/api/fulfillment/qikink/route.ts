import { NextResponse } from "next/server";

/**
 * Stub: POST Qikink-style payload here after Razorpay webhook verifies payment.
 * Wire QIKINK_API_KEY + vendor URL via env when ready.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // eslint-disable-next-line no-console
    console.log("[qikink stub]", JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true, reference: `QK_STUB_${Date.now()}` });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
