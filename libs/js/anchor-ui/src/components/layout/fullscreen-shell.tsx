'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface FullscreenShellProps {
  /**
   * Header component to render at the top
   */
  header: React.ReactNode;
  /**
   * Optional footer component to render at the bottom
   */
  footer?: React.ReactNode;
  /**
   * Main content - takes up all remaining space
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FullscreenShell - Layout component for fullscreen apps like Canvas and Places.
 *
 * Features:
 * - Takes full viewport height (h-screen)
 * - Fixed header at top
 * - Content area fills remaining space (flex-1)
 * - Optional mini footer at bottom
 * - No vertical scroll on the shell itself
 *
 * @example
 * ```tsx
 * <FullscreenShell
 *   header={<Header />}
 *   footer={<MiniFooter />}
 * >
 *   <Canvas />
 * </FullscreenShell>
 * ```
 */
export function FullscreenShell({ header, footer, children, className }: FullscreenShellProps) {
  return (
    <div className={cn('h-screen flex flex-col overflow-hidden bg-background', className)}>
      {/* Header - fixed height */}
      {header}

      {/* Main content - fills remaining space */}
      <div className="flex-1 flex overflow-hidden">{children}</div>

      {/* Footer - optional, fixed height */}
      {footer}
    </div>
  );
}
