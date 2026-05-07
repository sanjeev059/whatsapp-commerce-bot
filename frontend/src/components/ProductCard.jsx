import { Plus } from "lucide-react";
import QuantityStepper from "@/components/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

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
          src={product.image}
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[15px] font-bold" data-testid={`product-price-${product.id}`}>
            {formatINR(product.price)}
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
