import { NextRequest, NextResponse } from "next/server";

function backendBase() {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
}

function adminBearer() {
  return (
    process.env.ADMIN_API_TOKEN?.trim() || process.env.PRINTS_ADMIN_TOKEN?.trim() || ""
  );
}

function verifyPin(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin") ?? "";
  const expected =
    process.env.PRINTS_OPS_PIN?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_PIN?.trim() ||
    "gharsip2026";
  return pin === expected;
}

export async function GET(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const base = backendBase();
  const token = adminBearer();
  if (!base || !token) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_BACKEND_URL and ADMIN_API_TOKEN on Vercel" },
      { status: 503 }
    );
  }

  const r = await fetch(`${base}/api/admin/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await r.text();
  if (!r.ok) {
    return new NextResponse(text || r.statusText, { status: r.status });
  }
  return new NextResponse(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(req: NextRequest) {
  if (!verifyPin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const base = backendBase();
  const token = adminBearer();
  if (!base || !token) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_BACKEND_URL and ADMIN_API_TOKEN on Vercel" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const bookingId = url.searchParams.get("id");
  if (!bookingId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.text();
  const r = await fetch(`${base}/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await r.text();
  if (!r.ok) {
    return new NextResponse(text || r.statusText, { status: r.status });
  }
  return new NextResponse(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
