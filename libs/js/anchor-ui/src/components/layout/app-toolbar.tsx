'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AppToolbarProps {
  /**
   * Toolbar content (buttons, controls, etc.)
   */
  children: React.ReactNode;
  /**
   * Position of the toolbar
   */
  position?: 'top' | 'bottom';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppToolbar - Horizontal toolbar component for fullscreen apps.
 *
 * Features:
 * - Glassmorphism styling with subtle border
 * - Configurable position (top/bottom of content area)
 * - Flexible content layout
 *
 * @example
 * ```tsx
 * <AppToolbar position="top">
 *   <ToolButton icon={Brush} active />
 *   <ToolButton icon={Eraser} />
 *   <Separator />
 *   <ZoomControls />
 * </AppToolbar>
 * ```
 */
export function AppToolbar({ children, position = 'top', className }: AppToolbarProps) {
  return (
    <div
      className={cn(
        'px-4 py-3',
        'bg-white/[0.02] backdrop-blur-sm',
        position === 'top' ? 'border-b border-white/[0.06]' : 'border-t border-white/[0.06]',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * AppToolbarGroup - Groups related toolbar items together.
 */
export interface AppToolbarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function AppToolbarGroup({ children, className }: AppToolbarGroupProps) {
  return <div className={cn('flex items-center gap-1', className)}>{children}</div>;
}

/**
 * AppToolbarSeparator - Visual separator between toolbar groups.
 */
export function AppToolbarSeparator() {
  return <div className="w-px h-6 bg-white/10 mx-2" />;
}

/**
 * AppToolbarButton - Button for toolbar actions.
 */
export interface AppToolbarButtonProps {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

export function AppToolbarButton({
  children,
  active = false,
  disabled = false,
  onClick,
  title,
  className,
}: AppToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-lg',
        'transition-all duration-150',
        'text-white/60 hover:text-white',
        active ? 'bg-app-accent/20 text-app-accent' : 'hover:bg-white/[0.08]',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}
