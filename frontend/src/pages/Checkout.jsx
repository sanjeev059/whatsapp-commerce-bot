import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { CATEGORY_RULES } from "@/config";
import { buildOrderMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { MessageCircle, Phone, MapPin, User, StickyNote } from "lucide-react";
import { toast } from "sonner";

const CAT_LABELS = {
  liquor: "🍻 Liquor",
  cigarettes: "🚬 Cigarettes",
  snacks: "🍟 Snacks",
  food: "🍔 Food",
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totals, clear } = useCart();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
    return true;
  };

  const placeOrder = () => {
    if (!validate()) return;
    setSubmitting(true);

    const message = buildOrderMessage({
      items: items.map((i) => ({
        category_id: i.category_id,
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      customer: form,
      total: totals.total,
    });
    const link = buildWhatsAppLink(message);

    // Persist for confirmation screen
    sessionStorage.setItem(
      "lc_last_order",
      JSON.stringify({
        message,
        link,
        total: totals.total,
        count: totals.count,
        customer: form,
        items: items.map((i) => ({ ...i })),
      })
    );

    // Open WhatsApp in new tab — note: must not be blocked since this runs from a click event
    window.open(link, "_blank", "noopener,noreferrer");

    // Clear cart and navigate to confirmation
    clear();
    setTimeout(() => {
      navigate("/confirmation", { replace: true });
    }, 350);
  };

  return (
    <div className="min-h-[100dvh] pb-36" data-testid="checkout-page">
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
              placeholder="Phone number (e.g. +91 9XXXXXXXXX)"
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

        <div className="surface p-4 flex items-center gap-3" data-testid="payment-mode">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(34,210,122,0.12)", color: "var(--accent)" }}
          >
            💵
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Cash on Delivery</div>
            <div className="text-xs text-[var(--text-muted)]">
              Pay the vendor when your order arrives.
            </div>
          </div>
          <span className="pill">Default</span>
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
            {submitting ? "Opening WhatsApp…" : `Place Order via WhatsApp`}
          </button>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)] text-center mt-2">
            Order summary opens in WhatsApp · Tap send to confirm
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
        className={`absolute left-3 ${multi ? "top-3.5" : "top-1/2 -translate-y-1/2"} text-[var(--text-faint)]`}
      >
        {icon}
      </div>
      {children}
    </div>
  );
}
