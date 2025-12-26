'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface AppBackgroundProps {
  /**
   * Children elements to render inside the background
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppBackground - Standard background wrapper for all Anchor applications.
 * Provides a consistent dark gradient background across all apps.
 *
 * The gradient goes from slate-900 to slate-800 to slate-900, creating
 * a subtle depth effect that works well with all accent colors.
 *
 * @example
 * ```tsx
 * // In your layout.tsx
 * <html lang="en" className="dark">
 *   <AppBackground className="antialiased">
 *     <Providers>
 *       <AppShell header={<Header />} footer={<Footer />}>
 *         <AppMain>{children}</AppMain>
 *       </AppShell>
 *     </Providers>
 *   </AppBackground>
 * </html>
 * ```
 */
export function AppBackground({ children, className }: AppBackgroundProps) {
  return (
    <body
      className={cn(
        'min-h-screen',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
        className
      )}
    >
      {children}
    </body>
  );
}

/**
 * Standard background class string for use in layouts that can't use the component directly.
 * Use this when you need to add font variables or other dynamic classes.
 *
 * @example
 * ```tsx
 * <body className={cn(APP_BACKGROUND_CLASS, fontVariables, "antialiased")}>
 * ```
 */
export const APP_BACKGROUND_CLASS =
  'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
