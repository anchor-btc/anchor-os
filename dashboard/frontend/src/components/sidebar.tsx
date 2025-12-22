"use client";

import { useState, useEffect, memo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  ChevronDown,
  ChevronRight,
  Clock,
  Blocks,
  GripVertical,
  Pencil,
  Check,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apps } from "@/lib/apps";
import { getAppStatus } from "@/lib/apps";
import { fetchContainers, startContainer, stopContainer, fetchUserProfile, fetchInstallationStatus, shutdownAll, restartAll, fetchBlockchainInfo } from "@/lib/api";
import { getServiceIdFromAppId } from "@/lib/service-rules";
import { MultiLogsModal } from "./multi-logs-modal";
import { MultiTerminalModal } from "./multi-terminal-modal";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/contexts/auth-context";
import { SortableItem, SortableCategory } from "./sidebar-sortable";
import { useSidebarOrder, CategoryKey, DEFAULT_CATEGORY_ORDER } from "@/hooks/use-sidebar-order";

// Memoized Clock component - manages its own state to avoid sidebar re-renders
const SidebarClock = memo(function SidebarClock() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Clock className="w-3.5 h-3.5" />
      <span className="font-mono tabular-nums">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
});

// Memoized BlockHeight component - manages its own query to avoid sidebar re-renders
const SidebarBlockHeight = memo(function SidebarBlockHeight() {
  const { data: blockchainInfo } = useQuery({
    queryKey: ["blockchain-info-sidebar"],
    queryFn: fetchBlockchainInfo,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (!blockchainInfo) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Blocks className="w-3.5 h-3.5 text-primary" />
      <span className="font-mono tabular-nums text-foreground font-medium">
        {blockchainInfo.blocks.toLocaleString()}
      </span>
    </div>
  );
});

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

// Default expanded state - all expanded by default
const DEFAULT_EXPANDED: Record<CategoryKey, boolean> = {
  protocol: true,
  apps: true,
  explorers: true,
  networking: true,
  electrum: true,
  storage: true,
  monitoring: true,
};

// Category config with icons and translation keys
const categoryConfig: Record<CategoryKey, { icon: React.ElementType; labelKey: string }> = {
  protocol: { icon: Anchor, labelKey: "sidebar.protocol" },
  apps: { icon: AppWindow, labelKey: "sidebar.apps" },
  explorers: { icon: Search, labelKey: "sidebar.explorers" },
  networking: { icon: Network, labelKey: "sidebar.networking" },
  electrum: { icon: Zap, labelKey: "sidebar.electrum" },
  storage: { icon: Database, labelKey: "sidebar.storage" },
  monitoring: { icon: Activity, labelKey: "sidebar.monitoring" },
};

// Map category keys to app categories
const categoryToAppCategory: Record<CategoryKey, string> = {
  protocol: "anchor",
  apps: "app",
  explorers: "explorer",
  networking: "networking",
  electrum: "electrum",
  storage: "storage",
  monitoring: "monitoring",
};

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentAppId = searchParams.get("app");
  const queryClient = useQueryClient();
  const { isAuthEnabled } = useAuth();
  const [logsContainers, setLogsContainers] = useState<string[] | null>(null);
  const [terminalContainers, setTerminalContainers] = useState<string[] | null>(null);
  const [pendingContainers, setPendingContainers] = useState<Set<string>>(new Set());
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  
  // Collapsed categories state with localStorage persistence
  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryKey, boolean>>(DEFAULT_EXPANDED);
  
  // Sidebar order hook for drag-and-drop
  const {
    categoryOrder,
    setCategoryOrder,
    getSortedItems,
    setItemOrder,
    isEditMode,
    startEdit,
    confirmEdit,
    cancelEdit,
    resetOrder,
    isLoaded: isOrderLoaded,
  } = useSidebarOrder();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("anchor-sidebar-expanded");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExpandedCategories({ ...DEFAULT_EXPANDED, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);
  
  // Toggle category expansion
  const toggleCategory = (category: CategoryKey) => {
    setExpandedCategories((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      localStorage.setItem("anchor-sidebar-expanded", JSON.stringify(next));
      return next;
    });
  };

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

  // Get apps by category, filtered by installation status
  const getAppsForCategory = useCallback((category: CategoryKey) => {
    const appCategory = categoryToAppCategory[category];
    const filtered = apps.filter((app) => app.category === appCategory && isServiceInstalled(app.id));
    return getSortedItems(category, filtered);
  }, [getSortedItems, isServiceInstalled]);

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

  // Collapsible category header component
  const CategoryHeader = ({
    category,
    icon: Icon,
    label,
    count,
  }: {
    category: CategoryKey;
    icon: React.ElementType;
    label: string;
    count: number;
  }) => {
    const isExpanded = expandedCategories[category];
    
    return (
      <button
        onClick={() => !isEditMode && toggleCategory(category)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group",
          isEditMode && "cursor-default"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
          <span className="text-[9px] opacity-60 font-normal">({count})</span>
        </div>
        {!isEditMode && (
          <div className="transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            ) : (
              <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            )}
          </div>
        )}
      </button>
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
        {!isEditMode && (
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
        )}
      </>
    );

    const itemContent = (
      <>
        {/* Internal dashboard link */}
        {hasInternalUrl ? (
          <Link
            href={app.internalUrl!}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            {content}
          </Link>
        ) : hasExternalUrl && app.supportsIframe === false ? (
          /* External app that doesn't support iframe - open in new tab directly */
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            {content}
          </a>
        ) : hasExternalUrl ? (
          /* External app/explorer - use iframe view with query param */
          <Link
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
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/60 cursor-default group"
          >
            {content}
          </div>
        )}
      </>
    );

    return (
      <SortableItem key={app.id} id={app.id} isEditMode={isEditMode}>
        {itemContent}
      </SortableItem>
    );
  };

  // Handle drag end for categories
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categoryOrder.indexOf(active.id as CategoryKey);
      const newIndex = categoryOrder.indexOf(over.id as CategoryKey);
      const newOrder = arrayMove(categoryOrder, oldIndex, newIndex);
      setCategoryOrder(newOrder);
    }
  };

  // Handle drag end for items within a category
  const handleItemDragEnd = (category: CategoryKey) => (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const items = getAppsForCategory(category);
      const itemIds = items.map((item) => item.id);
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      const newOrder = arrayMove(itemIds, oldIndex, newIndex);
      setItemOrder(category, newOrder);
    }
  };

  // Render a category with its items
  const renderCategory = (category: CategoryKey) => {
    const items = getAppsForCategory(category);
    if (items.length === 0) return null;

    const config = categoryConfig[category];
    const isExpanded = expandedCategories[category] || isEditMode;

    return (
      <SortableCategory key={category} id={category} isEditMode={isEditMode}>
        <div className="pt-4">
          <CategoryHeader
            category={category}
            icon={config.icon}
            label={t(config.labelKey)}
            count={items.length}
          />
          {isExpanded && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleItemDragEnd(category)}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-1 space-y-0.5">
                  {items.map(renderServiceItem)}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </SortableCategory>
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
                      {isAuthEnabled && (
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
                      )}
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

          {/* Dynamic Categories with Drag-and-Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categoryOrder}
              strategy={verticalListSortingStrategy}
            >
              {categoryOrder.map(renderCategory)}
            </SortableContext>
          </DndContext>
        </nav>

        {/* Footer - Edit Mode Toggle & Clock & Block Height */}
        <div className="border-t border-border px-4 py-3 shrink-0 bg-muted/30">
          <div className="flex items-center justify-between text-xs">
            {isEditMode ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <button
                    onClick={confirmEdit}
                    className="flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    {t("sidebar.done", "Done")}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground rounded text-[10px] font-medium hover:bg-muted/80 transition-colors"
                  >
                    {t("sidebar.cancel", "Cancel")}
                  </button>
                </div>
                <button
                  onClick={resetOrder}
                  className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground rounded text-[10px] font-medium hover:text-foreground transition-colors"
                  title={t("sidebar.resetOrder", "Reset Order")}
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <SidebarClock />
                <div className="flex items-center gap-3">
                  <button
                    onClick={startEdit}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
                    title={t("sidebar.editOrder", "Edit Order")}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <SidebarBlockHeight />
                </div>
              </>
            )}
          </div>
        </div>
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
