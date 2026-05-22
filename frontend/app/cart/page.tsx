"use client";

import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { useCart, summarizeProductType } from "@/lib/CartContext";
import { computeCartDelivery, FREE_DELIVERY_OVER } from "@/lib/pricing";

export default function CartPage() {
  const { lines, removeLine, setQty } = useCart();
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const delivery = computeCartDelivery(subtotal);
  const total = subtotal + delivery;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <h1 className="text-3xl font-extrabold">Your cart</h1>
          {lines.length === 0 ? (
            <p className="mt-6 text-zinc-500">
              Empty for now —{" "}
              <Link className="font-bold text-brand hover:underline" href="/customize">
                start designing
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {lines.map((line) => (
                <li
                  key={line.lineId}
                  className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-2 ring-transparent"
                    style={{ backgroundColor: line.colorHex }}
                  >
                    {line.designUrl ? (
                      <Image
                        src={line.designUrl}
                        alt=""
                        fill
                        className="object-cover opacity-95"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900">
                      {line.designName ?? "Plain tee"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {summarizeProductType(line.productType)} · {line.colorLabel} · Size {line.size}
                    </p>
                    <p className="mt-2 text-sm font-bold text-brand">₹{line.unitPrice} each</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center rounded-lg border border-zinc-200">
                        <button type="button" className="px-3 py-1 font-bold" onClick={() => setQty(line.lineId, line.qty - 1)}>
                          −
                        </button>
                        <span className="w-8 text-center font-bold">{line.qty}</span>
                        <button type="button" className="px-3 py-1 font-bold" onClick={() => setQty(line.lineId, line.qty + 1)}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-bold text-red-600 underline"
                        onClick={() => removeLine(line.lineId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-extrabold">₹{line.unitPrice * line.qty}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="mt-10 lg:col-span-5 lg:mt-0">
          <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h2 className="text-lg font-extrabold">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Delivery</span>
                <span className="font-bold">
                  {delivery === 0 ? <span className="text-brand">FREE</span> : `₹${delivery}`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Free delivery on orders above ₹{FREE_DELIVERY_OVER}.
              </p>
              <div className="flex justify-between border-t border-zinc-200 pt-3 text-lg font-extrabold">
                <span>Total</span>
                <span className="text-brand">₹{total}</span>
              </div>
            </div>
            <Link
              href={lines.length ? "/checkout" : "#"}
              className={`mt-6 block w-full rounded-2xl py-3.5 text-center text-sm font-extrabold text-white ${
                lines.length ? "bg-brand hover:bg-brand-dark" : "cursor-not-allowed bg-zinc-300"
              }`}
              aria-disabled={!lines.length}
            >
              Proceed to pay
            </Link>
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
