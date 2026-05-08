import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

const AdminAuthContext = createContext(null);
const TOKEN_KEY = "lc_admin_token";

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown/loading, false = logged out, object = logged in
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);

  // Apply token to axios default headers whenever it changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      delete api.defaults.headers.common.Authorization;
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // On mount, if a token exists, fetch /auth/me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setUser(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global 401 handler — but skip endpoints where 401 means "wrong field input",
  // not "session expired" (e.g. change-password).
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        const url = err?.config?.url || "";
        const isInFormAuthCheck = url.includes("/auth/change-password");
        if (err?.response?.status === 401 && !isInFormAuthCheck) {
          setToken(null);
          setUser(false);
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(false);
  };

  return (
    <AdminAuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
