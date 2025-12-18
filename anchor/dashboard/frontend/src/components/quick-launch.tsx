"use client";

import { useQuery } from "@tanstack/react-query";
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
  ExternalLink,
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

  const renderAppItem = (app: (typeof apps)[0], showCategory = false) => {
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

    const categoryLabels: Record<string, string> = {
      app: "App",
      explorer: "Explorer",
      networking: "Tool",
      core: "Core",
    };
    const categoryLabel = categoryLabels[app.category] || "";

    return (
      <a
        key={app.id}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg transition-all",
          "hover:bg-muted group",
          !isRunning && "opacity-50"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            colorClass
          )}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
            {isExternal && (
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showCategory && <span className="text-[10px]">{categoryLabel}</span>}
            {app.port && <span>:{app.port}</span>}
            {app.backendPort && <span>API :{app.backendPort}</span>}
          </div>
        </div>

        {/* Status */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isRunning ? "bg-success" : "bg-slate-400"
          )}
        />
      </a>
    );
  };

  // All apps in a single list for fluid grid
  const allApps = [...appsByCategory.app, ...appsByCategory.explorer, ...appsByCategory.networking];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Launch</h2>
        <Link
          href="/apps"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Fluid grid layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
        {allApps.map((app) => renderAppItem(app, true))}
      </div>
    </div>
  );
}
