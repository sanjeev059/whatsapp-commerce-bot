import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Store } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div aria-hidden className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }} />
      <div aria-hidden className="absolute -bottom-32 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--warm), transparent 70%)" }} />

      <div className="relative max-w-md w-full text-center fade-up">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 10px 30px var(--accent-glow)",
          }}>
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-[var(--text-muted)]">GHARSIP</span>
        </div>

        <h1 className="text-[44px] leading-[1.05] font-extrabold tracking-tight" data-testid="landing-heading">
          Hyperlocal commerce for{" "}
          <span style={{ background: "linear-gradient(135deg, var(--accent), var(--warm))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            local stores
          </span>
        </h1>
        <p className="mt-4 text-[16px] text-[var(--text-muted)]">
          Each vendor has their own QR sticker. Scan it at the store to open their menu directly — no app to download.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <a href="/store/sharma-wines" className="btn-primary" data-testid="store-cta">
            <Store className="w-4 h-4" /> Just a Store →
          </a>
          <button onClick={() => navigate("/admin/login")} className="btn-ghost justify-center" data-testid="login-cta">
            Store sign in
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-8 text-[11px] text-[var(--text-faint)] uppercase tracking-[0.18em] leading-relaxed">
          Vendors are solely responsible for products, compliance &amp; fulfilment.
          <span className="block mt-2 normal-case tracking-normal">
            <Link to="/terms" className="underline underline-offset-2 hover:text-white">
              Terms &amp; conditions
            </Link>
            {" · "}
            By using GharSip you agree to these terms.
          </span>
        </p>
      </div>
    </div>
  );
}
