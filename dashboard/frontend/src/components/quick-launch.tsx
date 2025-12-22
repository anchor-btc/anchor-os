"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchContainers } from "@/lib/api";
import { apps, getAppStatus } from "@/lib/apps";
import {
  Globe,
  MapPin,
  Grid3X3,
  FileCheck,
  MessageSquare,
  Coins,
  Search,
  Bitcoin,
  Cloud,
  Network,
  Loader2,
  ArrowRight,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Globe,
  MapPin,
  Grid3X3,
  FileCheck,
  MessageSquare,
  Coins,
  Search,
  Bitcoin,
  Cloud,
  Network,
  Layers,
};

const bgColorMap: Record<string, string> = {
  cyan: "bg-cyan-500/10 text-cyan-600",
  blue: "bg-blue-500/10 text-blue-600",
  purple: "bg-purple-500/10 text-purple-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  orange: "bg-orange-500/10 text-orange-600",
  amber: "bg-amber-500/10 text-amber-600",
  yellow: "bg-yellow-500/10 text-yellow-600",
  green: "bg-green-500/10 text-green-600",
};

export function QuickLaunch() {
  const { t } = useTranslation();
  const { data: containersData, isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];

  // Get apps, explorers, and networking tools
  const launchableApps = apps.filter(
    (app) =>
      app.category === "app" ||
      app.category === "explorer" ||
      app.category === "networking"
  );

  // Group by category
  const appsByCategory = {
    app: launchableApps.filter((a) => a.category === "app"),
    explorer: launchableApps.filter((a) => a.category === "explorer"),
    networking: launchableApps.filter((a) => a.category === "networking"),
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const renderAppItem = (app: (typeof apps)[0]) => {
    const status = getAppStatus(
      app.containers,
      containers.map((c) => ({ name: c.name, state: c.state }))
    );
    const isRunning = status === "running";
    const IconComponent = iconMap[app.icon] || Globe;
    const colorClass = bgColorMap[app.color] || bgColorMap.blue;
    const href = app.url || app.internalUrl || "#";
    const isExternal = !!app.url;
    const displayName = app.name.replace("Anchor ", "");

    return (
      <a
        key={app.id}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "flex items-center gap-3 p-2.5 rounded-lg transition-all",
          "hover:bg-muted group",
          !isRunning && "opacity-50"
        )}
      >
        {/* Icon with status indicator */}
        <div className="relative shrink-0">
        <div
          className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
            colorClass
          )}
        >
            <IconComponent className="w-5 h-5" />
          </div>
          {/* Status dot */}
        <div
          className={cn(
              "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
            isRunning ? "bg-success" : "bg-slate-400"
          )}
        />
        </div>

        {/* Name only - clean and simple */}
        <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
          {displayName}
        </span>
      </a>
    );
  };

  // All apps in a single list for fluid grid
  const allApps = [...appsByCategory.app, ...appsByCategory.explorer, ...appsByCategory.networking];

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{t("widgets.quickLaunch")}</h2>
        <Link
          href="/apps"
          className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline"
        >
          {t("common.seeAll")}
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
      </div>

      {/* Responsive grid layout with fixed minimum width per item */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {allApps.map((app) => renderAppItem(app))}
      </div>
    </div>
  );
}
