import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { api } from "@/lib/apiClient";
import { useNewOrderAlerts, primeOrderAlertAudio } from "@/hooks/useNewOrderAlerts";
import { subscribeVendorPush, isPushSupported, sendTestPush } from "@/lib/push";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ListOrdered,
  Package,
  LogOut,
  Sparkles,
  ExternalLink,
  Store,
  Users,
  Crown,
  Bell,
  BellOff,
  BellRing,
  BarChart3,
  AlertTriangle,
  Wallet,
  Receipt,
  Tag,
} from "lucide-react";
import VendorBillingPaywall from "@/components/VendorBillingPaywall";
import { PLATFORM_NAME } from "@/config";

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingOrders, setPendingOrders] = useState([]);
  const isMaster = user && user.role === "master_admin";
  const isVendor = user && user.role === "vendor_admin";

  // Poll active orders for vendors so we can chime on new ones
  useEffect(() => {
    if (!isVendor) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/vendor/orders", { params: { limit: 30 } });
        if (!cancelled) setPendingOrders(data);
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isVendor]);

  // Unlock Web Audio on first tap anywhere in admin (autoplay policy).
  useEffect(() => {
    if (!isVendor) return;
    const once = () => {
      primeOrderAlertAudio();
      document.removeEventListener("pointerdown", once, true);
    };
    document.addEventListener("pointerdown", once, true);
    return () => document.removeEventListener("pointerdown", once, true);
  }, [isVendor]);

  const { permission, requestPermission } = useNewOrderAlerts(pendingOrders, {
    enabled: isVendor,
  });

  // Once permission is granted, register service worker & subscribe to web push
  // so vendors receive new-order alerts even when this tab is closed.
  const [pushSubscribed, setPushSubscribed] = useState(false);
  useEffect(() => {
    if (!isVendor || permission !== "granted" || !isPushSupported()) return;
    let cancelled = false;
    subscribeVendorPush()
      .then((sub) => {
        if (!cancelled && sub) setPushSubscribed(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isVendor, permission]);

  const onTestPush = async () => {
    try {
      await sendTestPush();
      toast.success("Test notification sent — check your device");
    } catch {
      toast.error("Could not send test push");
    }
  };

  const enablePush = async () => {
    primeOrderAlertAudio();
    const result = await requestPermission();
    if (result !== "granted") {
      if (result === "denied") {
        toast.error("Notifications blocked — allow them in the browser address bar for this site.");
      }
      return;
    }

    let vapidOk = false;
    try {
      const { data } = await api.get("/push/vapid-public-key", { headers: { Authorization: "" } });
      vapidOk = !!data?.enabled;
    } catch {
      /* ignore */
    }

    const sub = await subscribeVendorPush();
    if (sub) {
      setPushSubscribed(true);
      toast.success("Background push enabled on this device");
    } else if (!vapidOk) {
      toast.message("In-tab new-order alerts are on", {
        description:
          "You'll get a chime and a banner when new orders arrive while this tab stays open. To alert when the tab is closed, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY_PEM on your API server, then tap Enable again.",
        duration: 14000,
      });
    } else {
      toast.error("Could not subscribe to push — try another browser or check site is HTTPS");
    }
  };

  // Vendor subscription / billing gate
  const [billing, setBilling] = useState(null);
  useEffect(() => {
    if (!isVendor) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await api.get("/vendor/billing");
        if (!cancelled) setBilling(data);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 60000); // re-check once a minute so master flipping `subscription_active=true` reflects live
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isVendor]);
  const subBlocked =
    billing && (billing.subscription?.is_expired || !billing.subscription?.active);
  const subDaysWarn =
    billing &&
    !subBlocked &&
    typeof billing.subscription?.days_remaining === "number" &&
    billing.subscription.days_remaining <= 7;

  const path = location.pathname;

  if (user === null) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center text-[var(--text-muted)]"
        data-testid="admin-layout-loading"
      >
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (user === false) {
    if (path.startsWith("/admin/master")) {
      return <Navigate to="/admin/ops/login" replace />;
    }
    return <Navigate to="/admin/login" replace />;
  }

  // Auto-redirect mismatched routes
  if (isMaster && !path.startsWith("/admin/master")) {
    return <Navigate to="/admin/master" replace />;
  }
  if (!isMaster && path.startsWith("/admin/master")) {
    return <Navigate to="/admin" replace />;
  }

  const onLogout = () => {
    const dest = user?.role === "master_admin" ? "/admin/ops/login" : "/admin/login";
    logout();
    navigate(dest, { replace: true });
  };

  const linkBase = "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors";
  const linkActive = "bg-[var(--surface-2)] text-white";
  const linkInactive = "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)]";

  const masterLinks = [
    { to: "/admin/master", end: true, icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/master/vendors", icon: Users, label: "Vendors" },
    { to: "/admin/master/payments", icon: Receipt, label: "Payments" },
    { to: "/admin/master/offers", icon: Tag, label: "Offers" },
    { to: "/admin/master/billing", icon: Wallet, label: "Billing" },
  ];
  const vendorLinks = [
    { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/orders", icon: ListOrdered, label: "Orders" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/offers", icon: Tag, label: "Offers" },
    { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/admin/store", icon: Store, label: "Store settings" },
  ];
  const links = isMaster ? masterLinks : vendorLinks;
  const mobileLinks = isMaster
    ? masterLinks
    : vendorLinks.filter((l) => l.label !== "Store settings"); // 4 items fit on mobile

  return (
    <div className="min-h-[100dvh] flex" data-testid="admin-layout">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col p-4 border-r"
        style={{ borderColor: "var(--border-soft)", background: "var(--bg-2)" }}
        data-testid="admin-sidebar"
      >
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: isMaster
                ? "linear-gradient(135deg, #ffb547, #ff8a47)"
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            {isMaster ? (
              <Crown className="w-4 h-4 text-black" />
            ) : (
              <Sparkles className="w-4 h-4 text-black" />
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              {isMaster ? "Operations" : "Store"}
            </div>
            <div className="text-sm font-semibold">
              {isMaster ? PLATFORM_NAME : user?.vendor?.name || PLATFORM_NAME}
            </div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {links.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              data-testid={`nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <it.icon className="w-4 h-4" /> {it.label}
            </NavLink>
          ))}
          {!isMaster && (
            <a
              href={`/store/${user.vendor_id ? "" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                window.open("/", "_blank", "noopener,noreferrer");
              }}
              className={`${linkBase} ${linkInactive}`}
              data-testid="nav-storefront"
            >
              <ExternalLink className="w-4 h-4" /> View storefront
            </a>
          )}
        </nav>

        <div className="border-t border-[var(--border-soft)] pt-4">
          <div className="px-1 mb-3">
            <div className="text-xs text-[var(--text-faint)]">Signed in as</div>
            <div className="text-sm font-medium truncate" data-testid="admin-user-email">
              {user.email}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-ghost w-full justify-center text-sm"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(7,8,11,0.85)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center gap-2">
          {isMaster ? (
            <Crown className="w-4 h-4 text-[var(--warm)]" />
          ) : (
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          )}
          <span className="font-semibold">{isMaster ? "Ops" : user?.vendor?.name || "Store"}</span>
        </div>
        <button
          onClick={onLogout}
          className="btn-ghost !py-1.5 !px-3 text-xs"
          data-testid="admin-logout-btn-mobile"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      {/* Mobile bottom nav */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid border-t"
        style={{
          background: "rgba(7,8,11,0.92)",
          backdropFilter: "blur(14px)",
          borderColor: "var(--border-soft)",
          gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0, 1fr))`,
        }}
      >
        {mobileLinks.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2.5 text-[11px] ${
                isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              }`
            }
            data-testid={`mobile-nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <it.icon className="w-5 h-5" />
            {it.label}
          </NavLink>
        ))}
      </div>

      {/* Content */}
      <main
        className="flex-1 min-w-0 pt-16 md:pt-0 pb-20 md:pb-0 overflow-x-hidden"
        data-testid="admin-content"
      >
        {user.password_must_change && (
          <div
            className="mx-4 md:mx-8 mt-4 md:mt-6 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(244,63,94,0.10)",
              border: "1px solid rgba(244,63,94,0.35)",
            }}
            data-testid="seed-password-banner"
          >
            <AlertTriangle className="w-4 h-4 text-[#f43f5e] shrink-0" />
            <div className="flex-1 text-xs leading-relaxed">
              <span className="font-bold text-white">You're using the default password.</span>{" "}
              {isMaster
                ? "Change it now before going live."
                : "Change it from Store settings before sharing your storefront."}
            </div>
            <NavLink
              to={isMaster ? "/admin/master/security" : "/admin/store"}
              className="btn-primary !py-1.5 !px-3 text-xs shrink-0"
              data-testid="seed-password-fix-btn"
            >
              Fix now
            </NavLink>
          </div>
        )}
        {isVendor && permission === "default" && (
          <div
            className="mx-4 md:mx-8 mt-4 md:mt-6 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(96,165,250,0.08)",
              border: "1px solid rgba(96,165,250,0.30)",
            }}
            data-testid="enable-notifications-banner"
          >
            <Bell className="w-4 h-4 text-[#60a5fa] shrink-0" />
            <div className="flex-1 text-xs leading-relaxed">
              <span className="font-semibold text-white">New order alerts</span> — allow notifications,
              then tap once anywhere in this panel so the chime can play (browser rule). You'll also see
              an on-screen toast for each new order.
            </div>
            <button
              onClick={enablePush}
              className="btn-primary !py-1.5 !px-3 text-xs shrink-0"
              data-testid="enable-notifications-btn"
            >
              Enable
            </button>
          </div>
        )}
        {isVendor && permission === "granted" && pushSubscribed && (
          <div
            className="mx-4 md:mx-8 mt-4 md:mt-6 rounded-xl px-4 py-2 flex items-center gap-3 text-xs"
            style={{
              background: "rgba(34,210,122,0.06)",
              border: "1px solid rgba(34,210,122,0.20)",
            }}
            data-testid="push-active-banner"
          >
            <BellRing className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <div className="flex-1 text-[var(--text-muted)]">
              Push alerts active on this device. We'll ping you on every new order.
            </div>
            <button
              onClick={onTestPush}
              className="btn-ghost !py-1 !px-2 text-[11px] shrink-0"
              data-testid="test-push-btn"
            >
              Send test
            </button>
          </div>
        )}
        {isVendor && permission === "denied" && (
          <div
            className="mx-4 md:mx-8 mt-4 md:mt-6 rounded-xl px-4 py-2 flex items-center gap-3 text-xs"
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.20)",
            }}
            data-testid="notifications-denied-banner"
          >
            <BellOff className="w-3.5 h-3.5 text-[#f43f5e] shrink-0" />
            <div className="text-[var(--text-muted)] leading-relaxed">
              Browser notifications blocked — you'll still get <strong className="text-white">toasts + chime</strong>{" "}
              while this tab is open (tap the page once if you don't hear sound).
            </div>
          </div>
        )}
        {isVendor && subDaysWarn && (
          <div
            className="mx-4 md:mx-8 mt-4 md:mt-6 rounded-xl px-4 py-2 flex items-center gap-3 text-xs"
            style={{
              background: "rgba(255,181,71,0.10)",
              border: "1px solid rgba(255,181,71,0.30)",
            }}
            data-testid="sub-warning-banner"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warm)] shrink-0" />
            <div className="flex-1 text-[var(--text-muted)] leading-relaxed">
              Subscription expires in{" "}
              <span className="font-bold text-white">
                {billing.subscription.days_remaining} day
                {billing.subscription.days_remaining === 1 ? "" : "s"}
              </span>
              . Renew before then to keep your store live.
            </div>
          </div>
        )}
        {isVendor && subBlocked ? (
          <VendorBillingPaywall billing={billing} vendorName={user.email} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
