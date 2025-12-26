'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  CheckCheck,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from '@/lib/api';

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  success: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  const config = severityConfig[notification.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50',
        !notification.read && 'bg-primary/5'
      )}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      <div className={cn('p-1.5 rounded-lg shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              notification.read ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.message}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Ensure we're on the client for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  // Fetch notifications when dropdown is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const unreadCount = unreadData?.count ?? 0;
  const notifications = notificationsData?.notifications ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title={t('notifications.title', 'Notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - rendered via portal to ensure it's above everything */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed left-64 top-14 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ zIndex: 99999 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-secondary">
              <h3 className="text-sm font-semibold text-foreground">
                {t('notifications.title', 'Notifications')}
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title={t('notifications.markAllRead', 'Mark all as read')}
                  >
                    {markAllReadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">{t('notifications.empty', 'No notifications')}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {notifications.slice(0, 10).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border bg-secondary">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('notifications.viewAll', 'View all notifications')}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
