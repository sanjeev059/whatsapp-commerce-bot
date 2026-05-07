import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { CATEGORY_RULES } from "@/config";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import {
  MessageCircle,
  Phone,
  MapPin,
  User,
  StickyNote,
  CheckCircle2,
  Banknote,
  Smartphone,
  Copy,
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
  const navigate = useNavigate();
  const { items, totals, clear } = useCart();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [paymentMode, setPaymentMode] = useState("upi");
  const [hasPaid, setHasPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendor, setVendor] = useState({ name: "Demo Store", upi_id: "", whatsapp: "" });

  useEffect(() => {
    api
      .get("/vendor", { headers: { Authorization: "" } })
      .then(({ data }) => setVendor(data))
      .catch(() => {});
  }, []);

  const liquorTotal = totals.byCat?.liquor || 0;
  const liquorBlock =
    items.some((i) => i.category_id === "liquor") &&
    liquorTotal < CATEGORY_RULES.liquor.minSubtotal;

  useEffect(() => {
    if (items.length === 0) navigate("/cart", { replace: true });
  }, [items.length, navigate]);

  if (items.length === 0) return null;

  const grouped = items.reduce((acc, it) => {
    (acc[it.category_id] = acc[it.category_id] || []).push(it);
    return acc;
  }, {});
  const order = ["liquor", "cigarettes", "snacks", "food"].filter(
    (c) => grouped[c]?.length
  );

  const validate = () => {
    if (liquorBlock) {
      toast.error(
        `Liquor minimum order is ${formatINR(CATEGORY_RULES.liquor.minSubtotal)}`
      );
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
    if (paymentMode === "upi" && !hasPaid) {
      toast.error("Tap 'I've Paid' after completing the UPI payment");
      return false;
    }
    return true;
  };

  // UPI deep-link string (per Indian UPI spec)
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

    let savedOrder = null;
    try {
      const { data } = await api.post(
        "/orders",
        {
          customer_name: form.name,
          customer_phone: form.phone,
          delivery_address: form.address,
          notes: form.notes,
          payment_mode:
            paymentMode === "upi" ? "Paid via UPI" : "Cash on Delivery",
          items: orderItems,
        },
        { headers: { Authorization: "" } }
      );
      savedOrder = data;
    } catch (e) {
      setSubmitting(false);
      toast.error(apiErrorMessage(e, "Could not place order"));
      return;
    }

    sessionStorage.setItem(
      "lc_last_order",
      JSON.stringify({
        total: totals.total,
        count: totals.count,
        customer: form,
        items: items.map((i) => ({ ...i })),
        short_id: savedOrder?.short_id,
        payment_mode: savedOrder?.payment_mode,
      })
    );

    clear();
    setTimeout(() => navigate("/confirmation", { replace: true }), 200);
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
      <Header title="Checkout" subtitle="Confirm your details" />

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
              placeholder="WhatsApp number (e.g. +91 9XXXXXXXXX)"
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
                    setHasPaid(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-[var(--accent)]"
                      : "border-[var(--border-soft)]"
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
                      background: active
                        ? "rgba(34,210,122,0.18)"
                        : "var(--surface)",
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
                Scan to pay {formatINR(totals.total)}
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="rounded-xl p-3 shrink-0"
                  style={{ background: "white" }}
                  data-testid="upi-qr"
                >
                  <QRCodeSVG
                    value={upiUri}
                    size={130}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--text-muted)]">
                    Pay to
                  </div>
                  <div className="font-semibold text-sm truncate">
                    {vendor.name}
                  </div>
                  <button
                    onClick={copyUpi}
                    className="mt-1 text-xs flex items-center gap-1 text-[var(--accent)] hover:underline"
                    data-testid="upi-copy-id"
                  >
                    <Copy className="w-3 h-3" /> {upiPa || "vendor@upi"}
                  </button>
                  <div className="mt-2 text-[11px] text-[var(--text-faint)] leading-relaxed">
                    Scan with PhonePe / GPay / Paytm or any UPI app and complete
                    the payment, then tap the button below.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setHasPaid(true);
                  toast.success("Marked as paid — confirm below to send order");
                }}
                disabled={hasPaid}
                className={`mt-3 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                  hasPaid
                    ? "bg-[rgba(34,210,122,0.18)] text-[var(--accent)]"
                    : "btn-ghost"
                }`}
                data-testid="upi-mark-paid"
              >
                <CheckCircle2 className="w-4 h-4" />
                {hasPaid ? "Payment marked — confirm below" : "I've paid"}
              </button>
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
            <MessageCircle className="w-5 h-5" />
            {submitting
              ? "Placing order…"
              : `Confirm Order · ${formatINR(totals.total)}`}
          </button>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)] text-center mt-2">
            You'll get a WhatsApp confirmation · vendor gets notified instantly
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
