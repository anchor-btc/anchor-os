"use client";

import { useState, useEffect, useMemo } from "react";
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
  Layers,
  BookOpen,
  Activity,
  Power,
  RotateCcw,
  Lock,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apps, getAppStatus } from "@/lib/apps";
import { fetchContainers, startContainer, stopContainer, fetchUserProfile, fetchInstallationStatus, shutdownAll, restartAll } from "@/lib/api";
import { getServiceIdFromAppId } from "@/lib/service-rules";
import { MultiLogsModal } from "./multi-logs-modal";
import { MultiTerminalModal } from "./multi-terminal-modal";
import { NotificationBell } from "./notification-bell";

// Dynamic greeting messages based on time of day
function getGreeting(t: (key: string, fallback: string) => string): { greeting: string; emoji: string } {
  const hour = new Date().getHours();
  
  // Time-based greetings
  const morningGreetings = [
    { greeting: t("greetings.goodMorning", "Good morning"), emoji: "☀️" },
    { greeting: t("greetings.riseAndShine", "Rise and shine"), emoji: "🌅" },
    { greeting: t("greetings.topOfTheMorning", "Top of the morning"), emoji: "🌤️" },
    { greeting: t("greetings.freshStart", "Fresh start today"), emoji: "🌱" },
    { greeting: t("greetings.coffeeTime", "Coffee time"), emoji: "☕" },
    { greeting: t("greetings.letsGo", "Let's go"), emoji: "🚀" },
  ];
  
  const afternoonGreetings = [
    { greeting: t("greetings.goodAfternoon", "Good afternoon"), emoji: "🌞" },
    { greeting: t("greetings.hopefullyProductive", "Hope you're productive"), emoji: "💪" },
    { greeting: t("greetings.keepStacking", "Keep stacking"), emoji: "⚡" },
    { greeting: t("greetings.halfwayThere", "Halfway there"), emoji: "🎯" },
    { greeting: t("greetings.keepGoing", "Keep going"), emoji: "💫" },
    { greeting: t("greetings.almostEvening", "Almost evening"), emoji: "🌆" },
  ];
  
  const eveningGreetings = [
    { greeting: t("greetings.goodEvening", "Good evening"), emoji: "🌙" },
    { greeting: t("greetings.eveningVibes", "Evening vibes"), emoji: "✨" },
    { greeting: t("greetings.nightOwl", "Night owl mode"), emoji: "🦉" },
    { greeting: t("greetings.windingDown", "Winding down"), emoji: "🌅" },
    { greeting: t("greetings.relaxMode", "Relax mode"), emoji: "😌" },
    { greeting: t("greetings.eveningShift", "Evening shift"), emoji: "🌃" },
  ];
  
  const lateNightGreetings = [
    { greeting: t("greetings.stillAwake", "Still awake?"), emoji: "🌃" },
    { greeting: t("greetings.burningMidnightOil", "Burning midnight oil"), emoji: "🔥" },
    { greeting: t("greetings.nocturnalCoder", "Nocturnal builder"), emoji: "🛠️" },
    { greeting: t("greetings.lateNightHacking", "Late night hacking"), emoji: "💻" },
    { greeting: t("greetings.sleepIsOverrated", "Sleep is overrated"), emoji: "😴" },
    { greeting: t("greetings.midnightMagic", "Midnight magic"), emoji: "🪄" },
  ];
  
  // Fun Bitcoin-themed greetings (random chance)
  const bitcoinGreetings = [
    { greeting: t("greetings.hodlOn", "HODL on"), emoji: "₿" },
    { greeting: t("greetings.stayHumble", "Stay humble"), emoji: "🙏" },
    { greeting: t("greetings.stackSats", "Stack sats"), emoji: "⚡" },
    { greeting: t("greetings.notYourKeys", "Your keys, your coins"), emoji: "🔐" },
    { greeting: t("greetings.tickTock", "Tick tock"), emoji: "⏰" },
    { greeting: t("greetings.nextBlock", "Next block"), emoji: "🧱" },
    { greeting: t("greetings.verifyDontTrust", "Verify, don't trust"), emoji: "🔍" },
    { greeting: t("greetings.runYourNode", "Run your node"), emoji: "🖥️" },
    { greeting: t("greetings.beYourOwnBank", "Be your own bank"), emoji: "🏦" },
    { greeting: t("greetings.fixTheMoney", "Fix the money"), emoji: "🔧" },
    { greeting: t("greetings.orangePilled", "Orange pilled"), emoji: "🍊" },
    { greeting: t("greetings.toTheMoon", "To the moon"), emoji: "🌕" },
    { greeting: t("greetings.diamondHands", "Diamond hands"), emoji: "💎" },
    { greeting: t("greetings.wagmi", "WAGMI"), emoji: "🤝" },
    { greeting: t("greetings.lfg", "LFG"), emoji: "🔥" },
  ];
  
  // 25% chance of a Bitcoin greeting
  if (Math.random() < 0.25) {
    return bitcoinGreetings[Math.floor(Math.random() * bitcoinGreetings.length)];
  }
  
  let greetings: { greeting: string; emoji: string }[];
  
  if (hour >= 5 && hour < 12) {
    greetings = morningGreetings;
  } else if (hour >= 12 && hour < 18) {
    greetings = afternoonGreetings;
  } else if (hour >= 18 && hour < 23) {
    greetings = eveningGreetings;
  } else {
    greetings = lateNightGreetings;
  }
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

const navigationSections = [
  {
    labelKey: "sidebar.menu",
    items: [
      { nameKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
      { nameKey: "nav.services", href: "/apps", icon: AppWindow },
      { nameKey: "nav.settings", href: "/settings", icon: Settings },
    ],
  },
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
  Layers,
  BookOpen,
  Activity,
};

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentAppId = searchParams.get("app");
  const queryClient = useQueryClient();
  const [logsContainers, setLogsContainers] = useState<string[] | null>(null);
  const [terminalContainers, setTerminalContainers] = useState<string[] | null>(null);
  const [pendingContainers, setPendingContainers] = useState<Set<string>>(new Set());
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  
  // Dynamic greeting - changes on mount and every 30 minutes
  const [greeting, setGreeting] = useState<{ greeting: string; emoji: string }>({ greeting: "", emoji: "" });
  
  useEffect(() => {
    // Set initial greeting
    setGreeting(getGreeting(t));
    
    // Update greeting every 30 minutes
    const interval = setInterval(() => {
      setGreeting(getGreeting(t));
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [t]);

  const { data: containersData } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: installationStatus } = useQuery({
    queryKey: ["installation-status"],
    queryFn: fetchInstallationStatus,
    refetchInterval: 5000, // Sync with apps page
  });

  const containers = containersData?.containers || [];
  const installedServices = installationStatus?.installed_services || [];

  // Check if a service is installed
  const isServiceInstalled = (appId: string): boolean => {
    // If no installation data, show all (backwards compatibility)
    if (!installationStatus || installedServices.length === 0) return true;
    const serviceId = getServiceIdFromAppId(appId);
    return installedServices.includes(serviceId);
  };

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

  const shutdownMutation = useMutation({
    mutationFn: shutdownAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setIsShuttingDown(false);
    },
    onError: () => {
      setIsShuttingDown(false);
    },
  });

  const restartAllMutation = useMutation({
    mutationFn: restartAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setIsRestarting(false);
    },
    onError: () => {
      setIsRestarting(false);
    },
  });

  const handleShutdown = () => {
    if (confirm(t("sidebar.confirmShutdown", "Are you sure you want to shutdown all services?"))) {
      setIsShuttingDown(true);
      shutdownMutation.mutate();
    }
  };

  const handleRestartAll = () => {
    if (confirm(t("sidebar.confirmRestart", "Are you sure you want to restart all services?"))) {
      setIsRestarting(true);
      restartAllMutation.mutate();
    }
  };

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

  // Filter apps by category AND installation status
  const appsList = apps.filter((app) => app.category === "app" && isServiceInstalled(app.id));
  const explorersList = apps.filter((app) => app.category === "explorer" && isServiceInstalled(app.id));
  const networkingList = apps.filter((app) => app.category === "networking" && isServiceInstalled(app.id));
  // New kernel subcategories
  const electrumList = apps.filter((app) => app.category === "electrum" && isServiceInstalled(app.id));
  const anchorList = apps.filter((app) => app.category === "anchor" && isServiceInstalled(app.id));
  const storageList = apps.filter((app) => app.category === "storage" && isServiceInstalled(app.id));
  const monitoringList = apps.filter((app) => app.category === "monitoring" && isServiceInstalled(app.id));

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
              setLogsContainers(app.containers);
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
              setTerminalContainers(app.containers);
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

    // External app that doesn't support iframe - open in new tab directly
    if (hasExternalUrl && app.supportsIframe === false) {
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
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Anchor className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">ANCHOR OS</h1>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">beta</span>
              </div>
            </Link>
            <NotificationBell />
          </div>
        </div>

        {/* User Profile */}
        {userProfile && userProfile.name && (
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <Link href="/settings/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center text-xl overflow-hidden border-2 border-primary/20 ring-2 ring-primary/10 shrink-0">
                  {userProfile.avatar_url?.startsWith("data:") || userProfile.avatar_url?.startsWith("http") ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userProfile.avatar_url || "🧑‍💻"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{greeting.emoji}</span>
                    <span>{greeting.greeting}</span>
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">{userProfile.name}</p>
                </div>
              </Link>
              {/* More Menu */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {moreMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                      <button
                        onClick={() => {
                          localStorage.removeItem("anchor-os-token");
                          window.location.reload();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        {t("sidebar.lock", "Lock")}
                      </button>
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          handleRestartAll();
                        }}
                        disabled={isRestarting || isShuttingDown}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-warning hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {isRestarting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        {t("sidebar.restartAll", "Restart All")}
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          setMoreMenuOpen(false);
                          handleShutdown();
                        }}
                        disabled={isShuttingDown || isRestarting}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        {isShuttingDown ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                        {t("sidebar.shutdown", "Shutdown")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Navigation Sections */}
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.labelKey} className={sectionIndex > 0 ? "pt-4" : ""}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                {t(section.labelKey)}
              </p>
              {section.items.map((item) => {
                // Dashboard is active when pathname is "/" AND no app is selected in iframe
                const isActive = item.href === "/" 
                  ? pathname === "/" && !currentAppId
                  : pathname === item.href;
                
                // Handle external links (like Docs)
                if ('external' in item && item.external && 'externalUrl' in item) {
                  return (
                    <a
                      key={item.nameKey}
                      href={item.externalUrl as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <item.icon className="w-4 h-4" />
                      {t(item.nameKey)}
                    </a>
                  );
                }
                
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
            </div>
          ))}

          {/* Anchor Protocol */}
          {anchorList.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                <Anchor className="w-3 h-3" />
                {t("sidebar.protocol")}
              </p>
              {anchorList.map(renderServiceItem)}
            </div>
          )}

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

          {/* Electrum Servers */}
          {electrumList.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                {t("sidebar.electrum")}
              </p>
              {electrumList.map(renderServiceItem)}
            </div>
          )}

          {/* Storage / Infrastructure */}
          {storageList.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                <Database className="w-3 h-3" />
                {t("sidebar.storage")}
              </p>
              {storageList.map(renderServiceItem)}
            </div>
          )}

          {/* Monitoring */}
          {monitoringList.length > 0 && (
            <div className="pt-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                {t("sidebar.monitoring")}
              </p>
              {monitoringList.map(renderServiceItem)}
            </div>
          )}
        </nav>
      </aside>

      {/* Logs Modal (with tabs for multiple containers) */}
      <MultiLogsModal
        containerNames={logsContainers}
        onClose={() => setLogsContainers(null)}
      />

      {/* Terminal Modal (with tabs for multiple containers) */}
      <MultiTerminalModal
        containerNames={terminalContainers}
        onClose={() => setTerminalContainers(null)}
      />
    </>
  );
}
