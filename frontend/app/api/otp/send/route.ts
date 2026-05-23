import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };

  const digits = phone?.replace(/\D/g, "").slice(-10) ?? "";
  if (digits.length !== 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
  }

  const authkey = process.env.MSG91_API_KEY?.trim();
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();

  if (!authkey) {
    return NextResponse.json({ error: "MSG91_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile: `91${digits}`,
      otp_expiry: 10,
      ...(templateId ? { template_id: templateId } : {}),
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok || data.type === "error") {
    return NextResponse.json(
      { error: (data.message as string) ?? "Failed to send OTP" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
