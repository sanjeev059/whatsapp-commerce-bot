"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { persistOrderDraft } from "@/lib/orders";
import type { StoredOrder } from "@/lib/types";
import { createOrderOnBackend, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { computeCartDelivery } from "@/lib/pricing";

const CHECKOUT_KEY = "prints_checkout_form";

type PayMethod = "upi" | "card" | "netbanking";

const UPI_APPS = [
  { id: "gpay", label: "Google Pay", color: "#4285F4" },
  { id: "phonepe", label: "PhonePe", color: "#5f259f" },
  { id: "paytm", label: "Paytm", color: "#00BAF2" },
  { id: "other", label: "Other UPI", color: "#374151" },
];

export default function PaymentPage() {
  const { lines, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<PayMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [selectedUpi, setSelectedUpi] = useState("gpay");

  const checkoutRaw = typeof window !== "undefined" ? sessionStorage.getItem(CHECKOUT_KEY) : null;
  const checkout = checkoutRaw ? (JSON.parse(checkoutRaw) as {
    name: string; phone: string; email: string;
    address1: string; address2?: string; city: string; state: string; pincode: string;
    coupon?: string; subtotal: number; delivery: number; total: number;
  }) : null;

  const subtotal = checkout?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const delivery = checkout?.delivery ?? computeCartDelivery(subtotal);
  const total = checkout?.total ?? subtotal + delivery;

  useEffect(() => {
    if (lines.length === 0 && !checkoutRaw) setError("Your cart is empty.");
  }, [lines.length, checkoutRaw]);

  const handlePay = async () => {
    setError(null);
    if (!checkout || lines.length === 0) {
      setError("Missing checkout details — go back and fill your delivery address.");
      return;
    }

    /* ── Razorpay integration point ────────────────────────────────
       When NEXT_PUBLIC_RAZORPAY_KEY_ID is set, replace the block
       below with: create a Razorpay order on your backend, open
       the Razorpay checkout modal, then verify the payment
       signature before calling persistOrderDraft / createOrderOnBackend.
    ──────────────────────────────────────────────────────────────── */

    const payload: Omit<StoredOrder, "id" | "createdAt"> = {
      lines: lines.map((l) => ({ ...l })),
      customer: {
        name: checkout.name,
        phone: checkout.phone,
        email: checkout.email,
        address1: checkout.address1,
        address2: checkout.address2,
        city: checkout.city,
        state: checkout.state,
        pincode: checkout.pincode,
      },
      coupon: checkout.coupon,
      subtotal: checkout.subtotal,
      delivery: checkout.delivery,
      total: checkout.total,
      paymentId: `pay_${Date.now()}`,
      paymentStatus: "paid",
      timeline: [],
    };

    if (isGharsipApiEnabled()) {
      setBusy(true);
      try {
        const { id } = await createOrderOnBackend(payload);
        sessionStorage.setItem(`prints_confirm_phone:${id}`, checkout.phone.trim());
        clearCart();
        sessionStorage.removeItem(CHECKOUT_KEY);
        window.location.href = `/order-confirmed?order=${encodeURIComponent(id)}`;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not place order.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const order = persistOrderDraft(payload);
    clearCart();
    sessionStorage.removeItem(CHECKOUT_KEY);
    window.location.href = `/order-confirmed?order=${encodeURIComponent(order.id)}`;
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Left — payment form */}
        <div className="lg:col-span-7">
          <Link href="/checkout" className="text-xs font-bold text-brand hover:underline">
            ← Edit address
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Payment</h1>
          <p className="mt-1 text-sm text-zinc-500">
            All payments are 100% secure and encrypted.
            <span className="ml-2 inline-flex items-center gap-1 text-brand font-semibold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Secure
            </span>
          </p>

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Method tabs */}
          <div className="mt-6 flex gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            {(["upi", "card", "netbanking"] as PayMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold capitalize transition ${
                  method === m ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {m === "upi" ? "UPI" : m === "card" ? "Card" : "Netbanking"}
              </button>
            ))}
          </div>

          {/* UPI */}
          {method === "upi" ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpi(app.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition ${
                      selectedUpi === app.id
                        ? "border-brand bg-brand-muted text-brand-dark"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: app.color }}
                    >
                      {app.label[0]}
                    </span>
                    {app.label}
                  </button>
                ))}
              </div>
              {selectedUpi === "other" ? (
                <input
                  type="text"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="Enter UPI ID (e.g. name@upi)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}

          {/* Card */}
          {method === "card" ? (
            <div className="mt-5 space-y-3">
              <input
                type="text"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Card number"
                maxLength={19}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="MM / YY"
                  maxLength={7}
                />
                <input
                  type="text"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="CVV"
                  maxLength={4}
                />
              </div>
              <input
                type="text"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Name on card"
              />
            </div>
          ) : null}

          {/* Netbanking */}
          {method === "netbanking" ? (
            <div className="mt-5">
              <select className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 bg-white">
                <option value="">Select your bank</option>
                {["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank", "PNB", "Canara Bank", "Union Bank"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Pay button */}
          <button
            type="button"
            disabled={busy || lines.length === 0}
            onClick={() => void handlePay()}
            className="mt-8 w-full rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Processing…
              </span>
            ) : (
              `Pay ₹${total}`
            )}
          </button>

          <p className="mt-3 text-center text-xs text-zinc-400">
            By paying you agree to our Terms &amp; Conditions · Powered by Razorpay
          </p>
        </div>

        {/* Right — order summary */}
        <aside className="mt-10 lg:col-span-5 lg:mt-0">
          <div className="sticky top-24 rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-500">Order Summary</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.lineId} className="flex items-start justify-between gap-3 text-sm">
                  <div
                    className="h-12 w-10 shrink-0 rounded-lg"
                    style={{ backgroundColor: l.colorHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{l.designName ?? "Plain tee"}</p>
                    <p className="text-xs text-zinc-500">{l.colorLabel} · Size {l.size} · ×{l.qty}</p>
                  </div>
                  <p className="font-bold text-zinc-900 shrink-0">₹{l.unitPrice * l.qty}</p>
                </li>
              ))}
            </ul>

            {/* Delivery info */}
            {checkout ? (
              <div className="mt-4 rounded-xl bg-white border border-zinc-100 p-3 text-xs text-zinc-500">
                <p className="font-bold text-zinc-700 mb-1">Delivering to</p>
                <p>{checkout.name}</p>
                <p>{checkout.address1}{checkout.address2 ? `, ${checkout.address2}` : ""}</p>
                <p>{checkout.city}, {checkout.state} — {checkout.pincode}</p>
              </div>
            ) : null}

            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery</span>
                <span className="font-bold">
                  {delivery === 0 ? <span className="text-brand">FREE</span> : `₹${delivery}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-extrabold">
                <span>Total</span>
                <span className="text-brand">₹{total}</span>
              </div>
            </div>

            {/* Trust signals */}
            <div className="mt-5 flex flex-col gap-1.5 text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                256-bit SSL encryption
              </span>
              <span className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Money-back guarantee
              </span>
              <span className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                UPI · Cards · Netbanking
              </span>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
