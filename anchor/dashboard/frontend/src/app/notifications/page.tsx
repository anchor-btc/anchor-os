"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  Server,
  Wallet,
  HardDrive,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Notification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
} from "@/lib/api";

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

const PAGE_SIZE = 20;

// Severity config
const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  success: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  error: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
};

// Type config
const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
  service: { icon: Server, label: "Service" },
  transaction: { icon: Wallet, label: "Transaction" },
  backup: { icon: HardDrive, label: "Backup" },
  system: { icon: Settings, label: "System" },
};

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Fetch notifications with pagination
async function fetchNotificationsPaginated(
  page: number,
  filters: { type?: string; severity?: string; read?: string }
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", PAGE_SIZE.toString());
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters.read && filters.read !== "all") params.set("read", filters.read);

  const res = await fetch(`${DASHBOARD_BACKEND_URL}/notifications?${params}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const data = await res.json();
  
  return {
    notifications: data.notifications || [],
    total: data.total || 0,
    page,
    hasMore: (data.notifications?.length || 0) === PAGE_SIZE,
  };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [filters, setFilters] = useState({
    type: "all",
    severity: "all",
    read: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["notifications-history", filters],
    queryFn: ({ pageParam = 1 }) => fetchNotificationsPaginated(pageParam, filters),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    refetchInterval: 30000,
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const clearReadMutation = useMutation({
    mutationFn: clearReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
    },
  });

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Flatten all pages
  const allNotifications = data?.pages.flatMap((page) => page.notifications) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ type: "all", severity: "all", read: "all" });
  };

  const hasActiveFilters =
    filters.type !== "all" || filters.severity !== "all" || filters.read !== "all";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("notifications.history", "Notification History")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("notifications.historyDesc", "View and manage all your notifications")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors",
              showFilters || hasActiveFilters
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            <Filter className="w-4 h-4" />
            {t("common.filters", "Filters")}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white" />
            )}
          </button>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            {t("notifications.markAllRead", "Mark all read")}
          </button>
          <button
            onClick={() => clearReadMutation.mutate()}
            disabled={clearReadMutation.isPending}
            className="px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors text-destructive"
          >
            {clearReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t("notifications.clearRead", "Clear read")}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t("notifications.filterNotifications", "Filter Notifications")}
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {t("common.clearFilters", "Clear filters")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t("notifications.type", "Type")}
              </label>
              <div className="relative">
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">{t("common.all", "All")}</option>
                  <option value="service">{t("notifications.typeService", "Service")}</option>
                  <option value="transaction">{t("notifications.typeTransaction", "Transaction")}</option>
                  <option value="backup">{t("notifications.typeBackup", "Backup")}</option>
                  <option value="system">{t("notifications.typeSystem", "System")}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t("notifications.severity", "Severity")}
              </label>
              <div className="relative">
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange("severity", e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">{t("common.all", "All")}</option>
                  <option value="info">{t("notifications.severityInfo", "Info")}</option>
                  <option value="success">{t("notifications.severitySuccess", "Success")}</option>
                  <option value="warning">{t("notifications.severityWarning", "Warning")}</option>
                  <option value="error">{t("notifications.severityError", "Error")}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Read Status Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t("notifications.status", "Status")}
              </label>
              <div className="relative">
                <select
                  value={filters.read}
                  onChange={(e) => handleFilterChange("read", e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">{t("common.all", "All")}</option>
                  <option value="false">{t("notifications.unread", "Unread")}</option>
                  <option value="true">{t("notifications.read", "Read")}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 text-sm text-muted-foreground">
        {t("notifications.showing", "Showing")} {allNotifications.length}{" "}
        {t("common.of", "of")} {totalCount} {t("notifications.notifications", "notifications")}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {t("notifications.noNotifications", "No notifications")}
            </p>
            <p className="text-sm">
              {hasActiveFilters
                ? t("notifications.noNotificationsFiltered", "Try changing your filters")
                : t("notifications.noNotificationsYet", "You're all caught up!")}
            </p>
          </div>
        ) : (
          allNotifications.map((notification) => {
            const config = severityConfig[notification.severity as keyof typeof severityConfig] || severityConfig.info;
            const typeInfo = typeConfig[notification.notification_type] || { icon: Bell, label: notification.notification_type };
            const Icon = config.icon;
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 rounded-xl border transition-all group",
                  notification.read
                    ? "bg-card border-border"
                    : "bg-primary/5 border-primary/20"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Icon */}
                  <div className={cn("p-2.5 rounded-xl shrink-0", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        "font-medium",
                        notification.read ? "text-foreground" : "text-foreground"
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    
                    {notification.message && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {/* Type Badge */}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                      </span>
                      
                      {/* Time */}
                      <span title={formatDate(notification.created_at)}>
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title={t("notifications.markAsRead", "Mark as read")}
                      >
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      title={t("common.delete", "Delete")}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
