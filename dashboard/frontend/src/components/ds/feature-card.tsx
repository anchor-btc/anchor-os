'use client';

import * as React from 'react';
import { LucideIcon, CheckCircle2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dsColors, type DSColor } from './colors';

export interface FeatureCardProps {
  /** The icon to display */
  icon: LucideIcon;
  /** Color variant */
  color?: DSColor;
  /** Card title */
  title: string;
  /** Status text (e.g., "running", "stopped") */
  subtitle?: string;
  /** Description text */
  description?: string;
  /** Whether this card is active/selected/default */
  isActive?: boolean;
  /** Badge text to show when active */
  badge?: string;
  /** Whether the service is running (shows activity indicator) */
  isRunning?: boolean;
  /** Port or additional info */
  info?: string;
  /** Actions to render at the bottom */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Click handler for the entire card */
  onClick?: () => void;
}

/**
 * FeatureCard - Highlighted card with color accent for feature sections.
 *
 * Inspired by the ServerCard pattern in the Electrum page.
 *
 * @example
 * ```tsx
 * <FeatureCard
 *   icon={Zap}
 *   color="yellow"
 *   title="Electrs"
 *   subtitle="running"
 *   description="Lightweight, fast sync, lower resource usage"
 *   isActive={isDefault}
 *   badge="Default"
 *   isRunning={true}
 *   info="Port 50001"
 *   actions={
 *     <>
 *       <ActionButton variant="stop" onClick={handleStop} />
 *       <ActionButton variant="start" onClick={handleSetDefault} label="Set Default" />
 *     </>
 *   }
 * />
 * ```
 */
export function FeatureCard({
  icon: Icon,
  color = 'primary',
  title,
  subtitle,
  description,
  isActive = false,
  badge,
  isRunning = false,
  info,
  actions,
  className,
  onClick,
}: FeatureCardProps) {
  const colorClasses = dsColors[color];

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all',
        isActive ? `${colorClasses.bg} ${colorClasses.border}` : 'bg-card border-border',
        onClick && 'cursor-pointer hover:border-border/80',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon container */}
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                isActive ? `${colorClasses.bg}` : 'bg-muted'
              )}
            >
              <Icon
                className={cn('w-6 h-6', isActive ? colorClasses.text : 'text-muted-foreground')}
              />
            </div>

            {/* Title and status */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground">{title}</h3>
                {isActive && badge && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      colorClasses.bg,
                      colorClasses.text
                    )}
                  >
                    {badge}
                  </span>
                )}
              </div>

              {/* Status and info */}
              <div className="flex items-center gap-2">
                {subtitle && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      isRunning ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {isRunning && <Activity className="w-3 h-3 animate-pulse" />}
                    {subtitle}
                  </span>
                )}
                {info && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{info}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active checkmark */}
          {isActive && <CheckCircle2 className={cn('w-5 h-5', colorClasses.text)} />}
        </div>

        {/* Description */}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {/* Actions */}
      {actions && <div className="px-6 pb-6 flex gap-2">{actions}</div>}
    </div>
  );
}
