import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { api, resolveUrl } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  Phone,
  MapPin,
  Map as MapIcon,
  StickyNote,
  Camera,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

const PAYMENT_LABELS = { upi: "Paid via UPI", cod: "Collect cash" };

export default function DeliveryHandoff() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api
      .get(`/delivery/${token}`, { headers: { Authorization: "" } })
      .then(({ data }) => setOrder(data))
      .catch((e) =>
        setError(e?.response?.status === 404 ? "Delivery link is invalid or expired." : apiErrorMessage(e))
      );
  }, [token]);

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      toast.error("Photo too large (max 3MB)");
      return;
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!photo) {
      toast.error("Please take a photo first");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", photo);
      const { data } = await api.post(`/delivery/${token}/delivered`, fd, {
        headers: { Authorization: "" },
      });
      setOrder({
        ...order,
        status: "delivered",
        is_actionable: false,
        delivered_at: data.delivered_at,
        delivery_proof_image_id: data.proof_image_id,
      });
      toast.success("Marked as delivered");
    } catch (e) {
      if (e?.response?.status === 409) {
        toast.error("This order has already been delivered.");
        try {
          const { data } = await api.get(`/delivery/${token}`, { headers: { Authorization: "" } });
          setOrder(data);
        } catch {}
      } else {
        toast.error(apiErrorMessage(e, "Could not mark delivered"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <DeliveryError message={error} />;
  if (!order) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-[var(--text-muted)]" data-testid="delivery-loading">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Already delivered → read-only success view
  if (order.status === "delivered") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6" data-testid="delivery-completed">
        <div className="max-w-sm text-center fade-up">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{
              background: "rgba(34,210,122,0.14)",
              boxShadow: "0 0 0 8px rgba(34,210,122,0.06)",
            }}
          >
            <PackageCheck className="w-9 h-9 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-extrabold mt-5">Delivered!</h1>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            Order <span className="font-mono text-white">#{order.short_id}</span> · {formatINR(order.total)}
          </div>
          {order.delivered_at && (
            <div className="text-[11px] text-[var(--text-faint)] mt-2">
              {new Date(order.delivered_at).toLocaleString()}
            </div>
          )}
          {order.delivery_proof_image_id && (
            <img
              src={resolveUrl(`/api/uploads/${order.delivery_proof_image_id}`)}
              alt="Proof"
              className="w-40 h-40 object-cover rounded-xl mx-auto mt-5 border border-[var(--border-soft)]"
              data-testid="delivery-proof-img"
            />
          )}
          <p className="text-xs text-[var(--text-faint)] mt-5">
            This delivery link is now closed. You can safely close this page.
          </p>
        </div>
      </div>
    );
  }

  if (!order.is_actionable) {
    return (
      <DeliveryError
        message={`Order is currently ${order.status.replace(/_/g, " ")} — please ask the vendor to dispatch it before marking delivered.`}
      />
    );
  }

  const callCustomer = () => {
    window.location.href = `tel:${(order.customer_phone || "").replace(/\s/g, "")}`;
  };
  const mapsUrl = order.customer_lat && order.customer_lng
    ? `https://www.google.com/maps/search/?api=1&query=${order.customer_lat},${order.customer_lng}`
    : null;

  return (
    <div className="min-h-[100dvh] pb-40" data-testid="delivery-page">
      <div
        className="px-5 pt-6 pb-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,210,122,0.18), rgba(110,255,196,0.06) 60%, transparent)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
          Delivery handoff
        </div>
        <div className="flex items-end justify-between gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Order #{order.short_id}</h1>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              From <span className="text-white font-semibold">{order.vendor_name}</span>
            </div>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={
              order.payment_mode === "cod"
                ? { background: "rgba(255,181,71,0.14)", color: "#ffb547" }
                : { background: "rgba(34,210,122,0.14)", color: "#22d27a" }
            }
            data-testid="delivery-payment-badge"
          >
            {PAYMENT_LABELS[order.payment_mode] || order.payment_mode}
          </div>
        </div>
        {order.payment_mode === "cod" && (
          <div className="mt-3 surface !rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--warm)]" />
            <div className="text-sm">
              Collect <span className="font-extrabold text-white">{formatINR(order.total)}</span> in cash
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Customer */}
        <div className="surface p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">
            Drop-off
          </div>
          <div className="font-semibold">{order.customer_name}</div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={callCustomer}
              className="flex-1 btn-primary !py-2.5 text-sm justify-center"
              data-testid="delivery-call-btn"
            >
              <Phone className="w-4 h-4" /> Call
            </button>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 btn-ghost !py-2.5 text-sm justify-center"
                data-testid="delivery-maps-link"
              >
                <MapIcon className="w-4 h-4" /> Maps
              </a>
            )}
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-[var(--text-faint)] mt-0.5 shrink-0" />
            <div className="break-words" data-testid="delivery-address">
              {order.delivery_address}
            </div>
          </div>
          {order.notes && (
            <div className="mt-3 flex items-start gap-2 text-sm">
              <StickyNote className="w-4 h-4 text-[var(--text-faint)] mt-0.5 shrink-0" />
              <div className="text-[var(--text-muted)]">{order.notes}</div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="surface p-4" data-testid="delivery-items">
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
          <div className="flex justify-between mt-3 text-sm font-bold">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
        </div>

        {/* Photo capture */}
        <div className="surface p-4" data-testid="delivery-proof-section">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-2">
            Proof of delivery
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
            Take a photo of the packet at the customer's door, or with the customer holding it.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhoto}
            className="hidden"
            data-testid="delivery-photo-input"
          />
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Proof preview"
                className="w-full h-56 object-cover rounded-xl"
                data-testid="delivery-photo-preview"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 btn-ghost !py-1.5 !px-3 text-xs"
                style={{ background: "rgba(7,8,11,0.9)" }}
                data-testid="delivery-photo-retake"
              >
                <RotateCcw className="w-3 h-3" /> Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full surface-2 !rounded-xl border-2 border-dashed border-[var(--border)] py-10 text-center hover:border-[var(--accent)] transition-colors"
              data-testid="delivery-photo-pick"
            >
              <Camera className="w-7 h-7 mx-auto text-[var(--accent)]" />
              <div className="mt-2 text-sm font-semibold">Take a photo</div>
              <div className="text-[11px] text-[var(--text-faint)] mt-1">
                Required to mark delivered
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-4 pointer-events-none">
        <div className="max-w-[480px] mx-auto pointer-events-auto">
          <button
            onClick={submit}
            disabled={!photo || submitting}
            className="btn-primary w-full text-base"
            data-testid="delivery-submit-btn"
          >
            <CheckCircle2 className="w-5 h-5" />
            {submitting ? "Saving…" : "Mark Delivered"}
          </button>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)] text-center mt-2">
            Vendor + customer get notified instantly
          </p>
        </div>
      </div>
    </div>
  );
}

function DeliveryError({ message }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6" data-testid="delivery-error">
      <div className="max-w-sm text-center">
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "rgba(244,63,94,0.14)" }}
        >
          <AlertTriangle className="w-9 h-9 text-[var(--danger)]" />
        </div>
        <h1 className="text-xl font-extrabold mt-5">Cannot complete delivery</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">{message}</p>
      </div>
    </div>
  );
}
