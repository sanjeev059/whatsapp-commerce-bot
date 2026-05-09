import { useEffect, useState } from "react";
import { Smartphone, X, Share, Plus } from "lucide-react";

// Per-slug dismiss key so each new vendor gets a fresh nudge
const DISMISS_KEY = (slug) => `gharsip:install-dismissed:${slug || "default"}`;

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

/**
 * Customer "Save as app" hint.
 * - Android/Chrome: catches the beforeinstallprompt event and offers a one-tap install.
 * - iOS Safari: shows a tooltip explaining the Share → Add to Home Screen flow.
 * - Hidden once dismissed (per device) or once already running standalone.
 */
export default function InstallAppHint({ vendorName, slug, autoOpen = false }) {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY(slug))) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS doesn't fire beforeinstallprompt — show the manual tip after a short delay.
    // autoOpen mode (e.g. Confirmation page) opens the iOS modal directly.
    const iosTimer = isIOS()
      ? setTimeout(() => {
          if (!isStandalone()) {
            setShow(true);
            if (autoOpen) setIosTip(true);
          }
        }, autoOpen ? 800 : 4000)
      : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [slug, autoOpen]);

  const dismiss = () => {
    setShow(false);
    setIosTip(false);
    try {
      localStorage.setItem(DISMISS_KEY(slug), String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") dismiss();
      else setDeferred(null);
    } else if (isIOS()) {
      setIosTip(true);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 bottom-0 z-30 px-4 pb-4 pointer-events-none"
        data-testid="install-hint"
      >
        <div
          className="mx-auto max-w-[480px] surface flex items-center gap-3 px-3 py-3 pointer-events-auto fade-up"
          style={{
            background: "rgba(7,8,11,0.92)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(34,210,122,0.30)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(34,210,122,0.14)" }}
          >
            <Smartphone className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold leading-tight">
              Save {vendorName || "this store"} as an app
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              One-tap reorder · works offline · no app store
            </div>
          </div>
          <button
            onClick={install}
            className="btn-primary !py-1.5 !px-3 text-xs shrink-0"
            data-testid="install-hint-install"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="text-[var(--text-faint)] p-1.5 shrink-0 hover:text-white"
            aria-label="Dismiss"
            data-testid="install-hint-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {iosTip && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center p-4 pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={dismiss}
          data-testid="install-hint-ios-tip"
        >
          <div
            className="surface max-w-[440px] w-full rounded-2xl p-5 fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold mb-2">Add to Home Screen</div>
            <ol className="text-sm text-[var(--text-muted)] space-y-2.5">
              <li className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "rgba(34,210,122,0.14)", color: "var(--accent)" }}
                >
                  1
                </span>
                <div className="flex items-center gap-2">
                  Tap the <Share className="inline w-4 h-4 text-white" /> Share button at the bottom
                </div>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "rgba(34,210,122,0.14)", color: "var(--accent)" }}
                >
                  2
                </span>
                <div className="flex items-center gap-2">
                  Choose <Plus className="inline w-4 h-4 text-white" /> "Add to Home Screen"
                </div>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "rgba(34,210,122,0.14)", color: "var(--accent)" }}
                >
                  3
                </span>
                <div>Tap "Add" — you're done!</div>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="btn-ghost w-full mt-4 justify-center text-sm"
              data-testid="install-hint-ios-close"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
