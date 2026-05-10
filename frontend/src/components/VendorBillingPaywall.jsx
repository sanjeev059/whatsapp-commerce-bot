import { resolveUrl } from "@/lib/apiClient";
import { Lock, MessageCircle, Copy, Power } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useNavigate } from "react-router-dom";

/**
 * Full-screen vendor paywall shown when subscription_active=false OR subscription expired.
 * Master controls activation manually after receiving payment via UPI / WhatsApp.
 */
export default function VendorBillingPaywall({ billing, vendorName }) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const platform = billing?.platform || {};
  const sub = billing?.subscription || {};
  const fee = platform.monthly_fee_inr || 5000;
  const upiId = platform.upi_id || "";
  const wa = platform.whatsapp || "";
  const qrSrc = platform.qr_available ? resolveUrl("/api/billing/qr.png?size=512") : null;

  const reasonLabel = sub.is_expired
    ? `Subscription expired${sub.expires_at ? ` on ${new Date(sub.expires_at).toLocaleDateString()}` : ""}`
    : "Subscription inactive";

  const copyUpi = async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const waLink = wa
    ? `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I've paid the monthly subscription for "${vendorName}". Please reactivate my store.`
      )}`
    : null;

  const onLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-10"
      data-testid="vendor-paywall"
    >
      <div className="max-w-md w-full surface p-6 fade-up">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(244,63,94,0.14)" }}
        >
          <Lock className="w-7 h-7 text-[#f43f5e]" />
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#f43f5e] font-bold">
          {reasonLabel}
        </div>
        <h1 className="text-2xl font-extrabold mt-1">Pay to reactivate your store</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Your storefront is offline. Pay the monthly fee below, then send the
          payment screenshot on WhatsApp — your store will be switched back on shortly.
        </p>

        <div className="mt-5 surface-2 !rounded-xl p-4 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">
            Monthly fee
          </div>
          <div className="text-3xl font-extrabold mt-0.5" data-testid="paywall-fee">
            ₹{fee.toLocaleString("en-IN")}
          </div>
        </div>

        {qrSrc ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold mb-2">
              Scan to pay
            </div>
            <div className="surface-2 !rounded-xl p-3 flex justify-center">
              <img
                src={qrSrc}
                alt="UPI QR"
                className="w-56 h-56 rounded-lg"
                data-testid="paywall-qr"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 surface-2 !rounded-lg px-3 py-2 text-xs font-mono truncate">
                {upiId}
              </div>
              <button
                onClick={copyUpi}
                className="btn-ghost !py-2 !px-3 text-xs shrink-0"
                data-testid="paywall-copy-upi"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        ) : (
          <div
            className="mt-4 p-3 rounded-xl text-xs"
            style={{
              background: "rgba(255,181,71,0.10)",
              border: "1px solid rgba(255,181,71,0.30)",
            }}
          >
            Billing details aren&rsquo;t set up yet. Contact support for payment instructions.
          </div>
        )}

        {platform.note_to_vendor && (
          <p className="mt-4 text-[11px] text-[var(--text-faint)] leading-relaxed">
            {platform.note_to_vendor}
          </p>
        )}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full justify-center mt-5"
            data-testid="paywall-whatsapp"
          >
            <MessageCircle className="w-4 h-4" /> Send screenshot on WhatsApp
          </a>
        )}

        <button
          onClick={onLogout}
          className="btn-ghost w-full justify-center mt-3 text-xs"
          data-testid="paywall-logout"
        >
          <Power className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}
