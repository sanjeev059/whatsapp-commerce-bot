import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { CheckCircle2, Clock, MapPin, Truck, Package, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/format";

const STATUS_FLOW = [
  { id: "payment_verification_pending", label: "Payment under review", icon: Clock },
  { id: "payment_verified", label: "Payment verified", icon: CheckCircle2 },
  { id: "accepted", label: "Order accepted", icon: Package },
  { id: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export default function TrackOrder() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/track/${token}`, { headers: { Authorization: "" } });
      setOrder(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Order not found");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-center px-6" data-testid="track-error">
        <div>
          <div className="text-5xl">😕</div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }
  if (!order) return <div className="min-h-[100dvh] flex items-center justify-center text-[var(--text-muted)]">Loading…</div>;

  const isRejected = order.status === "rejected" || order.status === "cancelled";
  const currentIdx = STATUS_FLOW.findIndex((s) => s.id === order.status);

  return (
    <div className="min-h-[100dvh] pb-10" data-testid="track-page">
      <div className="px-5 pt-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Tracking</div>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <span className="font-mono">#{order.short_id}</span>
          <button onClick={load} className="ml-auto p-1.5 rounded-md hover:bg-[var(--surface)]" data-testid="track-refresh">
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{order.vendor?.name}</p>
      </div>

      <div className="px-5 mt-6">
        {isRejected ? (
          <div className="surface p-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(244,63,94,0.14)" }}>❌</div>
            <h3 className="mt-3 font-bold text-lg">Order {order.status === "rejected" ? "rejected" : "cancelled"}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">If you paid via UPI, the vendor will refund within 24 hours.</p>
          </div>
        ) : (
          <div className="surface p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-3">Status</div>
            <div className="space-y-3">
              {STATUS_FLOW.map((s, i) => {
                const isActive = i === currentIdx;
                const isDone = i < currentIdx;
                const Icon = s.icon;
                return (
                  <div key={s.id} className="flex items-center gap-3" data-testid={`track-step-${s.id}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: isDone || isActive ? "rgba(34,210,122,0.18)" : "var(--surface-2)",
                        color: isDone || isActive ? "var(--accent)" : "var(--text-faint)",
                      }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${isDone || isActive ? "font-semibold" : "text-[var(--text-faint)]"}`}>{s.label}</div>
                      {isActive && <div className="text-[11px] text-[var(--accent)] font-semibold">In progress…</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 mt-4 surface p-4 mx-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">Order summary</div>
        <ul className="text-sm divide-y divide-[var(--border-soft)]">
          {order.items.map((it, i) => (
            <li key={i} className="py-1.5 flex justify-between">
              <span className="truncate pr-2">{it.name} <span className="text-[var(--text-faint)]">x{it.qty}</span></span>
              <span>{formatINR(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--border-soft)] mt-3 pt-3 flex justify-between text-sm">
          <span>Total ({order.payment_mode === "upi" ? "Paid via UPI" : "Cash on Delivery"})</span>
          <span className="font-extrabold">{formatINR(order.total)}</span>
        </div>
      </div>

      <div className="px-5 mt-4 surface p-4 mx-5">
        <div className="text-xs text-[var(--text-muted)] flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{order.delivery_address}</span>
        </div>
      </div>

      <div className="px-5 mt-6">
        <button onClick={() => navigate("/")} className="btn-ghost w-full justify-center" data-testid="track-home">
          Back to home
        </button>
      </div>
    </div>
  );
}
