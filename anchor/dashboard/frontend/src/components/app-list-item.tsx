"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { App, getAppStatus } from "@/lib/apps";
import { Container, startContainer, stopContainer, ServiceInstallStatus } from "@/lib/api";
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

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-500" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-500" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500" },
};

interface AppListItemProps {
  app: App;
  containers: Container[];
  onToggle?: () => void;
  onShowLogs?: (containerNames: string[]) => void;
  onShowTerminal?: (containerNames: string[]) => void;
  installStatus?: ServiceInstallStatus;
  onInstall?: () => void;
  onUninstall?: (removeContainers?: boolean) => void;
  isRequired?: boolean;
}

export function AppListItem({
  app,
  containers,
  onToggle,
  onShowLogs,
  onShowTerminal,
  installStatus = "installed",
  onInstall,
  onUninstall,
  isRequired = false,
}: AppListItemProps) {
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
      setRemoveContainers(true);
    }
  };

  const canUninstall = !isRequired && !isNotInstalled && onUninstall;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors",
          isNotInstalled && "opacity-60"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            isNotInstalled ? "bg-muted" : colors.bg
          )}
        >
          <Icon className={cn("w-5 h-5", isNotInstalled ? "text-muted-foreground" : colors.text)} />
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">{app.name}</h3>
            {!isNotInstalled && (
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  isRunning && "bg-success",
                  isPartial && "bg-warning",
                  !isRunning && !isPartial && "bg-slate-500"
                )}
              />
            )}
            {isNotInstalled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                <Package className="w-2.5 h-2.5" />
                {t("appCard.notInstalled", "Not Installed")}
              </span>
            )}
            {isInstalling && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                {t("appCard.installing", "Installing...")}
              </span>
            )}
            {isRequired && !isNotInstalled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                <Lock className="w-2.5 h-2.5" />
                {t("appCard.required", "Required")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{app.description}</p>
        </div>

        {/* Ports */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {app.port && !isNotInstalled && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                isRunning ? `${colors.bg} ${colors.text}` : "bg-muted text-muted-foreground"
              )}
            >
              <span className="opacity-60">Port</span>
              <span className="font-mono">{app.port}</span>
            </span>
          )}
          {app.backendPort && !isNotInstalled && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                isRunning ? "bg-violet-500/10 text-violet-400" : "bg-muted text-muted-foreground"
              )}
            >
              <span className="opacity-60">API</span>
              <span className="font-mono">{app.backendPort}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isNotInstalled ? (
            <button
              onClick={handleInstall}
              disabled={installing || isInstalling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {installing || isInstalling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {t("appCard.install", "Install")}
            </button>
          ) : (
            <>
              {/* Open App / Start */}
              {app.internalUrl && isRunning ? (
                <Link
                  href={app.internalUrl}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    colors.bg,
                    colors.text,
                    "hover:opacity-80"
                  )}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t("appCard.open", "Open")}
                </Link>
              ) : app.url && isRunning ? (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    colors.bg,
                    colors.text,
                    "hover:opacity-80"
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("appCard.open", "Open")}
                </a>
              ) : !isRunning && !isPartial ? (
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {t("appCard.start", "Start")}
                </button>
              ) : null}

              {/* Stop */}
              {(isRunning || isPartial) && (
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10 transition-colors"
                  title={t("services.stop")}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                </button>
              )}

              {/* Logs */}
              <button
                onClick={() => onShowLogs?.(app.containers)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={t("services.logs")}
              >
                <ScrollText className="w-4 h-4" />
              </button>

              {/* Terminal */}
              <button
                onClick={() => onShowTerminal?.(app.containers)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title={t("services.terminal")}
              >
                <SquareTerminal className="w-4 h-4" />
              </button>

              {/* Uninstall */}
              {canUninstall && (
                <button
                  onClick={handleUninstallClick}
                  disabled={uninstalling || isRunning || isPartial}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    isRunning || isPartial
                      ? t("appCard.stopBeforeUninstall", "Stop before uninstalling")
                      : t("appCard.uninstall", "Uninstall")
                  }
                >
                  {uninstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Uninstall Modal */}
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
    </>
  );
}

