import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.QIKINK_CLIENT_ID ?? "";
const SECRET    = process.env.QIKINK_SECRET    ?? "";
const BASE      = "https://api.qikink.com";

export type QikinkOrderBody = {
  gharsipOrderId: string;
  lines: Array<{
    designUrl:   string | null;
    designName:  string | null;
    colorLabel:  string;
    size:        string;
    qty:         number;
    productType: string;
  }>;
  customer: {
    name:    string;
    phone:   string;
    email:   string;
    address1: string;
    address2?: string;
    city:    string;
    state:   string;
    pincode: string;
  };
};

export async function POST(req: NextRequest) {
  if (!CLIENT_ID || !SECRET) {
    return NextResponse.json({ error: "Qikink keys not configured" }, { status: 500 });
  }

  const body = (await req.json()) as QikinkOrderBody;

  // Map each line to Qikink's line_items format.
  // QIKINK_PRODUCT_ID must be set — get it from your Qikink product catalog.
  const defaultProductId = process.env.QIKINK_DEFAULT_PRODUCT_ID ?? "";

  const line_items = body.lines.map((l) => ({
    product_id:   defaultProductId || l.productType,
    quantity:     l.qty,
    size:         l.size,
    color:        l.colorLabel,
    // Qikink requires a publicly-accessible design URL.
    // Data URLs (our SVG designs) are passed as-is here;
    // for production, upload designs to Cloudinary/S3 first.
    print_front:  l.designUrl ?? "",
    design_name:  l.designName ?? "Custom",
  }));

  const payload = {
    external_order_id: body.gharsipOrderId,
    line_items,
    shipping_address: {
      name:     body.customer.name,
      phone:    body.customer.phone.replace(/\D/g, "").slice(-10),
      email:    body.customer.email,
      address1: body.customer.address1,
      address2: body.customer.address2 ?? "",
      city:     body.customer.city,
      state:    body.customer.state,
      pincode:  body.customer.pincode,
      country:  "IN",
    },
  };

  const cfRes = await fetch(`${BASE}/api/v1/orders`, {
    method:  "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-client-id":     CLIENT_ID,
      "x-client-secret": SECRET,
    },
    body: JSON.stringify(payload),
  });

  const data = await cfRes.json() as Record<string, unknown>;

  if (!cfRes.ok) {
    return NextResponse.json(
      { error: (data.message as string) ?? JSON.stringify(data) },
      { status: cfRes.status }
    );
  }

  return NextResponse.json({
    qikinkOrderId: data.order_id ?? data.id ?? data.external_order_id,
    status:        data.status ?? "submitted",
    raw:           data,
  });
}
