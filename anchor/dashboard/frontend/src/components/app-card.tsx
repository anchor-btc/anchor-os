"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { App, getAppStatus } from "@/lib/apps";
import { Container, startContainer, stopContainer } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Search,
  Grid3X3,
  MapPin,
  Bitcoin,
  Wallet,
  Database,
  Pickaxe,
  Globe,
  FileCheck,
  ExternalLink,
  Loader2,
  Power,
  ScrollText,
  SquareTerminal,
  Play,
  Square,
  Settings,
  MessageSquare,
  Network,
  Cloud,
  Coins,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Search,
  Grid3X3,
  MapPin,
  Bitcoin,
  Wallet,
  Database,
  Pickaxe,
  Globe,
  FileCheck,
  MessageSquare,
  Network,
  Cloud,
  Coins,
};

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-500",
    glow: "shadow-orange-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-500",
    glow: "shadow-purple-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-500",
    glow: "shadow-blue-500/20",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-500",
    glow: "shadow-yellow-500/20",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-500",
    glow: "shadow-green-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-500",
    glow: "shadow-cyan-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-500",
    glow: "shadow-amber-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-500",
    glow: "shadow-emerald-500/20",
  },
};

interface AppCardProps {
  app: App;
  containers: Container[];
  onToggle?: () => void;
  onShowLogs?: (containerNames: string[]) => void;
  onShowTerminal?: (containerNames: string[]) => void;
  featured?: boolean;
}

export function AppCard({ app, containers, onToggle, onShowLogs, onShowTerminal, featured }: AppCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const Icon = iconMap[app.icon] || Search;
  const colors = colorMap[app.color] || colorMap.orange;

  const status = getAppStatus(
    app.containers,
    containers.map((c) => ({ name: c.name, state: c.state }))
  );

  const isRunning = status === "running";
  const isPartial = status === "partial";

  const handleToggle = async () => {
    setLoading(true);
    try {
      for (const containerName of app.containers) {
        if (isRunning || isPartial) {
          await stopContainer(containerName);
        } else {
          await startContainer(containerName);
        }
      }
      onToggle?.();
    } catch (error) {
      console.error("Failed to toggle app:", error);
    } finally {
      setLoading(false);
    }
  };

  // Pass all containers for logs/terminal (will show tabs if multiple)

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl p-6 transition-all duration-300 flex flex-col",
        featured ? "col-span-1 md:col-span-1" : "",
        isRunning && `${colors.border} shadow-lg ${colors.glow}`,
        !isRunning && "border-border hover:border-muted-foreground/30"
      )}
    >
      {/* Header: Icon, name, status */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
            colors.bg
          )}
        >
          <Icon className={cn("w-7 h-7", colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground truncate">{app.name}</h3>
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                isRunning && "bg-success",
                isPartial && "bg-warning",
                !isRunning && !isPartial && "bg-slate-500"
              )}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {app.port && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                isRunning 
                  ? `${colors.bg} ${colors.text} ${colors.border}` 
                  : "bg-muted text-muted-foreground border-transparent"
              )}>
                <span className="opacity-60">Port</span>
                <span className="font-mono font-semibold">{app.port}</span>
              </span>
            )}
            {app.backendPort && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                isRunning 
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/30" 
                  : "bg-muted text-muted-foreground border-transparent"
              )}
              title="Backend API port"
              >
                <span className="opacity-60">API</span>
                <span className="font-mono font-semibold">{app.backendPort}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-5 line-clamp-2 flex-1">
        {app.description}
      </p>

      {/* Action Buttons - Verbose */}
      <div className="space-y-2">
        {/* Primary action: Open App (when running) or Start */}
        {app.internalUrl && isRunning ? (
          <Link
            href={app.internalUrl}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm transition-all",
              colors.bg,
              colors.text,
              "hover:opacity-80"
            )}
          >
            <Settings className="w-4 h-4" />
            {t("appCard.controlPanel")}
          </Link>
        ) : app.url && isRunning ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm transition-all",
              colors.bg,
              colors.text,
              "hover:opacity-80"
            )}
          >
            <ExternalLink className="w-4 h-4" />
            {t("appCard.openApp")}
          </a>
        ) : !isRunning && !isPartial ? (
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm transition-all",
              "bg-success/10 text-success hover:bg-success/20"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {t("appCard.startApp")}
          </button>
        ) : null}

        {/* Secondary actions row */}
        <div className="flex items-center gap-2">
          {/* Logs button */}
          <button
            onClick={() => onShowLogs?.(app.containers)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t("services.logs")}
          >
            <ScrollText className="w-4 h-4" />
            {t("services.logs")}
          </button>

          {/* Terminal button */}
          <button
            onClick={() => onShowTerminal?.(app.containers)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-muted/50 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
            title={t("services.terminal")}
          >
            <SquareTerminal className="w-4 h-4" />
            {t("services.terminal")}
          </button>

          {/* Stop button (when running) */}
          {(isRunning || isPartial) && (
            <button
              onClick={handleToggle}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-muted/50 hover:bg-error/10 text-muted-foreground hover:text-error transition-colors"
              title={t("services.stop")}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {t("services.stop")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
