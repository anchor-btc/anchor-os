"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox } from "./icon-box";
import { dsColors, type DSColor } from "./colors";

export interface StatCardProps {
  /** The Lucide icon to display */
  icon: LucideIcon;
  /** The value to display (number or string) */
  value: string | number;
  /** The label below the value */
  label: string;
  /** Color variant */
  color?: DSColor;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * StatCard - A single metric display card.
 *
 * @example
 * ```tsx
 * <StatCard icon={Blocks} value={5423} label="Total Blocks" color="orange" />
 * ```
 */
export function StatCard({
  icon,
  value,
  label,
  color = "primary",
  isLoading = false,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-xl p-5 relative overflow-hidden",
          className
        )}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-muted/30 to-transparent" />
        <div className="h-10 w-10 bg-muted rounded-lg mb-3" />
        <div className="h-8 w-20 bg-muted rounded-lg mb-2" />
        <div className="h-4 w-16 bg-muted/60 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-5",
        "transition-colors duration-200",
        "hover:border-border/80",
        className
      )}
    >
      <IconBox icon={icon} color={color} size="md" className="mb-3" />
      <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export interface StatGridProps {
  /** Array of stat items to display */
  items: Array<{
    icon: LucideIcon;
    value: string | number;
    label: string;
    color?: DSColor;
  }>;
  /** Number of columns on different breakpoints */
  columns?: {
    default?: 1 | 2 | 3 | 4;
    sm?: 1 | 2 | 3 | 4;
    md?: 2 | 3 | 4 | 6;
    lg?: 3 | 4 | 6;
  };
  /** Loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-6",
} as const;

/**
 * StatGrid - Grid of metric cards with responsive columns.
 *
 * @example
 * ```tsx
 * <StatGrid
 *   items={[
 *     { icon: Globe, value: 18, label: "Domains", color: "orange" },
 *     { icon: Database, value: 18, label: "Records", color: "blue" },
 *   ]}
 *   columns={{ default: 2, md: 4 }}
 * />
 * ```
 */
export function StatGrid({
  items,
  columns = { default: 2, md: 4 },
  isLoading = false,
  className,
}: StatGridProps) {
  const gridCols = cn(
    columns.default && columnClasses[columns.default],
    columns.sm && `sm:${columnClasses[columns.sm]}`,
    columns.md && `md:${columnClasses[columns.md]}`,
    columns.lg && `lg:${columnClasses[columns.lg]}`
  );

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {items.map((item, index) => (
        <StatCard
          key={index}
          icon={item.icon}
          value={item.value}
          label={item.label}
          color={item.color}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

