"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Save, Loader2 } from "lucide-react";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

interface NotificationSettings {
  enabled: boolean;
  backup_alerts: boolean;
  service_alerts: boolean;
  transaction_alerts: boolean;
}

export default function NotificationsPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    backup_alerts: true,
    service_alerts: true,
    transaction_alerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/settings/notifications`);
      if (res.ok) {
        const data = await res.json();
        if (data.setting?.value) {
          setSettings(data.setting.value);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${DASHBOARD_BACKEND_URL}/settings/notifications`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: settings }),
        }
      );

      if (res.ok) {
        setSuccess(t("notifications.saved"));
        setHasChanges(false);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  const toggleItems = [
    {
      key: "enabled" as const,
      labelKey: "notifications.enable",
      descKey: "notifications.enableDesc",
    },
    {
      key: "backup_alerts" as const,
      labelKey: "notifications.backup",
      descKey: "notifications.backupDesc",
      disabled: !settings.enabled,
    },
    {
      key: "service_alerts" as const,
      labelKey: "notifications.service",
      descKey: "notifications.serviceDesc",
      disabled: !settings.enabled,
    },
    {
      key: "transaction_alerts" as const,
      labelKey: "notifications.transaction",
      descKey: "notifications.transactionDesc",
      disabled: !settings.enabled,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("notifications.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("notifications.description")}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {toggleItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between p-4 rounded-lg border border-border ${
                item.disabled ? "opacity-50" : ""
              }`}
            >
              <div>
                <div className="font-medium text-foreground">
                  {t(item.labelKey)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(item.descKey)}
                </div>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                disabled={item.disabled}
                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${settings[item.key] ? "bg-primary" : "bg-muted"}
                  ${item.disabled ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                    ${settings[item.key] ? "translate-x-7" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          ))}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t("notifications.saveChanges")}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          {t("common.note")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("notifications.note")}</p>
      </div>
    </div>
  );
}
