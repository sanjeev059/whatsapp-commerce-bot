import type { StoredOrder } from "./types";

/** Backend base URL — no trailing slash (e.g. https://your-app.onrender.com) */
export function getGharsipBackendUrl(): string | undefined {
  const u = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  if (!u?.trim()) return undefined;
  return u.replace(/\/$/, "");
}

/** Mongo-backed orders API is configured when this URL exists. */
export function isGharsipApiEnabled(): boolean {
  return Boolean(getGharsipBackendUrl());
}

/** Legacy name — older pages used this alias */
export const isPrintsBackendEnabled = isGharsipApiEnabled;

type CreateOrderBody = {
  lines: StoredOrder["lines"];
  customer: StoredOrder["customer"];
  coupon?: string;
  subtotal: number;
  delivery: number;
  total: number;
  paymentId?: string;
  paymentStatus: StoredOrder["paymentStatus"];
};

/** POST /api/orders — public; CORS must allow your Vercel origin. */
export async function createOrderOnBackend(body: CreateOrderBody): Promise<{ id: string }> {
  const base = getGharsipBackendUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { detail?: string | unknown };
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail)) msg = JSON.stringify(j.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg || `Order failed (${res.status})`);
  }

  return res.json() as Promise<{ id: string }>;
}

/** @deprecated Use createOrderOnBackend */
export const createPrintsOrderOnBackend = createOrderOnBackend;

/** GET /api/orders/{id}?phone=… */
export async function fetchOrderFromBackend(orderId: string, phone: string): Promise<StoredOrder | null> {
  const base = getGharsipBackendUrl();
  if (!base) return null;

  const q = new URLSearchParams({ phone });
  const res = await fetch(`${base}/api/orders/${encodeURIComponent(orderId)}?${q}`, {
    method: "GET",
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Lookup failed (${res.status})`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  return storedOrderFromApi(raw);
}

/** @deprecated Use fetchOrderFromBackend */
export const fetchPrintsOrderFromBackend = fetchOrderFromBackend;

export function storedOrderFromApi(raw: Record<string, unknown>): StoredOrder {
  return {
    id: String(raw.id),
    lines: raw.lines as StoredOrder["lines"],
    customer: raw.customer as StoredOrder["customer"],
    coupon: raw.coupon ? String(raw.coupon) : undefined,
    subtotal: Number(raw.subtotal),
    delivery: Number(raw.delivery),
    total: Number(raw.total),
    paymentId: raw.paymentId ? String(raw.paymentId) : undefined,
    paymentStatus: (raw.paymentStatus as StoredOrder["paymentStatus"]) || "pending",
    createdAt: String(raw.createdAt),
    timeline: (raw.timeline as StoredOrder["timeline"]) || [],
    tracking: raw.tracking ? String(raw.tracking) : undefined,
    qikinkId: raw.qikinkId ? String(raw.qikinkId) : undefined,
  };
}
