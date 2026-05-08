import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import {
  Users,
  ShoppingBag,
  Activity,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Crown,
} from "lucide-react";
import { StatusPill } from "@/pages/admin/orderStatus";

export default function MasterDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, o, v] = await Promise.all([
          api.get("/master/stats"),
          api.get("/master/orders", { params: { limit: 8 } }),
          api.get("/master/vendors"),
        ]);
        setStats(s.data);
        setOrders(o.data);
        setVendors(v.data);
      } catch {}
    };
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="master-dashboard">
      <div className="mb-6 flex items-center gap-2">
        <Crown className="w-5 h-5 text-[var(--warm)]" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Platform</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Master overview</h1>
      <p className="text-sm text-[var(--text-muted)] mt-1 mb-6">
        All vendors, all orders, full GMV across the platform.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Vendors"
          value={stats?.vendors_total ?? "—"}
          testid="stat-vendors-total"
          accent
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Active"
          value={stats?.vendors_active ?? "—"}
          testid="stat-vendors-active"
        />
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Total orders"
          value={stats?.orders_total ?? "—"}
          testid="stat-orders-total"
        />
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Today"
          value={stats?.orders_today ?? "—"}
          testid="stat-orders-today"
        />
        <StatCard
          icon={<IndianRupee className="w-4 h-4" />}
          label="Lifetime GMV"
          value={stats ? formatINR(stats.gmv) : "—"}
          testid="stat-gmv"
          accent
        />
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        {/* Recent orders */}
        <div className="surface p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
              Recent orders (all vendors)
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="py-10 text-center text-[var(--text-muted)] text-sm">No orders yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border-soft)]">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                  data-testid={`master-order-${o.id}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span className="font-mono">#{o.short_id}</span>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate">
                      {o.vendor_name} · {o.customer_name}
                    </div>
                  </div>
                  <div className="text-sm font-bold shrink-0">{formatINR(o.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendors quick list */}
        <div className="surface p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
              Vendors
            </div>
            <Link
              to="/admin/master/vendors"
              className="text-xs text-[var(--accent)] font-semibold flex items-center gap-1"
              data-testid="see-all-vendors"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {vendors.length === 0 ? (
            <div className="py-10 text-center text-[var(--text-muted)] text-sm">
              No vendors onboarded yet.{" "}
              <Link to="/admin/master/vendors" className="text-[var(--accent)] font-semibold">
                Add one →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {vendors.slice(0, 6).map((v) => (
                <li
                  key={v.id}
                  className="py-2.5 flex items-center justify-between"
                  data-testid={`master-vendor-row-${v.slug}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{v.name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono truncate">
                      /store/{v.slug}
                    </div>
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
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
          background: accent ? "rgba(255,181,71,0.14)" : "var(--surface-2)",
          color: accent ? "#ffb547" : "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-xl md:text-2xl font-extrabold mt-0.5 tracking-tight">{value}</div>
    </div>
  );
}
