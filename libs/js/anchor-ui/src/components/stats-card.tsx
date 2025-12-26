'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { LucideIcon } from 'lucide-react';

// ============================================================================
// APPLE-INSPIRED STATS COMPONENTS
// Clean, static cards with minimal hover effects - no entrance animations
// ============================================================================

// Predefined color configurations
const colorConfigs = {
  orange: {
    icon: 'text-orange-400',
    bg: 'from-orange-500/20 to-orange-600/10',
    ring: 'ring-orange-500/20',
  },
  emerald: {
    icon: 'text-emerald-400',
    bg: 'from-emerald-500/20 to-emerald-600/10',
    ring: 'ring-emerald-500/20',
  },
  blue: {
    icon: 'text-blue-400',
    bg: 'from-blue-500/20 to-blue-600/10',
    ring: 'ring-blue-500/20',
  },
  purple: {
    icon: 'text-purple-400',
    bg: 'from-purple-500/20 to-purple-600/10',
    ring: 'ring-purple-500/20',
  },
  amber: {
    icon: 'text-amber-400',
    bg: 'from-amber-500/20 to-amber-600/10',
    ring: 'ring-amber-500/20',
  },
  green: {
    icon: 'text-green-400',
    bg: 'from-green-500/20 to-green-600/10',
    ring: 'ring-green-500/20',
  },
  red: {
    icon: 'text-red-400',
    bg: 'from-red-500/20 to-red-600/10',
    ring: 'ring-red-500/20',
  },
  cyan: {
    icon: 'text-cyan-400',
    bg: 'from-cyan-500/20 to-cyan-600/10',
    ring: 'ring-cyan-500/20',
  },
  yellow: {
    icon: 'text-yellow-400',
    bg: 'from-yellow-500/20 to-yellow-600/10',
    ring: 'ring-yellow-500/20',
  },
  slate: {
    icon: 'text-slate-400',
    bg: 'from-slate-500/20 to-slate-600/10',
    ring: 'ring-slate-500/20',
  },
} as const;

type ColorKey = keyof typeof colorConfigs;

// Helper to extract color from Tailwind class
function getColorFromClass(colorClass?: string): ColorKey {
  if (!colorClass) return 'slate';

  for (const key of Object.keys(colorConfigs) as ColorKey[]) {
    if (colorClass.includes(key)) return key;
  }
  return 'slate';
}

export interface StatItem {
  /** The icon to display */
  icon: LucideIcon;
  /** The value to display (number or string) */
  value: string | number;
  /** The label below the value */
  label: string;
  /** Icon color class (e.g., "text-orange-400") - used to derive color theme */
  color?: string;
  /** Background color class for icon container - legacy, auto-derived from color */
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
 * StatsGrid - Clean grid of metric cards.
 *
 * Design philosophy:
 * - No entrance animations
 * - Very subtle hover (just background tint)
 * - No glow effects (too distracting for data)
 * - Tabular numbers for aligned values
 *
 * @example
 * ```tsx
 * <StatsGrid
 *   items={[
 *     { icon: Globe, value: 18, label: "Domains", color: "text-orange-400" },
 *     { icon: Database, value: 18, label: "Records", color: "text-blue-400" },
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
    columns.default === 2 && 'grid-cols-2',
    columns.default === 3 && 'grid-cols-3',
    columns.default === 4 && 'grid-cols-4',
    columns.md === 3 && 'md:grid-cols-3',
    columns.md === 4 && 'md:grid-cols-4',
    columns.md === 6 && 'md:grid-cols-6',
    columns.lg === 4 && 'lg:grid-cols-4',
    columns.lg === 6 && 'lg:grid-cols-6'
  );

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridCols, className)}>
        {[...Array(items.length || 4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'bg-white/[0.03] rounded-2xl',
              'border border-white/[0.05]',
              'p-5 relative overflow-hidden'
            )}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

            <div className="h-11 w-11 bg-white/[0.05] rounded-xl mb-3" />
            <div className="h-8 w-20 bg-white/[0.05] rounded-lg mb-2" />
            <div className="h-4 w-16 bg-white/[0.03] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const colorKey = getColorFromClass(item.color);
        const config = colorConfigs[colorKey];

        return (
          <div
            key={index}
            className={cn(
              // Glass card base
              'bg-white/[0.03] rounded-2xl',
              'border border-white/[0.05]',
              'p-5',
              // Very subtle hover - just tint
              'transition-colors duration-200',
              'hover:bg-white/[0.04]'
            )}
          >
            {/* Icon container with gradient bg */}
            <div
              className={cn(
                'w-11 h-11 rounded-xl',
                'bg-gradient-to-br',
                config.bg,
                'flex items-center justify-center mb-3',
                'ring-1',
                config.ring
              )}
            >
              <Icon className={cn('w-5 h-5', config.icon)} />
            </div>

            {/* Value - large, bold, tabular */}
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </p>

            {/* Label - subtle */}
            <p className="text-sm text-slate-500 mt-1">{item.label}</p>
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
  /** Background color class - legacy */
  bgColor?: string;
  /** Additional class names */
  className?: string;
}

/**
 * StatCard - A single clean metric card.
 */
export function StatCard({ icon: Icon, value, label, color, bgColor, className }: StatCardProps) {
  const colorKey = getColorFromClass(color);
  const config = colorConfigs[colorKey];

  return (
    <div
      className={cn(
        // Glass card base
        'bg-white/[0.03] rounded-2xl',
        'border border-white/[0.05]',
        'p-5',
        // Subtle hover
        'transition-colors duration-200',
        'hover:bg-white/[0.04]',
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'w-11 h-11 rounded-xl',
          'bg-gradient-to-br',
          config.bg,
          'flex items-center justify-center mb-3',
          'ring-1',
          config.ring
        )}
      >
        <Icon className={cn('w-5 h-5', config.icon)} />
      </div>

      <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default StatsGrid;
