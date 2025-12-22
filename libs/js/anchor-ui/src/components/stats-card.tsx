"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { LucideIcon } from "lucide-react";

export interface StatItem {
  /** The icon to display */
  icon: LucideIcon;
  /** The value to display (number or string) */
  value: string | number;
  /** The label below the value */
  label: string;
  /** Icon color class (e.g., "text-orange-400") */
  color?: string;
  /** Background color class for icon container (e.g., "bg-orange-400/20") */
  bgColor?: string;
}

export interface StatsGridProps {
  /** Array of stat items to display */
  items: StatItem[];
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number;
    md?: number;
    lg?: number;
  };
  /** Loading state - shows skeleton */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * StatsGrid - A grid of statistic cards for displaying metrics.
 * Based on Anchor Domains design pattern.
 *
 * @example
 * ```tsx
 * <StatsGrid
 *   items={[
 *     { icon: Globe, value: 18, label: "Domains", color: "text-orange-400", bgColor: "bg-orange-400/20" },
 *     { icon: Database, value: 18, label: "DNS Records", color: "text-blue-400", bgColor: "bg-blue-400/20" },
 *     { icon: Blocks, value: 2050, label: "Block Height", color: "text-green-400", bgColor: "bg-green-400/20" },
 *   ]}
 *   columns={{ default: 2, md: 4 }}
 * />
 * ```
 */
export function StatsGrid({
  items,
  columns = { default: 2, md: 4 },
  isLoading = false,
  className,
}: StatsGridProps) {
  const gridCols = cn(
    columns.default === 2 && "grid-cols-2",
    columns.default === 3 && "grid-cols-3",
    columns.default === 4 && "grid-cols-4",
    columns.md === 3 && "md:grid-cols-3",
    columns.md === 4 && "md:grid-cols-4",
    columns.md === 6 && "md:grid-cols-6",
    columns.lg === 4 && "lg:grid-cols-4",
    columns.lg === 6 && "lg:grid-cols-6"
  );

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", gridCols, className)}>
        {[...Array(items.length || 4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 animate-pulse"
          >
            <div className="h-8 w-8 bg-slate-700 rounded-lg mb-2" />
            <div className="h-6 w-16 bg-slate-700 rounded mb-1" />
            <div className="h-4 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridCols, className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-4"
          >
            <div
              className={cn(
                "p-2 rounded-lg w-fit mb-2",
                item.bgColor || "bg-slate-700/50"
              )}
            >
              <Icon className={cn("h-5 w-5", item.color || "text-slate-400")} />
            </div>
            <p className="text-2xl font-bold text-white">
              {typeof item.value === "number"
                ? item.value.toLocaleString()
                : item.value}
            </p>
            <p className="text-sm text-slate-400">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export interface StatCardProps {
  /** The icon to display */
  icon: LucideIcon;
  /** The value to display (number or string) */
  value: string | number;
  /** The label below the value */
  label: string;
  /** Icon color class (e.g., "text-orange-400") */
  color?: string;
  /** Background color class for icon container (e.g., "bg-orange-400/20") */
  bgColor?: string;
  /** Additional class names */
  className?: string;
}

/**
 * StatCard - A single statistic card for displaying a metric.
 *
 * @example
 * ```tsx
 * <StatCard
 *   icon={Globe}
 *   value={18}
 *   label="Domains"
 *   color="text-orange-400"
 *   bgColor="bg-orange-400/20"
 * />
 * ```
 */
export function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-slate-800/50 rounded-xl border border-slate-700 p-4",
        className
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg w-fit mb-2",
          bgColor || "bg-slate-700/50"
        )}
      >
        <Icon className={cn("h-5 w-5", color || "text-slate-400")} />
      </div>
      <p className="text-2xl font-bold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export default StatsGrid;

