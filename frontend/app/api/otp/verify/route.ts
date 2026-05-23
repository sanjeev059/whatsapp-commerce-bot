import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { phone, otp } = (await req.json()) as { phone?: string; otp?: string };

  const digits = phone?.replace(/\D/g, "").slice(-10) ?? "";
  if (digits.length !== 10) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  if (!otp || otp.trim().length < 4) {
    return NextResponse.json({ error: "Enter the OTP" }, { status: 400 });
  }

  const authkey = process.env.MSG91_API_KEY?.trim();
  if (!authkey) {
    return NextResponse.json({ error: "MSG91_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch("https://control.msg91.com/api/v5/otp/verify", {
    method: "POST",
    headers: {
      authkey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile: `91${digits}`,
      otp: otp.trim(),
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok || data.type === "error") {
    return NextResponse.json(
      { error: (data.message as string) ?? "Invalid OTP. Please try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ verified: true });
}
