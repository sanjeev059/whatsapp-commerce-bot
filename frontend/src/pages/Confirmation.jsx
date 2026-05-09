import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Home, Receipt, Truck, Smartphone, Share, Plus } from "lucide-react";
import { formatINR } from "@/lib/format";

const PAYMENT_LABELS = { upi: "Paid via UPI", cod: "Cash on Delivery" };

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua) && !window.MSStream;
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

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
        <SaveAsAppCard vendorName={order.vendor_name} />
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

function SaveAsAppCard({ vendorName }) {
  const [deferred, setDeferred] = useState(null);
  const [iosTip, setIosTip] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  const onInstall = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else if (isIOS()) {
      setIosTip(true);
    } else {
      // Desktop / browser without beforeinstallprompt — fall back to iOS-style tip
      setIosTip(true);
    }
  };

  return (
    <>
      <button
        onClick={onInstall}
        className="w-full surface p-3 flex items-center gap-3 text-left hover:border-[var(--accent)] transition-colors fade-up"
        style={{
          background: "rgba(34,210,122,0.06)",
          border: "1px solid rgba(34,210,122,0.30)",
        }}
        data-testid="confirmation-install-btn"
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(34,210,122,0.16)" }}
        >
          <Smartphone className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">
            Save {vendorName || "this store"} as an app
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
            One-tap reorder next time · No app store · Works offline
          </div>
        </div>
        <div className="text-[var(--accent)] text-xs font-bold shrink-0 px-2">
          Install
        </div>
      </button>

      {iosTip && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setIosTip(false)}
          data-testid="confirmation-install-tip"
        >
          <div
            className="surface max-w-[440px] w-full rounded-2xl p-5 fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold mb-1">Save to your home screen</div>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              So you don't forget the URL — find {vendorName || "the store"} as an app icon next time.
            </p>
            <ol className="text-sm text-[var(--text-muted)] space-y-2.5">
              <li className="flex items-center gap-2">
                <Step n={1} />
                <div className="flex items-center gap-2">
                  Tap <Share className="inline w-4 h-4 text-white" /> Share at the bottom
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Step n={2} />
                <div className="flex items-center gap-2">
                  Choose <Plus className="inline w-4 h-4 text-white" /> "Add to Home Screen"
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Step n={3} />
                <div>Tap "Add" — that's it.</div>
              </li>
            </ol>
            <button
              onClick={() => setIosTip(false)}
              className="btn-ghost w-full mt-4 justify-center text-sm"
              data-testid="confirmation-install-tip-close"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: "rgba(34,210,122,0.14)", color: "var(--accent)" }}
    >
      {n}
    </span>
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
