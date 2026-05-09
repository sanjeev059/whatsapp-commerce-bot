import { MapPin, RefreshCw, ArrowLeft } from "lucide-react";

/**
 * Shown when customer's GPS location is outside the vendor's delivery radius.
 */
export default function OutOfRange({ vendorName, distance, radius, onRetry, onBack }) {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-8"
      data-testid="out-of-range-page"
    >
      <div className="max-w-md w-full surface p-6 fade-up">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(244,63,94,0.14)" }}
        >
          <MapPin className="w-7 h-7 text-[#f43f5e]" />
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#f43f5e] font-bold">
          Out of delivery range
        </div>
        <h1 className="text-2xl font-extrabold mt-1 leading-tight">
          Sorry — we don't deliver here
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
          You're <span className="font-bold text-white">{distance.toFixed(1)} km</span> away from
          <span className="font-semibold text-white"> {vendorName || "this store"}</span>, which
          delivers up to <span className="font-bold text-white">{radius.toFixed(0)} km</span>.
        </p>

        <div
          className="mt-4 p-3 rounded-xl text-[12px] text-[var(--text-muted)] leading-relaxed"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
        >
          MRP shops are hyper-local — each store delivers only to a small zone around it. Try a different store closer to you.
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="btn-primary w-full justify-center"
            data-testid="out-of-range-retry"
          >
            <RefreshCw className="w-4 h-4" /> Re-check my location
          </button>
          <button
            onClick={onBack}
            className="btn-ghost w-full justify-center text-xs"
            data-testid="out-of-range-back"
          >
            <ArrowLeft className="w-4 h-4" /> Take me away
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-faint)] mt-4 text-center">
          Distance is a straight-line estimate. Some streets may add 10–20%.
        </p>
      </div>
    </div>
  );
}
