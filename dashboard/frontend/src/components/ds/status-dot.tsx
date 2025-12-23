"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "running" | "stopped" | "restarting" | "warning" | "unknown";

const statusClasses: Record<StatusVariant, string> = {
  running: "status-running",
  stopped: "status-stopped",
  restarting: "status-restarting",
  warning: "bg-warning",
  unknown: "bg-muted-foreground/30",
};

const statusTextClasses: Record<StatusVariant, string> = {
  running: "text-success",
  stopped: "text-error",
  restarting: "text-warning",
  warning: "text-warning",
  unknown: "text-muted-foreground",
};

const statusLabels: Record<StatusVariant, string> = {
  running: "Running",
  stopped: "Stopped",
  restarting: "Restarting",
  warning: "Warning",
  unknown: "Unknown",
};

export interface StatusDotProps {
  /** Status variant */
  status: StatusVariant;
  /** Optional label to display next to the dot */
  label?: string | boolean;
  /** Size of the dot */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
} as const;

/**
 * StatusDot - Status indicator with optional label.
 *
 * @example
 * ```tsx
 * <StatusDot status="running" />
 * <StatusDot status="running" label="Running" />
 * <StatusDot status="stopped" label />  // Uses default label
 * ```
 */
export function StatusDot({
  status,
  label,
  size = "md",
  className,
}: StatusDotProps) {
  const showLabel = label === true || typeof label === "string";
  const labelText = typeof label === "string" ? label : statusLabels[status];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full shrink-0",
          sizeClasses[size],
          statusClasses[status]
        )}
      />
      {showLabel && (
        <span className={cn("text-sm", statusTextClasses[status])}>
          {labelText}
        </span>
      )}
    </div>
  );
}

/**
 * Helper to convert container state to StatusVariant
 */
export function getStatusVariant(state?: string): StatusVariant {
  switch (state) {
    case "running":
      return "running";
    case "restarting":
      return "restarting";
    case "exited":
    case "stopped":
    case "dead":
      return "stopped";
    default:
      return "unknown";
  }
}

