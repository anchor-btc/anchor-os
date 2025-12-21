"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Clock, Eye, EyeOff, Loader2 } from "lucide-react";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

interface AuthStatus {
  enabled: boolean;
  has_password: boolean;
  inactivity_timeout: number;
}

export default function SecurityPage() {
  const { t } = useTranslation();

  const TIMEOUT_OPTIONS = [
    { value: 60, label: t("security.timeouts.1min") },
    { value: 300, label: t("security.timeouts.5min") },
    { value: 900, label: t("security.timeouts.15min") },
    { value: 1800, label: t("security.timeouts.30min") },
    { value: 3600, label: t("security.timeouts.1hour") },
    { value: -1, label: t("security.timeouts.never") },
  ];

  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password setup/change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTimeout, setSelectedTimeout] = useState(300);

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/status`);
      if (!res.ok) throw new Error("Failed to fetch auth status");
      const data = await res.json();
      setAuthStatus(data);
      setSelectedTimeout(data.inactivity_timeout || 300);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("security.passwordsDontMatch"));
      return;
    }
    if (password.length < 4) {
      setError(t("security.passwordTooShort"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          inactivity_timeout: selectedTimeout === -1 ? null : selectedTimeout,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(t("security.passwordSet"));
        setShowPasswordForm(false);
        setPassword("");
        setConfirmPassword("");
        await fetchAuthStatus();
      } else {
        setError(data.message || t("common.error"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("security.passwordsDontMatch"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(t("security.passwordChanged"));
        setShowPasswordForm(false);
        setIsChangingPassword(false);
        setPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
      } else {
        setError(data.message || t("security.invalidPassword"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAuth = async () => {
    if (!confirm(t("data.resetConfirm"))) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/disable`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(t("security.authDisabled"));
        await fetchAuthStatus();
      } else {
        setError(data.message || t("common.error"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTimeout = async (timeout: number) => {
    if (!authStatus?.enabled) return;

    setSelectedTimeout(timeout);
    setSaving(true);

    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/settings/auth`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: {
            enabled: authStatus.enabled,
            password_hash: null,
            inactivity_timeout: timeout === -1 ? null : timeout,
          },
        }),
      });

      if (res.ok) {
        setSuccess(t("common.success"));
        await fetchAuthStatus();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
          {success}
        </div>
      )}

      {/* Password Protection */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("security.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("security.description")}
            </p>
          </div>
        </div>

        {!authStatus?.enabled ? (
          <>
            {!showPasswordForm ? (
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-foreground">
                      {t("security.disabled")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("security.disabledDesc")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t("security.enable")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetupPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.newPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={t("lockScreen.placeholder")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("security.confirmPassword")}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.autoLockDesc")}
                  </label>
                  <select
                    value={selectedTimeout}
                    onChange={(e) => setSelectedTimeout(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {TIMEOUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t("security.setPassword")}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-success/30 bg-success/5">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-success" />
                <div>
                  <div className="font-medium text-foreground">
                    {t("security.enabled")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("security.enabledDesc")}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisableAuth}
                disabled={saving}
                className="px-4 py-2 border border-error/30 text-error rounded-lg text-sm font-medium hover:bg-error/10 transition-colors"
              >
                {t("security.disable")}
              </button>
            </div>

            {/* Change Password */}
            {!isChangingPassword ? (
              <button
                onClick={() => {
                  setIsChangingPassword(true);
                  setShowPasswordForm(true);
                }}
                className="text-sm text-primary hover:underline"
              >
                {t("security.changePassword")}
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.currentPassword")}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("security.currentPassword")}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.newPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={t("security.newPassword")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("security.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={t("security.confirmPassword")}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setShowPasswordForm(false);
                      setPassword("");
                      setConfirmPassword("");
                      setCurrentPassword("");
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t("security.changePassword")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Inactivity Timeout */}
      {authStatus?.enabled && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-secondary">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("security.autoLock")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("security.autoLockDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TIMEOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleUpdateTimeout(opt.value)}
                className={`
                  px-4 py-3 rounded-lg border text-sm font-medium transition-colors
                  ${
                    selectedTimeout === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary text-foreground"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lock Now Button */}
      {authStatus?.enabled && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">
                {t("security.lockNow")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("security.lockNowDesc")}
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("anchor-os-token");
                window.location.reload();
              }}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t("security.lock")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






