"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/Footer";
import { cycleSuffix } from "@/lib/billing";
import { fetchOrders, fetchSubscriptions, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { MEAL_TYPE_LABELS } from "@/lib/timeSlots";
import type { Order, Subscription } from "@/lib/types";

const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUS_STYLES: Record<Order["status"], string> = {
  placed: "bg-amber-50 text-amber-700",
  confirmed: "bg-brand-muted text-brand",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const STATUS_LABELS: Record<Subscription["status"], string> = {
  pending_confirmation: "Pending Confirmation",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_STYLES: Record<Subscription["status"], string> = {
  pending_confirmation: "bg-amber-50 text-amber-700",
  active: "bg-brand-muted text-brand",
  paused: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-50 text-red-600",
  completed: "bg-zinc-100 text-zinc-600",
};

const PAYMENT_LABELS: Record<Subscription["paymentStatus"], string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
};

function TrackInner() {
  const sp = useSearchParams();
  const [phone, setPhone] = useState(sp.get("phone") || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    const p10 = phone.replace(/\D/g, "").slice(-10);
    if (p10.length !== 10) {
      setMsg("Enter a valid 10-digit phone number.");
      setSubs(null);
      setOrders(null);
      return;
    }

    if (!isGharsipApiEnabled()) {
      setMsg("Tracking is being set up. Message us on WhatsApp for your subscription status.");
      setSubs(null);
      setOrders(null);
      return;
    }

    setLoading(true);
    try {
      const [subResult, orderResult] = await Promise.all([fetchSubscriptions(phone), fetchOrders(phone)]);
      if (subResult.length === 0 && orderResult.length === 0) {
        setSubs(null);
        setOrders(null);
        setMsg("No subscriptions or orders found for this phone number.");
        return;
      }
      setMsg(null);
      setSubs(subResult.length > 0 ? subResult : null);
      setOrders(orderResult.length > 0 ? orderResult : null);
    } catch (err) {
      setSubs(null);
      setOrders(null);
      setMsg(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold text-zinc-900">Track Subscription</h1>
      <p className="text-sm text-zinc-600">Enter the phone number used to subscribe.</p>
      <form onSubmit={lookup} className="mt-6 flex flex-col gap-3">
        <input
          required
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          placeholder="10-digit phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={10}
          inputMode="numeric"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-brand py-3 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Track"}
        </button>
      </form>
      {msg ? <p className="mt-4 text-sm text-amber-800">{msg}</p> : null}

      {subs ? (
        <div className="mt-10 space-y-5">
          {subs.map((sub) => (
            <div key={sub.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-zinc-400">#{sub.id}</p>
                  <h2 className="text-lg font-extrabold text-zinc-900">{sub.planName}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[sub.status]}`}>
                  {STATUS_LABELS[sub.status]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p className="text-zinc-500">
                  Start date: <span className="font-semibold text-zinc-800">{sub.startDate}</span>
                </p>
                <p className="text-zinc-500">
                  Plan: <span className="font-semibold text-zinc-800">₹{sub.priceMonthly.toLocaleString("en-IN")}{cycleSuffix(sub.billingCycle)}</span>
                </p>
                <p className="text-zinc-500">
                  Payment: <span className="font-semibold text-zinc-800">{PAYMENT_LABELS[sub.paymentStatus]}</span>
                </p>
                {sub.dietPreference ? (
                  <p className="text-zinc-500">
                    Diet: <span className="font-semibold text-zinc-800 capitalize">{sub.dietPreference}</span>
                  </p>
                ) : null}
                {sub.customer.apartment ? (
                  <p className="text-zinc-500">
                    Apartment: <span className="font-semibold text-zinc-800">{sub.customer.apartment}</span>
                  </p>
                ) : null}
              </div>

              {sub.mealTimeSlots && Object.keys(sub.mealTimeSlots).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Delivery times</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {Object.entries(sub.mealTimeSlots).map(([mealType, slot]) => (
                      <li key={mealType} className="flex items-center justify-between">
                        <span className="text-zinc-700">{MEAL_TYPE_LABELS[mealType] ?? mealType}</span>
                        <span className="font-semibold text-zinc-900">{slot}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sub.deliveryLog.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Delivery log</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {sub.deliveryLog.map((entry, i) => (
                      <li key={`${entry.date}-${i}`} className="flex items-center justify-between">
                        <span className="text-zinc-700">{entry.date}</span>
                        <span className="font-semibold text-zinc-900">{entry.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {orders ? (
        <div className="mt-10 space-y-5">
          <h2 className="text-lg font-extrabold text-zinc-900">Your Orders</h2>
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-zinc-400">#{order.id}</p>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    {MEAL_TYPE_LABELS[order.mealType] ?? order.mealType} · {order.timeSlot}
                  </h3>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_STYLES[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p className="text-zinc-500">
                  Date: <span className="font-semibold text-zinc-800">{order.deliveryDate}</span>
                </p>
                <p className="text-zinc-500">
                  Total: <span className="font-semibold text-zinc-800">₹{order.total.toLocaleString("en-IN")}</span>
                </p>
                <p className="col-span-2 text-zinc-500">
                  Apartment: <span className="font-semibold text-zinc-800">{order.customer.apartment}</span>
                </p>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Items</p>
                <ul className="mt-1.5 space-y-1 text-sm text-zinc-700">
                  {order.items.map((line, i) => (
                    <li key={`${line.id}-${i}`} className="flex items-center justify-between">
                      <span>{line.name} x{line.qty}</span>
                      <span className="font-semibold text-zinc-900">₹{line.price * line.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Link href="/" className="mt-10 inline-block text-sm font-bold text-zinc-500 hover:text-brand">
        ← Home
      </Link>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center">Loading…</div>}>
      <TrackInner />
      <Footer />
    </Suspense>
  );
}
