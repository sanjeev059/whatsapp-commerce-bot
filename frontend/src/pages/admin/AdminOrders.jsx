import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { STATUS_META, STATUS_ORDER, StatusPill } from "@/pages/admin/orderStatus";
import {
  RefreshCw,
  X,
  Phone,
  MapPin,
  StickyNote,
  User as UserIcon,
  Hash,
  Copy,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

const FILTER_OPTIONS = [{ v: "", l: "All" }, ...STATUS_ORDER.map((k) => ({ v: k, l: STATUS_META[k].label }))];

// Allowed transitions per status (vendor-driven)
const NEXT_STATES = {
  payment_verification_pending: ["payment_verified", "rejected"],
  payment_verified: ["accepted", "rejected"],
  accepted: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/vendor/orders", {
        params: filter ? { status_filter: filter } : {},
      });
      setOrders(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const updateStatus = async (oid, newStatus) => {
    try {
      const { data } = await api.patch(`/vendor/orders/${oid}`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === oid ? data : o)));
      if (selected?.id === oid) setSelected(data);
      toast.success(`Order ${data.short_id} → ${STATUS_META[newStatus].label}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update"));
    }
  };

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="admin-orders-page">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Vendor inbox
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Orders</h1>
        </div>
        <button onClick={load} className="btn-ghost text-xs" data-testid="orders-refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === f.v ? "border-transparent text-black" : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
            style={
              filter === f.v
                ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                : { background: "var(--surface-2)" }
            }
            data-testid={`filter-${f.v || "all"}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="surface p-10 mt-6 text-center text-[var(--text-muted)] text-sm">
          {loading ? "Loading…" : "No orders match this filter."}
        </div>
      ) : (
        <div className="mt-5 space-y-3" data-testid="orders-list">
          {orders.map((o) => (
            <div
              key={o.id}
              className="surface p-4 cursor-pointer hover:border-[var(--border)] transition-colors"
              onClick={() => setSelected(o)}
              data-testid={`order-card-${o.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm">#{o.short_id}</span>
                    <StatusPill status={o.status} />
                    {o.payment_mode === "upi" && o.upi_last5 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                        UPI•{o.upi_last5}
                      </span>
                    )}
                    {o.payment_mode === "cod" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(255,181,71,0.14)] text-[var(--warm)]">
                        COD
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-1 truncate">
                    {o.customer_name} · {o.customer_phone}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {new Date(o.created_at).toLocaleString()} · {o.items.length} items
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold">{formatINR(o.total)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatus={(s) => updateStatus(selected.id, s)}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onStatus }) {
  const copyOrder = async () => {
    const lines = [
      `Order ${order.short_id}`,
      `${order.customer_name} · ${order.customer_phone}`,
      order.delivery_address,
      "",
      ...order.items.map((it) => `${it.name} x${it.qty} — ${formatINR(it.price * it.qty)}`),
      "",
      `Total: ${formatINR(order.total)}`,
      order.payment_mode === "upi" ? `Paid via UPI · txn ends ${order.upi_last5}` : "Cash on Delivery",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied order details");
    } catch {
      toast.error("Could not copy");
    }
  };

  const callCustomer = () => {
    window.location.href = `tel:${order.customer_phone.replace(/\s/g, "")}`;
  };

  const trackingUrl = order.tracking_token ? `${window.location.origin}/track/${order.tracking_token}` : null;
  const next = NEXT_STATES[order.status] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="order-detail-modal"
    >
      <div
        className="surface w-full md:max-w-lg max-h-[90vh] overflow-y-auto thin-scroll slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Order</div>
            <div className="font-mono font-bold">#{order.short_id}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={order.status} />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)]"
              data-testid="modal-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Payment block */}
          <div
            className="p-3 rounded-xl flex items-start gap-2"
            style={{
              background: order.payment_mode === "upi" ? "rgba(34,210,122,0.06)" : "rgba(255,181,71,0.08)",
              border:
                order.payment_mode === "upi"
                  ? "1px solid rgba(34,210,122,0.24)"
                  : "1px solid rgba(255,181,71,0.30)",
            }}
            data-testid="modal-payment-block"
          >
            <CreditCard className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {order.payment_mode === "upi" ? "Paid via UPI" : "Cash on Delivery"}
              </div>
              {order.payment_mode === "upi" && order.upi_last5 && (
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Customer entered last 5 digits:{" "}
                  <span className="font-mono font-bold text-white">{order.upi_last5}</span> — match
                  this against your UPI app's transaction history.
                </div>
              )}
              {order.status === "payment_verification_pending" && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    onClick={() => onStatus("payment_verified")}
                    className="btn-primary !py-1.5 !px-3 text-xs"
                    data-testid="verify-payment-btn"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Match found — verify
                  </button>
                  <button
                    onClick={() => onStatus("rejected")}
                    className="btn-ghost !py-1.5 !px-3 text-xs"
                    style={{ color: "#f43f5e" }}
                    data-testid="reject-payment-btn"
                  >
                    No payment — reject
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="space-y-2">
            <Row icon={<UserIcon className="w-4 h-4" />} text={order.customer_name} />
            <Row
              icon={<Phone className="w-4 h-4" />}
              text={
                <button onClick={callCustomer} className="text-[var(--accent)] underline">
                  {order.customer_phone}
                </button>
              }
            />
            <Row icon={<MapPin className="w-4 h-4" />} text={order.delivery_address} />
            {order.notes && <Row icon={<StickyNote className="w-4 h-4" />} text={order.notes} />}
            {trackingUrl && (
              <Row
                icon={<Hash className="w-4 h-4" />}
                text={
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] break-all underline text-xs"
                  >
                    {trackingUrl}
                  </a>
                }
              />
            )}
          </div>

          {/* Items */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">
              Items
            </div>
            <ul className="surface-2 !rounded-xl divide-y divide-[var(--border-soft)]">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="truncate pr-3">
                    {it.name} <span className="text-[var(--text-faint)]">x{it.qty}</span>
                  </span>
                  <span className="font-semibold">{formatINR(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-3">
            <div className="text-sm text-[var(--text-muted)]">Total</div>
            <div className="text-xl font-extrabold">{formatINR(order.total)}</div>
          </div>

          {/* Status update */}
          {next.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">
                Move to next state
              </div>
              <div className="flex flex-wrap gap-2">
                {next.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatus(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] text-white transition"
                    style={{ background: STATUS_META[s].bg }}
                    data-testid={`modal-status-${s}`}
                  >
                    → {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={copyOrder}
            className="btn-ghost w-full justify-center text-sm"
            data-testid="modal-copy"
          >
            <Copy className="w-4 h-4" /> Copy order details
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, text }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-[var(--text-faint)] mt-0.5">{icon}</span>
      <span className="flex-1 break-words">{text}</span>
    </div>
  );
}
