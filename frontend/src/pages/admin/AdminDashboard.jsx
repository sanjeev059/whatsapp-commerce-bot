import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Activity,
  TrendingUp,
  Store,
  Power,
  ExternalLink,
} from "lucide-react";
import { STATUS_META, STATUS_ORDER, StatusPill } from "@/pages/admin/orderStatus";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/apiError";

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, o, v] = await Promise.all([
          api.get("/vendor/stats"),
          api.get("/vendor/orders", { params: { limit: 5 } }),
          api.get("/vendor/me"),
        ]);
        if (cancelled) return;
        setStats(s.data);
        setRecent(o.data);
        setVendor(v.data);
      } catch {}
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const toggleStore = async () => {
    if (!vendor) return;
    setToggling(true);
    const next = vendor.store_status === "open" ? "closed" : "open";
    try {
      const { data } = await api.patch("/vendor/store", { store_status: next });
      setVendor(data);
      toast.success(`Store is now ${next.toUpperCase()}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setToggling(false);
    }
  };

  const isOpen = vendor?.store_status === "open";

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="admin-dashboard">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Overview
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            {vendor?.name || "Welcome back"}
          </h1>
        </div>
        {vendor && (
          <div className="flex items-center gap-2">
            <a
              href={`/store/${vendor.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs"
              data-testid="open-storefront-link"
            >
              <ExternalLink className="w-3.5 h-3.5" /> /store/{vendor.slug}
            </a>
            <button
              onClick={toggleStore}
              disabled={toggling}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              style={{
                background: isOpen ? "rgba(34,210,122,0.14)" : "rgba(244,63,94,0.14)",
                color: isOpen ? "#22d27a" : "#f43f5e",
                border: `1px solid ${
                  isOpen ? "rgba(34,210,122,0.4)" : "rgba(244,63,94,0.4)"
                }`,
              }}
              data-testid="store-toggle-btn"
            >
              <Power className="w-4 h-4" />
              <span>{isOpen ? "OPEN — tap to close" : "CLOSED — tap to open"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<IndianRupee className="w-4 h-4" />}
          label="Today's revenue"
          value={stats ? formatINR(stats.today_revenue) : "—"}
          accent
          testid="stat-today-revenue"
        />
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Today's orders"
          value={stats ? stats.today_orders : "—"}
          testid="stat-today-orders"
        />
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="All-time orders"
          value={stats ? stats.total_orders : "—"}
          testid="stat-total-orders"
        />
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="Live products"
          value={stats ? stats.total_products : "—"}
          testid="stat-total-products"
        />
      </div>

      {/* Status breakdown */}
      <div className="mt-6 surface p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
            Pipeline
          </div>
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div className="flex flex-wrap gap-2" data-testid="pipeline">
          {STATUS_ORDER.map((k) => {
            const m = STATUS_META[k];
            const v = stats?.by_status?.[k] ?? 0;
            return (
              <div
                key={k}
                className="px-3 py-2 rounded-xl flex items-center gap-2 text-sm"
                style={{ background: m.bg, color: m.color }}
                data-testid={`pipeline-${k}`}
              >
                <span className="font-semibold">{v}</span>
                <span className="text-xs opacity-90">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-6 surface p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
            Recent orders
          </div>
          <Link
            to="/admin/orders"
            className="text-xs text-[var(--accent)] font-semibold"
            data-testid="dashboard-see-all-orders"
          >
            See all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">
            No orders yet — they'll appear here as soon as customers place them.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {recent.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders"
                className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-2)] -mx-2 px-2 rounded-lg transition-colors"
                data-testid={`recent-order-${o.id}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className="font-mono">#{o.short_id}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {o.customer_name} · {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm font-bold">{formatINR(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!vendor?.upi_id && (
        <div
          className="mt-5 surface p-4 flex items-start gap-3"
          style={{ borderColor: "rgba(255,181,71,0.4)" }}
          data-testid="upi-cta-banner"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(255,181,71,0.14)" }}
          >
            <Store className="w-5 h-5 text-[var(--warm)]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Add your UPI ID to start receiving payments</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Customers see your QR + UPI ID at checkout.
            </div>
          </div>
          <Link to="/admin/store" className="btn-primary !py-2 !px-3 text-xs shrink-0">
            Set up
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent, testid }) {
  return (
    <div className="surface p-4" data-testid={testid}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{
          background: accent ? "rgba(34,210,122,0.14)" : "var(--surface-2)",
          color: accent ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className="text-2xl md:text-[26px] font-extrabold mt-0.5 tracking-tight">{value}</div>
    </div>
  );
}
