"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

const TOKEN_KEY = "anchor-os-token";
const LAST_ACTIVITY_KEY = "anchor-os-last-activity";

interface AuthStatus {
  enabled: boolean;
  has_password: boolean;
  inactivity_timeout: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthEnabled: boolean;
  isLoading: boolean;
  inactivityTimeout: number;
  login: (password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateActivity: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(300);

  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // Fetch auth status from backend
      const statusRes = await fetch(`${DASHBOARD_BACKEND_URL}/auth/status`);
      if (!statusRes.ok) {
        // Backend not available, assume no auth
        setIsAuthEnabled(false);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const status: AuthStatus = await statusRes.json();
      setIsAuthEnabled(status.enabled);
      setInactivityTimeout(status.inactivity_timeout || 300);

      if (!status.enabled) {
        // Auth disabled, user is always authenticated
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Auth is enabled, check for valid token
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const verifyRes = await fetch(`${DASHBOARD_BACKEND_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const verifyData = await verifyRes.json();
      setIsAuthenticated(verifyData.valid);

      if (verifyData.valid) {
        updateActivity();
      }
    } catch {
      // Error connecting to backend, assume no auth required
      setIsAuthEnabled(false);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, [updateActivity]);

  const login = useCallback(
    async (
      password: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          setIsAuthenticated(true);
          updateActivity();
          return { success: true, message: "Login successful" };
        }

        return { success: false, message: data.message || "Login failed" };
      } catch {
        return { success: false, message: "Failed to connect to server" };
      }
    },
    [updateActivity]
  );

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Inactivity checker
  useEffect(() => {
    if (!isAuthEnabled || !isAuthenticated || inactivityTimeout <= 0) {
      return;
    }

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!lastActivity) return;

      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > inactivityTimeout * 1000) {
        logout();
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkInactivity, 10000);

    return () => clearInterval(interval);
  }, [isAuthEnabled, isAuthenticated, inactivityTimeout, logout]);

  // Activity event listeners
  useEffect(() => {
    if (!isAuthEnabled || !isAuthenticated) return;

    const handleActivity = () => updateActivity();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [isAuthEnabled, isAuthenticated, updateActivity]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAuthEnabled,
        isLoading,
        inactivityTimeout,
        login,
        logout,
        updateActivity,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
