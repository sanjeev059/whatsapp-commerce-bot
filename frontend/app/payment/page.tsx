"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { computeCartDelivery } from "@/lib/pricing";

const CHECKOUT_KEY = "prints_checkout_form";
const PENDING_KEY  = "gharsip_cf_pending";

// Cashfree SDK v3 global type
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => any;
  }
}

const CF_ENV = (process.env.NEXT_PUBLIC_CASHFREE_ENV ?? "sandbox") as "sandbox" | "production";

type Checkout = {
  name: string; phone: string; email: string;
  address1: string; address2?: string; city: string; state: string; pincode: string;
  coupon?: string; subtotal: number; delivery: number; total: number;
};

function generateOrderId(): string {
  return `GH${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function PaymentPage() {
  const { lines } = useCart();
  const [sdkReady, setSdkReady]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const checkoutRaw = typeof window !== "undefined" ? sessionStorage.getItem(CHECKOUT_KEY) : null;
  const checkout: Checkout | null = checkoutRaw ? JSON.parse(checkoutRaw) : null;

  const subtotal = checkout?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const delivery = checkout?.delivery ?? computeCartDelivery(subtotal);
  const total    = checkout?.total    ?? subtotal + delivery;

  // Load Cashfree JS SDK
  useEffect(() => {
    if (document.getElementById("cf-sdk")) { setSdkReady(true); return; }
    const s = document.createElement("script");
    s.id  = "cf-sdk";
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => setSdkReady(true);
    s.onerror = () => setError("Could not load payment SDK. Please refresh.");
    document.head.appendChild(s);
  }, []);

  const handlePay = async () => {
    setError(null);
    if (!checkout || lines.length === 0) {
      setError("Cart is empty or delivery details missing — go back to checkout.");
      return;
    }
    if (!window.Cashfree) {
      setError("Payment SDK not loaded yet — please wait a moment and try again.");
      return;
    }

    setBusy(true);
    try {
      const orderId   = generateOrderId();
      const returnUrl = `${window.location.origin}/order-confirmed?order=${orderId}&cf=1`;

      // Save everything we need after the redirect
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({
        orderId,
        lines: lines.map((l) => ({ ...l })),
        customer: {
          name:    checkout.name,
          phone:   checkout.phone,
          email:   checkout.email,
          address1: checkout.address1,
          address2: checkout.address2,
          city:    checkout.city,
          state:   checkout.state,
          pincode: checkout.pincode,
        },
        coupon:   checkout.coupon,
        subtotal: checkout.subtotal,
        delivery: checkout.delivery,
        total:    checkout.total,
      }));

      // Create Cashfree order (server-side call keeps secret key hidden)
      const res = await fetch("/api/cashfree/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount:         checkout.total,
          customerName:   checkout.name,
          customerEmail:  checkout.email,
          customerPhone:  checkout.phone,
          returnUrl,
        }),
      });

      const data = await res.json() as { payment_session_id?: string; error?: string };
      if (!res.ok || !data.payment_session_id) {
        setError(data.error ?? "Could not create payment session. Try again.");
        setBusy(false);
        return;
      }

      // Open Cashfree checkout modal / redirect
      const cashfree = window.Cashfree({ mode: CF_ENV });
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl,
      });

      // If SDK opens a modal (not a redirect), the user stays on this page.
      // After they close it, we rely on the returnUrl redirect.
      // Just stop the spinner after a moment.
      setTimeout(() => setBusy(false), 3000);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-10">

        {/* Left — payment panel */}
        <div className="lg:col-span-7">
          <Link href="/checkout" className="text-xs font-bold text-brand hover:underline">← Edit address</Link>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Secure Checkout</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Powered by <span className="font-bold text-[#1e3a5f]">Cashfree Payments</span> — UPI · Cards · Netbanking · Wallets
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Cashfree branding block */}
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Amount to pay</p>
                <p className="mt-1 text-4xl font-extrabold text-brand">₹{total}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
                  🔒 256-bit SSL
                </span>
                <span className="text-[10px] text-zinc-400">Secured by Cashfree</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["UPI / GPay / PhonePe", "Debit Card", "Credit Card", "Netbanking", "Wallets"].map((m) => (
                <span key={m} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                  {m}
                </span>
              ))}
            </div>

            <button
              type="button"
              disabled={busy || !sdkReady || lines.length === 0}
              onClick={() => void handlePay()}
              className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Opening payment…
                </span>
              ) : !sdkReady ? (
                "Loading payment SDK…"
              ) : (
                `Pay ₹${total} securely`
              )}
            </button>

            <p className="mt-3 text-center text-xs text-zinc-400">
              You&apos;ll be taken to Cashfree&apos;s secure payment screen. Your card details are never stored by Gharsip.
            </p>
          </div>

          {/* Trust row */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-zinc-400">
            {[
              { icon: "🔐", text: "End-to-end encrypted" },
              { icon: "✅", text: "RBI authorised gateway" },
              { icon: "↩️", text: "Easy refund if order fails" },
            ].map((t) => (
              <span key={t.text} className="flex items-center gap-1.5">{t.icon} {t.text}</span>
            ))}
          </div>

          <Link href="/checkout" className="mt-6 inline-block text-sm font-bold text-brand hover:underline">
            ← Change delivery address
          </Link>
        </div>

        {/* Right — order summary */}
        <aside className="mt-10 lg:col-span-5 lg:mt-0">
          <div className="sticky top-24 rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-500">Order Summary</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.lineId} className="flex items-start justify-between gap-3 text-sm">
                  <div className="h-12 w-10 shrink-0 rounded-lg border border-zinc-200" style={{ backgroundColor: l.colorHex }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{l.designName ?? "Plain tee"}</p>
                    <p className="text-xs text-zinc-500">{l.colorLabel} · Size {l.size} · ×{l.qty}</p>
                  </div>
                  <p className="font-bold text-zinc-900 shrink-0">₹{l.unitPrice * l.qty}</p>
                </li>
              ))}
            </ul>

            {checkout && (
              <div className="mt-4 rounded-xl bg-white border border-zinc-100 p-3 text-xs text-zinc-500">
                <p className="font-bold text-zinc-700 mb-1">Delivering to</p>
                <p className="font-semibold text-zinc-800">{checkout.name}</p>
                <p>{checkout.address1}{checkout.address2 ? `, ${checkout.address2}` : ""}</p>
                <p>{checkout.city}, {checkout.state} — {checkout.pincode}</p>
                <p className="mt-1 text-zinc-400">{checkout.phone}</p>
              </div>
            )}

            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery</span>
                <span className="font-bold">{delivery === 0 ? <span className="text-brand">FREE</span> : `₹${delivery}`}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-extrabold">
                <span>Total</span>
                <span className="text-brand">₹{total}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
