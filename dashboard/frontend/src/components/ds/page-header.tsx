'use client';

import * as React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconBox } from './icon-box';
import { type DSColor } from './colors';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon to display */
  icon?: LucideIcon;
  /** Icon color variant */
  iconColor?: DSColor;
  /** Optional back link URL */
  backHref?: string;
  /** Actions to display on the right side (e.g., RefreshButton) */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Children rendered below the title (optional) */
  children?: React.ReactNode;
}

/**
 * PageHeader - Standardized page title with icon, subtitle, and actions.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   icon={Zap}
 *   iconColor="yellow"
 *   title="Electrum Servers"
 *   subtitle="Manage your Electrum servers"
 *   actions={<RefreshButton onClick={refetch} loading={isRefetching} />}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  backHref,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
        {icon && <IconBox icon={icon} color={iconColor} size="lg" />}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
