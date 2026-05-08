import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import {
  Activity,
  Clock,
  Calendar,
  TrendingUp,
  Moon,
  Trophy,
  IndianRupee,
} from "lucide-react";

const RANGES = [
  { v: 7, l: "7d" },
  { v: 30, l: "30d" },
  { v: 90, l: "90d" },
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) =>
  h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`
);

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/vendor/analytics", { params: { days } });
        if (!cancelled) setData(data);
      } catch (e) {
        if (!cancelled) toast.error(apiErrorMessage(e, "Could not load analytics"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const peakHourLabel =
    data?.peak_hour != null ? HOUR_LABELS[data.peak_hour] + "–" + HOUR_LABELS[(data.peak_hour + 1) % 24] : "—";

  const hourlyData = (data?.hourly || []).map((b) => ({
    ...b,
    label: HOUR_LABELS[b.hour],
    isPeak: data?.peak_hour === b.hour,
  }));

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-12" data-testid="admin-analytics-page">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Insights
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">Analytics</h1>
        </div>
        <div className="flex gap-1 surface-2 !rounded-full p-1" style={{ background: "var(--surface-2)" }}>
          {RANGES.map((r) => (
            <button
              key={r.v}
              onClick={() => setDays(r.v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                days === r.v ? "text-black" : "text-[var(--text-muted)]"
              }`}
              style={
                days === r.v
                  ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                  : {}
              }
              data-testid={`analytics-range-${r.v}`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {!data && (
        <div className="surface p-10 text-center text-sm text-[var(--text-muted)]">
          {loading ? "Loading…" : "No data yet."}
        </div>
      )}

      {data && (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat
              icon={<IndianRupee className="w-4 h-4" />}
              label={`Revenue (${data.window_days}d)`}
              value={formatINR(data.paid_revenue)}
              accent
              testid="stat-revenue"
            />
            <Stat
              icon={<Activity className="w-4 h-4" />}
              label="Paid orders"
              value={data.paid_orders}
              testid="stat-paid-orders"
            />
            <Stat
              icon={<TrendingUp className="w-4 h-4" />}
              label="Avg order"
              value={formatINR(data.avg_order_value)}
              testid="stat-aov"
            />
            <Stat
              icon={<Clock className="w-4 h-4" />}
              label="Peak hour"
              value={peakHourLabel}
              testid="stat-peak-hour"
            />
          </div>

          {/* Hourly bar */}
          <div className="mt-6 surface p-4 md:p-5" data-testid="hourly-chart">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
                  Revenue by hour (IST)
                </div>
                {data.peak_hour != null && (
                  <div className="text-xs text-[var(--text-faint)] mt-1">
                    Peak demand: <span className="text-[var(--accent)] font-semibold">{peakHourLabel}</span>
                  </div>
                )}
              </div>
              <Clock className="w-4 h-4 text-[var(--text-faint)]" />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 5, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                    interval={2}
                    axisLine={{ stroke: "var(--border-soft)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v, n) => [n === "revenue" ? formatINR(v) : v, n]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, i) => (
                      <Cell key={i} fill={entry.isPeak ? "var(--accent)" : "var(--accent-2)"} fillOpacity={entry.isPeak ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day of week + Night uplift */}
          <div className="mt-5 grid md:grid-cols-2 gap-5">
            <div className="surface p-4 md:p-5" data-testid="dow-chart">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
                  Day of week
                </div>
                <Calendar className="w-4 h-4 text-[var(--text-faint)]" />
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.day_of_week} margin={{ top: 5, right: 0, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                      axisLine={{ stroke: "var(--border-soft)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-faint)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => formatINR(v)}
                    />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {data.peak_day && (
                <div className="text-xs text-[var(--text-faint)] mt-2 text-center">
                  Strongest day: <span className="text-[var(--accent)] font-semibold">{data.peak_day}</span>
                </div>
              )}
            </div>

            {/* Night-pricing uplift */}
            <div className="surface p-4 md:p-5" data-testid="night-uplift-card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
                  Night-pricing uplift
                </div>
                <Moon className="w-4 h-4 text-[#a78bfa]" />
              </div>
              {data.night_revenue > 0 ? (
                <>
                  <div className="text-3xl font-extrabold tracking-tight" data-testid="night-uplift-amount">
                    +{formatINR(data.night_uplift_amount)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Extra revenue captured during your night window over base prices.
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <MiniStat label="Night revenue" value={formatINR(data.night_revenue)} />
                    <MiniStat label="Markup %" value={`+${data.night_uplift_pct}%`} accent />
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <div className="text-sm text-[var(--text-muted)]">
                    {data.night_pricing_enabled
                      ? "No orders fell in the night window for this period."
                      : "Night pricing is OFF. Turn it on in Store settings to capture peak-hour pricing."}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top products + Category mix */}
          <div className="mt-5 grid md:grid-cols-2 gap-5">
            <div className="surface p-4 md:p-5" data-testid="top-products-card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
                  Top products
                </div>
                <Trophy className="w-4 h-4 text-[var(--warm)]" />
              </div>
              {data.top_products.length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--text-muted)]">
                  No paid orders yet.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border-soft)]">
                  {data.top_products.map((p, i) => (
                    <li
                      key={p.id || i}
                      className="py-2.5 flex items-center justify-between gap-3"
                      data-testid={`top-product-${i}`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{
                            background: i === 0 ? "rgba(255,181,71,0.18)" : "var(--surface-2)",
                            color: i === 0 ? "var(--warm)" : "var(--text-muted)",
                          }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{p.qty} sold</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold shrink-0">{formatINR(p.revenue)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="surface p-4 md:p-5" data-testid="category-mix-card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold">
                  Category mix
                </div>
              </div>
              {data.category_revenue.length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--text-muted)]">No data.</div>
              ) : (
                <div className="space-y-2.5">
                  {data.category_revenue.map((c) => {
                    const pct =
                      data.paid_revenue > 0 ? (c.revenue / data.paid_revenue) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium">{c.category}</span>
                          <span className="font-bold">
                            {formatINR(c.revenue)}
                            <span className="text-[var(--text-faint)] text-xs font-normal ml-2">
                              {pct.toFixed(0)}%
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 mt-1 rounded-full surface-2" style={{ background: "var(--surface-2)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(135deg, var(--accent), var(--accent-2))",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, accent, testid }) {
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
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-xl md:text-2xl font-extrabold mt-0.5 tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="surface-2 !rounded-lg p-2.5" style={{ background: "var(--surface-2)" }}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div
        className="text-base font-extrabold mt-0.5"
        style={accent ? { color: "var(--accent)" } : {}}
      >
        {value}
      </div>
    </div>
  );
}
