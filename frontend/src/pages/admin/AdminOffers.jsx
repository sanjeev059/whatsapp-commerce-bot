import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Tag, Plus, Trash2, X, Save, Power, RefreshCw } from "lucide-react";

/**
 * Vendor offers — list + create + toggle active + delete.
 * Used by AdminOffers (vendor) and reused by MasterOffers (master) via the `apiBase` prop.
 *
 * apiBase examples:
 *   - vendor: "/vendor/offers"
 *   - master (single vendor): `/master/vendors/${vendorId}/offers` for create,
 *     and `/master/offers/${oid}` for patch/delete; passed as a function map.
 */
export default function AdminOffers({
  apiPaths = {
    list: "/vendor/offers",
    create: "/vendor/offers",
    update: (oid) => `/vendor/offers/${oid}`,
    remove: (oid) => `/vendor/offers/${oid}`,
  },
  scopeTitle = "Offers & coupons",
  scopeSubtitle = "Create discount codes customers can apply at checkout.",
  testid = "admin-offers-page",
}) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(apiPaths.list);
      setOffers(data);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPaths.list]);

  const toggleActive = async (o) => {
    try {
      await api.patch(apiPaths.update(o.id), { is_active: !o.is_active });
      toast.success(`Offer ${o.is_active ? "paused" : "resumed"}`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete offer "${o.code}"? This cannot be undone.`)) return;
    try {
      await api.delete(apiPaths.remove(o.id));
      toast.success("Offer deleted");
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12" data-testid={testid}>
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            <Tag className="w-3.5 h-3.5 text-[var(--accent)]" /> {scopeTitle}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            Discounts & coupons
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{scopeSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-xs" data-testid="offers-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary !py-2 !px-3 text-sm"
            data-testid="add-offer-btn"
          >
            <Plus className="w-4 h-4" /> New offer
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-[var(--text-muted)]">
          {loading
            ? "Loading…"
            : "No offers yet. Click 'New offer' to create your first discount code."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3" data-testid="offers-list">
          {offers.map((o) => (
            <div
              key={o.id}
              className="surface p-4"
              data-testid={`offer-card-${o.code}`}
              style={{
                opacity: o.is_active ? 1 : 0.55,
                borderStyle: o.is_active ? "solid" : "dashed",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono font-extrabold text-lg tracking-wider">{o.code}</div>
                  <div className="text-sm font-semibold mt-0.5 truncate">{o.title}</div>
                  {o.vendor_name && (
                    <div className="text-[10px] text-[var(--text-faint)] mt-0.5 uppercase tracking-wider">
                      {o.vendor_name}
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                  style={
                    o.is_active
                      ? { background: "rgba(34,210,122,0.14)", color: "#22d27a" }
                      : { background: "rgba(244,63,94,0.14)", color: "#f43f5e" }
                  }
                >
                  {o.is_active ? "Live" : "Paused"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat
                  label="Discount"
                  value={
                    o.discount_type === "percent"
                      ? `${o.discount_value}% off`
                      : `₹${o.discount_value} off`
                  }
                />
                <Stat label="Min order" value={o.min_order_amount ? `₹${o.min_order_amount}` : "—"} />
                <Stat label="Max cap" value={o.max_discount_amount ? `₹${o.max_discount_amount}` : "—"} />
                <Stat label="Used" value={`${o.uses}${o.usage_limit_total ? ` / ${o.usage_limit_total}` : ""}`} />
              </div>
              {o.expires_at && (
                <div className="text-[10px] text-[var(--text-faint)] mt-2">
                  Expires {new Date(o.expires_at).toLocaleDateString()}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-soft)]">
                <button
                  onClick={() => toggleActive(o)}
                  className="btn-ghost !py-1.5 !px-3 text-xs flex-1 justify-center"
                  data-testid={`offer-toggle-${o.code}`}
                >
                  <Power className="w-3.5 h-3.5" /> {o.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => remove(o)}
                  className="btn-ghost !py-1.5 !px-3 text-xs"
                  style={{ color: "#f43f5e" }}
                  data-testid={`offer-delete-${o.code}`}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreateOfferModal
          createPath={apiPaths.create}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="surface-2 !rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-xs font-bold mt-0.5">{value}</div>
    </div>
  );
}

function CreateOfferModal({ createPath, onClose, onCreated }) {
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    discount_type: "percent",
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: "",
    expires_at: "",
    usage_limit_total: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        usage_limit_total: form.usage_limit_total ? Number(form.usage_limit_total) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      await api.post(createPath, payload);
      toast.success(`Offer ${payload.code} created`);
      onCreated();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="create-offer-modal"
    >
      <form
        onSubmit={submit}
        className="surface w-full md:max-w-md max-h-[90vh] overflow-y-auto thin-scroll slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">New</div>
            <div className="font-bold">Create offer</div>
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
          <Field label="Code (customer types this) *" hint="Uppercase letters/digits only">
            <input
              required
              className="input font-mono uppercase tracking-wider"
              placeholder="WELCOME10"
              value={form.code}
              onChange={(e) =>
                set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              data-testid="offer-code"
            />
          </Field>
          <Field label="Title (shown in cart) *">
            <input
              required
              className="input"
              placeholder="10% off your first order"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              data-testid="offer-title"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type *">
              <select
                className="input"
                value={form.discount_type}
                onChange={(e) => set("discount_type", e.target.value)}
                data-testid="offer-type"
              >
                <option value="percent">% off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </Field>
            <Field label={form.discount_type === "percent" ? "% off (1-100)" : "Flat ₹ off"}>
              <input
                type="number"
                min={1}
                max={form.discount_type === "percent" ? 100 : undefined}
                required
                className="input"
                value={form.discount_value}
                onChange={(e) => set("discount_value", e.target.value)}
                data-testid="offer-value"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min order ₹">
              <input
                type="number"
                min={0}
                className="input"
                value={form.min_order_amount}
                onChange={(e) => set("min_order_amount", e.target.value)}
                data-testid="offer-min"
              />
            </Field>
            {form.discount_type === "percent" && (
              <Field label="Max cap ₹ (optional)">
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="e.g. 200"
                  value={form.max_discount_amount}
                  onChange={(e) => set("max_discount_amount", e.target.value)}
                  data-testid="offer-max"
                />
              </Field>
            )}
          </div>
          <Field label="Total uses limit (optional)">
            <input
              type="number"
              min={1}
              className="input"
              placeholder="Unlimited if blank"
              value={form.usage_limit_total}
              onChange={(e) => set("usage_limit_total", e.target.value)}
              data-testid="offer-limit"
            />
          </Field>
          <Field label="Expires (optional)">
            <input
              type="date"
              className="input"
              value={form.expires_at}
              onChange={(e) => set("expires_at", e.target.value)}
              data-testid="offer-expires"
            />
          </Field>
        </div>

        <div
          className="sticky bottom-0 px-5 py-3 flex gap-2 border-t"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
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
            data-testid="offer-submit"
          >
            <Save className="w-4 h-4" /> {submitting ? "Saving…" : "Create offer"}
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
