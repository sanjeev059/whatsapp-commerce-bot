"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cycleSuffix } from "@/lib/billing";
import { isGharsipApiEnabled } from "@/lib/gharsipApi";
import { MEAL_TYPE_LABELS } from "@/lib/timeSlots";
import type { DeliveryLogEntry, KitchenPrepResponse, Order, Subscription } from "@/lib/types";

const STATUS_LABELS: Record<Subscription["status"], string> = {
  pending_confirmation: "Pending Confirmation",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_COLORS: Record<Subscription["status"], string> = {
  pending_confirmation: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

const PAYMENT_LABELS: Record<Subscription["paymentStatus"], string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
};

const PAYMENT_COLORS: Record<Subscription["paymentStatus"], string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "In Preparation",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_COLORS: Record<Order["status"], string> = {
  placed: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const ORDER_PIPELINE: Order["status"][] = [
  "placed",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
];

type DeliveryGroup = {
  apartment: string;
  timeSlot: string;
  subscriptions: {
    id: string;
    name: string;
    phone: string;
    address: string;
    locationUrl?: string | null;
    planName: string;
    deliveredToday?: boolean;
  }[];
  orders: {
    id: string;
    name: string;
    phone: string;
    address: string;
    locationUrl?: string | null;
    items: { name: string; qty: number }[];
    status?: Order["status"];
  }[];
};

type DeliveryGroupsResponse = {
  date: string;
  mealType: string;
  timeSlots: string[];
  groups: DeliveryGroup[];
};

const DELIVERY_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"subscriptions" | "orders" | "deliveries">("subscriptions");

  const todayIso = new Date().toISOString().split("T")[0];
  const [deliveryMealType, setDeliveryMealType] = useState<(typeof DELIVERY_MEAL_TYPES)[number]>("breakfast");
  const [deliveryDate, setDeliveryDate] = useState(todayIso);
  const [deliveryGroups, setDeliveryGroups] = useState<DeliveryGroupsResponse | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [prep, setPrep] = useState<KitchenPrepResponse | null>(null);

  const useBackend = isGharsipApiEnabled();

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [subsRes, ordersRes] = await Promise.all([
        fetch("/api/admin/backend-subscriptions", { headers: { "x-admin-pin": adminPin }, cache: "no-store" }),
        fetch("/api/admin/backend-orders", { headers: { "x-admin-pin": adminPin }, cache: "no-store" }),
      ]);
      if (!subsRes.ok) {
        setError(await subsRes.text());
        setSubs([]);
      } else {
        const j = (await subsRes.json()) as { subscriptions?: Subscription[] };
        setSubs(j.subscriptions ?? []);
      }
      if (ordersRes.ok) {
        const j = (await ordersRes.json()) as { orders?: Order[] };
        setOrders(j.orders ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [adminPin]);

  const [markingId, setMarkingId] = useState<string | null>(null);

  const markOrderDelivered = useCallback(
    async (orderId: string, delivered: boolean) => {
      setMarkingId(orderId);
      try {
        const res = await fetch(`/api/admin/backend-orders/${encodeURIComponent(orderId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
          body: JSON.stringify({ status: delivered ? "delivered" : "out_for_delivery" }),
        });
        if (!res.ok) {
          alert(await res.text());
          return;
        }
        await refreshDeliveries();
      } finally {
        setMarkingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminPin]
  );

  const markSubscriptionDelivered = useCallback(
    async (subId: string, delivered: boolean) => {
      setMarkingId(subId);
      try {
        const res = await fetch(`/api/admin/backend-subscriptions/${encodeURIComponent(subId)}/delivery-log`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
          body: JSON.stringify({
            date: deliveryDate,
            mealType: deliveryMealType,
            status: delivered ? "delivered" : "pending",
          }),
        });
        if (!res.ok) {
          alert(await res.text());
          return;
        }
        await refreshDeliveries();
      } finally {
        setMarkingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminPin, deliveryDate, deliveryMealType]
  );

  const refreshDeliveries = useCallback(async () => {
    setDeliveryError(null);
    setDeliveryLoading(true);
    try {
      const q = new URLSearchParams({ mealType: deliveryMealType, date: deliveryDate });
      const [groupsRes, prepRes] = await Promise.all([
        fetch(`/api/admin/delivery-groups?${q}`, { headers: { "x-admin-pin": adminPin }, cache: "no-store" }),
        fetch(`/api/admin/delivery-prep?${q}`, { headers: { "x-admin-pin": adminPin }, cache: "no-store" }),
      ]);
      if (!groupsRes.ok) {
        setDeliveryError(await groupsRes.text());
        setDeliveryGroups(null);
      } else {
        setDeliveryGroups((await groupsRes.json()) as DeliveryGroupsResponse);
      }
      if (prepRes.ok) {
        setPrep((await prepRes.json()) as KitchenPrepResponse);
      } else {
        setPrep(null);
      }
    } finally {
      setDeliveryLoading(false);
    }
  }, [adminPin, deliveryMealType, deliveryDate]);

  useEffect(() => {
    if (ok) void refresh();
  }, [ok, refresh]);

  useEffect(() => {
    if (ok && tab === "deliveries") void refreshDeliveries();
  }, [ok, tab, refreshDeliveries]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PIN || "gharsip2026";
    if (pw === expected) {
      setAdminPin(pw);
      setOk(true);
      setPw("");
    } else {
      alert("Wrong PIN");
    }
  };

  const lockout = () => {
    setOk(false);
    setAdminPin("");
    setSubs([]);
    setOrders([]);
    setDeliveryGroups(null);
    setPrep(null);
  };

  if (!ok) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <p className="text-sm text-zinc-500">
          PIN unlocks subscription management. Set{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">PRINTS_OPS_PIN</code> on Vercel
          to change it.
        </p>
        <form onSubmit={login} className="mt-4 space-y-3">
          <input
            type="password"
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="PIN"
          />
          <button type="submit" className="w-full rounded-xl bg-brand py-3 font-bold text-white">
            Unlock
          </button>
        </form>
        <Link href="/" className="mt-8 text-center text-sm text-brand">
          ← Storefront
        </Link>
      </div>
    );
  }

  const today = new Date().toDateString();
  const todaySubs = subs.filter((s) => new Date(s.createdAt).toDateString() === today);
  const activeSubs = subs.filter((s) => s.status === "active");
  const pendingSubs = subs.filter((s) => s.status === "pending_confirmation");
  const todayOrders = orders.filter((o) => o.deliveryDate === todayIso);
  const placedOrders = orders.filter((o) => o.status === "placed");

  const subtitle = useBackend
    ? `Subscriptions from Mongo (${process.env.NEXT_PUBLIC_BACKEND_URL}).`
    : "Set NEXT_PUBLIC_BACKEND_URL + backend for Mongo-backed subscriptions.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Gharsip · Operations</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className="text-sm font-bold text-red-600" onClick={lockout}>
            Lock
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Total subscriptions</p>
          <p className="mt-2 text-3xl font-extrabold">{subs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Active</p>
          <p className="mt-2 text-3xl font-extrabold text-brand">{activeSubs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Pending confirmation</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{pendingSubs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Today&apos;s subscriptions</p>
          <p className="mt-2 text-3xl font-extrabold">{todaySubs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Total orders</p>
          <p className="mt-2 text-3xl font-extrabold">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Today&apos;s orders</p>
          <p className="mt-2 text-3xl font-extrabold text-brand">{todayOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Orders awaiting confirmation</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{placedOrders.length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "subscriptions" as const, label: "Subscriptions" },
            { id: "orders" as const, label: "Orders" },
            { id: "deliveries" as const, label: "Today's Deliveries" },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === t.id
                ? "bg-brand text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "subscriptions" && (
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  No subscriptions yet — they appear here after customers subscribe.
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <SubscriptionAdminRow key={s.id} sub={s} adminPin={adminPin} onSaved={() => void refresh()} />
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {tab === "orders" && (
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Apartment</th>
              <th className="p-3">Delivery</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">
                  No orders yet — they appear here after customers checkout on the menu.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <OrderAdminRow key={o.id} order={o} adminPin={adminPin} onSaved={() => void refresh()} />
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {tab === "deliveries" && (
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {DELIVERY_MEAL_TYPES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDeliveryMealType(m)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  deliveryMealType === m
                    ? "bg-brand text-white shadow-sm"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
                }`}
              >
                {MEAL_TYPE_LABELS[m] ?? m}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
          <button
            type="button"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={deliveryLoading}
            onClick={() => void refreshDeliveries()}
          >
            {deliveryLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {deliveryError ? <p className="mt-3 text-xs text-red-600">{deliveryError}</p> : null}

        {prep && (prep.orderCount > 0 || prep.subscriptionCount > 0) ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-extrabold text-zinc-900">
              🍳 Kitchen Prep — {MEAL_TYPE_LABELS[deliveryMealType] ?? deliveryMealType} · {deliveryDate}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">
                  À la carte orders ({prep.orderCount})
                </p>
                {prep.orderItems.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-400">No items ordered yet.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {prep.orderItems.map((it) => (
                      <li key={`${it.kind}-${it.name}`} className="flex items-center justify-between">
                        <span className="text-zinc-700">{it.name}</span>
                        <span className="font-bold text-zinc-900">x{it.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Subscription meals ({prep.subscriptionCount})
                </p>
                {prep.subscriptionMeals.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-400">No active subscriptions for this meal.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5 text-sm">
                    {prep.subscriptionMeals.map((m) => (
                      <li key={m.planName}>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-700">{m.planName}</span>
                          <span className="font-bold text-zinc-900">x{m.qty}</span>
                        </div>
                        <p className="text-xs text-zinc-400 capitalize">
                          {Object.entries(m.dietPreference)
                            .map(([diet, n]) => `${diet}: ${n}`)
                            .join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {deliveryGroups && deliveryGroups.groups.length > 0
          ? (() => {
              const total = deliveryGroups.groups.reduce(
                (sum, g) => sum + g.subscriptions.length + g.orders.length,
                0
              );
              const done = deliveryGroups.groups.reduce(
                (sum, g) =>
                  sum +
                  g.subscriptions.filter((s) => s.deliveredToday).length +
                  g.orders.filter((o) => o.status === "delivered").length,
                0
              );
              return (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-zinc-700">Delivery progress</p>
                  <p className={`text-lg font-extrabold ${done === total ? "text-green-600" : "text-brand"}`}>
                    {done} / {total} delivered
                  </p>
                </div>
              );
            })()
          : null}

        <div className="mt-4 space-y-4">
          {!deliveryGroups || deliveryGroups.groups.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              {deliveryLoading
                ? "Loading deliveries…"
                : `No ${MEAL_TYPE_LABELS[deliveryMealType]?.toLowerCase()} deliveries for ${deliveryDate} yet.`}
            </p>
          ) : (
            deliveryGroups.groups.map((g) => {
              const count = g.subscriptions.length + g.orders.length;
              const delivered =
                g.subscriptions.filter((s) => s.deliveredToday).length +
                g.orders.filter((o) => o.status === "delivered").length;
              return (
                <div key={`${g.apartment}-${g.timeSlot}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-extrabold text-zinc-900">{g.apartment}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">{g.timeSlot}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        delivered === count ? "bg-green-100 text-green-700" : "bg-brand-muted text-brand"
                      }`}
                    >
                      {delivered}/{count} delivered
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {g.subscriptions.map((s) => (
                      <li
                        key={`sub-${s.id}`}
                        className={`rounded-xl px-3 py-2 ${s.deliveredToday ? "bg-green-50" : "bg-zinc-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-zinc-800">
                              {s.name} <span className="text-xs font-normal text-zinc-400">· {s.phone}</span>
                            </p>
                            <p className="text-xs text-zinc-500">{s.address}</p>
                            <p className="text-xs text-zinc-400">Subscription: {s.planName} ({s.id})</p>
                            {s.locationUrl && (
                              <a
                                href={s.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-brand hover:underline"
                              >
                                📍 View location
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={markingId === s.id}
                            onClick={() => void markSubscriptionDelivered(s.id, !s.deliveredToday)}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                              s.deliveredToday
                                ? "bg-green-100 text-green-700"
                                : "border border-zinc-300 text-zinc-600 hover:border-brand hover:text-brand"
                            }`}
                          >
                            {s.deliveredToday ? "✓ Delivered" : "Mark delivered"}
                          </button>
                        </div>
                      </li>
                    ))}
                    {g.orders.map((o) => {
                      const isDelivered = o.status === "delivered";
                      return (
                        <li
                          key={`order-${o.id}`}
                          className={`rounded-xl px-3 py-2 ${isDelivered ? "bg-green-50" : "bg-zinc-50"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-zinc-800">
                                {o.name} <span className="text-xs font-normal text-zinc-400">· {o.phone}</span>
                              </p>
                              <p className="text-xs text-zinc-500">{o.address}</p>
                              <p className="text-xs text-zinc-400">
                                Order {o.id}: {o.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                              </p>
                              {o.status && (
                                <span
                                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${ORDER_STATUS_COLORS[o.status]}`}
                                >
                                  {ORDER_STATUS_LABELS[o.status]}
                                </span>
                              )}
                              {o.locationUrl && (
                                <a
                                  href={o.locationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs font-bold text-brand hover:underline"
                                >
                                  📍 View location
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={markingId === o.id}
                              onClick={() => void markOrderDelivered(o.id, !isDelivered)}
                              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                isDelivered
                                  ? "bg-green-100 text-green-700"
                                  : "border border-zinc-300 text-zinc-600 hover:border-brand hover:text-brand"
                              }`}
                            >
                              {isDelivered ? "✓ Delivered" : "Mark delivered"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function SubscriptionAdminRow({
  sub,
  adminPin,
  onSaved,
}: {
  sub: Subscription;
  adminPin: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(sub.status);
  const [paymentStatus, setPaymentStatus] = useState(sub.paymentStatus);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>(sub.deliveryLog);
  const [newDate, setNewDate] = useState("");
  const [newStatus, setNewStatus] = useState("delivered");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/backend-subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const addDeliveryEntry = () => {
    if (!newDate) return;
    const entry: DeliveryLogEntry = { date: newDate, status: newStatus, note: newNote || undefined };
    const updated = [...deliveryLog, entry];
    setDeliveryLog(updated);
    setNewDate("");
    setNewNote("");
    void save({ deliveryLog: updated });
  };

  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="p-3 font-mono font-bold">{sub.id}</td>
        <td className="p-3">
          <div className="font-semibold">{sub.customer.name}</div>
          <div className="text-xs text-zinc-500">{sub.customer.phone}</div>
        </td>
        <td className="p-3">{sub.planName}</td>
        <td className="p-3 text-xs">{sub.startDate}</td>
        <td className="p-3 font-bold">₹{sub.priceMonthly.toLocaleString("en-IN")}{cycleSuffix(sub.billingCycle)}</td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[paymentStatus]}`}>
            {PAYMENT_LABELS[paymentStatus]}
          </span>
        </td>
        <td className="p-3">
          <button type="button" className="text-xs font-bold text-brand" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Manage"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-zinc-50">
          <td colSpan={8} className="p-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold text-zinc-700">Customer</p>
                <p className="text-zinc-600">{sub.customer.email}</p>
                <p className="text-zinc-600">
                  {sub.customer.address1}
                  {sub.customer.address2 ? `, ${sub.customer.address2}` : ""}, {sub.customer.city},{" "}
                  {sub.customer.state} – {sub.customer.pincode}
                </p>
                {sub.dietPreference ? (
                  <p className="mt-1 text-zinc-600">
                    Diet: <span className="font-semibold capitalize">{sub.dietPreference}</span>
                  </p>
                ) : null}
                {sub.notes ? <p className="mt-1 text-zinc-600">Notes: {sub.notes}</p> : null}
              </div>

              <div>
                <p className="mb-2 font-semibold text-zinc-700">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_LABELS) as Subscription["status"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || status === key}
                      onClick={() => {
                        setStatus(key);
                        void save({ status: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        status === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {STATUS_LABELS[key]}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 font-semibold text-zinc-700">Payment</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PAYMENT_LABELS) as Subscription["paymentStatus"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || paymentStatus === key}
                      onClick={() => {
                        setPaymentStatus(key);
                        void save({ paymentStatus: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        paymentStatus === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {PAYMENT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-semibold text-zinc-700">Delivery log</p>
              {deliveryLog.length > 0 ? (
                <ul className="mb-3 space-y-1">
                  {deliveryLog.map((entry, i) => (
                    <li
                      key={`${entry.date}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5"
                    >
                      <span>{entry.date}</span>
                      <span className="font-semibold">{entry.status}</span>
                      {entry.note ? <span className="text-zinc-500">{entry.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-zinc-500">No delivery entries yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <select
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="delivered">Delivered</option>
                  <option value="skipped">Skipped</option>
                  <option value="missed">Missed</option>
                </select>
                <input
                  className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="Note (optional)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg bg-brand px-4 py-2 font-bold text-white disabled:bg-zinc-400"
                  disabled={saving || !newDate}
                  onClick={addDeliveryEntry}
                >
                  {saving ? "Saving…" : "Add entry"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderAdminRow({
  order,
  adminPin,
  onSaved,
}: {
  order: Order;
  adminPin: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [saving, setSaving] = useState(false);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/backend-orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="p-3 font-mono font-bold">{order.id}</td>
        <td className="p-3">
          <div className="font-semibold">{order.customer.name}</div>
          <div className="text-xs text-zinc-500">{order.customer.phone}</div>
        </td>
        <td className="p-3">{order.customer.apartment}</td>
        <td className="p-3 text-xs">
          <p className="font-semibold capitalize">{MEAL_TYPE_LABELS[order.mealType] ?? order.mealType}</p>
          <p className="text-zinc-500">{order.timeSlot}</p>
          <p className="text-zinc-400">{order.deliveryDate}</p>
        </td>
        <td className="p-3 text-xs text-zinc-600">
          {order.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
        </td>
        <td className="p-3 font-bold">₹{order.total.toLocaleString("en-IN")}</td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[status]}`}>
            {ORDER_STATUS_LABELS[status]}
          </span>
          {(() => {
            const idx = ORDER_PIPELINE.indexOf(status);
            const next = idx >= 0 && idx < ORDER_PIPELINE.length - 1 ? ORDER_PIPELINE[idx + 1] : null;
            if (!next) return null;
            return (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setStatus(next);
                  void save({ status: next });
                }}
                className="ml-2 rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-bold text-zinc-600 hover:border-brand hover:text-brand disabled:opacity-50"
              >
                {ORDER_STATUS_LABELS[next]} →
              </button>
            );
          })()}
        </td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[paymentStatus]}`}>
            {PAYMENT_LABELS[paymentStatus]}
          </span>
        </td>
        <td className="p-3">
          <button type="button" className="text-xs font-bold text-brand" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Manage"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-zinc-50">
          <td colSpan={9} className="p-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold text-zinc-700">Delivery address</p>
                <p className="text-zinc-600">{order.customer.address1}, {order.customer.city}</p>
                {order.notes ? <p className="mt-1 text-zinc-600">Notes: {order.notes}</p> : null}
              </div>
              <div>
                <p className="mb-2 font-semibold text-zinc-700">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ORDER_STATUS_LABELS) as Order["status"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || status === key}
                      onClick={() => {
                        setStatus(key);
                        void save({ status: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        status === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[key]}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 font-semibold text-zinc-700">Payment</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PAYMENT_LABELS) as Order["paymentStatus"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || paymentStatus === key}
                      onClick={() => {
                        setPaymentStatus(key);
                        void save({ paymentStatus: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        paymentStatus === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {PAYMENT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
