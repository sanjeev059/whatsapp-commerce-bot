import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle, Home, Copy } from "lucide-react";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

export default function Confirmation() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lc_last_order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  const orderId = useMemo(
    () =>
      order?.short_id ||
      "LC" + Math.floor(100000 + Math.random() * 900000).toString(),
    [order]
  );

  const reopenWhatsApp = () => {
    if (order?.link) window.open(order.link, "_blank", "noopener,noreferrer");
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(order?.message || "");
      toast.success("Order summary copied");
    } catch {
      toast.error("Could not copy");
    }
  };

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
          <h1 className="text-[26px] font-extrabold mt-5 tracking-tight" data-testid="confirmation-heading">
            Order shared successfully
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs">
            Your order has been opened in WhatsApp. Tap{" "}
            <span className="text-white font-semibold">Send</span> to share with the vendor.
          </p>
          <div
            className="mt-4 pill"
            style={{ fontSize: 11 }}
            data-testid="confirmation-order-id"
          >
            Ref · {orderId}
          </div>
        </div>

        {order && (
          <div className="mt-8 surface p-4 fade-up">
            <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
              Quick summary
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Items</span>
              <span className="font-semibold">{order.count}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Total</span>
              <span className="font-extrabold">{formatINR(order.total)}</span>
            </div>
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
            📞
          </div>
          <div>
            <div className="font-semibold text-sm">Vendor will contact you shortly</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Expected delivery in 30–45 minutes. Keep your phone reachable.
            </div>
          </div>
        </div>

        {order?.message && (
          <button
            onClick={copyMessage}
            className="btn-ghost w-full mt-4 justify-center text-sm"
            data-testid="confirmation-copy-btn"
          >
            <Copy className="w-4 h-4" /> Copy order summary
          </button>
        )}
      </div>

      {/* Sticky actions */}
      <div className="px-4 pb-5 space-y-2" data-testid="confirmation-actions">
        {order?.link && (
          <button
            onClick={reopenWhatsApp}
            className="btn-primary w-full text-base"
            data-testid="confirmation-reopen-whatsapp"
          >
            <MessageCircle className="w-5 h-5" />
            Re-open WhatsApp
          </button>
        )}
        <button
          onClick={() => navigate("/store", { replace: true })}
          className="btn-ghost w-full justify-center text-sm"
          data-testid="confirmation-back-home"
        >
          <Home className="w-4 h-4" /> Back to store
        </button>
      </div>
    </div>
  );
}
