"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { persistOrderDraft } from "@/lib/orders";
import type { StoredOrder } from "@/lib/types";

const CHECKOUT_KEY = "prints_checkout_form";

export default function PaymentPage() {
  const { lines, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lines.length === 0 && typeof window !== "undefined") {
      const has = sessionStorage.getItem(CHECKOUT_KEY);
      if (!has) setError("Your cart is empty. Add a tee first.");
    }
  }, [lines.length]);

  const payDemo = () => {
    setError(null);
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    if (!raw || lines.length === 0) {
      setError("Missing checkout details — go back to checkout.");
      return;
    }
    const c = JSON.parse(raw) as {
      name: string;
      phone: string;
      email: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      pincode: string;
      coupon?: string;
      subtotal: number;
      delivery: number;
      total: number;
    };

    const payload: Omit<StoredOrder, "id" | "createdAt"> = {
      lines: lines.map((l) => ({ ...l })),
      customer: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        address1: c.address1,
        address2: c.address2,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
      },
      coupon: c.coupon,
      subtotal: c.subtotal,
      delivery: c.delivery,
      total: c.total,
      paymentId: `pay_demo_${Date.now()}`,
      paymentStatus: "paid",
      timeline: [],
    };

    const order = persistOrderDraft(payload);
    clearCart();
    sessionStorage.removeItem(CHECKOUT_KEY);
    window.location.href = `/order-confirmed?order=${encodeURIComponent(order.id)}`;
  };

  return (
    <>
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold">Payment</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Razorpay (UPI / cards / netbanking) hooks in via env keys. For your first deploy, use the demo
          button — then wire <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_RAZORPAY_KEY_ID</code> +
          server verify.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={payDemo}
            className="rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg hover:bg-brand-dark"
          >
            Simulate paid order (demo)
          </button>
          <button
            type="button"
            onClick={() => setError("Add Razorpay Checkout script — see README.")}
            className="rounded-2xl border border-zinc-300 py-4 font-bold text-zinc-800"
          >
            Pay with Razorpay (needs keys)
          </button>
        </div>
        <Link href="/checkout" className="mt-6 inline-block text-sm font-bold text-brand hover:underline">
          ← Edit details
        </Link>
      </div>
      <Footer />
    </>
  );
}
