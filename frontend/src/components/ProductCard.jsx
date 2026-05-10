import { Plus } from "lucide-react";
import QuantityStepper from "@/components/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { resolveUrl } from "@/lib/apiClient";

export default function ProductCard({ product, categoryId, subgroupId }) {
  const { add, setQty, getQty } = useCart();
  const qty = getQty(product.id);

  return (
    <div
      className="surface p-3 flex gap-3 items-center fade-up"
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative shrink-0">
        <img
          src={resolveUrl(product.image)}
          alt={product.name}
          className="w-20 h-20 rounded-2xl object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><rect width='80' height='80' fill='%231c2029'/><text x='50%25' y='54%25' font-size='28' text-anchor='middle' fill='%2322d27a' font-family='sans-serif'>" +
              encodeURIComponent((product.name || "?").charAt(0).toUpperCase()) +
              "</text></svg>";
          }}
        />
        {product.tag ? (
          <span
            className="absolute -top-1 -left-1 pill pill-warm"
            style={{ fontSize: 9, padding: "2px 6px" }}
          >
            {product.tag}
          </span>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] leading-tight line-clamp-2" data-testid={`product-name-${product.id}`}>
          {product.name}
        </div>
        {product.unit ? (
          <div className="text-[11px] text-[var(--text-faint)] mt-0.5 uppercase tracking-wider">
            {product.unit}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {categoryId === "cigarettes" && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(255,181,71,0.14)", color: "var(--warm)" }}
              data-testid={`product-fullpack-${product.id}`}
            >
              Full pack only
            </span>
          )}
          {typeof product.stock_count === "number" &&
            product.stock_count > 0 &&
            product.stock_count <= 5 && (
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                style={{ background: "rgba(244,63,94,0.14)", color: "#f43f5e" }}
                data-testid={`product-low-stock-${product.id}`}
              >
                Only {product.stock_count} left
              </span>
            )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-bold" data-testid={`product-price-${product.id}`}>
              {formatINR(product.price)}
            </div>
            {product.night_pricing && product.base_price && product.base_price !== product.price && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(167,139,250,0.16)", color: "#a78bfa" }}
                data-testid={`product-night-badge-${product.id}`}
                title={`Night price · base ${formatINR(product.base_price)}`}
              >
                NIGHT
              </span>
            )}
          </div>

          {qty === 0 ? (
            <button
              onClick={() => add(product, categoryId, subgroupId)}
              className="btn-primary !py-2 !px-4 !text-sm h-9"
              data-testid={`product-add-${product.id}`}
            >
              <Plus className="w-4 h-4" /> ADD
            </button>
          ) : (
            <QuantityStepper
              qty={qty}
              size="sm"
              onInc={() => setQty(product.id, qty + 1)}
              onDec={() => setQty(product.id, qty - 1)}
              testId={`product-stepper-${product.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
