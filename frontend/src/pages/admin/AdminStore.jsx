import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import StorefrontQRCard from "@/components/StorefrontQRCard";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { PLATFORM_NAME } from "@/config";
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
  Moon,
  Sun,
  Navigation,
  Loader2,
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
          enabled_categories: data.enabled_categories && data.enabled_categories.length > 0
            ? data.enabled_categories
            : ["liquor", "cigarettes", "snacks", "food"],
          lat: data.lat ?? "",
          lng: data.lng ?? "",
          delivery_radius_km: data.delivery_radius_km ?? 5,
          night_pricing_enabled: !!data.night_pricing_enabled,
          night_start: data.night_start || "22:00",
          night_end: data.night_end || "06:00",
          night_multiplier: data.night_multiplier || 1.10,
          night_categories: data.night_categories || ["liquor"],
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

      {/* Storefront QR */}
      <StorefrontQRCard slug={vendor.slug} vendorName={vendor.name} />

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

        <DeliveryRadiusCard form={form} setForm={setForm} />

        <Field label="Categories you sell">
          <div className="grid grid-cols-2 gap-2 pt-1" data-testid="store-categories">
            {[
              { id: "liquor", label: "🍻 Liquor" },
              { id: "cigarettes", label: "🚬 Cigarettes" },
              { id: "snacks", label: "🍿 Snacks" },
              { id: "food", label: "🍔 Food" },
            ].map((c) => {
              const active = (form.enabled_categories || []).includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`px-3 py-2 rounded-lg border text-sm cursor-pointer flex items-center gap-2 ${
                    active
                      ? "border-[var(--accent)] bg-[rgba(34,210,122,0.08)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  }`}
                  data-testid={`store-cat-${c.id}`}
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={active}
                    onChange={() =>
                      setForm({
                        ...form,
                        enabled_categories: active
                          ? form.enabled_categories.filter((x) => x !== c.id)
                          : [...(form.enabled_categories || []), c.id],
                      })
                    }
                  />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-2">
            Customers will only see categories you tick. Untick to hide a category from your storefront.
          </div>
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full text-sm"
          data-testid="store-save-btn"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Day/Night dynamic pricing */}
      <NightPricingCard form={form} setForm={setForm} onSave={save} saving={saving} />

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
              <span className="text-white">/store/{vendor.slug}</span>. {PLATFORM_NAME} runs this app;
              compliance with applicable licences and age rules is your responsibility.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NightPricingCard({ form, setForm, onSave, saving }) {
  const enabled = !!form.night_pricing_enabled;
  const cats = form.night_categories || [];
  const allCats = [
    { id: "liquor", label: "🍻 Liquor" },
    { id: "cigarettes", label: "🚬 Cigarettes" },
    { id: "snacks", label: "🍟 Snacks" },
    { id: "food", label: "🍔 Food" },
  ];
  const togglecat = (id) => {
    setForm({
      ...form,
      night_categories: cats.includes(id) ? cats.filter((x) => x !== id) : [...cats, id],
    });
  };
  const mult = Number(form.night_multiplier || 1);
  const pct = Math.round((mult - 1) * 100);

  return (
    <div className="mt-6 surface p-4 md:p-5" data-testid="night-pricing-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-[#a78bfa]" />
          <div className="text-base font-bold">Day / Night dynamic pricing</div>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setForm({ ...form, night_pricing_enabled: e.target.checked })}
            data-testid="night-pricing-toggle"
          />
          {enabled ? "On" : "Off"}
        </label>
      </div>
      <p className="text-xs text-[var(--text-muted)] -mt-1 mb-3">
        Apply a markup during the night window (IST) — e.g. +10% for liquor after 10 PM.
      </p>

      {enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Night starts at" icon={<Sun className="w-4 h-4" />}>
              <input
                type="time"
                className="input pl-10"
                value={form.night_start}
                onChange={(e) => setForm({ ...form, night_start: e.target.value })}
                data-testid="night-start-input"
              />
            </Field>
            <Field label="Night ends at" icon={<Sun className="w-4 h-4" />}>
              <input
                type="time"
                className="input pl-10"
                value={form.night_end}
                onChange={(e) => setForm({ ...form, night_end: e.target.value })}
                data-testid="night-end-input"
              />
            </Field>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center justify-between">
              <span>Markup multiplier</span>
              <span className="text-white font-mono">
                {mult.toFixed(2)}x · {pct >= 0 ? "+" : ""}
                {pct}%
              </span>
            </span>
            <input
              type="range"
              min="1.00"
              max="2.00"
              step="0.05"
              value={mult}
              onChange={(e) => setForm({ ...form, night_multiplier: parseFloat(e.target.value) })}
              className="w-full mt-2 accent-[var(--accent)]"
              data-testid="night-multiplier-input"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-faint)] mt-1">
              <span>1.00 (no markup)</span>
              <span>2.00 (double)</span>
            </div>
          </label>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Apply to categories
            </span>
            <div className="flex flex-wrap gap-2 mt-2" data-testid="night-categories">
              {allCats.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => togglecat(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      on ? "border-transparent text-black" : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                    style={
                      on
                        ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                        : { background: "var(--surface-2)" }
                    }
                    data-testid={`night-cat-${c.id}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="btn-primary w-full text-sm mt-4"
        data-testid="night-save-btn"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save pricing rules"}
      </button>
    </div>
  );
}


function PasswordChangeCard() {
  const { refreshMe } = useAdminAuth();
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
        { validateStatus: () => true } // bypass global 401 interceptor
      );
      if (res.status === 200) {
        toast.success("Password changed");
        setForm({ current_password: "", new_password: "", confirm: "" });
        if (refreshMe) await refreshMe();
      } else {
        toast.error(
          (res.data && (res.data.detail || res.data.message)) ||
            "Could not change password"
        );
      }
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

function DeliveryRadiusCard({ form, setForm }) {
  const [pinning, setPinning] = useState(false);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support GPS");
      return;
    }
    setPinning(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        toast.success(
          `Pinned · ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        );
        setPinning(false);
      },
      (err) => {
        setPinning(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Allow location to pin your shop"
            : "Could not get location — try again"
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const clear = () =>
    setForm((f) => ({ ...f, lat: "", lng: "" }));

  const hasPin = form.lat !== "" && form.lng !== "" && form.lat != null && form.lng != null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
      data-testid="store-radius-card"
    >
      <div className="flex items-center gap-2 mb-2">
        <Navigation className="w-4 h-4 text-[var(--accent)]" />
        <div className="text-sm font-bold">Delivery range</div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
        Pin your shop on the map. Customers more than the set distance away will be told you don't deliver to them — both before they browse and at checkout.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="surface-2 !rounded-lg px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Latitude</div>
          <div className="text-sm font-mono mt-0.5" data-testid="store-lat">
            {hasPin ? Number(form.lat).toFixed(5) : <span className="text-[var(--text-faint)]">— · —</span>}
          </div>
        </div>
        <div className="surface-2 !rounded-lg px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Longitude</div>
          <div className="text-sm font-mono mt-0.5" data-testid="store-lng">
            {hasPin ? Number(form.lng).toFixed(5) : <span className="text-[var(--text-faint)]">— · —</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={pinning}
          className="btn-primary !py-2 !px-3 text-xs flex-1 justify-center"
          data-testid="store-pin-location"
        >
          {pinning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          {pinning ? "Pinning…" : hasPin ? "Re-pin" : "Use my current location"}
        </button>
        {hasPin && (
          <button
            type="button"
            onClick={clear}
            className="btn-ghost !py-2 !px-3 text-xs"
            data-testid="store-clear-pin"
          >
            Clear pin
          </button>
        )}
      </div>

      <div className="mt-3">
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          Delivery radius (km)
        </span>
        <input
          type="number"
          min={0.5}
          max={50}
          step={0.5}
          className="input mt-1"
          value={form.delivery_radius_km}
          onChange={(e) => setForm({ ...form, delivery_radius_km: Number(e.target.value) || 5 })}
          data-testid="store-radius-input"
        />
        <div className="text-[10px] text-[var(--text-faint)] mt-1">
          Recommended: 3–5 km. Customers further away than this will be blocked.
        </div>
      </div>

      {!hasPin && (
        <div
          className="mt-3 p-2.5 rounded-lg text-[11px] text-[var(--warm)]"
          style={{ background: "rgba(255,181,71,0.10)", border: "1px solid rgba(255,181,71,0.25)" }}
        >
          ⚠ No pin set yet. Range check is OFF — every customer can order regardless of distance.
        </div>
      )}
    </div>
  );
}

