"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Anchor,
  LayoutDashboard,
  Bitcoin,
  Wallet,
  Map,
  Grid3X3,
  Search,
  AppWindow,
  Globe,
  FileCheck,
  Database,
  Pickaxe,
  Server,
  Terminal,
  Wrench,
  Zap,
  MessageSquare,
  ScrollText,
  SquareTerminal,
  Network,
  Cloud,
  Play,
  Pause,
  Loader2,
  HardDrive,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apps, getAppStatus } from "@/lib/apps";
import { fetchContainers, startContainer, stopContainer } from "@/lib/api";
import { LogsModal } from "./logs-modal";
import { TerminalModal } from "./terminal-modal";

const navigation = [
  { nameKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { nameKey: "nav.services", href: "/apps", icon: AppWindow },
  { nameKey: "nav.testnetControl", href: "/testnet", icon: Zap },
  { nameKey: "nav.bitcoinNode", href: "/node", icon: Bitcoin },
  { nameKey: "nav.wallet", href: "/wallet", icon: Wallet },
  { nameKey: "nav.backup", href: "/backup", icon: HardDrive },
  { nameKey: "nav.settings", href: "/settings", icon: Settings },
];

const iconMap: Record<string, React.ElementType> = {
  Search,
  Grid3X3,
  MapPin: Map,
  Bitcoin,
  Wallet,
  Database,
  Pickaxe,
  Globe,
  FileCheck,
  Server,
  MessageSquare,
  Network,
  Cloud,
  Shield,
};

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentAppId = searchParams.get("app");
  const queryClient = useQueryClient();
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [terminalContainer, setTerminalContainer] = useState<string | null>(null);
  const [pendingContainers, setPendingContainers] = useState<Set<string>>(new Set());

  const { data: containersData } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];

  const startMutation = useMutation({
    mutationFn: startContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const handleToggleService = async (
    e: React.MouseEvent,
    containerNames: string[],
    isRunning: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Add all containers to pending state
    setPendingContainers((prev) => {
      const next = new Set(prev);
      containerNames.forEach((name) => next.add(name));
      return next;
    });

    try {
      // Start/stop all containers in parallel
      if (isRunning) {
        await Promise.all(
          containerNames.map((name) => stopMutation.mutateAsync(name).catch(() => {}))
        );
      } else {
        // Start containers sequentially to respect dependencies
        for (const name of containerNames) {
          try {
            await startMutation.mutateAsync(name);
          } catch {
            console.error(`Failed to start ${name}`);
          }
        }
      }
    } finally {
      setPendingContainers((prev) => {
        const next = new Set(prev);
        containerNames.forEach((name) => next.delete(name));
        return next;
      });
    }
  };

  const appsList = apps.filter((app) => app.category === "app");
  const explorersList = apps.filter((app) => app.category === "explorer");
  const networkingList = apps.filter((app) => app.category === "networking");
  const coreList = apps.filter((app) => app.category === "core");

  const getAppStatusInfo = (appContainers: string[]) => {
    const status = getAppStatus(
      appContainers,
      containers.map((c) => ({ name: c.name, state: c.state }))
    );
    return {
      status,
      isRunning: status === "running" || status === "partial",
      color: status === "running" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-slate-500",
    };
  };

  // Status control button component with its own hover state
  const StatusControl = ({
    containerNames,
    isRunning,
    color,
    isPending,
  }: {
    containerNames: string[];
    isRunning: boolean;
    color: string;
    isPending: boolean;
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (isPending) {
      return (
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div
        className="relative w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => handleToggleService(e, containerNames, isRunning)}
        title={isRunning ? "Stop Service" : "Start Service"}
      >
        {/* Status dot - visible by default, hidden on hover */}
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-150",
            color,
            isHovered && "opacity-0 scale-0"
          )}
        />
        {/* Play/Pause button - hidden by default, visible on hover */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-150",
            isRunning ? "text-destructive" : "text-success",
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
        >
          {isRunning ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </div>
      </div>
    );
  };

  const renderServiceItem = (app: typeof apps[0]) => {
    const Icon = iconMap[app.icon] || Server;
    const hasExternalUrl = !!app.url;
    const hasInternalUrl = !!app.internalUrl;
    const mainContainer = app.containers[0];
    const { isRunning, color } = getAppStatusInfo(app.containers);
    // Check if any container of this app is pending
    const isPending = app.containers.some((c) => pendingContainers.has(c));
    // Check if this app is currently active in iframe
    const isActiveInIframe = currentAppId === app.id;

    const content = (
      <>
        {/* Status indicator with hover control */}
        <StatusControl
          containerNames={app.containers}
          isRunning={isRunning}
          color={color}
          isPending={isPending}
        />
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">{app.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLogsContainer(mainContainer);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="View Logs"
          >
            <ScrollText className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTerminalContainer(mainContainer);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Open Terminal"
          >
            <SquareTerminal className="w-3 h-3" />
          </button>
        </div>
      </>
    );

    // Internal dashboard link
    if (hasInternalUrl) {
      return (
        <Link
          key={app.id}
          href={app.internalUrl!}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
        >
          {content}
        </Link>
      );
    }

    // External app/explorer - use iframe view with query param
    if (hasExternalUrl) {
      return (
        <Link
          key={app.id}
          href={`/?app=${app.id}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors group",
            isActiveInIframe
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {content}
        </Link>
      );
    }

    return (
      <div
        key={app.id}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/60 cursor-default group"
      >
        {content}
      </div>
    );
  };

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="p-4 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Anchor className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">ANCHOR OS</h1>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">beta</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Menu */}
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            {t("sidebar.menu")}
          </p>
          {navigation.map((item) => {
            // Dashboard is active when pathname is "/" AND no app is selected in iframe
            const isActive = item.href === "/" 
              ? pathname === "/" && !currentAppId
              : pathname === item.href;
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {t(item.nameKey)}
              </Link>
            );
          })}

          {/* Apps */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <AppWindow className="w-3 h-3" />
              {t("sidebar.apps")}
            </p>
            {appsList.map(renderServiceItem)}
          </div>

          {/* Explorers */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Search className="w-3 h-3" />
              {t("sidebar.explorers")}
            </p>
            {explorersList.map(renderServiceItem)}
          </div>

          {/* Networking */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Network className="w-3 h-3" />
              {t("sidebar.networking")}
            </p>
            {networkingList.map(renderServiceItem)}
          </div>

          {/* Kernel */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Server className="w-3 h-3" />
              {t("sidebar.kernel")}
            </p>
            {coreList.map(renderServiceItem)}
          </div>
        </nav>
      </aside>

      {/* Logs Modal */}
      <LogsModal
        containerName={logsContainer}
        onClose={() => setLogsContainer(null)}
      />

      {/* Terminal Modal */}
      <TerminalModal
        containerName={terminalContainer}
        onClose={() => setTerminalContainer(null)}
      />
    </>
  );
}
