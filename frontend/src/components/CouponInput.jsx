import { useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { Tag, Check, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

/**
 * Coupon-code input bar shown on Cart page.
 * Validates server-side via /api/storefront/<slug>/offers/validate; on success,
 * persists the applied offer in CartContext so Checkout can submit it.
 */
export default function CouponInput({ slug, cartTotal }) {
  const { appliedOffer, applyOffer, clearOffer } = useCart();
  const [code, setCode] = useState(appliedOffer?.code || "");
  const [submitting, setSubmitting] = useState(false);

  const apply = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(
        `/storefront/${slug}/offers/validate`,
        { code: code.trim().toUpperCase(), cart_total: Math.round(cartTotal) },
        { headers: { Authorization: "" } }
      );
      applyOffer(data);
      toast.success(`${data.code} applied · -₹${data.discount_amount}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Invalid coupon"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = () => {
    clearOffer();
    setCode("");
    toast.info("Coupon removed");
  };

  return (
    <div className="surface p-3" data-testid="coupon-input">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold flex items-center gap-1.5 mb-2">
        <Tag className="w-3 h-3" /> Have a coupon?
      </div>
      {appliedOffer ? (
        <div
          className="p-3 rounded-xl flex items-center gap-2"
          style={{
            background: "rgba(34,210,122,0.08)",
            border: "1px solid rgba(34,210,122,0.30)",
          }}
          data-testid="coupon-applied"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(34,210,122,0.18)" }}
          >
            <Check className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono font-extrabold text-sm tracking-wider">
              {appliedOffer.code}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              {appliedOffer.title} · saved ₹{appliedOffer.discount_amount}
            </div>
          </div>
          <button
            onClick={remove}
            className="w-8 h-8 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)]"
            data-testid="coupon-remove"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={apply} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="ENTER CODE"
            className="input font-mono tracking-wider flex-1"
            maxLength={20}
            data-testid="coupon-code-input"
          />
          <button
            type="submit"
            disabled={!code.trim() || submitting}
            className="btn-primary !py-2 !px-4 text-sm shrink-0"
            data-testid="coupon-apply-btn"
          >
            {submitting ? "…" : "Apply"}
          </button>
        </form>
      )}
    </div>
  );
}
