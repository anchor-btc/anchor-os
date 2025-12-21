"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Eye, EyeOff, Loader2, Anchor } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function LockScreen() {
  const { t } = useTranslation();
  const { login, isLoading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await login(password);

    if (!result.success) {
      setError(result.message);
      setPassword("");
    }

    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-gradient-radial" />

      {/* Lock Screen Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-border bg-secondary/30">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Anchor className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {t("lockScreen.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("lockScreen.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t("lockScreen.password")}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  placeholder={t("lockScreen.placeholder")}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("lockScreen.unlocking")}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {t("lockScreen.unlock")}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6">
            <p className="text-xs text-center text-muted-foreground">
              {t("lockScreen.protected")}
            </p>
          </div>
        </div>

        {/* Anchor branding */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("lockScreen.poweredBy")}
          </p>
        </div>
      </div>
    </div>
  );
}





