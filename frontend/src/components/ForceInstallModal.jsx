import { useEffect, useState } from "react";
import { Smartphone, X, Share, Plus, Sparkles } from "lucide-react";

/**
 * Aggressive one-time-per-store install prompt fired RIGHT after the customer accepts
 * the age gate on first scan. Designed to maximize installation rate so customers
 * don't lose the store URL after closing the tab.
 *
 * Behavior:
 *  - Skipped if already standalone (PWA already installed).
 *  - Skipped if dismissed before for THIS slug (key: gharsip:install-popup-dismissed:<slug>).
 *  - Android Chrome: triggers native beforeinstallprompt directly.
 *  - iOS Safari: shows manual Share → Add to Home Screen tutorial.
 */
const KEY = (slug) => `gharsip:install-popup-dismissed:${slug || "default"}`;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua) && !window.MSStream;
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function ForceInstallModal({ slug, vendorName, onDone }) {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    if (isStandalone()) {
      onDone?.();
      return;
    }
    try {
      if (localStorage.getItem(KEY(slug))) {
        onDone?.();
        return;
      }
    } catch {}

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Open shortly after age gate acceptance — feels intentional, not jarring.
    const t = setTimeout(() => setOpen(true), 600);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, [slug, onDone]);

  const close = (remember = true) => {
    setOpen(false);
    if (remember) {
      try {
        localStorage.setItem(KEY(slug), String(Date.now()));
      } catch {}
    }
    onDone?.();
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      close(true);
      if (choice.outcome === "accepted") {
        // Browser handles the rest
      }
    }
  };

  if (!open) return null;
  const ios = isIOS();
  const canPromptNative = !!deferred && !ios;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center px-4 pb-4 pt-12 md:p-6"
      style={{ background: "rgba(7,8,11,0.92)", backdropFilter: "blur(8px)" }}
      data-testid="force-install-modal"
    >
      <div className="surface max-w-[440px] w-full slide-up md:fade-up rounded-2xl overflow-hidden">
        <div
          className="px-5 pt-5 pb-4 relative"
          style={{
            background:
              "linear-gradient(180deg, rgba(34,210,122,0.16) 0%, transparent 100%)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(34,210,122,0.20)" }}
          >
            <Smartphone className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--accent)] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> One last step
          </div>
          <h2 className="text-2xl font-extrabold mt-1 leading-tight">
            Install <span className="text-[var(--accent)]">{vendorName || "the store"}</span>
            <br />on your phone
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
            So you don't lose the link. One tap and the store sits as an app icon on your home
            screen — open it next time without scanning the QR again.
          </p>
        </div>

        <div className="px-5 pb-3 grid grid-cols-3 gap-2 text-center">
          <Bullet icon="⚡" label="One-tap reorder" />
          <Bullet icon="🎁" label="Coupon alerts" />
          <Bullet icon="📡" label="Works offline" />
        </div>

        {canPromptNative ? (
          <div className="px-5 pb-5">
            <button
              onClick={install}
              className="btn-primary w-full text-base justify-center"
              data-testid="force-install-yes"
            >
              <Plus className="w-5 h-5" /> Add to Home Screen
            </button>
            <button
              onClick={() => close(true)}
              className="btn-ghost w-full justify-center text-xs mt-2"
              data-testid="force-install-later"
            >
              Maybe later
            </button>
          </div>
        ) : ios ? (
          <div className="px-5 pb-5">
            <div
              className="rounded-xl p-3 space-y-2.5 text-sm text-[var(--text-muted)]"
              style={{ background: "var(--surface-2)" }}
              data-testid="force-install-ios-tip"
            >
              <Step n={1}>
                Tap <Share className="inline w-4 h-4 -mt-0.5 text-white" /> at the bottom of Safari
              </Step>
              <Step n={2}>
                Select <Plus className="inline w-4 h-4 -mt-0.5 text-white" />
                <span className="font-semibold text-white"> Add to Home Screen</span>
              </Step>
              <Step n={3}>Tap <span className="font-semibold text-white">Add</span> — done!</Step>
            </div>
            <button
              onClick={() => close(true)}
              className="btn-primary w-full text-base justify-center mt-4"
              data-testid="force-install-ios-done"
            >
              Got it
            </button>
          </div>
        ) : (
          // Desktop or browser without beforeinstallprompt — be lenient
          <div className="px-5 pb-5">
            <div
              className="rounded-xl p-3 text-sm text-[var(--text-muted)]"
              style={{ background: "var(--surface-2)" }}
            >
              On a phone? Open this link in Chrome or Safari and you'll get an
              "Install app" option.
            </div>
            <button
              onClick={() => close(true)}
              className="btn-primary w-full text-base justify-center mt-4"
              data-testid="force-install-skip"
            >
              Continue to store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bullet({ icon, label }) {
  return (
    <div className="surface-2 !rounded-xl py-2.5 px-1">
      <div className="text-2xl">{icon}</div>
      <div className="text-[10px] mt-0.5 text-[var(--text-muted)] font-semibold leading-tight">
        {label}
      </div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ background: "rgba(34,210,122,0.16)", color: "var(--accent)" }}
      >
        {n}
      </span>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  );
}
