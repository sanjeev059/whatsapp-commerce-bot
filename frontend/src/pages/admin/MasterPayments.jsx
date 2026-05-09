import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { Crown, Receipt, Plus, Calendar, RefreshCw, X } from "lucide-react";

export default function MasterPayments() {
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null); // vendor object selected for "Record payment"

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        api.get("/master/vendors"),
        api.get("/master/payments", { params: { limit: 200 } }),
      ]);
      setVendors(vRes.data);
      setPayments(pRes.data);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalCollected = payments.reduce((s, p) => s + (p.amount_inr || 0), 0);

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12" data-testid="master-payments-page">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            <Crown className="w-3.5 h-3.5 text-[var(--warm)]" /> Master · Payments log
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            Vendor subscription payments
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Mark a vendor as paid to auto-extend their expiry by 30 days.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-xs" data-testid="payments-refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total collected" value={formatINR(totalCollected)} testid="payments-total" />
        <SummaryCard label="Records" value={payments.length} testid="payments-count" />
        <SummaryCard
          label="Active vendors"
          value={vendors.filter((v) => v.subscription_active).length}
          testid="vendors-active"
        />
        <SummaryCard
          label="Disabled"
          value={vendors.filter((v) => !v.subscription_active).length}
          testid="vendors-disabled"
        />
      </div>

      {/* Vendors with quick "Mark paid 30d" */}
      <div className="surface overflow-hidden mb-6" data-testid="vendor-quick-pay">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold flex items-center justify-between">
          <span>Quick action · One-click renewal</span>
        </div>
        {vendors.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : "No vendors yet."}
          </div>
        ) : (
          vendors.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)] last:border-0"
              data-testid={`pay-row-${v.slug}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{v.name}</div>
                <div className="text-[11px] text-[var(--text-faint)] truncate flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {v.subscription_expires_at
                    ? `Current expiry: ${new Date(v.subscription_expires_at).toLocaleDateString()}`
                    : "No expiry set"}
                </div>
              </div>
              <button
                onClick={() => setRecording(v)}
                className="btn-primary !py-1.5 !px-3 text-xs"
                data-testid={`mark-paid-${v.slug}`}
              >
                <Plus className="w-3.5 h-3.5" /> Mark paid · 30d
              </button>
            </div>
          ))
        )}
      </div>

      {/* Audit log */}
      <div className="surface overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-soft)] text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5" /> Audit log
        </div>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            No payments recorded yet. Hit "Mark paid · 30d" above to log the first one.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]" data-testid="payments-list">
            {payments.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 grid grid-cols-[1fr_auto] gap-3"
                data-testid={`payment-row-${p.id}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{p.vendor_name}</div>
                  <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
                    {new Date(p.recorded_at).toLocaleString()} · by {p.recorded_by} · +
                    {p.days_extended}d
                  </div>
                  {p.txn_note && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5 italic">
                      "{p.txn_note}"
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-extrabold">{formatINR(p.amount_inr)}</div>
                  <div className="text-[10px] text-[var(--text-faint)]">
                    Until {new Date(p.new_expiry_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recording && (
        <RecordPaymentModal
          vendor={recording}
          onClose={() => setRecording(null)}
          onRecorded={() => {
            setRecording(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, testid }) {
  return (
    <div className="surface p-3" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

function RecordPaymentModal({ vendor, onClose, onRecorded }) {
  const [form, setForm] = useState({ amount_inr: 5000, days_extended: 30, txn_note: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/master/vendors/${vendor.id}/payments`, {
        ...form,
        amount_inr: Math.max(0, Number(form.amount_inr) || 0),
        days_extended: Math.max(1, Number(form.days_extended) || 30),
      });
      toast.success(
        `${vendor.name} renewed · expires ${new Date(data.new_expiry_at).toLocaleDateString()}`
      );
      onRecorded();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="record-payment-modal"
    >
      <form
        onSubmit={submit}
        className="surface w-full md:max-w-md slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Record payment</div>
            <div className="font-bold text-lg">{vendor.name}</div>
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
          <Field label="Amount paid (₹)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.amount_inr}
              onChange={(e) => setForm({ ...form, amount_inr: e.target.value })}
              data-testid="record-amount"
              required
            />
          </Field>
          <Field label="Extend subscription by (days)">
            <input
              type="number"
              min={1}
              max={365}
              className="input"
              value={form.days_extended}
              onChange={(e) => setForm({ ...form, days_extended: e.target.value })}
              data-testid="record-days"
              required
            />
          </Field>
          <Field label="Transaction note (optional)" hint="UPI ref / WhatsApp note">
            <input
              className="input"
              placeholder="e.g. UPI ref 8472… / Sent screenshot 9 May"
              value={form.txn_note}
              onChange={(e) => setForm({ ...form, txn_note: e.target.value })}
              data-testid="record-note"
            />
          </Field>
        </div>

        <div
          className="px-5 py-3 flex gap-2 border-t"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-[2] text-sm"
            data-testid="record-submit"
          >
            <Plus className="w-4 h-4" /> {submitting ? "Recording…" : "Record & extend"}
          </button>
        </div>
      </form>
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
