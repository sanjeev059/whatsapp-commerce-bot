import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { apiErrorMessage } from "@/lib/apiError";
import { LogIn, Sparkles, Eye, EyeOff } from "lucide-react";
import { PLATFORM_NAME } from "@/config";

export default function AdminLogin({ portal = "store" }) {
  const { user, login } = useAdminAuth();
  const isOps = portal === "ops";
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user && user.role === "master_admin") return <Navigate to="/admin/master" replace />;
  if (user && user.role === "vendor_admin") return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password, portal);
      navigate(u.role === "master_admin" ? "/admin/master" : "/admin", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      data-testid="admin-login-page"
      style={{
        background:
          "radial-gradient(circle at 30% 0%, rgba(34,210,122,0.10), transparent 50%), radial-gradient(circle at 70% 100%, rgba(255,181,71,0.06), transparent 50%), var(--bg)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 fade-up">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: isOps
                ? "linear-gradient(135deg, #ffb547, #ff8a47)"
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 10px 30px var(--accent-glow)",
            }}
          >
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              {isOps ? "Operations" : "Store admin"}
            </div>
            <div className="text-base font-semibold">{PLATFORM_NAME}</div>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight" data-testid="login-heading">
          Sign in
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-7">
          {isOps
            ? "Onboard stores, billing, and subscriptions."
            : "Manage your menu, orders, and store settings."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              placeholder="you@yourbusiness.com"
              required
              data-testid="login-email"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Password</span>
            <div className="relative mt-1">
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-11"
                placeholder="••••••••"
                required
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--text-faint)]"
                data-testid="login-toggle-pwd"
                aria-label="Toggle password"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div
              className="text-sm rounded-lg p-3"
              style={{
                background: "rgba(244,63,94,0.10)",
                border: "1px solid rgba(244,63,94,0.30)",
                color: "#fda4af",
              }}
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full mt-2 text-base"
            data-testid="login-submit"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
