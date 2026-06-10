"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isGharsipApiEnabled } from "@/lib/gharsipApi";
import type { DeliveryLogEntry, Subscription } from "@/lib/types";

const STATUS_LABELS: Record<Subscription["status"], string> = {
  pending_confirmation: "Pending Confirmation",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_COLORS: Record<Subscription["status"], string> = {
  pending_confirmation: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

const PAYMENT_LABELS: Record<Subscription["paymentStatus"], string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
};

const PAYMENT_COLORS: Record<Subscription["paymentStatus"], string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const useBackend = isGharsipApiEnabled();

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backend-subscriptions", {
        headers: { "x-admin-pin": adminPin },
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await res.text());
        setSubs([]);
        return;
      }
      const j = (await res.json()) as { subscriptions?: Subscription[] };
      setSubs(j.subscriptions ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    if (ok) void refresh();
  }, [ok, refresh]);

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

  const lockout = () => {
    setOk(false);
    setAdminPin("");
    setSubs([]);
  };

  if (!ok) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <p className="text-sm text-zinc-500">
          PIN unlocks subscription management. Set{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">PRINTS_OPS_PIN</code> on Vercel
          to change it.
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

  const today = new Date().toDateString();
  const todaySubs = subs.filter((s) => new Date(s.createdAt).toDateString() === today);
  const activeSubs = subs.filter((s) => s.status === "active");
  const pendingSubs = subs.filter((s) => s.status === "pending_confirmation");

  const subtitle = useBackend
    ? `Subscriptions from Mongo (${process.env.NEXT_PUBLIC_BACKEND_URL}).`
    : "Set NEXT_PUBLIC_BACKEND_URL + backend for Mongo-backed subscriptions.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Gharsip · Subscriptions</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/admin/bookings" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold">
            Bookings Admin
          </Link>
          <button type="button" className="text-sm font-bold text-red-600" onClick={lockout}>
            Lock
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Total subscriptions</p>
          <p className="mt-2 text-3xl font-extrabold">{subs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Active</p>
          <p className="mt-2 text-3xl font-extrabold text-brand">{activeSubs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Pending confirmation</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{pendingSubs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Today</p>
          <p className="mt-2 text-3xl font-extrabold">{todaySubs.length}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  No subscriptions yet — they appear here after customers subscribe.
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <SubscriptionAdminRow key={s.id} sub={s} adminPin={adminPin} onSaved={() => void refresh()} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionAdminRow({
  sub,
  adminPin,
  onSaved,
}: {
  sub: Subscription;
  adminPin: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(sub.status);
  const [paymentStatus, setPaymentStatus] = useState(sub.paymentStatus);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>(sub.deliveryLog);
  const [newDate, setNewDate] = useState("");
  const [newStatus, setNewStatus] = useState("delivered");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/backend-subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        alert(await res.text());
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const addDeliveryEntry = () => {
    if (!newDate) return;
    const entry: DeliveryLogEntry = { date: newDate, status: newStatus, note: newNote || undefined };
    const updated = [...deliveryLog, entry];
    setDeliveryLog(updated);
    setNewDate("");
    setNewNote("");
    void save({ deliveryLog: updated });
  };

  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="p-3 font-mono font-bold">{sub.id}</td>
        <td className="p-3">
          <div className="font-semibold">{sub.customer.name}</div>
          <div className="text-xs text-zinc-500">{sub.customer.phone}</div>
        </td>
        <td className="p-3">{sub.planName}</td>
        <td className="p-3 text-xs">{sub.startDate}</td>
        <td className="p-3 font-bold">₹{sub.priceMonthly.toLocaleString("en-IN")}</td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[paymentStatus]}`}>
            {PAYMENT_LABELS[paymentStatus]}
          </span>
        </td>
        <td className="p-3">
          <button type="button" className="text-xs font-bold text-brand" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Manage"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="bg-zinc-50">
          <td colSpan={8} className="p-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold text-zinc-700">Customer</p>
                <p className="text-zinc-600">{sub.customer.email}</p>
                <p className="text-zinc-600">
                  {sub.customer.address1}
                  {sub.customer.address2 ? `, ${sub.customer.address2}` : ""}, {sub.customer.city},{" "}
                  {sub.customer.state} – {sub.customer.pincode}
                </p>
                {sub.dietPreference ? (
                  <p className="mt-1 text-zinc-600">
                    Diet: <span className="font-semibold capitalize">{sub.dietPreference}</span>
                  </p>
                ) : null}
                {sub.notes ? <p className="mt-1 text-zinc-600">Notes: {sub.notes}</p> : null}
              </div>

              <div>
                <p className="mb-2 font-semibold text-zinc-700">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_LABELS) as Subscription["status"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || status === key}
                      onClick={() => {
                        setStatus(key);
                        void save({ status: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        status === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {STATUS_LABELS[key]}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 font-semibold text-zinc-700">Payment</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PAYMENT_LABELS) as Subscription["paymentStatus"][]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={saving || paymentStatus === key}
                      onClick={() => {
                        setPaymentStatus(key);
                        void save({ paymentStatus: key });
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                        paymentStatus === key
                          ? "bg-brand text-white"
                          : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {PAYMENT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-semibold text-zinc-700">Delivery log</p>
              {deliveryLog.length > 0 ? (
                <ul className="mb-3 space-y-1">
                  {deliveryLog.map((entry, i) => (
                    <li
                      key={`${entry.date}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5"
                    >
                      <span>{entry.date}</span>
                      <span className="font-semibold">{entry.status}</span>
                      {entry.note ? <span className="text-zinc-500">{entry.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-zinc-500">No delivery entries yet.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <select
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="delivered">Delivered</option>
                  <option value="skipped">Skipped</option>
                  <option value="missed">Missed</option>
                </select>
                <input
                  className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="Note (optional)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg bg-brand px-4 py-2 font-bold text-white disabled:bg-zinc-400"
                  disabled={saving || !newDate}
                  onClick={addDeliveryEntry}
                >
                  {saving ? "Saving…" : "Add entry"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
