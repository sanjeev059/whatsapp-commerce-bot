import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";

const KEY = (slug) => `gharsip:age-ok:${slug}`;
const TTL_DAYS = 30;

export default function AgeGate({ slug, vendorName, onAccept, children }) {
  const [verified, setVerified] = useState(null); // null=loading, true/false

  useEffect(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(KEY(slug));
      if (!raw) {
        setVerified(false);
        return;
      }
      const ok = JSON.parse(raw);
      if (ok.exp && ok.exp > Date.now()) {
        setVerified(true);
        onAccept?.();
      } else setVerified(false);
    } catch {
      setVerified(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const accept = () => {
    try {
      localStorage.setItem(
        KEY(slug),
        JSON.stringify({ exp: Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000, at: Date.now() })
      );
    } catch {}
    setVerified(true);
    onAccept?.();
  };

  const reject = () => {
    window.location.href = "https://www.google.com";
  };

  if (verified === null) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-[var(--text-muted)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (verified) return children;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(7,8,11,0.96)", backdropFilter: "blur(8px)" }}
      data-testid="age-gate"
    >
      <div className="max-w-md w-full surface p-6 fade-up">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,181,71,0.14)" }}
        >
          <ShieldCheck className="w-7 h-7 text-[var(--warm)]" />
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[var(--text-faint)] font-bold">
          Age verification · 21+ only
        </div>
        <h1 className="text-2xl font-extrabold mt-1 leading-tight">
          Confirm you are <span className="text-[var(--warm)]">21 years or older</span>
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
          You are about to view <span className="font-semibold text-white">{vendorName || "a"}</span>'s
          private storefront. Liquor and tobacco products may be listed.
        </p>

        <div
          className="mt-4 p-3 rounded-xl text-[11px] leading-relaxed text-[var(--text-muted)]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
          data-testid="age-gate-disclaimer"
        >
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warm)] mt-0.5 shrink-0" />
            <span className="font-semibold text-white text-[12px]">Important — please read</span>
          </div>
          <ul className="space-y-1.5 list-disc pl-4">
            <li>
              <strong>GharSip is only a technology platform</strong> connecting you to the local
              store you scanned. We do not own, sell, store, or deliver any products.
            </li>
            <li>
              <strong>The local store is the seller</strong> and is solely responsible for product
              quality, license compliance, packaging, and delivery.
            </li>
            <li>
              You must be <strong>21 years or older</strong> to purchase liquor or tobacco. The
              delivery person will verify your age and refuse delivery if unable to confirm.
            </li>
            <li>
              By continuing, you confirm you are 21+, are of sound mind, and understand that
              GharSip is not the merchant of record. Drink responsibly.
            </li>
          </ul>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={accept}
            className="btn-primary w-full text-[15px] justify-center"
            data-testid="age-gate-accept"
          >
            I am 21+ · Continue to {vendorName || "store"}
          </button>
          <button
            onClick={reject}
            className="btn-ghost w-full text-xs justify-center"
            data-testid="age-gate-reject"
          >
            I am under 21 · Take me away
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-faint)] mt-4 text-center">
          Confirmation stored locally for 30 days · Drink responsibly
        </p>
      </div>
    </div>
  );
}
