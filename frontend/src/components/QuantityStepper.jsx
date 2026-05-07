import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({ qty, onInc, onDec, size = "md", testId }) {
  const dims =
    size === "sm"
      ? "h-9 px-1 text-sm"
      : "h-11 px-1 text-base";
  const btn =
    size === "sm" ? "w-8 h-8" : "w-9 h-9";
  return (
    <div
      className={`inline-flex items-center justify-between ${dims} rounded-full font-semibold`}
      style={{
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
        color: "#06150d",
        minWidth: size === "sm" ? 92 : 104,
      }}
      data-testid={testId}
    >
      <button
        onClick={onDec}
        className={`${btn} flex items-center justify-center rounded-full active:scale-90 transition`}
        aria-label="Decrease"
        data-testid={testId ? `${testId}-dec` : undefined}
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="px-1 tabular-nums" data-testid={testId ? `${testId}-qty` : undefined}>
        {qty}
      </span>
      <button
        onClick={onInc}
        className={`${btn} flex items-center justify-center rounded-full active:scale-90 transition`}
        aria-label="Increase"
        data-testid={testId ? `${testId}-inc` : undefined}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
