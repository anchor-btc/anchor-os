"use client";

import * as React from "react";
import { Play, Square, RotateCw, RefreshCw, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionVariant = "start" | "stop" | "restart" | "refresh" | "primary" | "secondary" | "destructive";

const variantConfig: Record<
  ActionVariant,
  {
    icon?: React.ElementType;
    label: string;
    className: string;
    loadingLabel?: string;
  }
> = {
  start: {
    icon: Play,
    label: "Start",
    className: "bg-success/10 hover:bg-success/20 text-success",
  },
  stop: {
    icon: Square,
    label: "Stop",
    className: "bg-muted hover:bg-error/20 text-muted-foreground hover:text-error",
  },
  restart: {
    icon: RotateCw,
    label: "Restart",
    className: "bg-muted hover:bg-warning/20 text-muted-foreground hover:text-warning",
  },
  refresh: {
    icon: RefreshCw,
    label: "Refresh",
    className: "bg-muted hover:bg-muted/80 text-muted-foreground",
  },
  primary: {
    label: "Submit",
    className: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  secondary: {
    label: "Cancel",
    className: "bg-muted hover:bg-muted/80 text-foreground",
  },
  destructive: {
    label: "Delete",
    className: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
};

export interface ActionButtonProps {
  /** Action variant determines icon and styling */
  variant: ActionVariant;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Show label text */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Custom icon */
  icon?: LucideIcon;
  /** Additional class names */
  className?: string;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * ActionButton - Semantic action buttons for start/stop/restart operations.
 *
 * @example
 * ```tsx
 * <ActionButton variant="start" loading={loading} onClick={handleStart} />
 * <ActionButton variant="stop" showLabel onClick={handleStop} />
 * ```
 */
export function ActionButton({
  variant,
  loading = false,
  onClick,
  disabled = false,
  showLabel = true,
  label,
  icon: CustomIcon,
  className,
  fullWidth = false,
}: ActionButtonProps) {
  const config = variantConfig[variant];
  const Icon = CustomIcon || config.icon;
  const displayLabel = label || config.label;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
        config.className,
        fullWidth && "flex-1",
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      {showLabel && displayLabel}
    </button>
  );
}

export interface RefreshButtonProps {
  /** Loading/refreshing state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * RefreshButton - Simple refresh icon button for page headers.
 *
 * @example
 * ```tsx
 * <RefreshButton loading={isRefetching} onClick={() => refetch()} />
 * ```
 */
export function RefreshButton({
  loading = false,
  onClick,
  disabled = false,
  className,
}: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50",
        className
      )}
    >
      <RefreshCw
        className={cn(
          "w-4 h-4 text-muted-foreground",
          loading && "animate-spin"
        )}
      />
    </button>
  );
}

