import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { StatusPill } from "@/pages/admin/AdminDashboard";
import { buildOrderMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import {
  RefreshCw,
  X,
  ExternalLink,
  Phone,
  MapPin,
  StickyNote,
  User,
  Copy,
} from "lucide-react";

const STATUS_OPTIONS = [
  { v: "placed", l: "Placed" },
  { v: "preparing", l: "Preparing" },
  { v: "out_for_delivery", l: "Out for delivery" },
  { v: "delivered", l: "Delivered" },
  { v: "cancelled", l: "Cancelled" },
];
const FILTER_OPTIONS = [{ v: "", l: "All" }, ...STATUS_OPTIONS];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", {
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
    const id = setInterval(load, 15000); // poll for new orders
    return () => clearInterval(id);
  }, [load]);

  const updateStatus = async (oid, newStatus) => {
    try {
      const { data } = await api.patch(`/admin/orders/${oid}`, {
        status: newStatus,
      });
      setOrders((prev) => prev.map((o) => (o.id === oid ? data : o)));
      if (selected?.id === oid) setSelected(data);
      toast.success(`Order ${data.short_id} → ${newStatus.replace("_", " ")}`);
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            Orders
          </h1>
        </div>
        <button
          onClick={load}
          className="btn-ghost text-xs"
          data-testid="orders-refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />{" "}
          Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === f.v
                ? "border-transparent text-black"
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
            style={
              filter === f.v
                ? {
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  }
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
                    <span className="font-mono font-bold text-sm">
                      #{o.short_id}
                    </span>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="text-sm font-medium mt-1 truncate">
                    {o.customer_name} · {o.customer_phone}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {new Date(o.created_at).toLocaleString()} · {o.items.length}{" "}
                    items
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold">
                    {formatINR(o.total)}
                  </div>
                  <select
                    value={o.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="mt-1.5 input !py-1 !px-2 text-xs cursor-pointer"
                    style={{ minWidth: 140 }}
                    data-testid={`order-status-select-${o.id}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.l}
                      </option>
                    ))}
                  </select>
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
  const reshareWhatsapp = () => {
    const message = buildOrderMessage({
      items: order.items.map((i) => ({
        category_id: i.category_id,
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.delivery_address,
        notes: order.notes,
      },
      total: order.total,
    });
    const link = buildWhatsAppLink(message, order.customer_phone.replace(/[^0-9]/g, ""));
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const copyOrder = async () => {
    const message = buildOrderMessage({
      items: order.items,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.delivery_address,
        notes: order.notes,
      },
      total: order.total,
    });
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copied order details");
    } catch {
      toast.error("Could not copy");
    }
  };

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
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-soft)",
          }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Order
            </div>
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
          {/* Customer info */}
          <div className="space-y-2">
            <Row icon={<User className="w-4 h-4" />} text={order.customer_name} />
            <Row icon={<Phone className="w-4 h-4" />} text={order.customer_phone} />
            <Row icon={<MapPin className="w-4 h-4" />} text={order.delivery_address} />
            {order.notes && (
              <Row icon={<StickyNote className="w-4 h-4" />} text={order.notes} />
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
                    {it.name}{" "}
                    <span className="text-[var(--text-faint)]">x{it.qty}</span>
                  </span>
                  <span className="font-semibold">
                    {formatINR(it.price * it.qty)}
                  </span>
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
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">
              Update status
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.v}
                  onClick={() => onStatus(s.v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    order.status === s.v
                      ? "border-transparent text-black"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                  style={
                    order.status === s.v
                      ? {
                          background:
                            "linear-gradient(135deg, var(--accent), var(--accent-2))",
                        }
                      : { background: "var(--surface-2)" }
                  }
                  data-testid={`modal-status-${s.v}`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={reshareWhatsapp}
              className="btn-primary text-sm"
              data-testid="modal-whatsapp-customer"
            >
              <ExternalLink className="w-4 h-4" /> Message customer
            </button>
            <button
              onClick={copyOrder}
              className="btn-ghost justify-center text-sm"
              data-testid="modal-copy"
            >
              <Copy className="w-4 h-4" /> Copy details
            </button>
          </div>
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
