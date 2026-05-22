"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { persistOrderDraft } from "@/lib/orders";
import { createOrderOnBackend, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { computeCartDelivery } from "@/lib/pricing";
import type { StoredOrder } from "@/lib/types";

const CHECKOUT_KEY = "prints_checkout_form";
const PENDING_KEY  = "gharsip_rzp_pending";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void };
  }
}

type Checkout = {
  name: string; phone: string; email: string;
  address1: string; address2?: string; city: string; state: string; pincode: string;
  coupon?: string; subtotal: number; delivery: number; total: number;
};

function generateOrderId() {
  return `GH${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export default function PaymentPage() {
  const { lines, clearCart } = useCart();
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const checkoutRaw = typeof window !== "undefined" ? sessionStorage.getItem(CHECKOUT_KEY) : null;
  const checkout: Checkout | null = checkoutRaw ? JSON.parse(checkoutRaw) : null;

  const subtotal = checkout?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const delivery = checkout?.delivery ?? computeCartDelivery(subtotal);
  const total    = checkout?.total    ?? subtotal + delivery;

  // Load Razorpay checkout.js
  useEffect(() => {
    if (document.getElementById("rzp-sdk")) { setSdkReady(true); return; }
    const s   = document.createElement("script");
    s.id      = "rzp-sdk";
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => setSdkReady(true);
    s.onerror = () => setError("Could not load Razorpay SDK. Check your internet connection.");
    document.head.appendChild(s);
  }, []);

  const handlePay = async () => {
    setError(null);
    if (!checkout || lines.length === 0) {
      setError("Cart or delivery details missing — go back to checkout.");
      return;
    }
    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded yet — please wait and try again.");
      return;
    }

    setBusy(true);
    try {
      const gharsipOrderId = generateOrderId();

      // 1 — Create a Razorpay order on our server
      const res = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:  checkout.total,
          receipt: gharsipOrderId,
          notes:   { name: checkout.name, phone: checkout.phone },
        }),
      });

      const rzpOrder = await res.json() as { orderId?: string; error?: string };
      if (!res.ok || !rzpOrder.orderId) {
        setError(rzpOrder.error ?? "Could not create payment order. Please try again.");
        setBusy(false);
        return;
      }

      // 2 — Save pending data to sessionStorage (survives Razorpay redirect)
      const pending: Omit<StoredOrder, "id" | "createdAt"> & { gharsipOrderId: string } = {
        gharsipOrderId,
        lines:         lines.map((l) => ({ ...l })),
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
        coupon:        checkout.coupon,
        subtotal:      checkout.subtotal,
        delivery:      checkout.delivery,
        total:         checkout.total,
        paymentId:     "",
        paymentStatus: "pending",
        timeline:      [],
      };
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

      // 3 — Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount:      Math.round(checkout.total * 100),
        currency:    "INR",
        name:        "Gharsip Custom Prints",
        description: `Order ${gharsipOrderId}`,
        image:       `${window.location.origin}/favicon.ico`,
        order_id:    rzpOrder.orderId,
        prefill: {
          name:    checkout.name,
          email:   checkout.email || `${checkout.phone}@gharsip.in`,
          contact: checkout.phone.replace(/\D/g, "").slice(-10),
        },
        theme: { color: "#2E7D32" },

        // 4 — Payment success handler
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id:   string;
          razorpay_signature:  string;
        }) => {
          setBusy(true);
          setError(null);
          try {
            // Verify signature server-side
            const verifyRes = await fetch("/api/razorpay/verify", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json() as { valid?: boolean; error?: string };
            if (!verifyRes.ok || !verifyData.valid) {
              setError(verifyData.error ?? "Payment signature invalid. Contact support.");
              setBusy(false);
              return;
            }

            // Finalise order
            const pendingRaw = sessionStorage.getItem(PENDING_KEY);
            if (!pendingRaw) throw new Error("Pending order data lost.");

            const p = JSON.parse(pendingRaw) as typeof pending;
            const finalPayload: Omit<StoredOrder, "id" | "createdAt"> = {
              lines:         p.lines,
              customer:      p.customer,
              coupon:        p.coupon,
              subtotal:      p.subtotal,
              delivery:      p.delivery,
              total:         p.total,
              paymentId:     response.razorpay_payment_id,
              paymentStatus: "paid",
              timeline:      [],
            };

            let finalId: string;
            if (isGharsipApiEnabled()) {
              const { id } = await createOrderOnBackend(finalPayload);
              sessionStorage.setItem(`prints_confirm_phone:${id}`, p.customer.phone.trim());
              finalId = id;
            } else {
              const saved = persistOrderDraft(finalPayload);
              finalId = saved.id;
            }

            clearCart();
            sessionStorage.removeItem(PENDING_KEY);
            sessionStorage.removeItem(CHECKOUT_KEY);

            // Auto-submit to Qikink (fire-and-forget; admin can retry from panel)
            fetch("/api/qikink/create-order", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gharsipOrderId: finalId,
                lines:          p.lines,
                customer:       p.customer,
              }),
            }).catch(() => { /* handled in admin panel */ });

            window.location.href = `/order-confirmed?order=${encodeURIComponent(finalId)}`;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Order finalisation failed. Contact support.");
            setBusy(false);
          }
        },

        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      rzp.open();
      // don't clear busy here — cleared in handler / ondismiss
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-10">

        {/* Left */}
        <div className="lg:col-span-7">
          <Link href="/checkout" className="text-xs font-bold text-brand hover:underline">← Edit address</Link>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Secure Payment</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Powered by <span className="font-bold text-[#0057b7]">Razorpay</span> — UPI · Cards · Netbanking · Wallets
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Main pay block */}
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Amount to pay</p>
                <p className="mt-1 text-4xl font-extrabold text-brand">₹{total}</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
                🔒 Secure checkout
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["UPI / GPay / PhonePe", "Debit Card", "Credit Card", "Netbanking", "Wallets", "EMI"].map((m) => (
                <span key={m} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{m}</span>
              ))}
            </div>

            <button
              type="button"
              disabled={busy || !sdkReady || lines.length === 0}
              onClick={() => void handlePay()}
              className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg hover:bg-brand-dark disabled:opacity-60 transition"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing…
                </span>
              ) : !sdkReady ? "Loading…" : `Pay ₹${total} with Razorpay`}
            </button>

            <p className="mt-3 text-center text-xs text-zinc-400">
              Your card/bank details go directly to Razorpay — Gharsip never sees them.
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-zinc-400">
            <span>🔐 256-bit SSL</span>
            <span>✅ RBI licensed gateway</span>
            <span>↩️ Easy refund if needed</span>
          </div>
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
