"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listOrderIds, loadOrder, saveOrder } from "@/lib/orders";
import { isGharsipApiEnabled, storedOrderFromApi } from "@/lib/gharsipApi";
import type { StoredOrder } from "@/lib/types";

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [tick, setTick] = useState(0);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [backendErr, setBackendErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const useBackend = isGharsipApiEnabled();

  const refreshOrders = useCallback(async () => {
    setBackendErr(null);
    setLoading(true);
    try {
      if (useBackend) {
        const res = await fetch("/api/admin/backend-orders", {
          headers: { "x-admin-pin": adminPin },
          cache: "no-store",
        });
        if (!res.ok) {
          const t = await res.text();
          setBackendErr(t || `${res.status} ${res.statusText}`);
          setOrders([]);
          return;
        }
        const j = (await res.json()) as { orders?: Record<string, unknown>[] };
        setOrders((j.orders || []).map((x) => storedOrderFromApi(x)));
        return;
      }
      setOrders(
        listOrderIds()
          .map((id) => loadOrder(id))
          .filter(Boolean) as StoredOrder[]
      );
    } finally {
      setLoading(false);
    }
  }, [useBackend, adminPin]);

  useEffect(() => {
    if (!ok || typeof window === "undefined") {
      setOrders([]);
      return;
    }
    void refreshOrders();
  }, [ok, tick, refreshOrders]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PIN || "gharsip2026";
    if (pw === expected) {
      setAdminPin(pw);
      setOk(true);
      setPw("");
    } else {
      alert("Wrong PIN");
    }
  };

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const revenueToday = todayOrders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);

  const lockout = () => {
    setOk(false);
    setAdminPin("");
    setOrders([]);
  };

  if (!ok) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <p className="text-sm text-zinc-500">
          PIN unlocks this page. Use the same PIN for server-backed orders (see{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">PRINTS_OPS_PIN</code> optional on Vercel).
        </p>
        <form onSubmit={login} className="mt-4 space-y-3">
          <input
            type="password"
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="PIN"
          />
          <button type="submit" className="w-full rounded-xl bg-brand py-3 font-bold text-white">
            Unlock
          </button>
        </form>
        <Link href="/" className="mt-8 text-center text-sm text-brand">
          ← Storefront
        </Link>
      </div>
    );
  }

  const subtitle = useBackend
    ? `Orders from Mongo (${process.env.NEXT_PUBLIC_BACKEND_URL}).`
    : "Orders from this browser only — set NEXT_PUBLIC_BACKEND_URL + backend for Mongo-backed ops.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Gharsip Custom Prints · Ops</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
          {backendErr ? <p className="mt-2 text-xs text-red-600">{backendErr}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {useBackend ? (
            <button
              type="button"
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold"
              disabled={loading}
              onClick={() => {
                void refreshOrders();
              }}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold"
              onClick={() => setTick((t) => t + 1)}
            >
              Refresh
            </button>
          )}
          <button type="button" className="text-sm font-bold text-red-600" onClick={lockout}>
            Lock
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Today orders</p>
          <p className="mt-2 text-3xl font-extrabold">{todayOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Revenue today</p>
          <p className="mt-2 text-3xl font-extrabold text-brand">₹{revenueToday}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">{useBackend ? "All orders (server)" : "All orders (this browser)"}</p>
          <p className="mt-2 text-3xl font-extrabold">{orders.length}</p>
        </div>
      </div>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Specs</th>
              <th className="p-3">Paid</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  {useBackend ? "No server orders yet — place one from checkout." : "No demo orders yet. Place one via “Simulate paid order”."}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <OrderAdminRow
                  key={o.id}
                  o={o}
                  useBackend={useBackend}
                  adminPin={adminPin}
                  onSaved={() => setTick((t) => t + 1)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderAdminRow({
  o,
  onSaved,
  useBackend,
  adminPin,
}: {
  o: StoredOrder;
  onSaved: () => void;
  useBackend: boolean;
  adminPin: string;
}) {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState(o.tracking || "");
  const [qk, setQk] = useState(o.qikinkId || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTrack(o.tracking || "");
    setQk(o.qikinkId || "");
  }, [o.id, o.tracking, o.qikinkId]);

  const save = async () => {
    if (useBackend) {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/backend-orders/${encodeURIComponent(o.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-pin": adminPin,
          },
          body: JSON.stringify({
            tracking: track.trim() || null,
            qikinkId: qk.trim() || null,
          }),
        });
        if (!res.ok) {
          alert(await res.text());
          return;
        }
        onSaved();
      } finally {
        setSaving(false);
      }
      return;
    }
    saveOrder({ ...o, tracking: track || undefined, qikinkId: qk || undefined });
    onSaved();
  };

  const qikinkPayload = JSON.stringify(
    {
      product_id: "[QIKINK_PRODUCT_ID]",
      design_url: o.lines[0]?.designUrl ?? "",
      size: o.lines[0]?.size,
      color: o.lines[0]?.colorLabel,
      quantity: o.lines.reduce((s, l) => s + l.qty, 0),
      shipping_name: o.customer.name,
      shipping_phone: o.customer.phone,
      shipping_address: [o.customer.address1, o.customer.address2].filter(Boolean).join(", "),
      shipping_pincode: o.customer.pincode,
      shipping_city: o.customer.city,
      shipping_state: o.customer.state,
    },
    null,
    2
  );

  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="p-3 font-mono font-bold">{o.id}</td>
        <td className="p-3">
          <div className="font-semibold">{o.customer.name}</div>
          <div className="text-xs text-zinc-500">{o.customer.phone}</div>
        </td>
        <td className="p-3 text-xs">
          {o.lines.map((l) => (
            <div key={l.lineId}>
              {(l.designName ?? "Plain")} · {l.colorLabel} · {l.size} ×{l.qty}
            </div>
          ))}
        </td>
        <td className="p-3 font-bold">₹{o.total}</td>
        <td className="p-3">
          <button type="button" className="text-xs font-bold text-brand" onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Expand"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-zinc-50">
          <td colSpan={5} className="p-4 text-xs">
            <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-4 text-[11px] text-green-200">{qikinkPayload}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                className="flex-1 min-w-[200px] rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="Courier tracking URL or ID"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              />
              <input
                className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 px-3 py-2"
                placeholder="Qikink ref"
                value={qk}
                onChange={(e) => setQk(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg bg-brand px-4 py-2 font-bold text-white disabled:bg-zinc-400"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save refs"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2 font-bold"
                onClick={() => navigator.clipboard.writeText(qikinkPayload)}
              >
                Copy Qikink JSON
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
