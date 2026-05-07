import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Truck } from "lucide-react";
import { STORE_NAME } from "@/config";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] relative overflow-hidden" data-testid="landing-page">
      {/* Hero gradient blobs */}
      <div
        aria-hidden
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--warm), transparent 70%)" }}
      />

      <div className="relative px-6 pt-16 pb-10 flex flex-col min-h-[100dvh]">
        {/* Logo mark */}
        <div className="flex items-center gap-2 fade-up">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 10px 30px var(--accent-glow)",
            }}
          >
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div className="text-sm font-semibold tracking-wide text-[var(--text-muted)]">
            HYPERLOCAL · MVP
          </div>
        </div>

        {/* Hero */}
        <div className="mt-12 flex-1 flex flex-col justify-center">
          <span className="pill mb-5 fade-up" style={{ animationDelay: "60ms" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> Open now · Delivers in 30 min
          </span>

          <h1
            className="text-[42px] md:text-[48px] leading-[1.05] font-extrabold tracking-tight fade-up"
            style={{ animationDelay: "120ms" }}
            data-testid="landing-heading"
          >
            Welcome to <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--warm))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {STORE_NAME}
            </span>
          </h1>

          <p
            className="mt-4 text-[17px] text-[var(--text-muted)] leading-relaxed max-w-sm fade-up"
            style={{ animationDelay: "180ms" }}
            data-testid="landing-subtitle"
          >
            Liquor orders <span className="text-white font-semibold">above ₹1000</span> only. Fast doorstep delivery, straight to your WhatsApp.
          </p>

          {/* Feature row */}
          <div
            className="mt-8 grid grid-cols-3 gap-3 fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Feature icon={<Zap className="w-4 h-4" />} label="30 min" sub="Avg delivery" />
            <Feature icon={<Truck className="w-4 h-4" />} label="No fees" sub="Free dropoff" />
            <Feature icon={<Sparkles className="w-4 h-4" />} label="Top picks" sub="Curated daily" />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/store")}
          className="btn-primary w-full text-[17px] py-4 fade-up"
          style={{ animationDelay: "320ms" }}
          data-testid="landing-cta"
        >
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

function Feature({ icon, label, sub }) {
  return (
    <div className="surface !rounded-2xl p-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
        style={{ background: "rgba(34,210,122,0.12)", color: "var(--accent)" }}
      >
        {icon}
      </div>
      <div className="text-sm font-bold leading-tight">{label}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-0.5">{sub}</div>
    </div>
  );
}
