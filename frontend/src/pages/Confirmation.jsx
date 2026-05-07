import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle, Home, Receipt } from "lucide-react";
import { formatINR } from "@/lib/format";

export default function Confirmation() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lc_last_order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  const refId =
    order?.short_id ||
    "LC" + Math.floor(100000 + Math.random() * 900000).toString();

  return (
    <div className="min-h-[100dvh] flex flex-col" data-testid="confirmation-page">
      <div className="flex-1 px-6 pt-12 pb-6">
        <div className="flex flex-col items-center text-center pop-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(34,210,122,0.14)",
              boxShadow: "0 0 0 8px rgba(34,210,122,0.06)",
            }}
          >
            <CheckCircle2 className="w-10 h-10 text-[var(--accent)]" />
          </div>
          <h1
            className="text-[26px] font-extrabold mt-5 tracking-tight"
            data-testid="confirmation-heading"
          >
            Order placed!
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs">
            We've sent a confirmation to your WhatsApp and notified the vendor.
            They'll accept it shortly.
          </p>
          <div
            className="mt-4 pill"
            style={{ fontSize: 11 }}
            data-testid="confirmation-order-id"
          >
            Ref · {refId}
          </div>
        </div>

        {order && (
          <div className="mt-8 surface p-4 fade-up">
            <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" /> Quick summary
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span>Items</span>
              <span className="font-semibold">{order.count}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Total</span>
              <span className="font-extrabold">{formatINR(order.total)}</span>
            </div>
            {order.payment_mode && (
              <div className="flex justify-between text-sm mt-1">
                <span>Payment</span>
                <span className="font-semibold text-[var(--accent)]">
                  {order.payment_mode}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-1">
              <span>Delivery to</span>
              <span className="text-right max-w-[60%] truncate">
                {order.customer?.address}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 surface p-4 flex items-start gap-3 fade-up">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(34,210,122,0.12)" }}
          >
            <MessageCircle className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="font-semibold text-sm">
              You'll get WhatsApp updates
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              "Order accepted" → "Out for delivery" → "Delivered". Keep your
              phone reachable.
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 space-y-2" data-testid="confirmation-actions">
        <button
          onClick={() => navigate("/store", { replace: true })}
          className="btn-primary w-full text-base"
          data-testid="confirmation-back-store"
        >
          <Home className="w-5 h-5" /> Back to store
        </button>
      </div>
    </div>
  );
}
