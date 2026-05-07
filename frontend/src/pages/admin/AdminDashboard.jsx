import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_LABELS = {
  placed: "Placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  placed: { bg: "rgba(255,181,71,0.12)", color: "#ffb547" },
  preparing: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  out_for_delivery: { bg: "rgba(34,210,122,0.12)", color: "#22d27a" },
  delivered: { bg: "rgba(34,210,122,0.20)", color: "#22d27a" },
  cancelled: { bg: "rgba(244,63,94,0.12)", color: "#f43f5e" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, o] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/orders", { params: { limit: 5 } }),
        ]);
        if (cancelled) return;
        setStats(s.data);
        setRecent(o.data);
      } catch {}
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="admin-dashboard">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
          Overview
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
          Welcome back
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<IndianRupee className="w-4 h-4" />}
          label="Today’s revenue"
          value={stats ? formatINR(stats.today_revenue) : "—"}
          accent
          testid="stat-today-revenue"
        />
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Today’s orders"
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
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS_LABELS).map((k) => {
            const v = stats?.by_status?.[k] ?? 0;
            const c = STATUS_COLORS[k];
            return (
              <div
                key={k}
                className="px-3 py-2 rounded-xl flex items-center gap-2 text-sm"
                style={{ background: c.bg, color: c.color }}
                data-testid={`pipeline-${k}`}
              >
                <span className="font-semibold">{v}</span>
                <span className="text-xs opacity-90">{STATUS_LABELS[k]}</span>
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
                    {o.customer_name} ·{" "}
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm font-bold">{formatINR(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
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
      <div className="text-2xl md:text-[26px] font-extrabold mt-0.5 tracking-tight">
        {value}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.placed;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: c.bg, color: c.color }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
