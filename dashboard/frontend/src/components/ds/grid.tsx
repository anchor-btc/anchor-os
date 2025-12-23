"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;
export type GridGap = "none" | "sm" | "md" | "lg";

// Static class mappings for Tailwind JIT to detect
const defaultColClasses: Record<GridColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const smColClasses: Record<GridColumns, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

const mdColClasses: Record<GridColumns, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const lgColClasses: Record<GridColumns, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const xlColClasses: Record<GridColumns, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

const gapClasses: Record<GridGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

export interface GridProps {
  /** Grid children */
  children: React.ReactNode;
  /** Column configuration for breakpoints */
  cols?: {
    default?: GridColumns;
    sm?: GridColumns;
    md?: GridColumns;
    lg?: GridColumns;
    xl?: GridColumns;
  };
  /** Gap size */
  gap?: GridGap;
  /** Additional class names */
  className?: string;
}

/**
 * Grid - Standardized responsive grid layouts.
 *
 * @example
 * ```tsx
 * <Grid cols={{ default: 1, md: 2, lg: 4 }} gap="md">
 *   {items.map(item => <Card key={item.id} />)}
 * </Grid>
 * ```
 */
export function Grid({
  children,
  cols = { default: 1, md: 2 },
  gap = "md",
  className,
}: GridProps) {
  const gridCols = cn(
    cols.default && defaultColClasses[cols.default],
    cols.sm && smColClasses[cols.sm],
    cols.md && mdColClasses[cols.md],
    cols.lg && lgColClasses[cols.lg],
    cols.xl && xlColClasses[cols.xl]
  );

  return (
    <div className={cn("grid", gridCols, gapClasses[gap], className)}>
      {children}
    </div>
  );
}

