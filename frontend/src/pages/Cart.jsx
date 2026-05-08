import { useNavigate, useParams } from "react-router-dom";
import { Trash2, ShoppingBag, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import QuantityStepper from "@/components/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { resolveUrl } from "@/lib/apiClient";
import { CATEGORY_RULES } from "@/config";

const CAT_LABELS = {
  liquor: { label: "Liquor", icon: "🍻" },
  cigarettes: { label: "Cigarettes", icon: "🚬" },
  snacks: { label: "Snacks", icon: "🍟" },
  food: { label: "Food", icon: "🍔" },
};

export default function Cart() {
  const { slug } = useParams();
  const { items, setQty, remove, totals, clear } = useCart();
  const navigate = useNavigate();

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

  if (items.length === 0) {
    return (
      <div className="min-h-[100dvh]" data-testid="cart-empty">
        <Header title="Your cart" />
        <div className="px-6 py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-full surface flex items-center justify-center text-3xl">
            🛒
          </div>
          <h3 className="text-xl font-bold mt-5">Your cart is empty</h3>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Add a few items from the store to get started.
          </p>
          <button
            onClick={() => navigate(`/store/${slug}/menu`)}
            className="btn-primary mt-7 px-6"
            data-testid="cart-empty-shop-btn"
          >
            <ShoppingBag className="w-4 h-4" /> Browse store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-40" data-testid="cart-page">
      <Header
        title="Your cart"
        subtitle={`${totals.count} ${totals.count === 1 ? "item" : "items"} · ${formatINR(totals.total)}`}
        right={
          <button
            onClick={clear}
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--danger)] px-2"
            data-testid="cart-clear-btn"
          >
            Clear
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {order.map((catId) => {
          const list = grouped[catId];
          const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
          return (
            <div key={catId} className="surface p-3" data-testid={`cart-group-${catId}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
                  <span>{CAT_LABELS[catId].icon}</span>
                  {CAT_LABELS[catId].label}
                </div>
                <div className="text-[12px] text-[var(--text-faint)]">
                  {formatINR(subtotal)}
                </div>
              </div>

              {catId === "liquor" && liquorBlock && (
                <div
                  className="mb-3 p-3 rounded-xl flex items-start gap-2"
                  style={{
                    background: "rgba(244,63,94,0.08)",
                    border: "1px solid rgba(244,63,94,0.25)",
                  }}
                  data-testid="liquor-warning"
                >
                  <AlertTriangle className="w-4 h-4 text-[var(--danger)] mt-0.5" />
                  <div className="text-xs leading-snug">
                    Liquor minimum order is{" "}
                    <span className="font-bold text-white">
                      {formatINR(CATEGORY_RULES.liquor.minSubtotal)}
                    </span>
                    . Add{" "}
                    <span className="font-bold text-[var(--danger)]">
                      {formatINR(CATEGORY_RULES.liquor.minSubtotal - liquorTotal)}
                    </span>{" "}
                    more to checkout.
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {list.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3"
                    data-testid={`cart-item-${it.id}`}
                  >
                    <img
                      src={resolveUrl(it.image)}
                      alt={it.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight line-clamp-1">
                        {it.name}
                      </div>
                      {it.unit && (
                        <div className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider mt-0.5">
                          {it.unit}
                        </div>
                      )}
                      <div className="text-sm font-bold mt-1">
                        {formatINR(it.price * it.qty)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <QuantityStepper
                        qty={it.qty}
                        size="sm"
                        onInc={() => setQty(it.id, it.qty + 1)}
                        onDec={() => setQty(it.id, it.qty - 1)}
                        testId={`cart-stepper-${it.id}`}
                      />
                      <button
                        onClick={() => remove(it.id)}
                        className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 hover:text-[var(--danger)]"
                        data-testid={`cart-remove-${it.id}`}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="surface p-4" data-testid="cart-bill-summary">
          <div className="text-[12px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-3">
            Bill summary
          </div>
          <Row label="Subtotal" value={formatINR(totals.total)} />
          <Row label="Delivery fee" value="FREE" valueClass="text-[var(--accent)] font-semibold" />
          <Row label="Taxes" value="Included" valueClass="text-[var(--text-faint)]" />
          <div className="my-3 border-t border-[var(--border-soft)]" />
          <Row label="Total" value={formatINR(totals.total)} bold testid="cart-total" />
        </div>
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-4"
        style={{ pointerEvents: "none" }}
      >
        <div className="max-w-[480px] mx-auto" style={{ pointerEvents: "auto" }}>
          <button
            onClick={() => !liquorBlock && navigate(`/store/${slug}/checkout`)}
            disabled={liquorBlock}
            className="btn-primary w-full text-base"
            data-testid="cart-checkout-btn"
          >
            {liquorBlock
              ? "Add more to checkout"
              : `Proceed to Checkout · ${formatINR(totals.total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, valueClass, testid }) {
  return (
    <div className="flex items-center justify-between py-1" data-testid={testid}>
      <div className={`text-sm ${bold ? "font-bold" : "text-[var(--text-muted)]"}`}>{label}</div>
      <div className={`text-sm ${bold ? "font-extrabold text-base" : ""} ${valueClass || ""}`}>
        {value}
      </div>
    </div>
  );
}
