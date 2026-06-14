import { FALLBACK_COMBOS, FALLBACK_MENU_ITEMS } from "./fallbackMenu";
import { FALLBACK_PLANS } from "./fallbackPlans";
import type { Combo, MenuItem, Order, OrderCustomer, OrderLine, Subscription, SubscriptionCustomer, SubscriptionPlan } from "./types";

/** Backend base URL — no trailing slash (e.g. https://your-app.onrender.com) */
export function getGharsipBackendUrl(): string | undefined {
  const u = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  if (!u?.trim()) return undefined;
  return u.replace(/\/$/, "");
}

/** Mongo-backed API is configured when this URL exists. */
export function isGharsipApiEnabled(): boolean {
  return Boolean(getGharsipBackendUrl());
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: string | unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return res.statusText || fallback;
}

function filterFallbackItems(category?: string): MenuItem[] {
  if (!category || category === "all") return FALLBACK_MENU_ITEMS;
  return FALLBACK_MENU_ITEMS.filter((i) => i.category === category);
}

function filterFallbackCombos(mealType?: string, dietType?: string): Combo[] {
  return FALLBACK_COMBOS.filter(
    (c) =>
      (!mealType || mealType === "all" || c.mealType === mealType) &&
      (!dietType || dietType === "all" || c.dietType === dietType)
  );
}

/**
 * GET /api/menu/items?category=… — falls back to the static menu (FALLBACK_MENU_ITEMS)
 * if the backend URL isn't configured, or the API call fails, so today's menu always
 * has items to show.
 */
export async function getMenuItems(category?: string): Promise<MenuItem[]> {
  const base = getGharsipBackendUrl();
  if (!base) return filterFallbackItems(category);

  try {
    const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${base}/api/menu/items${q}`, { cache: "no-store" });
    if (!res.ok) throw new Error(await readError(res, `Failed to load menu (${res.status})`));

    const data = (await res.json()) as { items: MenuItem[] };
    return data.items?.length ? data.items : filterFallbackItems(category);
  } catch (e) {
    console.error("getMenuItems: falling back to static menu —", e);
    return filterFallbackItems(category);
  }
}

/**
 * GET /api/menu/combos?mealType=&dietType= — falls back to the static combo list
 * (FALLBACK_COMBOS) if the backend URL isn't configured, or the API call fails.
 */
export async function getCombos(mealType?: string, dietType?: string): Promise<Combo[]> {
  const base = getGharsipBackendUrl();
  if (!base) return filterFallbackCombos(mealType, dietType);

  try {
    const params = new URLSearchParams();
    if (mealType && mealType !== "all") params.set("mealType", mealType);
    if (dietType && dietType !== "all") params.set("dietType", dietType);
    const qs = params.toString();
    const res = await fetch(`${base}/api/menu/combos${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(await readError(res, `Failed to load combos (${res.status})`));

    const data = (await res.json()) as { combos: Combo[] };
    return data.combos?.length ? data.combos : filterFallbackCombos(mealType, dietType);
  } catch (e) {
    console.error("getCombos: falling back to static combo list —", e);
    return filterFallbackCombos(mealType, dietType);
  }
}

/**
 * GET /api/plans — falls back to the static plan list (FALLBACK_PLANS) if the
 * backend URL isn't configured, or the API call fails, so the Plans page
 * always has subscription options to show.
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const base = getGharsipBackendUrl();
  if (!base) return FALLBACK_PLANS;

  try {
    const res = await fetch(`${base}/api/plans`, { cache: "no-store" });
    if (!res.ok) throw new Error(await readError(res, `Failed to load plans (${res.status})`));

    const data = (await res.json()) as { plans: SubscriptionPlan[] };
    return data.plans?.length ? data.plans : FALLBACK_PLANS;
  } catch (e) {
    console.error("getPlans: falling back to static plan list —", e);
    return FALLBACK_PLANS;
  }
}

/**
 * GET /api/plans/{id} — falls back to FALLBACK_PLANS if the backend is
 * unreachable, so subscription pages keep working while the API is down.
 */
export async function getPlan(planId: string): Promise<SubscriptionPlan | null> {
  const fallback = () => FALLBACK_PLANS.find((p) => p.id === planId) ?? null;

  const base = getGharsipBackendUrl();
  if (!base) return fallback();

  try {
    const res = await fetch(`${base}/api/plans/${encodeURIComponent(planId)}`, { cache: "no-store" });
    if (res.status === 404) return fallback();
    if (!res.ok) throw new Error(await readError(res, `Failed to load plan (${res.status})`));

    return (await res.json()) as SubscriptionPlan;
  } catch (e) {
    console.error("getPlan: falling back to static plan list —", e);
    return fallback();
  }
}

type CreateSubscriptionBody = {
  planId: string;
  customer: SubscriptionCustomer;
  dietPreference?: string;
  startDate: string;
  notes?: string;
  mealTimeSlots?: Record<string, string>;
};

/** POST /api/subscriptions — public; CORS must allow your Vercel origin. */
export async function createSubscription(
  body: CreateSubscriptionBody
): Promise<{ id: string; plan: SubscriptionPlan }> {
  const base = getGharsipBackendUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const res = await fetch(`${base}/api/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await readError(res, `Subscription failed (${res.status})`));

  return res.json() as Promise<{ id: string; plan: SubscriptionPlan }>;
}

/** GET /api/subscriptions?phone=… */
export async function fetchSubscriptions(phone: string): Promise<Subscription[]> {
  const base = getGharsipBackendUrl();
  if (!base) return [];

  const q = new URLSearchParams({ phone });
  const res = await fetch(`${base}/api/subscriptions?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `Lookup failed (${res.status})`));

  const data = (await res.json()) as { subscriptions: Subscription[] };
  return data.subscriptions ?? [];
}

/** GET /api/subscriptions/{id}?phone=… */
export async function fetchSubscription(subId: string, phone: string): Promise<Subscription | null> {
  const base = getGharsipBackendUrl();
  if (!base) return null;

  const q = new URLSearchParams({ phone });
  const res = await fetch(`${base}/api/subscriptions/${encodeURIComponent(subId)}?${q}`, {
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res, `Lookup failed (${res.status})`));

  return (await res.json()) as Subscription;
}

type CreateOrderBody = {
  customer: OrderCustomer;
  items: OrderLine[];
  mealType: string;
  timeSlot: string;
  deliveryDate?: string;
  notes?: string;
};

/** POST /api/orders — public; CORS must allow your Vercel origin. */
export async function createOrder(body: CreateOrderBody): Promise<{ id: string; order: Order }> {
  const base = getGharsipBackendUrl();
  if (!base) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const res = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await readError(res, `Order failed (${res.status})`));

  return res.json() as Promise<{ id: string; order: Order }>;
}

/** GET /api/orders?phone=… */
export async function fetchOrders(phone: string): Promise<Order[]> {
  const base = getGharsipBackendUrl();
  if (!base) return [];

  const q = new URLSearchParams({ phone });
  const res = await fetch(`${base}/api/orders?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `Lookup failed (${res.status})`));

  const data = (await res.json()) as { orders: Order[] };
  return data.orders ?? [];
}
