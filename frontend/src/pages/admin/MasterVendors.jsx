import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import MasterStorePasswordResetModal from "@/components/MasterStorePasswordResetModal";
import { toast } from "sonner";
import {
  Plus,
  X,
  Crown,
  ExternalLink,
  Power,
  Copy,
  ShieldCheck,
  Save,
  Trash2,
  Calendar,
  KeyRound,
} from "lucide-react";

export default function MasterVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // post-creation modal with default credentials
  const [passwordReset, setPasswordReset] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/master/vendors");
      setVendors(data);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deactivate = async (vid) => {
    if (!window.confirm("Disable this vendor's subscription? Their storefront will go offline.")) return;
    try {
      await api.delete(`/master/vendors/${vid}`);
      toast.success("Vendor deactivated");
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const reactivate = async (vid) => {
    try {
      await api.patch(`/master/vendors/${vid}`, { subscription_active: true });
      toast.success("Vendor re-activated");
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const setExpiry = async (v) => {
    const current = v.subscription_expires_at
      ? new Date(v.subscription_expires_at).toISOString().slice(0, 10)
      : "";
    // eslint-disable-next-line no-alert
    const input = window.prompt(
      `Set subscription expiry for "${v.name}"\n\nFormat: YYYY-MM-DD (leave blank to clear)`,
      current
    );
    if (input === null) return; // cancelled
    const trimmed = input.trim();
    let payload;
    if (trimmed === "") {
      payload = { subscription_expires_at: null };
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      toast.error("Use YYYY-MM-DD format");
      return;
    } else {
      // Set to end-of-day in IST so the day itself counts
      payload = { subscription_expires_at: `${trimmed}T23:59:59+05:30` };
    }
    try {
      await api.patch(`/master/vendors/${v.id}`, payload);
      toast.success(trimmed ? `Expiry → ${trimmed}` : "Expiry cleared");
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const resetStorePassword = async (v) => {
    if (
      !window.confirm(
        `Generate a new password for "${v.name}"?\n\n${v.admin_email || "Store admin"}\n\nThe current password will stop working immediately.`
      )
    )
      return;
    try {
      const { data } = await api.post(`/master/vendors/${v.id}/reset-admin-password`);
      setPasswordReset(data);
      toast.success("New store password generated — copy it now.");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const formatExpiry = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const now = new Date();
      const days = Math.ceil((d - now) / 86400000);
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
      if (days < 0) return { label, sub: `${Math.abs(days)}d ago`, expired: true };
      if (days <= 7) return { label, sub: `${days}d left`, soon: true };
      return { label, sub: `${days}d left` };
    } catch {
      return "—";
    }
  };

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12" data-testid="master-vendors-page">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            <Crown className="w-3.5 h-3.5 text-[var(--warm)]" /> Master
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Vendors</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary !py-2 !px-3 text-sm"
          data-testid="add-vendor-btn"
        >
          <Plus className="w-4 h-4" /> Add vendor
        </button>
      </div>

      {/* Vendor list */}
      <div className="surface overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1fr_180px_140px_120px_140px_140px] text-[11px] uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border-soft)] font-semibold">
          <div>Vendor</div>
          <div>Slug / URL</div>
          <div>Owner</div>
          <div className="text-center">Status</div>
          <div className="text-center">Sub. expiry</div>
          <div className="text-right">Actions</div>
        </div>
        {vendors.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : "No vendors yet. Click 'Add vendor' to onboard the first one."}
          </div>
        ) : (
          vendors.map((v) => {
            const exp = formatExpiry(v.subscription_expires_at);
            return (
            <div
              key={v.id}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_180px_140px_120px_140px_140px] items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)] last:border-0"
              data-testid={`vendor-row-${v.slug}`}
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{v.name}</div>
                <div className="text-[11px] text-[var(--text-faint)] truncate">
                  {v.admin_email || "—"}
                </div>
                {v.owner_aadhar ? (
                  <div className="text-[10px] font-mono text-[var(--text-faint)] truncate">
                    Aadhaar ········{String(v.owner_aadhar).slice(-4)}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="md:hidden mt-2 text-left text-xs text-[var(--accent)] font-semibold"
                  onClick={() => resetStorePassword(v)}
                  data-testid={`vendor-reset-pw-mobile-${v.slug}`}
                >
                  Reset store password →
                </button>
              </div>
              <div className="hidden md:block text-xs font-mono text-[var(--text-muted)] truncate">
                /store/{v.slug}
              </div>
              <div className="hidden md:block text-xs text-[var(--text-muted)] truncate">
                {v.owner_name}
              </div>
              <div className="hidden md:flex justify-center">
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={
                    v.subscription_active
                      ? { background: "rgba(34,210,122,0.14)", color: "#22d27a" }
                      : { background: "rgba(244,63,94,0.14)", color: "#f43f5e" }
                  }
                >
                  {v.subscription_active ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="hidden md:flex flex-col items-center text-center">
                {typeof exp === "object" ? (
                  <>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: exp.expired ? "#f43f5e" : exp.soon ? "#ffb547" : "var(--text)",
                      }}
                    >
                      {exp.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-faint)]">{exp.sub}</span>
                  </>
                ) : (
                  <span className="text-xs text-[var(--text-faint)]">—</span>
                )}
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setExpiry(v)}
                  className="p-2 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
                  data-testid={`vendor-expiry-${v.slug}`}
                  title="Set subscription expiry"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetStorePassword(v)}
                  className="p-2 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
                  data-testid={`vendor-reset-pw-${v.slug}`}
                  title="Reset store admin password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <a
                  href={`/store/${v.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
                  data-testid={`vendor-open-${v.slug}`}
                  title="Open storefront"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {v.subscription_active ? (
                  <button
                    onClick={() => deactivate(v.id)}
                    className="p-2 rounded-md text-[#f43f5e] hover:bg-[rgba(244,63,94,0.10)]"
                    data-testid={`vendor-disable-${v.slug}`}
                    title="Disable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => reactivate(v.id)}
                    className="p-2 rounded-md text-[var(--accent)] hover:bg-[rgba(34,210,122,0.10)]"
                    data-testid={`vendor-enable-${v.slug}`}
                    title="Re-activate"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
          })
        )}
      </div>

      {creating && (
        <CreateVendorModal
          onClose={() => setCreating(false)}
          onCreated={(payload) => {
            setCreating(false);
            setCreated(payload);
            load();
          }}
        />
      )}

      {created && <CredentialsModal payload={created} onClose={() => setCreated(null)} />}
      {passwordReset && <MasterStorePasswordResetModal data={passwordReset} onClose={() => setPasswordReset(null)} />}
    </div>
  );
}

function CreateVendorModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    owner_name: "",
    owner_phone: "",
    address: "",
    upi_id: "",
    license_info: "",
    license_photo_id: "",
    aadhar_photo_id: "",
    owner_aadhar: "",
    enabled_categories: ["liquor", "cigarettes", "snacks", "food"],
    tos_signature_name: "",
    accepts_tos: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const uploadOnboardingPhoto = async (file, field) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/master/uploads/onboarding", fd);
    setForm((f) => ({ ...f, [field]: data.id }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.accepts_tos) {
      toast.error("Vendor must accept the platform Terms of Service.");
      return;
    }
    if (!form.tos_signature_name.trim()) {
      toast.error("Vendor's typed legal name is required as e-signature.");
      return;
    }
    if (form.enabled_categories.length === 0) {
      toast.error("Pick at least one category the vendor will sell.");
      return;
    }
    setSubmitting(true);
    try {
      const ownerDigits = form.owner_aadhar.replace(/\D/g, "");
      const { data } = await api.post("/master/vendors", {
        name: form.name,
        slug: form.slug.trim() || undefined,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone,
        address: form.address,
        upi_id: form.upi_id,
        license_info: form.license_info,
        enabled_categories: form.enabled_categories,
        tos_signature_name: form.tos_signature_name,
        accepts_tos: form.accepts_tos,
        ...(form.license_photo_id ? { license_photo_id: form.license_photo_id } : {}),
        ...(form.aadhar_photo_id ? { aadhar_photo_id: form.aadhar_photo_id } : {}),
        ...(ownerDigits.length ? { owner_aadhar: ownerDigits } : {}),
      });
      toast.success(`Vendor ${data.vendor.name} onboarded`);
      onCreated(data);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCat = (id) => {
    setForm((f) => ({
      ...f,
      enabled_categories: f.enabled_categories.includes(id)
        ? f.enabled_categories.filter((c) => c !== id)
        : [...f.enabled_categories, id],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="create-vendor-modal"
    >
      <form
        onSubmit={submit}
        className="surface w-full md:max-w-lg max-h-[90vh] overflow-y-auto thin-scroll slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Onboard
            </div>
            <div className="font-bold">New vendor</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label="Store name *">
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="new-vendor-name"
            />
          </Field>
          <Field label="Slug (auto-generated if blank)">
            <input
              className="input font-mono"
              placeholder="auto-generated from name"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
              data-testid="new-vendor-slug"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner name *">
              <input
                className="input"
                required
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                data-testid="new-vendor-owner-name"
              />
            </Field>
            <Field label="Owner phone *">
              <input
                className="input"
                required
                placeholder="+91…"
                value={form.owner_phone}
                onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                data-testid="new-vendor-owner-phone"
              />
            </Field>
          </div>
          <Field label="UPI ID">
            <input
              className="input"
              placeholder="vendor@upi"
              value={form.upi_id}
              onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
              data-testid="new-vendor-upi"
            />
          </Field>
          <Field label="Address">
            <textarea
              className="input min-h-[64px] resize-none"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              data-testid="new-vendor-address"
            />
          </Field>
          <Field label="License info (FSSAI / excise / etc.)">
            <input
              className="input"
              value={form.license_info}
              onChange={(e) => setForm({ ...form, license_info: e.target.value })}
              data-testid="new-vendor-license"
            />
          </Field>

          <Field label="Licence photo (optional)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-xs text-[var(--text-muted)] w-full file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-1.5"
              data-testid="new-vendor-license-photo"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await uploadOnboardingPhoto(f, "license_photo_id");
                  toast.success("Licence photo uploaded");
                } catch (err) {
                  toast.error(apiErrorMessage(err));
                }
                e.target.value = "";
              }}
            />
            {form.license_photo_id ? (
              <p className="text-[10px] text-[var(--accent)] mt-1">Ready to attach on create</p>
            ) : null}
          </Field>

          <Field label="Owner Aadhaar card photo (optional)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-xs text-[var(--text-muted)] w-full file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-3 file:py-1.5"
              data-testid="new-vendor-aadhar-photo"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await uploadOnboardingPhoto(f, "aadhar_photo_id");
                  toast.success("Aadhaar photo uploaded");
                } catch (err) {
                  toast.error(apiErrorMessage(err));
                }
                e.target.value = "";
              }}
            />
            {form.aadhar_photo_id ? (
              <p className="text-[10px] text-[var(--accent)] mt-1">Ready to attach on create</p>
            ) : null}
          </Field>

          <Field label="Owner Aadhaar number (optional)">
            <input
              className="input font-mono tracking-wider"
              placeholder="12-digit Aadhaar"
              inputMode="numeric"
              autoComplete="off"
              value={form.owner_aadhar}
              onChange={(e) => setForm({ ...form, owner_aadhar: e.target.value.replace(/[^\d\s]/g, "") })}
              data-testid="new-vendor-owner-aadhar"
            />
            <p className="text-[10px] text-[var(--text-faint)] mt-1 leading-snug">
              Digit checksum only — not UIDAI online verification. Store securely; not shown to the vendor app.
            </p>
          </Field>

          <Field label="Categories this vendor sells *">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: "liquor", label: "🍻 Liquor" },
                { id: "cigarettes", label: "🚬 Cigarettes" },
                { id: "snacks", label: "🍿 Snacks" },
                { id: "food", label: "🍔 Food" },
              ].map((c) => (
                <label
                  key={c.id}
                  className={`px-3 py-2 rounded-lg border text-sm cursor-pointer flex items-center gap-2 ${
                    form.enabled_categories.includes(c.id)
                      ? "border-[var(--accent)] bg-[rgba(34,210,122,0.08)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  }`}
                  data-testid={`new-vendor-cat-${c.id}`}
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={form.enabled_categories.includes(c.id)}
                    onChange={() => toggleCat(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Terms of Service block */}
          <div
            className="rounded-xl p-3 mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
            data-testid="new-vendor-tos-block"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)] font-bold mb-2">
              Terms of Service · Vendor agreement
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 max-h-44 overflow-y-auto thin-scroll pr-2">
              <li>
                The Vendor is the sole <strong>merchant of record</strong> for every order placed
                through the storefront. GharSip / the Platform never takes title to, owns, sells,
                stores, or delivers any goods — including liquor, tobacco, food, or any restricted
                item. The Platform is a pure technology and listing service.
              </li>
              <li>
                The Vendor warrants they hold all required licenses (excise / FL-shop / FSSAI /
                trade / GST / municipal) for every category they list, and will keep them valid
                throughout the engagement. The Vendor will provide license copies on demand and
                immediately notify the Platform of any suspension, revocation, or expiry.
              </li>
              <li>
                The Vendor is solely responsible for: (a) verifying the customer's age (21+ for
                liquor / tobacco) at the time of physical handover, (b) refusing service to
                intoxicated or under-age individuals, (c) accurate product descriptions, MRP
                pricing, and tax compliance, (d) handling, packaging, hygiene, and food safety,
                (e) all delivery operations and personnel, and (f) complaints, refunds, and
                disputes with customers.
              </li>
              <li>
                The Vendor agrees to <strong>indemnify, defend, and hold harmless</strong> the
                Platform, its operators, employees, and affiliates from any and all claims,
                damages, fines, regulatory action, lawsuits, taxes, penalties, or losses arising
                from or relating to the Vendor's products, deliveries, license status, employees,
                customers, or any breach of law. This indemnity survives termination.
              </li>
              <li>
                The Platform may immediately deactivate the storefront on (a) non-payment of the
                monthly fee, (b) any regulatory complaint, (c) suspected fraud, (d) breach of
                these terms, or (e) at the Platform's sole discretion, without liability.
              </li>
              <li>
                Customer payments via UPI flow directly from customer to Vendor's UPI ID — the
                Platform never holds, processes, or settles any customer money. The Platform's
                only revenue is the monthly subscription fee paid by the Vendor.
              </li>
              <li>
                The Vendor consents to the platform displaying the store name, products, prices,
                address, hours, and aggregated order analytics for operational and marketing
                purposes.
              </li>
              <li>
                Disputes shall be governed by the laws of India and resolved by the courts of the
                Vendor's registered city. Either party may terminate with 7 days' written notice;
                outstanding subscription fees are non-refundable.
              </li>
              <li>
                Where the Vendor provides them, the Platform may retain the owner's Aadhaar number
                (digit-checksum validated only, not UIDAI e-KYC), licence references, and uploaded
                identity or licence images solely for audit, dispute resolution, and cooperation with
                lawful regulatory requests. The Vendor confirms this data corresponds to the person
                signing below.
              </li>
            </ol>
          </div>

          <Field label="Vendor's typed full legal name (e-signature) *">
            <input
              className="input"
              required
              placeholder="As it appears on the license / Aadhaar"
              value={form.tos_signature_name}
              onChange={(e) => setForm({ ...form, tos_signature_name: e.target.value })}
              data-testid="new-vendor-signature"
            />
          </Field>

          <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] pt-1">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--accent)]"
              checked={form.accepts_tos}
              onChange={(e) => setForm({ ...form, accepts_tos: e.target.checked })}
              data-testid="new-vendor-tos"
            />
            <span>
              By checking this box and signing above, the Vendor confirms they have read,
              understood, and accept all 9 clauses of the Terms of Service. Acceptance is recorded
              with timestamp and IP for audit.
            </span>
          </label>
        </div>

        <div
          className="sticky bottom-0 px-5 py-3 flex gap-2 border-t"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center text-sm"
            data-testid="new-vendor-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-[2] text-sm"
            data-testid="new-vendor-submit"
          >
            <Save className="w-4 h-4" /> {submitting ? "Creating…" : "Create vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialsModal({ payload, onClose }) {
  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const storefrontUrl = `${window.location.origin}/store/${payload.vendor.slug}`;
  const qrUrl = `${process.env.REACT_APP_BACKEND_URL}/api/storefront/${payload.vendor.slug}/qr.png?size=400`;

  const openKycImage = async (fileId, label) => {
    try {
      const { data } = await api.get(`/master/onboarding-uploads/${fileId}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) toast.error("Pop-up blocked — allow pop-ups for this site.");
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch {
      toast.error(`Could not open ${label}`);
    }
  };

  const printQr = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return toast.error("Pop-up blocked");
    w.document.write(`
      <html><head><title>${payload.vendor.name} — Storefront QR</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      h1{margin:0 0 4px}h2{font-weight:500;color:#64748b;margin:0 0 24px;letter-spacing:.05em;text-transform:uppercase;font-size:14px}
      img{max-width:380px;width:100%;border:8px solid #fff;box-shadow:0 6px 30px rgba(0,0,0,.15);border-radius:12px}
      .url{margin-top:18px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all}</style>
      </head><body><h1>${payload.vendor.name}</h1><h2>Scan to order</h2>
      <img src="${qrUrl}" /><div class="url">${storefrontUrl}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      data-testid="credentials-modal"
    >
      <div
        className="surface w-full max-w-md rounded-2xl p-6 fade-up max-h-[90vh] overflow-y-auto thin-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
          <div className="text-base font-bold">Vendor onboarded</div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Share these with the vendor. Their first sign-in will require a password change.
        </p>

        {/* QR preview + print */}
        <div
          className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "var(--surface-2)" }}
        >
          <img src={qrUrl} alt="QR" className="w-20 h-20 rounded-lg bg-white p-1.5" data-testid="cred-qr-img" />
          <div className="flex-1 text-xs">
            <div className="font-semibold text-white">Storefront QR</div>
            <div className="text-[var(--text-muted)] mt-0.5">Print and stick on the shop window.</div>
            <button onClick={printQr} className="mt-1.5 text-[var(--accent)] text-xs" data-testid="cred-qr-print">
              Print poster
            </button>
          </div>
        </div>

        <CredRow
          label="Login URL"
          value={`${window.location.origin}/admin/login`}
          onCopy={() => copy(`${window.location.origin}/admin/login`, "URL")}
        />
        <CredRow label="Email" value={payload.admin_email} onCopy={() => copy(payload.admin_email, "Email")} />
        <CredRow label="Password" value={payload.default_password} mono onCopy={() => copy(payload.default_password, "Password")} />
        <CredRow label="Storefront" value={storefrontUrl} onCopy={() => copy(storefrontUrl, "URL")} />

        {(payload.vendor.owner_aadhar ||
          payload.vendor.license_photo_id ||
          payload.vendor.aadhar_photo_id) && (
          <div
            className="rounded-xl p-3 mb-4 text-xs space-y-2 border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-soft)" }}
            data-testid="cred-identity-audit"
          >
            <div className="font-semibold text-[var(--text-muted)]">Onboarding audit (operator only)</div>
            {payload.vendor.owner_aadhar && (
              <div>
                <span className="text-[var(--text-faint)]">Owner Aadhaar on file</span>
                <div className="font-mono text-sm mt-0.5 tracking-wide">{payload.vendor.owner_aadhar}</div>
              </div>
            )}
            {(payload.vendor.license_photo_id || payload.vendor.aadhar_photo_id) ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {payload.vendor.license_photo_id && (
                  <button
                    type="button"
                    className="text-[var(--accent)] text-left"
                    onClick={() => openKycImage(payload.vendor.license_photo_id, "licence photo")}
                  >
                    Open licence photo
                  </button>
                )}
                {payload.vendor.aadhar_photo_id && (
                  <button
                    type="button"
                    className="text-[var(--accent)] text-left"
                    onClick={() => openKycImage(payload.vendor.aadhar_photo_id, "Aadhaar photo")}
                  >
                    Open Aadhaar photo
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        <button onClick={onClose} className="btn-primary w-full mt-4 text-sm" data-testid="cred-modal-done">
          Done
        </button>
      </div>
    </div>
  );
}

function CredRow({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--border-soft)] last:border-0">
      <div className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`flex-1 text-xs ${mono ? "font-mono" : ""} truncate`}>{value}</div>
      <button
        onClick={onCopy}
        className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
