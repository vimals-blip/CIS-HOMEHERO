import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { decodeJwtPayload } from "@/lib/token";
import { apiFetch, getRefreshToken, clearTokens } from "@/lib/api";

export type AppRole = "CUSTOMER" | "EXPERT" | "ADMIN" | "SUPER_ADMIN";

interface AuthContextValue {
  user: { id: string; email: string; role: AppRole } | null;
  token: string | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("homehero_token");
}

function parseToken(token: string | null) {
  if (!token) return null;
  const payload = decodeJwtPayload<Record<string, unknown>>(token);
  if (!payload || typeof payload.user_id !== "string" || typeof payload.role !== "string") return null;
  return {
    id: payload.user_id,
    email: typeof payload.email === "string" ? payload.email : "unknown@example.com",
    role: payload.role as AppRole,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; role: AppRole } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateAuth = () => {
      const storedToken = getStoredToken();
      const parsed = parseToken(storedToken);
      setToken(storedToken);
      setUser(parsed);
      setRole(parsed?.role ?? null);
      setLoading(false);
    };

    updateAuth();

    if (typeof window !== "undefined") {
      window.addEventListener("homehero-auth-changed", updateAuth);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("homehero-auth-changed", updateAuth);
      }
    };
  }, []);

  const signOut = async () => {
    // Best-effort server-side revocation of the refresh token.
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
      } catch { /* ignore — clear locally regardless */ }
    }
    clearTokens();
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
