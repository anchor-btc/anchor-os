"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Palette,
  Network,
  Languages,
  Bell,
  LayoutGrid,
  Database,
  ChevronRight,
  User,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/api";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

const WIDGET_STORAGE_KEY = "anchor-dashboard-widgets";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { currentTheme } = useTheme();
  const { isAuthEnabled } = useAuth();
  
  const [networkChain, setNetworkChain] = useState<string>("...");
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [widgetCount, setWidgetCount] = useState<number>(0);

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
  });

  useEffect(() => {
    // Fetch network info
    fetch(`${DASHBOARD_BACKEND_URL}/bitcoin/info`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.chain) {
          setNetworkChain(data.chain.charAt(0).toUpperCase() + data.chain.slice(1));
        }
      })
      .catch(() => setNetworkChain("Offline"));

    // Fetch notification settings
    fetch(`${DASHBOARD_BACKEND_URL}/settings/notifications`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.setting?.value?.enabled !== undefined) {
          setNotificationsEnabled(data.setting.value.enabled);
        }
      })
      .catch(() => {});

    // Get widget count from localStorage
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        const widgets = JSON.parse(saved);
        setWidgetCount(widgets.filter((w: { enabled: boolean }) => w.enabled).length);
      }
    } catch {
      setWidgetCount(0);
    }
  }, []);

  const currentLanguage = LANGUAGE_NAMES[i18n.language] || i18n.language;

  const settingsCards = [
    {
      href: "/settings/profile",
      labelKey: "settings.sections.profile.title",
      icon: <User className="w-6 h-6" />,
      descriptionKey: "settings.sections.profile.description",
      preview: (
        <div className="flex items-center gap-2">
          <span className="text-lg">{userProfile?.avatar_url || "🧑‍💻"}</span>
          <span className="text-sm text-muted-foreground">
            {userProfile?.name || "Bitcoiner"}
          </span>
        </div>
      ),
    },
    {
      href: "/settings/appearance",
      labelKey: "settings.sections.appearance.title",
      icon: <Palette className="w-6 h-6" />,
      descriptionKey: "settings.sections.appearance.description",
      preview: (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: currentTheme.preview.primary }}
          />
          <span className="text-sm text-muted-foreground">
            {currentTheme.name}
          </span>
        </div>
      ),
    },
    {
      href: "/settings/security",
      labelKey: "settings.sections.security.title",
      icon: <Shield className="w-6 h-6" />,
      descriptionKey: "settings.sections.security.description",
      preview: (
        <span className="text-sm text-muted-foreground">
          {isAuthEnabled ? t("security.enabled") : t("security.disabled")}
        </span>
      ),
    },
    {
      href: "/settings/network",
      labelKey: "settings.sections.network.title",
      icon: <Network className="w-6 h-6" />,
      descriptionKey: "settings.sections.network.description",
      preview: (
        <span className="text-sm text-muted-foreground">{networkChain}</span>
      ),
    },
    {
      href: "/settings/language",
      labelKey: "settings.sections.language.title",
      icon: <Languages className="w-6 h-6" />,
      descriptionKey: "settings.sections.language.description",
      preview: (
        <span className="text-sm text-muted-foreground">{currentLanguage}</span>
      ),
    },
    {
      href: "/settings/notifications",
      labelKey: "settings.sections.notifications.title",
      icon: <Bell className="w-6 h-6" />,
      descriptionKey: "settings.sections.notifications.description",
      preview: (
        <span className="text-sm text-muted-foreground">
          {notificationsEnabled === null
            ? "..."
            : notificationsEnabled
            ? t("notifications.enable")
            : t("common.disabled")}
        </span>
      ),
    },
    {
      href: "/settings/dashboard",
      labelKey: "settings.sections.dashboard.title",
      icon: <LayoutGrid className="w-6 h-6" />,
      descriptionKey: "settings.sections.dashboard.description",
      preview: (
        <span className="text-sm text-muted-foreground">
          {widgetCount} widgets
        </span>
      ),
    },
    {
      href: "/settings/data",
      labelKey: "settings.sections.data.title",
      icon: <Database className="w-6 h-6" />,
      descriptionKey: "settings.sections.data.description",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t("settings.quickSettings")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("settings.overview")}
        </p>

        <div className="grid gap-3">
          {settingsCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {t(card.labelKey)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(card.descriptionKey)}
                </div>
              </div>
              {card.preview && (
                <div className="hidden sm:block">{card.preview}</div>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          {t("settings.about")}
        </h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t("app.version")}: 1.0.0</p>
          <p>{t("app.tagline")}</p>
        </div>
      </div>
    </div>
  );
}
