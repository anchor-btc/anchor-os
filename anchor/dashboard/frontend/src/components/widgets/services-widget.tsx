"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchContainers } from "@/lib/api";
import { apps, getAppStatus, App } from "@/lib/apps";
import Link from "next/link";
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
  Database,
  Zap,
  Wallet,
  HardDrive,
  Server,
  Eye,
  Ticket,
  Activity,
  Layers,
} from "lucide-react";
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
  Database,
  Zap,
  Wallet,
  HardDrive,
  Server,
  Eye,
  Ticket,
  Activity,
  Layers,
};

const colorMap: Record<string, string> = {
  cyan: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  green: "bg-green-500/10 text-green-600 border-green-500/20",
  pink: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  slate: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

interface ServiceCardProps {
  app: App;
  status: "running" | "partial" | "stopped";
  containerCount: { running: number; total: number };
}

function ServiceCard({ app, status, containerCount }: ServiceCardProps) {
  const Icon = iconMap[app.icon] || Server;
  const colorClass = colorMap[app.color] || colorMap.blue;
  const isRunning = status === "running" || status === "partial";
  
  // Determine the link
  const href = app.url ? `/?app=${app.id}` : app.internalUrl || "#";
  const displayName = app.name.replace("Anchor ", "");

  const content = (
    <div
      className={cn(
        "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
        "hover:bg-muted/50",
        isRunning ? "bg-background border-border" : "bg-muted/30 border-border opacity-50"
      )}
    >
      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate block">
          {displayName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {app.port ? `:${app.port}` : ""}
          {containerCount.total > 1 ? ` • ${containerCount.running}/${containerCount.total}` : ""}
        </span>
      </div>

      {/* Status indicator */}
      <div
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          status === "running" && "bg-success",
          status === "partial" && "bg-warning",
          status === "stopped" && "bg-slate-400"
        )}
      />
    </div>
  );

  if (app.url) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  if (app.internalUrl) {
    return (
      <Link href={app.internalUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface ServicesWidgetProps {
  category?: "app" | "explorer" | "networking" | "core" | "all";
  title?: string;
}

export function ServicesWidget({ category = "all", title }: ServicesWidgetProps) {
  const { t } = useTranslation();
  const { data: containersData, isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];

  // Filter apps by category
  const filteredApps = category === "all" 
    ? apps 
    : apps.filter((app) => app.category === category);

  // Get status for each app
  const appsWithStatus = filteredApps.map((app) => {
    const status = getAppStatus(
      app.containers,
      containers.map((c) => ({ name: c.name, state: c.state }))
    );
    const runningCount = app.containers.filter((containerName) => {
      const container = containers.find((c) => c.name === containerName);
      return container?.state === "running";
    }).length;

    return {
      app,
      status,
      containerCount: { running: runningCount, total: app.containers.length },
    };
  });

  // Sort: running first, then partial, then stopped
  const sortedApps = [...appsWithStatus].sort((a, b) => {
    const order = { running: 0, partial: 1, stopped: 2 };
    return order[a.status] - order[b.status];
  });

  // Stats
  const runningCount = appsWithStatus.filter((a) => a.status === "running").length;
  const totalCount = appsWithStatus.length;

  const categoryTitles: Record<string, string> = {
    app: t("widgets.apps"),
    explorer: t("widgets.explorers"),
    networking: t("widgets.networking"),
    core: t("widgets.kernel"),
    all: t("widgets.allServices"),
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {title || categoryTitles[category]}
        </h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {runningCount}/{totalCount}
        </span>
      </div>

      {/* Services Grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sortedApps.map(({ app, status, containerCount }) => (
          <ServiceCard
            key={app.id}
            app={app}
            status={status}
            containerCount={containerCount}
          />
        ))}
      </div>
    </div>
  );
}

// Specialized widgets for each category
export function AppsWidget() {
  return <ServicesWidget category="app" />;
}

export function ExplorersWidget() {
  return <ServicesWidget category="explorer" />;
}

export function NetworkingWidget() {
  return <ServicesWidget category="networking" />;
}

export function KernelWidget() {
  return <ServicesWidget category="core" />;
}
