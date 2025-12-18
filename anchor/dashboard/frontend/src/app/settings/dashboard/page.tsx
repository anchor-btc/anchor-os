"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, RotateCcw, GripVertical } from "lucide-react";
import { WIDGET_DEFINITIONS } from "@/types/widgets";

const WIDGET_STORAGE_KEY = "anchor-dashboard-widgets";

interface WidgetConfig {
  id: string;
  type: string;
  size: string;
  enabled: boolean;
}

export default function DashboardSettingsPage() {
  const { t } = useTranslation();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed);
      } catch {
        setWidgets([]);
      }
    }
  }, []);

  const handleToggleWidget = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
    setHasChanges(true);
  };

  const handleResetWidgets = () => {
    if (confirm(t("data.resetConfirm"))) {
      localStorage.removeItem(WIDGET_STORAGE_KEY);
      setWidgets([]);
      setHasChanges(false);
      window.location.reload();
    }
  };

  const handleSave = () => {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));
    setHasChanges(false);
  };

  const enabledCount = widgets.filter((w) => w.enabled).length;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("dashboardSettings.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("dashboardSettings.description")}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetWidgets}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t("dashboardSettings.resetToDefault")}
          </button>
        </div>

        <div className="mb-4 p-4 bg-secondary/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{enabledCount}</span>{" "}
            {t("dashboardSettings.widgetsEnabled")}
          </div>
        </div>

        <div className="space-y-2">
          {widgets.length > 0 ? (
            widgets.map((widget) => {
              const definition = WIDGET_DEFINITIONS.find(
                (d) => d.type === widget.type
              );
              return (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">
                        {definition?.name || widget.type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {definition?.description || "Widget"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleWidget(widget.id)}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors
                      ${widget.enabled ? "bg-primary" : "bg-muted"}
                    `}
                  >
                    <div
                      className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                        ${widget.enabled ? "translate-x-7" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("dashboardSettings.noConfig")}</p>
              <p className="text-sm mt-1">
                {t("dashboardSettings.visitDashboard")}
              </p>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t("common.save")}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">
          {t("dashboardSettings.availableWidgets")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WIDGET_DEFINITIONS.map((widget) => (
            <div
              key={widget.type}
              className="p-3 rounded-lg border border-border bg-secondary/30"
            >
              <div className="text-sm font-medium text-foreground">
                {widget.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {widget.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
