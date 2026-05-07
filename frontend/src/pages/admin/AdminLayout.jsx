import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  LayoutDashboard,
  ListOrdered,
  Package,
  LogOut,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  // Loading state (initial /auth/me check)
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
  if (user === false) return <Navigate to="/admin/login" replace />;

  const onLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const linkBase =
    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors";
  const linkActive = "bg-[var(--surface-2)] text-white";
  const linkInactive = "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)]";

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
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              Vendor
            </div>
            <div className="text-sm font-semibold">Local Commerce</div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            data-testid="nav-orders"
          >
            <ListOrdered className="w-4 h-4" /> Orders
          </NavLink>
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            data-testid="nav-products"
          >
            <Package className="w-4 h-4" /> Products
          </NavLink>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className={`${linkBase} ${linkInactive}`}
            data-testid="nav-storefront"
          >
            <ExternalLink className="w-4 h-4" /> View storefront
          </a>
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
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-semibold">Vendor</span>
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t"
        style={{
          background: "rgba(7,8,11,0.92)",
          backdropFilter: "blur(14px)",
          borderColor: "var(--border-soft)",
        }}
      >
        {[
          { to: "/admin", end: true, icon: LayoutDashboard, label: "Stats" },
          { to: "/admin/orders", icon: ListOrdered, label: "Orders" },
          { to: "/admin/products", icon: Package, label: "Products" },
        ].map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2.5 text-[11px] ${
                isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              }`
            }
            data-testid={`mobile-nav-${it.label.toLowerCase()}`}
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
        <Outlet />
      </main>
    </div>
  );
}
