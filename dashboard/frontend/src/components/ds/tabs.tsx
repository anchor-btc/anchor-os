'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TabsProps {
  /** Currently active tab value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Tab items */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Style variant */
  variant?: 'pills' | 'underline';
}

/**
 * Tabs - Tab navigation container.
 *
 * @example
 * ```tsx
 * <Tabs value={activeTab} onChange={setActiveTab}>
 *   <Tab value="transactions" icon={ArrowDownLeft}>Transactions</Tab>
 *   <Tab value="utxos" icon={Coins}>UTXOs</Tab>
 *   <Tab value="assets" icon={Gem}>Assets</Tab>
 * </Tabs>
 * ```
 */
export function Tabs({ value, onChange, children, className, variant = 'pills' }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1',
        variant === 'pills' && 'bg-muted/50 p-1 rounded-lg',
        variant === 'underline' && 'border-b border-border',
        className
      )}
      role="tablist"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<TabProps>(child)) {
          return React.cloneElement(child, {
            isActive: child.props.value === value,
            onClick: () => onChange(child.props.value),
            variant,
          });
        }
        return child;
      })}
    </div>
  );
}

export interface TabProps {
  /** Tab value (used for selection) */
  value: string;
  /** Tab label */
  children: React.ReactNode;
  /** Optional icon */
  icon?: LucideIcon;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Internal: Whether this tab is active (set by Tabs parent) */
  isActive?: boolean;
  /** Internal: Click handler (set by Tabs parent) */
  onClick?: () => void;
  /** Internal: Variant (set by Tabs parent) */
  variant?: 'pills' | 'underline';
}

/**
 * Tab - Individual tab button within Tabs.
 */
export function Tab({
  children,
  icon: Icon,
  disabled = false,
  className,
  isActive = false,
  onClick,
  variant = 'pills',
}: TabProps) {
  const pillsClasses = cn(
    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
    isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  const underlineClasses = cn(
    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
    isActive
      ? 'border-primary text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(variant === 'pills' ? pillsClasses : underlineClasses, className)}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
