import { useEffect, useState } from "react";
import { api, resolveUrl } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Crown, Save, Wallet, MessageCircle, RefreshCw } from "lucide-react";

export default function MasterBilling() {
  const [form, setForm] = useState({
    upi_id: "",
    upi_name: "",
    whatsapp: "",
    monthly_fee_inr: 5000,
    note_to_vendor: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrBust, setQrBust] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/master/billing");
      setForm({
        upi_id: data.upi_id || "",
        upi_name: data.upi_name || "",
        whatsapp: data.whatsapp || "",
        monthly_fee_inr: Number(data.monthly_fee_inr) || 5000,
        note_to_vendor: data.note_to_vendor || "",
      });
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.upi_id.trim()) {
      toast.error("UPI ID is required");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/master/billing", {
        ...form,
        monthly_fee_inr: Math.max(0, Number(form.monthly_fee_inr) || 0),
      });
      toast.success("Platform billing updated");
      setQrBust((v) => v + 1);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const qrSrc = form.upi_id.trim()
    ? resolveUrl(`/api/billing/qr.png?size=480&v=${qrBust}`)
    : null;

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12" data-testid="master-billing-page">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            <Crown className="w-3.5 h-3.5 text-[var(--warm)]" /> Master · Platform billing
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            Subscription QR
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Set your UPI ID + monthly fee. This is the QR every vendor sees on their paywall.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="surface p-10 text-center text-[var(--text-muted)] text-sm">Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Form */}
          <div className="surface p-5 space-y-4">
            <Field label="Your UPI ID" hint="e.g. yourname@okhdfcbank">
              <input
                value={form.upi_id}
                onChange={(e) => set("upi_id", e.target.value)}
                className="input w-full"
                placeholder="gharsip@okaxis"
                data-testid="billing-upi-id"
              />
            </Field>
            <Field label="Display name" hint="Shown when vendor opens UPI app">
              <input
                value={form.upi_name}
                onChange={(e) => set("upi_name", e.target.value)}
                className="input w-full"
                placeholder="GharSip"
                data-testid="billing-upi-name"
              />
            </Field>
            <Field label="Monthly fee (₹)">
              <input
                type="number"
                min={0}
                value={form.monthly_fee_inr}
                onChange={(e) => set("monthly_fee_inr", e.target.value)}
                className="input w-full"
                data-testid="billing-fee"
              />
            </Field>
            <Field label="WhatsApp number" hint="With country code, no +. Used by vendors to send payment screenshots.">
              <input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                className="input w-full"
                placeholder="919876543210"
                data-testid="billing-whatsapp"
              />
            </Field>
            <Field label="Note to vendor" hint="Shown above the WhatsApp button on the paywall.">
              <textarea
                value={form.note_to_vendor}
                onChange={(e) => set("note_to_vendor", e.target.value)}
                rows={3}
                className="input w-full resize-none"
                data-testid="billing-note"
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary flex-1 justify-center"
                data-testid="billing-save"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={load}
                className="btn-ghost"
                title="Reload"
                data-testid="billing-reload"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live QR preview */}
          <div className="surface p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold mb-3">
              <Wallet className="w-3.5 h-3.5" /> Live QR preview
            </div>
            {qrSrc ? (
              <>
                <div className="surface-2 !rounded-xl p-4 flex justify-center">
                  <img
                    src={qrSrc}
                    alt="Platform UPI QR"
                    className="w-64 h-64 rounded-lg"
                    data-testid="billing-qr-preview"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-faint)] mt-3 leading-relaxed">
                  This QR encodes <span className="font-mono text-white">upi://pay?pa={form.upi_id}&am={form.monthly_fee_inr}</span> — scanning it auto-fills amount & UPI ID in PhonePe / GPay / Paytm.
                </p>
                <a
                  href={resolveUrl(`/api/billing/qr.png?size=1024&v=${qrBust}`)}
                  download="gharsip-subscription-qr.png"
                  className="btn-ghost w-full justify-center text-xs mt-3"
                  data-testid="billing-qr-download"
                >
                  Download QR (1024px PNG)
                </a>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)] py-10 text-center">
                Enter and save your UPI ID to see the QR preview here.
              </div>
            )}

            {form.whatsapp && (
              <a
                href={`https://wa.me/${form.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost w-full justify-center text-xs mt-2"
                data-testid="billing-whatsapp-test"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Test WhatsApp link
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold mb-1">
        {label}
      </div>
      {children}
      {hint && <div className="text-[10px] text-[var(--text-faint)] mt-1">{hint}</div>}
    </label>
  );
}
