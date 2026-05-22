"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/Footer";
import { loadOrder } from "@/lib/orders";
import { fetchOrderFromBackend, isGharsipApiEnabled } from "@/lib/gharsipApi";
import type { StoredOrder } from "@/lib/types";

function TrackInner() {
  const sp = useSearchParams();
  const startOrder = sp.get("order") || "";
  const [orderId, setOrderId] = useState(startOrder);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [found, setFound] = useState<StoredOrder | null>(null);

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    const idNorm = orderId.replace(/^#/, "").trim();
    const p10 = phone.replace(/\D/g, "").slice(-10);

    if (idNorm.length < 5 || p10.length !== 10) {
      setMsg("Enter order number and a valid phone.");
      setFound(null);
      return;
    }

    if (isGharsipApiEnabled()) {
      try {
        const o = await fetchOrderFromBackend(idNorm, phone);
        if (!o) {
          setFound(null);
          setMsg("Order not found — check the ID and phone used at checkout.");
          return;
        }
        setMsg(null);
        setFound(o);
      } catch (err) {
        setFound(null);
        setMsg(err instanceof Error ? err.message : "Lookup failed.");
      }
      return;
    }

    const o = loadOrder(idNorm);
    if (!o) {
      setFound(null);
      setMsg(
        "Order not found in this browser. Add NEXT_PUBLIC_BACKEND_URL to pull orders from the server."
      );
      return;
    }
    const op = o.customer.phone.replace(/\D/g, "");
    if (p10.length < 10 || op.slice(-10) !== p10) {
      setMsg("Phone doesn’t match this order.");
      setFound(null);
      return;
    }
    setMsg(null);
    setFound(o);
  };

  const o = found;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold">Track order</h1>
      <p className="text-sm text-zinc-600">Enter order number and phone.</p>
      <form onSubmit={lookup} className="mt-6 flex flex-col gap-3">
        <input
          className="rounded-xl border border-zinc-300 px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-brand"
          placeholder="GH12345"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <input
          required
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className="rounded-2xl bg-brand py-3 font-extrabold text-white hover:bg-brand-dark">
          Track
        </button>
      </form>
      {msg ? <p className="mt-4 text-sm text-amber-800">{msg}</p> : null}
      {o ? (
        <div className="mt-10">
          <p className="text-sm font-bold text-zinc-500">Order #{o.id}</p>
          <ol className="relative mt-4 space-y-6 border-l-2 border-brand-muted pl-6">
            {o.timeline.map((step) => (
              <li key={step.key} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.done ? "bg-brand text-white" : step.current ? "bg-amber-400 text-black" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {step.done ? "✓" : step.current ? "…" : ""}
                </span>
                <p className="font-bold text-zinc-900">{step.label}</p>
                {step.at ? (
                  <p className="text-xs text-zinc-500">{new Date(step.at).toLocaleString()}</p>
                ) : null}
                {step.detail ? <p className="text-xs text-zinc-600">{step.detail}</p> : null}
              </li>
            ))}
          </ol>
          {o.tracking ? (
            <a
              href={
                o.tracking.startsWith("http") ? o.tracking : `https://www.google.com/search?q=${o.tracking}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sm font-bold text-brand underline"
            >
              Open courier tracking
            </a>
          ) : null}
          {o.qikinkId ? (
            <p className="mt-2 font-mono text-xs text-zinc-500">
              Print partner ref: <span>{o.qikinkId}</span>
            </p>
          ) : null}
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
