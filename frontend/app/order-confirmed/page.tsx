"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { loadOrder } from "@/lib/orders";
import { fetchOrderFromBackend, isGharsipApiEnabled } from "@/lib/gharsipApi";
import type { StoredOrder } from "@/lib/types";

function Inner() {
  const sp = useSearchParams();
  const id = sp.get("order") || "";
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setOrder(null);
      return;
    }
    let cancelled = false;

    async function run() {
      setLoadErr(null);
      if (isGharsipApiEnabled()) {
        const phone =
          typeof window !== "undefined"
            ? sessionStorage.getItem(`prints_confirm_phone:${id}`)
            : null;
        if (!phone) {
          setOrder(null);
          setLoadErr("missing_phone");
          return;
        }
        try {
          const o = await fetchOrderFromBackend(id, phone);
          if (!cancelled) {
            setOrder(o);
            setLoadErr(!o ? "not_found" : null);
          }
        } catch (e) {
          if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Load failed");
        }
        return;
      }
      const local = loadOrder(id);
      if (!cancelled) {
        setOrder(local);
        if (!local) setLoadErr("not_found");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-zinc-600">No order reference. Start from the customizer.</p>
        <Link href="/customize" className="mt-4 inline-block font-bold text-brand">
          Design a tee
        </Link>
      </div>
    );
  }

  if (!order) {
    if (loadErr === "missing_phone") {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-zinc-700">
            We couldn’t load order details outside the checkout session. Use Track order with your order number and
            phone instead.
          </p>
          <Link href={`/track?order=${encodeURIComponent(id)}`} className="mt-6 inline-block font-bold text-brand">
            Track order
          </Link>
        </div>
      );
    }
    if (loadErr === "not_found") {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-zinc-600">Order not found. Check the order number.</p>
          <Link href="/" className="mt-6 inline-block font-bold text-brand">
            Home
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-zinc-600">{loadErr ?? "Loading order…"}</p>
      </div>
    );
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(
    `Hi Gharsip — order #${order.id} confirmed. Please keep me posted!`
  )}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
        <svg className="h-10 w-10 text-brand animate-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-zinc-900">Order placed successfully!</h1>
      <p className="mt-2 text-brand-dark">
        Order <span className="font-mono font-bold">#{order.id}</span>
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm shadow-sm">
        <p className="font-bold text-zinc-800">Summary</p>
        <ul className="mt-2 space-y-1 text-zinc-600">
          {order.lines.map((l) => (
            <li key={l.lineId}>
              {(l.designName ?? "Plain")} × {l.qty} — {l.colorLabel}, {l.size}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-extrabold text-zinc-900">Paid ₹{order.total}</p>
        <p className="mt-1 text-xs text-zinc-500">Est. delivery · 4–5 business days.</p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={`/track?order=${order.id}`}
          className="block rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark"
        >
          Track your order
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="block rounded-2xl border border-brand py-3.5 font-extrabold text-brand hover:bg-brand-muted"
        >
          WhatsApp support
        </a>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-zinc-500">Loading…</div>}>
      <Inner />
      <Footer />
    </Suspense>
  );
}
