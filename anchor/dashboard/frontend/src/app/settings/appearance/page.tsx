"use client";

import { useTranslation } from "react-i18next";
import { Check, Monitor } from "lucide-react";
import { useTheme, ThemeInfo } from "@/contexts/theme-context";

function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: ThemeInfo;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border-2 transition-all text-left
        ${
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-muted-foreground/30"
        }
      `}
    >
      {/* Theme Preview */}
      <div
        className="w-full h-24 rounded-lg mb-3 overflow-hidden border border-border/50"
        style={{ backgroundColor: theme.preview.background }}
      >
        {/* Mock UI */}
        <div className="h-full flex">
          {/* Sidebar mock */}
          <div
            className="w-8 h-full"
            style={{
              backgroundColor: theme.isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          />
          {/* Content area */}
          <div className="flex-1 p-2">
            {/* Header bar */}
            <div
              className="h-2 w-12 rounded-full mb-2"
              style={{ backgroundColor: theme.preview.primary }}
            />
            {/* Cards */}
            <div className="flex gap-1">
              <div
                className="w-8 h-6 rounded"
                style={{ backgroundColor: theme.preview.card }}
              />
              <div
                className="w-8 h-6 rounded"
                style={{ backgroundColor: theme.preview.card }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-foreground">{theme.name}</div>
          <div className="text-xs text-muted-foreground">
            {theme.description}
          </div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}

export default function AppearancePage() {
  const { t } = useTranslation();
  const { theme, setTheme, autoMode, setAutoMode, themes } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t("appearance.title")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("appearance.description")}
        </p>

        {/* Auto Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Monitor className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium text-foreground">
                {t("appearance.autoMode")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("appearance.autoModeDesc")}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${autoMode ? "bg-primary" : "bg-muted"}
            `}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                ${autoMode ? "translate-x-7" : "translate-x-1"}
              `}
            />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              isSelected={theme === t.id && !autoMode}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">
          {t("appearance.livePreview")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <div className="text-sm font-medium text-foreground mb-2">
              {t("appearance.cardExample")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("appearance.cardExampleDesc")}
            </p>
          </div>
          <div className="p-4 bg-primary text-primary-foreground rounded-lg">
            <div className="text-sm font-medium mb-2">
              {t("appearance.primaryButton")}
            </div>
            <p className="text-xs opacity-80">
              {t("appearance.primaryButtonDesc")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="px-3 py-1.5 text-xs font-medium rounded bg-success text-white">
            {t("common.success")}
          </div>
          <div className="px-3 py-1.5 text-xs font-medium rounded bg-warning text-white">
            {t("common.warning")}
          </div>
          <div className="px-3 py-1.5 text-xs font-medium rounded bg-error text-white">
            {t("common.error")}
          </div>
        </div>
      </div>
    </div>
  );
}




