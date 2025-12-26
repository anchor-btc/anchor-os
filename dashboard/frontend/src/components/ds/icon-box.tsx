'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dsColors, type DSColor } from './colors';

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
} as const;

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
} as const;

export type IconBoxSize = keyof typeof sizeClasses;

export interface IconBoxProps {
  /** The Lucide icon to display */
  icon: LucideIcon;
  /** Color variant */
  color?: DSColor;
  /** Size variant */
  size?: IconBoxSize;
  /** Additional class names */
  className?: string;
  /** Whether the icon should be rendered as active/highlighted */
  active?: boolean;
}

/**
 * IconBox - Colored icon container with consistent styling.
 *
 * @example
 * ```tsx
 * <IconBox icon={Zap} color="yellow" size="md" />
 * <IconBox icon={Database} color="blue" size="lg" active />
 * ```
 */
export function IconBox({
  icon: Icon,
  color = 'muted',
  size = 'md',
  className,
  active = true,
}: IconBoxProps) {
  const colorClasses = dsColors[color];

  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center',
        sizeClasses[size],
        active ? colorClasses.bg : 'bg-muted',
        className
      )}
    >
      <Icon
        className={cn(iconSizeClasses[size], active ? colorClasses.text : 'text-muted-foreground')}
      />
    </div>
  );
}
