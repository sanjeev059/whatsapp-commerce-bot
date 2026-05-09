import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import PerVendorPWA from "@/components/PerVendorPWA";
import InstallAppHint from "@/components/InstallAppHint";
import { ArrowRight, MapPin, Clock, Store } from "lucide-react";

export default function StorefrontHome() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/storefront/${slug}`, { headers: { Authorization: "" } })
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Store not found"));
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 text-center" data-testid="store-error">
        <div>
          <div className="text-5xl">🤷</div>
          <div className="mt-3 font-semibold">{error}</div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-[100dvh] flex items-center justify-center text-[var(--text-muted)]">Loading…</div>;

  if (!data.available) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 text-center" data-testid="store-closed-banner">
        <div className="max-w-sm">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl"
            style={{ background: "rgba(244,63,94,0.14)" }}>🔴</div>
          <h2 className="mt-5 text-2xl font-extrabold">Store Currently Closed</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {data.reason || "We are currently closed for the day. Please come back later."}
          </p>
        </div>
      </div>
    );
  }

  const v = data.vendor;
  return (
    <div className="min-h-[100dvh] relative overflow-hidden" data-testid="storefront-home">
      <PerVendorPWA vendor={v} />
      <InstallAppHint vendorName={v.name} />
      <div aria-hidden className="absolute -top-20 left-0 right-0 h-72 opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle at 50% 0%, var(--accent), transparent 60%)" }} />

      <div className="relative px-6 pt-14 pb-8 flex flex-col min-h-[100dvh]">
        <div className="flex items-center gap-2 fade-up">
          <Store className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">{v.slug}</span>
        </div>

        <div className="mt-12 flex-1 flex flex-col justify-center">
          <span className="pill mb-4 fade-up" data-testid="store-status-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> Open · 30 min delivery
          </span>
          <h1 className="text-[42px] leading-[1.05] font-extrabold tracking-tight fade-up" data-testid="store-name">
            {v.name}
          </h1>
          {v.address && (
            <p className="mt-3 text-sm text-[var(--text-muted)] flex items-start gap-1.5 fade-up">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{v.address}</span>
            </p>
          )}
          <p className="mt-4 text-[15px] text-[var(--text-muted)] leading-relaxed fade-up">
            Liquor orders <span className="text-white font-semibold">above ₹1000 only</span>. Pay via UPI on checkout.
          </p>
          {v.opening_time && v.closing_time && (
            <p className="mt-2 text-xs text-[var(--text-faint)] flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Hours: {v.opening_time} – {v.closing_time}
            </p>
          )}
        </div>

        <button onClick={() => navigate(`/store/${slug}/menu`)} className="btn-primary w-full text-[17px] py-4 fade-up" data-testid="open-store-cta">
          Open Store
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[11px] text-[var(--text-faint)] mt-3 uppercase tracking-[0.2em]">
          21+ only · Drink responsibly
        </p>
      </div>
    </div>
  );
}
