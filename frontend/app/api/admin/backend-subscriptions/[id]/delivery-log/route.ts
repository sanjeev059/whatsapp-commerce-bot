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

/** Proxies POST /api/admin/subscriptions/{id}/delivery-log — upserts today's delivery status. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const { id } = await ctx.params;
  const body = await req.text();

  const r = await fetch(`${base}/api/admin/subscriptions/${encodeURIComponent(id)}/delivery-log`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await r.text();
  return new NextResponse(text || r.statusText, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("content-type") || "application/json" },
  });
}
