import type { Combo, MenuItem, Subscription, SubscriptionCustomer, SubscriptionPlan } from "./types";

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

/** GET /api/menu/items?category=… */
export async function getMenuItems(category?: string): Promise<MenuItem[]> {
  const base = getGharsipBackendUrl();
  if (!base) return [];

  const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`${base}/api/menu/items${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `Failed to load menu (${res.status})`));

  const data = (await res.json()) as { items: MenuItem[] };
  return data.items ?? [];
}

/** GET /api/menu/combos?mealType=&dietType= */
export async function getCombos(mealType?: string, dietType?: string): Promise<Combo[]> {
  const base = getGharsipBackendUrl();
  if (!base) return [];

  const params = new URLSearchParams();
  if (mealType && mealType !== "all") params.set("mealType", mealType);
  if (dietType && dietType !== "all") params.set("dietType", dietType);
  const qs = params.toString();
  const res = await fetch(`${base}/api/menu/combos${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `Failed to load combos (${res.status})`));

  const data = (await res.json()) as { combos: Combo[] };
  return data.combos ?? [];
}

/** GET /api/plans */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const base = getGharsipBackendUrl();
  if (!base) return [];

  const res = await fetch(`${base}/api/plans`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `Failed to load plans (${res.status})`));

  const data = (await res.json()) as { plans: SubscriptionPlan[] };
  return data.plans ?? [];
}

/** GET /api/plans/{id} */
export async function getPlan(planId: string): Promise<SubscriptionPlan | null> {
  const base = getGharsipBackendUrl();
  if (!base) return null;

  const res = await fetch(`${base}/api/plans/${encodeURIComponent(planId)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res, `Failed to load plan (${res.status})`));

  return (await res.json()) as SubscriptionPlan;
}

type CreateSubscriptionBody = {
  planId: string;
  customer: SubscriptionCustomer;
  dietPreference?: string;
  startDate: string;
  notes?: string;
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
