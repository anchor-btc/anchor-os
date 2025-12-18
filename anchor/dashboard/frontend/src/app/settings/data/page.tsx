"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

export default function DataPage() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Export backend settings
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/settings/export`);
      const backendSettings = res.ok ? await res.json() : { settings: [] };

      // Export localStorage settings
      const localSettings: Record<string, unknown> = {};
      const keys = [
        "anchor-os-theme",
        "anchor-os-theme-auto",
        "anchor-os-language",
        "anchor-dashboard-widgets",
      ];

      keys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            localSettings[key] = JSON.parse(value);
          } catch {
            localSettings[key] = value;
          }
        }
      });

      const exportData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        backend: backendSettings,
        local: localSettings,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anchor-os-settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(t("data.exportSuccess"));
    } catch {
      setError(t("common.error"));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate format
      if (!data.version || !data.exportedAt) {
        throw new Error(t("data.importError"));
      }

      // Import backend settings
      if (data.backend?.settings?.length > 0) {
        await fetch(`${DASHBOARD_BACKEND_URL}/settings/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: data.backend.settings }),
        });
      }

      // Import localStorage settings
      if (data.local) {
        Object.entries(data.local).forEach(([key, value]) => {
          localStorage.setItem(
            key,
            typeof value === "string" ? value : JSON.stringify(value)
          );
        });
      }

      setSuccess(t("data.importSuccess"));
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("data.importError"));
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleReset = async () => {
    if (!confirm(t("data.resetConfirm"))) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Clear localStorage
      const keys = [
        "anchor-os-theme",
        "anchor-os-theme-auto",
        "anchor-os-language",
        "anchor-dashboard-widgets",
        "anchor-os-token",
        "anchor-os-last-activity",
      ];
      keys.forEach((key) => localStorage.removeItem(key));

      // Reset backend settings (disable auth, reset to defaults)
      await fetch(`${DASHBOARD_BACKEND_URL}/auth/disable`, { method: "DELETE" });

      setSuccess(t("data.resetSuccess"));
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError(t("common.error"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Export Settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("data.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("data.description")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">
                  {t("data.export")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("data.exportDesc")}
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t("data.export")}
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">
                  {t("data.import")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("data.importDesc")}
                </div>
              </div>
            </div>
            <label
              className={`
                px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium 
                hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2
                ${importing ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {t("data.import")}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Reset to Defaults */}
      <div className="bg-card border border-error/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-error/10">
            <RotateCcw className="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t("data.dangerZone")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("data.dangerZoneDesc")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-error/30 bg-error/5">
          <div>
            <div className="font-medium text-foreground">{t("data.reset")}</div>
            <div className="text-sm text-muted-foreground">
              {t("data.resetDesc")}
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t("data.reset")}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          {t("data.whatExported")}
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t("data.exportedItems.theme")}</li>
          <li>{t("data.exportedItems.language")}</li>
          <li>{t("data.exportedItems.widgets")}</li>
          <li>{t("data.exportedItems.notifications")}</li>
          <li>{t("data.exportedItems.network")}</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          <strong>{t("common.note")}:</strong> {t("data.passwordNote")}
        </p>
      </div>
    </div>
  );
}
