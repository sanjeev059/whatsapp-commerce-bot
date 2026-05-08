import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { CATEGORY_RULES } from "@/config";
import { api, fetchStorefront, resolveUrl } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import {
  Phone,
  MapPin,
  User,
  StickyNote,
  CheckCircle2,
  Banknote,
  Smartphone,
  Copy,
  ShieldCheck,
  Crosshair,
} from "lucide-react";
import { toast } from "sonner";

const CAT_LABELS = {
  liquor: "🍻 Liquor",
  cigarettes: "🚬 Cigarettes",
  snacks: "🍟 Snacks",
  food: "🍔 Food",
};

const PAYMENT_OPTIONS = [
  { id: "upi", label: "Pay via UPI", icon: Smartphone, sub: "PhonePe / GPay / Paytm" },
  { id: "cod", label: "Cash on Delivery", icon: Banknote, sub: "Pay when it arrives" },
];

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, totals, clear, bindSlug } = useCart();

  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [paymentMode, setPaymentMode] = useState("upi");
  const [upiLast5, setUpiLast5] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState(null); // {lat, lng}
  const [locating, setLocating] = useState(false);

  const captureLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocating(false);
        toast.success("Location captured");
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === 1
            ? "Location permission denied"
            : "Could not capture location"
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    bindSlug(slug);
    fetchStorefront(slug)
      .then((d) => {
        setVendor(d.vendor);
        if (!d.available) navigate(`/store/${slug}/closed`, { replace: true });
      })
      .catch(() => toast.error("Could not load store details"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (items.length === 0) navigate(`/store/${slug}/cart`, { replace: true });
  }, [items.length, navigate, slug]);

  if (items.length === 0 || !vendor) return null;

  const liquorTotal = totals.byCat?.liquor || 0;
  const liquorBlock =
    items.some((i) => i.category_id === "liquor") &&
    liquorTotal < CATEGORY_RULES.liquor.minSubtotal;

  const grouped = items.reduce((acc, it) => {
    (acc[it.category_id] = acc[it.category_id] || []).push(it);
    return acc;
  }, {});
  const order = ["liquor", "cigarettes", "snacks", "food"].filter(
    (c) => grouped[c]?.length
  );

  const validate = () => {
    if (liquorBlock) {
      toast.error(`Liquor minimum order is ${formatINR(CATEGORY_RULES.liquor.minSubtotal)}`);
      return false;
    }
    if (!form.name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    const phone = form.phone.replace(/\s/g, "");
    if (!/^\+?[0-9]{10,13}$/.test(phone)) {
      toast.error("Enter a valid phone number");
      return false;
    }
    if (form.address.trim().length < 8) {
      toast.error("Please enter a complete delivery address");
      return false;
    }
    if (paymentMode === "upi" && !/^\d{5}$/.test(upiLast5)) {
      toast.error("Enter the last 5 digits of your UPI transaction");
      return false;
    }
    return true;
  };

  // UPI deep-link
  const upiAmount = totals.total.toFixed(2);
  const upiNote = encodeURIComponent(`Order from ${vendor.name}`);
  const upiPa = vendor.upi_id || "vendor@upi";
  const upiPn = encodeURIComponent(vendor.name || "Vendor");
  const upiUri = `upi://pay?pa=${upiPa}&pn=${upiPn}&am=${upiAmount}&cu=INR&tn=${upiNote}`;

  const placeOrder = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const orderItems = items.map((i) => ({
      product_id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      category_id: i.category_id,
    }));

    try {
      const { data } = await api.post(
        "/orders",
        {
          vendor_slug: slug,
          customer_name: form.name,
          customer_phone: form.phone,
          delivery_address: form.address,
          customer_lat: coords?.lat || null,
          customer_lng: coords?.lng || null,
          notes: form.notes,
          payment_mode: paymentMode,
          upi_last5: paymentMode === "upi" ? upiLast5 : null,
          items: orderItems,
        },
        { headers: { Authorization: "" } }
      );

      sessionStorage.setItem(
        "lc_last_order",
        JSON.stringify({
          short_id: data.short_id,
          tracking_token: data.tracking_token,
          status: data.status,
          total: data.total ?? totals.total,
          count: totals.count,
          payment_mode: paymentMode,
          customer: form,
          vendor_name: vendor.name,
        })
      );
      clear();
      setTimeout(() => navigate("/confirmation", { replace: true }), 200);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not place order"));
      setSubmitting(false);
    }
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiPa);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-[100dvh] pb-44" data-testid="checkout-page">
      <Header title="Checkout" subtitle={vendor.name} />

      <div className="px-4 pt-4 space-y-4">
        {/* Order summary */}
        <div className="surface p-4" data-testid="checkout-summary">
          <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-3">
            Order summary
          </div>
          {order.map((cat) => (
            <div key={cat} className="mb-3 last:mb-0">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {CAT_LABELS[cat]}
              </div>
              <ul className="mt-1.5 space-y-1">
                {grouped[cat].map((it) => (
                  <li
                    key={it.id}
                    className="flex justify-between text-sm"
                    data-testid={`summary-item-${it.id}`}
                  >
                    <span className="truncate pr-2">
                      {it.name}{" "}
                      <span className="text-[var(--text-faint)]">x{it.qty}</span>
                    </span>
                    <span>{formatINR(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-[var(--border-soft)] mt-3 pt-3 flex items-center justify-between">
            <div className="text-sm font-bold">Total</div>
            <div className="text-lg font-extrabold" data-testid="checkout-total">
              {formatINR(totals.total)}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="surface p-4 space-y-3">
          <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
            Delivery details
          </div>

          <FieldIcon icon={<User className="w-4 h-4" />}>
            <input
              className="input pl-10"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="checkout-input-name"
            />
          </FieldIcon>

          <FieldIcon icon={<Phone className="w-4 h-4" />}>
            <input
              className="input pl-10"
              placeholder="Mobile number (e.g. +91 9XXXXXXXXX)"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="checkout-input-phone"
            />
          </FieldIcon>

          <FieldIcon icon={<MapPin className="w-4 h-4" />} multi>
            <textarea
              className="input pl-10 min-h-[88px] resize-none"
              placeholder="Delivery address — flat, building, area"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              data-testid="checkout-input-address"
            />
          </FieldIcon>

          <button
            type="button"
            onClick={captureLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: coords ? "rgba(34,210,122,0.10)" : "var(--surface-2)",
              border: `1px solid ${coords ? "rgba(34,210,122,0.35)" : "var(--border-soft)"}`,
              color: coords ? "var(--accent)" : "var(--text-muted)",
            }}
            data-testid="capture-location-btn"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
            {locating
              ? "Locating you…"
              : coords
              ? `Location captured · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : "Share my live location (helps the vendor find you faster)"}
          </button>

          <FieldIcon icon={<StickyNote className="w-4 h-4" />} multi>
            <textarea
              className="input pl-10 min-h-[64px] resize-none"
              placeholder="Notes / instructions (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="checkout-input-notes"
            />
          </FieldIcon>
        </div>

        {/* Payment selector */}
        <div className="surface p-4" data-testid="payment-selector">
          <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-3">
            Payment method
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const active = paymentMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPaymentMode(opt.id);
                    setUpiLast5("");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active ? "border-[var(--accent)]" : "border-[var(--border-soft)]"
                  }`}
                  style={{
                    background: active
                      ? "rgba(34,210,122,0.08)"
                      : "var(--surface-2)",
                  }}
                  data-testid={`payment-option-${opt.id}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{
                      background: active ? "rgba(34,210,122,0.18)" : "var(--surface)",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* UPI panel */}
          {paymentMode === "upi" && (
            <div className="mt-4 fade-up" data-testid="upi-panel">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2">
                Step 1 · Scan to pay {formatINR(totals.total)}
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="rounded-xl p-3 shrink-0"
                  style={{ background: "white" }}
                  data-testid="upi-qr"
                >
                  {vendor.payment_qr_url ? (
                    <img
                      src={resolveUrl(vendor.payment_qr_url)}
                      alt="UPI QR"
                      className="w-[130px] h-[130px] object-contain"
                    />
                  ) : (
                    <QRCodeSVG value={upiUri} size={130} level="M" includeMargin={false} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--text-muted)]">Pay to</div>
                  <div className="font-semibold text-sm truncate">{vendor.name}</div>
                  <button
                    onClick={copyUpi}
                    className="mt-1 text-xs flex items-center gap-1 text-[var(--accent)] hover:underline"
                    data-testid="upi-copy-id"
                  >
                    <Copy className="w-3 h-3" /> {upiPa}
                  </button>
                  <div className="mt-2 text-[11px] text-[var(--text-faint)] leading-relaxed">
                    Scan with PhonePe / GPay / Paytm and complete the payment.
                  </div>
                </div>
              </div>

              <div
                className="mt-4 p-3 rounded-xl"
                style={{
                  background: "rgba(255,181,71,0.08)",
                  border: "1px solid rgba(255,181,71,0.25)",
                }}
                data-testid="upi-verify-block"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--warm)]" />
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--warm)] font-semibold">
                    Step 2 · Verify your payment
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] mb-2 leading-relaxed">
                  Enter the <span className="text-white font-semibold">last 5 digits</span> of your
                  UPI transaction reference. The vendor will match it before accepting your order.
                </div>
                <input
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={upiLast5}
                  onChange={(e) => setUpiLast5(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="input tracking-[0.4em] font-mono text-center text-lg"
                  placeholder="• • • • •"
                  data-testid="upi-last5-input"
                />
                {upiLast5.length === 5 && (
                  <div className="mt-2 text-xs text-[var(--accent)] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Looks good — confirm below
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentMode === "cod" && (
            <div
              className="mt-4 p-3 rounded-xl text-xs leading-relaxed"
              style={{
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.20)",
                color: "#bfdbfe",
              }}
              data-testid="cod-panel"
            >
              Keep exact change ready. The delivery person will collect{" "}
              <span className="font-bold text-white">{formatINR(totals.total)}</span> at your door.
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-4"
        style={{ pointerEvents: "none" }}
      >
        <div className="max-w-[480px] mx-auto" style={{ pointerEvents: "auto" }}>
          <button
            onClick={placeOrder}
            disabled={submitting || liquorBlock}
            className="btn-primary w-full text-base"
            data-testid="place-order-btn"
          >
            <CheckCircle2 className="w-5 h-5" />
            {submitting
              ? "Placing order…"
              : `Confirm Order · ${formatINR(totals.total)}`}
          </button>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)] text-center mt-2">
            You'll get a tracking link · vendor gets notified instantly
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldIcon({ icon, children, multi }) {
  return (
    <div className="relative">
      <div
        className={`absolute left-3 ${
          multi ? "top-3.5" : "top-1/2 -translate-y-1/2"
        } text-[var(--text-faint)]`}
      >
        {icon}
      </div>
      {children}
    </div>
  );
}
