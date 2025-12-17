"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Anchor,
  LayoutDashboard,
  Bitcoin,
  Wallet,
  ExternalLink,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apps, getAppStatus } from "@/lib/apps";
import { fetchContainers } from "@/lib/api";
import { LogsModal } from "./logs-modal";
import { TerminalModal } from "./terminal-modal";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Services", href: "/apps", icon: AppWindow },
  { name: "Testnet Control", href: "/testnet", icon: Zap },
  { name: "Bitcoin Node", href: "/node", icon: Bitcoin },
  { name: "Wallet", href: "/wallet", icon: Wallet },
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
};

export function Sidebar() {
  const pathname = usePathname();
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [terminalContainer, setTerminalContainer] = useState<string | null>(null);

  const { data: containersData } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];

  const appsList = apps.filter((app) => app.category === "app");
  const explorersList = apps.filter((app) => app.category === "explorer");
  const networkingList = apps.filter((app) => app.category === "networking");
  const coreList = apps.filter((app) => app.category === "core");

  const getStatusColor = (appContainers: string[]) => {
    const status = getAppStatus(
      appContainers,
      containers.map((c) => ({ name: c.name, state: c.state }))
    );
    if (status === "running") return "bg-success";
    if (status === "partial") return "bg-warning";
    return "bg-slate-500"; // Gray dot for stopped services
  };

  const renderServiceItem = (app: typeof apps[0]) => {
    const Icon = iconMap[app.icon] || Server;
    const hasExternalUrl = !!app.url;
    const hasInternalUrl = !!app.internalUrl;
    const statusColor = getStatusColor(app.containers);
    const mainContainer = app.containers[0];

    const content = (
      <>
        <div className={cn("w-2 h-2 rounded-full shrink-0", statusColor)} />
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
          {hasExternalUrl && <ExternalLink className="w-3 h-3" />}
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

    // External link
    if (hasExternalUrl) {
      return (
        <a
          key={app.id}
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
        >
          {content}
        </a>
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
              <h1 className="font-bold text-lg text-foreground">ANCHOR</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Menu */}
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Menu
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}

          {/* Apps */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <AppWindow className="w-3 h-3" />
              Apps
            </p>
            {appsList.map(renderServiceItem)}
          </div>

          {/* Explorers */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Search className="w-3 h-3" />
              Explorers
            </p>
            {explorersList.map(renderServiceItem)}
          </div>

          {/* Networking */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Network className="w-3 h-3" />
              Networking
            </p>
            {networkingList.map(renderServiceItem)}
          </div>

          {/* Core */}
          <div className="pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
              <Server className="w-3 h-3" />
              Core
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
