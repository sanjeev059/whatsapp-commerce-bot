"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/CartContext";
import { computeCartDelivery } from "@/lib/pricing";

const CHECKOUT_KEY = "prints_checkout_form";

export default function CheckoutPage() {
  const { lines } = useCart();
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const [coupon, setCoupon] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const discount = coupon.trim().toUpperCase() === "GHARSIP10" ? Math.min(100, Math.floor(subtotal * 0.1)) : 0;
  const adjustedSub = Math.max(0, subtotal - discount);
  const delivery = computeCartDelivery(adjustedSub);
  const total = adjustedSub + delivery;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...form, coupon: coupon.trim(), subtotal: adjustedSub, delivery, total };
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload));
    window.location.href = "/payment";
  };

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/cart" className="text-xs font-bold text-brand hover:underline">
          ← Back to cart
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Delivery details</h1>
        <p className="text-sm text-zinc-600">
          ₹{total} total · Razorpay on the next step.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {(
            [
              ["name", "Full name"],
              ["phone", "Phone (10 digit)"],
              ["email", "Email"],
              ["address1", "Address line 1"],
              ["address2", "Address line 2"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
            ] as const
          ).map(([k, ph]) => (
            <label key={k} className="block text-xs font-bold uppercase text-zinc-500">
              {ph}
              <input
                required={k !== "address2"}
                className="input mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:ring-2 focus:ring-brand"
                placeholder={ph}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="block text-xs font-bold uppercase text-zinc-500">
            Coupon
            <input
              className="input mt-1 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-brand"
              placeholder="Try GHARSIP10"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
          </label>
          <button type="submit" disabled={lines.length === 0} className="w-full rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:bg-zinc-300">
            Continue to payment
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
}
