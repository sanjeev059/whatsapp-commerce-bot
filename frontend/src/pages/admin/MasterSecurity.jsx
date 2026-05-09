import { useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck, Crown } from "lucide-react";

export default function MasterSecurity() {
  const { user, refreshMe } = useAdminAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (form.new_password !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(
        "/auth/change-password",
        {
          current_password: form.current_password,
          new_password: form.new_password,
        },
        { validateStatus: () => true }
      );
      if (res.status === 200) {
        toast.success("Password changed");
        setForm({ current_password: "", new_password: "", confirm: "" });
        if (refreshMe) await refreshMe();
      } else {
        toast.error((res.data && (res.data.detail || res.data.message)) || "Could not change password");
      }
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12 max-w-xl" data-testid="master-security-page">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
          <Crown className="w-3.5 h-3.5 text-[var(--warm)]" /> Master · Security
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Account security</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Signed in as <span className="font-mono">{user?.email}</span>
        </p>
      </div>

      <form onSubmit={submit} className="surface p-4 md:p-5 space-y-3" data-testid="master-password-card">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-[var(--accent)]" />
          <div className="text-base font-bold">Change password</div>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-1">Use at least 8 characters.</p>

        <PwField
          label="Current password"
          value={form.current_password}
          show={show}
          onChange={(v) => setForm({ ...form, current_password: v })}
          testId="master-pw-current"
        />
        <PwField
          label="New password"
          value={form.new_password}
          show={show}
          onChange={(v) => setForm({ ...form, new_password: v })}
          testId="master-pw-new"
        />
        <PwField
          label="Confirm new password"
          value={form.confirm}
          show={show}
          onChange={(v) => setForm({ ...form, confirm: v })}
          testId="master-pw-confirm"
        />

        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-1">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          {show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Show passwords
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full text-sm"
          data-testid="master-pw-submit"
        >
          <ShieldCheck className="w-4 h-4" /> {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function PwField({ label, value, onChange, show, testId }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {label}
      </span>
      <input
        type={show ? "text" : "password"}
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        required
        data-testid={testId}
      />
    </label>
  );
}
