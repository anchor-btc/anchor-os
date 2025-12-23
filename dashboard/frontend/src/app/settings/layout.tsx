"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Palette,
  Network,
  Languages,
  Bell,
  LayoutGrid,
  Database,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/ds";

interface SettingsNavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const settingsNav: SettingsNavItem[] = [
  {
    href: "/settings",
    labelKey: "nav.settings",
    icon: <Settings className="w-4 h-4" />,
  },
  {
    href: "/settings/appearance",
    labelKey: "settings.sections.appearance.title",
    icon: <Palette className="w-4 h-4" />,
  },
  {
    href: "/settings/security",
    labelKey: "settings.sections.security.title",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    href: "/settings/network",
    labelKey: "settings.sections.network.title",
    icon: <Network className="w-4 h-4" />,
  },
  {
    href: "/settings/language",
    labelKey: "settings.sections.language.title",
    icon: <Languages className="w-4 h-4" />,
  },
  {
    href: "/settings/notifications",
    labelKey: "settings.sections.notifications.title",
    icon: <Bell className="w-4 h-4" />,
  },
  {
    href: "/settings/dashboard",
    labelKey: "settings.sections.dashboard.title",
    icon: <LayoutGrid className="w-4 h-4" />,
  },
  {
    href: "/settings/data",
    labelKey: "settings.sections.data.title",
    icon: <Database className="w-4 h-4" />,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        iconColor="muted"
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      <div className="flex gap-8">
        {/* Settings Navigation Sidebar */}
        <nav className="w-56 flex-shrink-0">
          <div className="space-y-1">
            {settingsNav.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/settings" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}
                >
                  <span
                    className={
                      isActive ? "text-primary" : "text-muted-foreground"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}






