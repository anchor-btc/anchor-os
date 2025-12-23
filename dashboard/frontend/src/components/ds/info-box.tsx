"use client";

import * as React from "react";
import { LucideIcon, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type InfoBoxVariant = "info" | "warning" | "success" | "error";

const variantClasses: Record<InfoBoxVariant, { container: string; icon: string }> = {
  info: {
    container: "bg-primary/5 border-primary/20",
    icon: "text-primary",
  },
  warning: {
    container: "bg-warning/10 border-warning/20",
    icon: "text-warning",
  },
  success: {
    container: "bg-success/10 border-success/20",
    icon: "text-success",
  },
  error: {
    container: "bg-error/10 border-error/20",
    icon: "text-error",
  },
};

const defaultIcons: Record<InfoBoxVariant, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
};

export interface InfoBoxProps {
  /** Variant determines styling */
  variant?: InfoBoxVariant;
  /** Custom icon (defaults to variant-specific icon) */
  icon?: LucideIcon;
  /** Title text */
  title?: string;
  /** Content/description */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * InfoBox - Alert/info banners with semantic variants.
 *
 * @example
 * ```tsx
 * <InfoBox variant="info" icon={Star} title="Default Server">
 *   Dependent services use the default server.
 * </InfoBox>
 *
 * <InfoBox variant="warning" title="Caution">
 *   This action cannot be undone.
 * </InfoBox>
 * ```
 */
export function InfoBox({
  variant = "info",
  icon,
  title,
  children,
  className,
}: InfoBoxProps) {
  const classes = variantClasses[variant];
  const Icon = icon || defaultIcons[variant];

  return (
    <div
      className={cn(
        "border rounded-xl p-4",
        classes.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", classes.icon)} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-medium text-foreground">{title}</p>
          )}
          {children && (
            <div className="text-sm text-muted-foreground">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

