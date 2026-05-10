import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

/**
 * Shows new store admin credentials after POST /master/vendors/:id/reset-admin-password
 */
export default function MasterStorePasswordResetModal({ data, onClose }) {
  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      data-testid="reset-password-modal"
    >
      <div
        className="surface w-full max-w-md rounded-2xl p-6 fade-up max-h-[90vh] overflow-y-auto thin-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-[var(--warm)]" />
          <div className="text-base font-bold">New store login</div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Copy and share with <strong className="text-white">{data.vendor_name}</strong> securely. The old password no
          longer works. They use the <strong className="text-white">store sign-in</strong> page (
          <span className="font-mono text-[var(--text-faint)]">/admin/login</span>
          ), not the operations login.
        </p>
        <Row
          label="Store login URL"
          value={`${window.location.origin}/admin/login`}
          onCopy={() => copy(`${window.location.origin}/admin/login`, "URL")}
        />
        <Row label="Email" value={data.admin_email} onCopy={() => copy(data.admin_email, "Email")} />
        <Row
          label="New password"
          value={data.new_password}
          mono
          onCopy={() => copy(data.new_password, "Password")}
        />
        <button
          onClick={onClose}
          className="btn-primary w-full mt-4 text-sm"
          data-testid="reset-password-modal-done"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--border-soft)] last:border-0">
      <div className="w-24 shrink-0 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className={`flex-1 text-xs ${mono ? "font-mono break-all" : ""}`}>{value}</div>
      <button
        type="button"
        onClick={onCopy}
        className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] shrink-0"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
