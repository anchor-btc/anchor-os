'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconBox } from './icon-box';
import { type DSColor } from './colors';

export interface SectionProps {
  /** Section content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Remove default padding */
  noPadding?: boolean;
}

/**
 * Section - Wrapper for content sections with consistent styling.
 *
 * @example
 * ```tsx
 * <Section>
 *   <SectionHeader icon={Link2} iconColor="yellow" title="Connection Info" />
 *   <SectionContent>...</SectionContent>
 * </Section>
 * ```
 */
export function Section({ children, className, noPadding = false }: SectionProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl', !noPadding && 'p-6', className)}>
      {children}
    </div>
  );
}

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description - can be string or JSX */
  subtitle?: React.ReactNode;
  /** Optional icon */
  icon?: LucideIcon;
  /** Icon color variant */
  iconColor?: DSColor;
  /** Actions to display on the right side */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * SectionHeader - Header for a Section with icon, title, and optional actions.
 */
export function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && <IconBox icon={icon} color={iconColor} size="md" />}
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface SectionContentProps {
  /** Content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * SectionContent - Content area within a Section.
 */
export function SectionContent({ children, className }: SectionContentProps) {
  return <div className={cn(className)}>{children}</div>;
}
