import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import {
  Power,
  Save,
  Store,
  Smartphone,
  Clock,
  MapPin,
  ShieldCheck,
  Copy,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminStore() {
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/vendor/me")
      .then(({ data }) => {
        setVendor(data);
        setForm({
          name: data.name || "",
          address: data.address || "",
          upi_id: data.upi_id || "",
          payment_qr_url: data.payment_qr_url || "",
          opening_time: data.opening_time || "10:00",
          closing_time: data.closing_time || "23:00",
        });
      })
      .catch(() => toast.error("Could not load store"));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/vendor/store", form);
      setVendor(data);
      toast.success("Store details saved");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const next = vendor.store_status === "open" ? "closed" : "open";
    try {
      const { data } = await api.patch("/vendor/store", { store_status: next });
      setVendor(data);
      toast.success(`Store is now ${next.toUpperCase()}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const copyLink = async () => {
    if (!vendor?.slug) return;
    const link = `${window.location.origin}/store/${vendor.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Storefront link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!vendor || !form)
    return (
      <div className="px-6 pt-10 text-sm text-[var(--text-muted)]" data-testid="store-loading">
        Loading…
      </div>
    );

  const isOpen = vendor.store_status === "open";

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12 max-w-3xl" data-testid="admin-store-page">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
          Settings
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Store settings</h1>
      </div>

      {/* Open/Close toggle */}
      <div className="surface p-4 md:p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: isOpen ? "rgba(34,210,122,0.14)" : "rgba(244,63,94,0.14)",
            color: isOpen ? "#22d27a" : "#f43f5e",
          }}
        >
          <Power className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">
            Store is currently <span style={{ color: isOpen ? "#22d27a" : "#f43f5e" }}>{isOpen ? "OPEN" : "CLOSED"}</span>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {isOpen
              ? "Customers can browse and place orders."
              : "Storefront shows a 'Closed' page. Existing orders are unaffected."}
          </div>
        </div>
        <button
          onClick={toggleStatus}
          className="btn-primary !py-2 text-sm"
          data-testid="toggle-store-status"
          style={
            isOpen
              ? { background: "linear-gradient(135deg, #f43f5e, #be123c)", color: "white" }
              : undefined
          }
        >
          {isOpen ? "Close store" : "Open store"}
        </button>
      </div>

      {/* Storefront link */}
      <div className="mt-4 surface p-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(96,165,250,0.14)", color: "#60a5fa" }}
        >
          <Store className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--text-muted)]">Storefront URL</div>
          <div className="font-mono text-sm truncate" data-testid="store-public-url">
            /store/{vendor.slug}
          </div>
        </div>
        <button onClick={copyLink} className="btn-ghost !py-2 !px-3 text-xs" data-testid="copy-store-link">
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
        <a
          href={`/store/${vendor.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !py-2 !px-3 text-xs"
          data-testid="open-store-link"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open
        </a>
      </div>

      {/* Edit form */}
      <div className="mt-6 surface p-4 md:p-5 space-y-4">
        <Field label="Store name" icon={<Store className="w-4 h-4" />}>
          <input
            className="input pl-10"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="store-name-input"
          />
        </Field>

        <Field label="Address" icon={<MapPin className="w-4 h-4" />} multi>
          <textarea
            className="input pl-10 min-h-[80px] resize-none"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            data-testid="store-address-input"
          />
        </Field>

        <Field label="UPI ID" icon={<Smartphone className="w-4 h-4" />}>
          <input
            className="input pl-10"
            placeholder="yourshop@upi"
            value={form.upi_id}
            onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
            data-testid="store-upi-input"
          />
        </Field>

        <Field label="Payment QR image (optional)">
          <ImageUpload
            value={form.payment_qr_url}
            onChange={(url) => setForm({ ...form, payment_qr_url: url })}
            testId="store-qr-upload"
            placeholder="Auto-generated QR will be used if blank"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens at" icon={<Clock className="w-4 h-4" />}>
            <input
              type="time"
              className="input pl-10"
              value={form.opening_time}
              onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
              data-testid="store-opening-input"
            />
          </Field>
          <Field label="Closes at" icon={<Clock className="w-4 h-4" />}>
            <input
              type="time"
              className="input pl-10"
              value={form.closing_time}
              onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
              data-testid="store-closing-input"
            />
          </Field>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full text-sm"
          data-testid="store-save-btn"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Password change */}
      <PasswordChangeCard />

      {/* Compliance / license read-only */}
      <div className="mt-6 surface p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] mt-0.5" />
          <div className="text-xs text-[var(--text-muted)] leading-relaxed">
            <div className="font-semibold text-white">Licenses & compliance</div>
            <div className="mt-1">{vendor.license_info || "Not on file"}</div>
            <div className="mt-2 text-[var(--text-faint)]">
              You are the legal merchant of record for all orders placed on{" "}
              <span className="text-white">/store/{vendor.slug}</span>. Local Commerce is the
              platform; compliance with FSSAI, excise, and age-gating laws is your responsibility.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordChangeCard() {
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
      await api.post("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success("Password changed");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 surface p-4 md:p-5 space-y-3" data-testid="password-card">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-[var(--accent)]" />
        <div className="text-base font-bold">Change password</div>
      </div>
      <p className="text-xs text-[var(--text-muted)] -mt-1">
        Use at least 8 characters. You'll stay signed in on this device.
      </p>

      <PwField
        label="Current password"
        value={form.current_password}
        show={show}
        onChange={(v) => setForm({ ...form, current_password: v })}
        testId="pw-current"
        placeholder="Current password"
      />
      <PwField
        label="New password"
        value={form.new_password}
        show={show}
        onChange={(v) => setForm({ ...form, new_password: v })}
        testId="pw-new"
        placeholder="At least 8 characters"
      />
      <PwField
        label="Confirm new password"
        value={form.confirm}
        show={show}
        onChange={(v) => setForm({ ...form, confirm: v })}
        testId="pw-confirm"
        placeholder="Type it again"
      />

      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-1">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        {show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Show passwords
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full text-sm"
        data-testid="pw-submit"
      >
        <Lock className="w-4 h-4" /> {submitting ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

function PwField({ label, value, onChange, show, testId, placeholder }) {
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
        placeholder={placeholder}
        autoComplete="new-password"
        required
        data-testid={testId}
      />
    </label>
  );
}

function Field({ label, icon, multi, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {label}
      </span>
      <div className="relative mt-1">
        <div
          className={`absolute left-3 ${
            multi ? "top-3.5" : "top-1/2 -translate-y-1/2"
          } text-[var(--text-faint)] pointer-events-none`}
        >
          {icon}
        </div>
        {children}
      </div>
    </label>
  );
}
