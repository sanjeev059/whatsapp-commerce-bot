"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { fetchSubscription, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Subscription } from "@/lib/types";

function Inner() {
  const sp = useSearchParams();
  const subId = sp.get("id") ?? "";
  const phone = sp.get("phone") ?? "";

  const [sub, setSub] = useState<Subscription | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "failed">("loading");

  useEffect(() => {
    if (!subId || !phone) {
      setStatus("failed");
      return;
    }
    if (!isGharsipApiEnabled()) {
      setStatus("failed");
      return;
    }

    let cancelled = false;
    fetchSubscription(subId, phone)
      .then((s) => {
        if (cancelled) return;
        setSub(s);
        setStatus(s ? "done" : "failed");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [subId, phone]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="mt-4 text-zinc-500">Loading your subscription…</p>
      </div>
    );
  }

  if (status === "failed" || !sub) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Couldn&apos;t load your subscription</h1>
        <p className="mt-2 text-sm text-zinc-500">
          If you just submitted the form, message us on WhatsApp and we&apos;ll confirm it manually.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={buildWhatsAppLink(`Hi Gharsip, I just subscribed (ref: ${subId || "n/a"}). Please confirm.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
          >
            Contact us on WhatsApp
          </a>
          <Link href="/plans" className="text-sm font-bold text-zinc-500 hover:text-brand">
            ← Back to plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
        <svg
          className="h-10 w-10 text-brand"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-zinc-900">Subscription requested!</h1>
      <p className="mt-2 font-mono text-sm font-bold text-brand">#{sub.id}</p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
        <p className="font-extrabold text-zinc-800">{sub.planName}</p>
        <div className="mt-3 space-y-1.5 text-sm text-zinc-600">
          <p>
            Start date: <span className="font-semibold text-zinc-900">{sub.startDate}</span>
          </p>
          <p>
            {sub.billingCycle === "weekly" ? "Weekly" : "Monthly"} price:{" "}
            <span className="font-semibold text-zinc-900">₹{sub.priceMonthly.toLocaleString("en-IN")}</span>
          </p>
          <p>
            Delivery to: <span className="font-semibold text-zinc-900">{sub.customer.address1}, {sub.customer.city}</span>
          </p>
          <p>
            Status: <span className="font-semibold text-amber-700">Pending confirmation</span>
          </p>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Our team will WhatsApp you shortly to confirm your start date and payment.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <a
          href={buildWhatsAppLink(`Hi Gharsip, I just subscribed to ${sub.planName} (ref: ${sub.id}). Please confirm my order.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark"
        >
          Confirm on WhatsApp
        </a>
        <Link
          href={`/track?phone=${encodeURIComponent(sub.customer.phone)}`}
          className="block rounded-2xl border border-brand py-3.5 font-extrabold text-brand hover:bg-brand-muted"
        >
          Track your subscription
        </Link>
        <Link href="/menu" className="text-sm font-bold text-zinc-500 hover:text-brand">
          Browse today&apos;s menu →
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionConfirmedPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-zinc-500">Loading…</div>}>
      <Inner />
      <Footer />
    </Suspense>
  );
}
