import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

export default function StickyCartBar() {
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  if (totals.count === 0) return null;
  if (location.pathname === "/cart" || location.pathname === "/checkout" || location.pathname === "/confirmation") {
    return null;
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 pointer-events-none"
      data-testid="sticky-cart-bar-wrap"
    >
      <div className="app-shell-mock mx-auto max-w-[480px] px-4 pb-4 pointer-events-auto">
        <button
          onClick={() => navigate("/cart")}
          className="w-full slide-up rounded-2xl flex items-center justify-between px-4 py-3"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#06150d",
            boxShadow: "0 18px 40px var(--accent-glow)",
          }}
          data-testid="sticky-cart-bar"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-black/15 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                {totals.count} {totals.count === 1 ? "item" : "items"}
              </div>
              <div className="text-base font-bold leading-tight">
                {formatINR(totals.total)}
              </div>
            </div>
          </div>
          <div className="text-sm font-bold">View Cart →</div>
        </button>
      </div>
    </div>
  );
}
