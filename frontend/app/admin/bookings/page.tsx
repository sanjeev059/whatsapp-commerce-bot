"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  service: string;
  pickupDate: string;
  amount: number;
  status: string;
  notes?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  picked_up: "Picked Up",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-brand-muted text-brand",
  picked_up: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function AdminBookingsPage() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chat-bookings", {
        headers: { "x-admin-pin": adminPin },
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await res.text());
        setBookings([]);
        return;
      }
      const j = (await res.json()) as { bookings?: Booking[] };
      setBookings(j.bookings ?? []);
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

  if (!ok) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
        <h1 className="text-2xl font-extrabold">Bookings Admin</h1>
        <p className="text-sm text-zinc-500">AI chat service bookings from Gharsip assistant.</p>
        <form onSubmit={login} className="mt-4 space-y-3">
          <input
            type="password"
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin PIN"
          />
          <button type="submit" className="w-full rounded-xl bg-brand py-3 font-bold text-white">
            Unlock
          </button>
        </form>
        <Link href="/admin" className="mt-4 text-center text-sm text-brand">
          ← Back to Orders Admin
        </Link>
      </div>
    );
  }

  const today = new Date().toDateString();
  const todayBookings = bookings.filter((b) => new Date(b.createdAt).toDateString() === today);
  const totalValue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Gharsip · Chat Bookings</h1>
          <p className="text-xs text-zinc-500">Service bookings captured via the AI assistant.</p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/admin" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold">
            Orders Admin
          </Link>
          <button
            type="button"
            className="text-sm font-bold text-red-600"
            onClick={() => { setOk(false); setAdminPin(""); setBookings([]); }}
          >
            Lock
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Today bookings</p>
          <p className="mt-2 text-3xl font-extrabold">{todayBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Total bookings</p>
          <p className="mt-2 text-3xl font-extrabold">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">Pipeline value</p>
          <p className="mt-2 text-3xl font-extrabold text-brand">₹{totalValue.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Service</th>
              <th className="p-3">Pickup Date</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No bookings yet — they appear here after customers confirm via the chat widget.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <BookingRow key={b.id} booking={b} adminPin={adminPin} onSaved={() => void refresh()} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingRow({
  booking: b,
  adminPin,
  onSaved,
}: {
  booking: Booking;
  adminPin: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(b.status);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/chat-bookings?id=${encodeURIComponent(b.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const colorClass = STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-600";

  return (
    <>
      <tr className="border-t border-zinc-100">
        <td className="p-3 font-mono text-xs font-bold text-zinc-600">{b.id}</td>
        <td className="p-3">
          <div className="font-semibold">{b.customerName}</div>
          <div className="text-xs text-zinc-500">{b.customerPhone}</div>
        </td>
        <td className="p-3 max-w-[180px]">
          <div className="line-clamp-2 text-xs">{b.service}</div>
        </td>
        <td className="p-3 text-xs">{b.pickupDate}</td>
        <td className="p-3 font-bold">₹{b.amount.toLocaleString("en-IN")}</td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </td>
        <td className="p-3">
          <button
            type="button"
            className="text-xs font-bold text-brand"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Manage"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50">
          <td colSpan={7} className="p-4 text-xs">
            <div className="mb-2 text-zinc-600"><span className="font-semibold">Address:</span> {b.address}</div>
            {b.notes && <div className="mb-3 text-zinc-600"><span className="font-semibold">Notes:</span> {b.notes}</div>}
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={saving || status === key}
                  onClick={() => void updateStatus(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                    status === key
                      ? "bg-brand text-white"
                      : "border border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
