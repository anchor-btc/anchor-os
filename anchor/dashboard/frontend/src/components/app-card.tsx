"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { App, getAppStatus } from "@/lib/apps";
import { Container, startContainer, stopContainer, installService, ServiceInstallStatus } from "@/lib/api";
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
  Layers,
  Download,
  Package,
  Activity,
  Eye,
  Ticket,
  Zap,
  Shield,
  HardDrive,
  Trash2,
  Lock,
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
  Layers,
  Activity,
  Eye,
  Ticket,
  Zap,
  Shield,
  HardDrive,
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
  installStatus?: ServiceInstallStatus;
  onInstall?: () => void;
  onUninstall?: (removeContainers?: boolean) => void;
  isRequired?: boolean;
}

export function AppCard({ 
  app, 
  containers, 
  onToggle, 
  onShowLogs, 
  onShowTerminal, 
  featured,
  installStatus = "installed",
  onInstall,
  onUninstall,
  isRequired = false,
}: AppCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [removeContainers, setRemoveContainers] = useState(true);
  const Icon = iconMap[app.icon] || Search;
  const colors = colorMap[app.color] || colorMap.orange;

  const isNotInstalled = installStatus === "not_installed";
  const isInstalling = installStatus === "installing";

  const status = getAppStatus(
    app.containers,
    containers.map((c) => ({ name: c.name, state: c.state }))
  );

  const isRunning = status === "running" && !isNotInstalled;
  const isPartial = status === "partial" && !isNotInstalled;

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

  const handleInstall = async () => {
    if (onInstall) {
      setInstalling(true);
      try {
        onInstall();
      } finally {
        setInstalling(false);
      }
    }
  };

  const handleUninstallClick = () => {
    if (!onUninstall || isRequired) return;
    setShowUninstallModal(true);
  };

  const handleUninstallConfirm = async () => {
    if (!onUninstall) return;
    
    setUninstalling(true);
    setShowUninstallModal(false);
    try {
      await onUninstall(removeContainers);
    } finally {
      setUninstalling(false);
      setRemoveContainers(true); // Reset for next time
    }
  };

  const canUninstall = !isRequired && !isNotInstalled && onUninstall;

  // Pass all containers for logs/terminal (will show tabs if multiple)

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl p-6 transition-all duration-300 flex flex-col relative",
        featured ? "col-span-1 md:col-span-1" : "",
        isRunning && `${colors.border} shadow-lg ${colors.glow}`,
        isNotInstalled && "border-dashed border-muted-foreground/30 opacity-75",
        !isRunning && !isNotInstalled && "border-border hover:border-muted-foreground/30"
      )}
    >
      {/* Installation status badge */}
      {isNotInstalled && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
            <Package className="w-3 h-3" />
            {t("appCard.notInstalled", "Not Installed")}
          </span>
        </div>
      )}
      {isInstalling && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("appCard.installing", "Installing...")}
          </span>
        </div>
      )}

      {/* Header: Icon, name, status */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
            isNotInstalled ? "bg-muted" : colors.bg
          )}
        >
          <Icon className={cn("w-7 h-7", isNotInstalled ? "text-muted-foreground" : colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground truncate">{app.name}</h3>
            {!isNotInstalled && (
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                isRunning && "bg-success",
                isPartial && "bg-warning",
                !isRunning && !isPartial && "bg-slate-500"
              )}
            />
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {app.port && !isNotInstalled && (
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
            {app.backendPort && !isNotInstalled && (
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

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Install button for not installed apps */}
        {isNotInstalled ? (
          <button
            onClick={handleInstall}
            disabled={installing || isInstalling}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm transition-all",
              "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {installing || isInstalling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("appCard.install", "Install")}
          </button>
        ) : (
          <>
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

            {/* Uninstall button - only for non-required services */}
            {canUninstall && (
              <button
                onClick={handleUninstallClick}
                disabled={uninstalling || isRunning || isPartial}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium transition-colors",
                  isRunning || isPartial
                    ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                    : "bg-muted/30 hover:bg-error/10 text-muted-foreground hover:text-error"
                )}
                title={isRunning || isPartial 
                  ? t("appCard.stopBeforeUninstall", "Stop the service before uninstalling") 
                  : t("appCard.uninstall", "Uninstall")}
              >
                {uninstalling ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                {t("appCard.uninstall", "Uninstall")}
              </button>
            )}

            {/* Required service indicator */}
            {isRequired && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                {t("appCard.requiredService", "Required service")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Uninstall Confirmation Modal */}
      {showUninstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-error/10">
                <Trash2 className="w-5 h-5 text-error" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t("appCard.uninstallTitle", "Uninstall {{name}}", { name: app.name })}
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {t("appCard.uninstallDescription", "This will remove the service from your installed services list.")}
            </p>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={removeContainers}
                onChange={(e) => setRemoveContainers(e.target.checked)}
                className="w-4 h-4 rounded border-border text-error focus:ring-error"
              />
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t("appCard.removeContainers", "Also remove containers")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("appCard.removeContainersDesc", "Delete Docker containers and free up disk space")}
                </div>
              </div>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUninstallModal(false);
                  setRemoveContainers(true);
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleUninstallConfirm}
                className="flex-1 px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t("appCard.uninstall", "Uninstall")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
