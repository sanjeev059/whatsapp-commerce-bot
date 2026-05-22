"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { loadOrder, persistOrderDraft } from "@/lib/orders";
import { createOrderOnBackend, fetchOrderFromBackend, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { useCart } from "@/lib/CartContext";
import type { StoredOrder } from "@/lib/types";

const CHECKOUT_KEY = "prints_checkout_form";
const PENDING_KEY  = "gharsip_cf_pending";

type PendingOrder = Omit<StoredOrder, "id" | "createdAt" | "paymentId" | "paymentStatus" | "timeline">;

function Inner() {
  const sp          = useSearchParams();
  const orderId     = sp.get("order") ?? "";
  const isCashfree  = sp.get("cf") === "1";
  const { clearCart } = useCart();

  const [order,   setOrder]   = useState<StoredOrder | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [status,  setStatus]  = useState<"loading" | "verifying" | "done" | "failed">("loading");

  useEffect(() => {
    if (!orderId) { setStatus("failed"); setLoadErr("No order ID found."); return; }
    let cancelled = false;

    async function run() {
      setLoadErr(null);

      // ── Cashfree payment verification path ────────────────────────────
      if (isCashfree) {
        setStatus("verifying");
        try {
          const res  = await fetch(`/api/cashfree/verify?orderId=${encodeURIComponent(orderId)}`);
          const data = await res.json() as { status?: string; paymentId?: string; error?: string };

          if (!res.ok || data.status !== "SUCCESS") {
            if (!cancelled) {
              setStatus("failed");
              setLoadErr(data.error ?? `Payment status: ${data.status ?? "UNKNOWN"}. If money was deducted, contact support.`);
            }
            return;
          }

          // Payment verified — finalise the order
          const pendingRaw = sessionStorage.getItem(PENDING_KEY);
          if (!pendingRaw) {
            if (!cancelled) {
              setStatus("failed");
              setLoadErr("Payment succeeded but order data was lost. Please contact us with your payment ID: " + data.paymentId);
            }
            return;
          }

          const pending = JSON.parse(pendingRaw) as PendingOrder & { orderId: string };
          const payload: Omit<StoredOrder, "id" | "createdAt"> = {
            lines:         pending.lines,
            customer:      pending.customer,
            coupon:        pending.coupon,
            subtotal:      pending.subtotal,
            delivery:      pending.delivery,
            total:         pending.total,
            paymentId:     data.paymentId ?? "",
            paymentStatus: "paid",
            timeline:      [],
          };

          let finalOrder: StoredOrder;
          if (isGharsipApiEnabled()) {
            const { id } = await createOrderOnBackend(payload);
            finalOrder = { ...payload, id, createdAt: new Date().toISOString() };
          } else {
            finalOrder = persistOrderDraft(payload);
          }

          clearCart();
          sessionStorage.removeItem(PENDING_KEY);
          sessionStorage.removeItem(CHECKOUT_KEY);

          if (!cancelled) { setOrder(finalOrder); setStatus("done"); }
        } catch (e) {
          if (!cancelled) {
            setStatus("failed");
            setLoadErr(e instanceof Error ? e.message : "Verification failed. Contact support.");
          }
        }
        return;
      }

      // ── Existing local / backend order path (non-Cashfree) ────────────
      setStatus("loading");
      if (isGharsipApiEnabled()) {
        const phone = typeof window !== "undefined"
          ? sessionStorage.getItem(`prints_confirm_phone:${orderId}`)
          : null;
        if (!phone) {
          if (!cancelled) { setLoadErr("missing_phone"); setStatus("failed"); }
          return;
        }
        try {
          const o = await fetchOrderFromBackend(orderId, phone);
          if (!cancelled) {
            setOrder(o);
            setStatus(o ? "done" : "failed");
            if (!o) setLoadErr("not_found");
          }
        } catch (e) {
          if (!cancelled) { setLoadErr(e instanceof Error ? e.message : "Load failed"); setStatus("failed"); }
        }
        return;
      }

      const local = loadOrder(orderId);
      if (!cancelled) {
        setOrder(local);
        setStatus(local ? "done" : "failed");
        if (!local) setLoadErr("not_found");
      }
    }

    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isCashfree]);

  // ── Verifying state ───────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-6 text-lg font-bold text-zinc-800">Verifying your payment…</p>
        <p className="mt-2 text-sm text-zinc-500">Please don&apos;t close this tab.</p>
      </div>
    );
  }

  // ── Error / failed states ─────────────────────────────────────────────
  if (status === "failed" || (!order && status === "done")) {
    const msg = loadErr;
    if (msg === "missing_phone") {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-zinc-700">Track your order using order number + phone.</p>
          <Link href={`/track?order=${orderId}`} className="mt-4 inline-block font-bold text-brand">Track order →</Link>
        </div>
      );
    }
    if (msg === "not_found") {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-zinc-600">Order not found. Try tracking it below.</p>
          <Link href="/track" className="mt-4 inline-block font-bold text-brand">Track order →</Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Payment issue</h1>
        <p className="mt-2 text-sm text-red-600">{msg ?? "Something went wrong."}</p>
        <p className="mt-4 text-xs text-zinc-500">
          If money was deducted from your account, contact us on WhatsApp with your order ID: <span className="font-mono font-bold">{orderId}</span>
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/payment" className="rounded-2xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark">
            Try payment again
          </Link>
          <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer"
            className="rounded-2xl border border-brand px-6 py-3 font-bold text-brand hover:bg-brand-muted">
            Contact support on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-4 text-zinc-500">Loading order…</p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────
  const wa = `https://wa.me/?text=${encodeURIComponent(
    `Hi Gharsip — order #${order.id} placed! Please keep me posted on dispatch.`
  )}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
        <svg className="h-10 w-10 animate-check text-brand" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-zinc-900">Order confirmed!</h1>
      <p className="mt-2 font-mono text-sm font-bold text-brand">#{order.id}</p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
        <p className="font-extrabold text-zinc-800">What you ordered</p>
        <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
          {order.lines.map((l) => (
            <li key={l.lineId} className="flex justify-between">
              <span>{l.designName ?? "Plain tee"} — {l.colorLabel}, {l.size} × {l.qty}</span>
              <span className="font-semibold">₹{l.unitPrice * l.qty}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-zinc-100 pt-3 font-extrabold">
          <span>Total paid</span>
          <span className="text-brand">₹{order.total}</span>
        </div>
        {order.paymentId && (
          <p className="mt-2 text-xs text-zinc-400">Payment ID: {order.paymentId}</p>
        )}
        <p className="mt-1 text-xs text-zinc-400">Est. delivery · 4–5 business days</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link href={`/track?order=${order.id}`}
          className="block rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark">
          Track your order
        </Link>
        <a href={wa} target="_blank" rel="noreferrer"
          className="block rounded-2xl border border-brand py-3.5 font-extrabold text-brand hover:bg-brand-muted">
          WhatsApp support
        </a>
        <Link href="/shop" className="text-sm font-bold text-zinc-500 hover:text-brand">
          Continue shopping →
        </Link>
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
