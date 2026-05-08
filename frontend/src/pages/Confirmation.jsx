import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Home, Receipt, Truck } from "lucide-react";
import { formatINR } from "@/lib/format";

const PAYMENT_LABELS = { upi: "Paid via UPI", cod: "Cash on Delivery" };

export default function Confirmation() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lc_last_order");
      if (raw) setOrder(JSON.parse(raw));
      else navigate("/", { replace: true });
    } catch {}
  }, [navigate]);

  if (!order) return null;

  const isPending = order.status === "payment_verification_pending";

  return (
    <div className="min-h-[100dvh] flex flex-col" data-testid="confirmation-page">
      <div className="flex-1 px-6 pt-12 pb-6">
        <div className="flex flex-col items-center text-center pop-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: isPending
                ? "rgba(255,181,71,0.14)"
                : "rgba(34,210,122,0.14)",
              boxShadow: isPending
                ? "0 0 0 8px rgba(255,181,71,0.06)"
                : "0 0 0 8px rgba(34,210,122,0.06)",
            }}
          >
            {isPending ? (
              <Clock className="w-10 h-10 text-[var(--warm)]" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-[var(--accent)]" />
            )}
          </div>
          <h1
            className="text-[26px] font-extrabold mt-5 tracking-tight"
            data-testid="confirmation-heading"
          >
            {isPending ? "Payment under review" : "Order placed!"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs">
            {isPending
              ? "Vendor is verifying your UPI payment. You'll see live updates on the tracking page."
              : "Your order is confirmed. The vendor has been notified and will start preparing it."}
          </p>
          <div
            className="mt-4 pill"
            style={{ fontSize: 11 }}
            data-testid="confirmation-order-id"
          >
            Ref · {order.short_id}
          </div>
        </div>

        <div className="mt-8 surface p-4 fade-up">
          <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5" /> Quick summary
          </div>
          <Row label="Store" value={order.vendor_name} />
          <Row label="Items" value={order.count} />
          <Row label="Total" value={formatINR(order.total)} bold />
          <Row label="Payment" value={PAYMENT_LABELS[order.payment_mode] || order.payment_mode} />
          <Row label="Delivery to" value={order.customer?.address} truncate />
        </div>

        <div className="mt-6 surface p-4 flex items-start gap-3 fade-up">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(34,210,122,0.12)" }}
          >
            <Truck className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="font-semibold text-sm">Live order tracking</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Bookmark the tracking page — it updates automatically as the vendor accepts and dispatches your order.
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 space-y-2" data-testid="confirmation-actions">
        <Link
          to={`/track/${order.tracking_token}`}
          className="btn-primary w-full text-base"
          data-testid="confirmation-track-btn"
        >
          <Truck className="w-5 h-5" /> Track my order
        </Link>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="btn-ghost w-full justify-center text-sm"
          data-testid="confirmation-back-home"
        >
          <Home className="w-4 h-4" /> Back to home
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold, truncate }) {
  return (
    <div className="flex justify-between text-sm mt-1.5 gap-2">
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span
        className={`text-right ${bold ? "font-extrabold" : "font-medium"} ${
          truncate ? "max-w-[60%] truncate" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
