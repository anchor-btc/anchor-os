import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppMainProps {
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disable default padding
   */
  noPadding?: boolean;
}

/**
 * AppMain - Main content wrapper for Anchor applications.
 * Provides consistent vertical padding and flex-grow behavior.
 *
 * @example
 * ```tsx
 * <AppShell header={<Header />} footer={<Footer />}>
 *   <AppMain>
 *     <Container>
 *       {children}
 *     </Container>
 *   </AppMain>
 * </AppShell>
 * ```
 */
export function AppMain({
  children,
  className,
  noPadding = false,
}: AppMainProps) {
  return (
    <main
      className={cn(
        "flex-1",
        !noPadding && "py-8",
        className
      )}
    >
      {children}
    </main>
  );
}

import { cn } from "../../utils/cn";

export interface AppMainProps {
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disable default padding
   */
  noPadding?: boolean;
}

/**
 * AppMain - Main content wrapper for Anchor applications.
 * Provides consistent vertical padding and flex-grow behavior.
 *
 * @example
 * ```tsx
 * <AppShell header={<Header />} footer={<Footer />}>
 *   <AppMain>
 *     <Container>
 *       {children}
 *     </Container>
 *   </AppMain>
 * </AppShell>
 * ```
 */
export function AppMain({
  children,
  className,
  noPadding = false,
}: AppMainProps) {
  return (
    <main
      className={cn(
        "flex-1",
        !noPadding && "py-8",
        className
      )}
    >
      {children}
    </main>
  );
}

import { cn } from "../../utils/cn";

export interface AppMainProps {
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disable default padding
   */
  noPadding?: boolean;
}

/**
 * AppMain - Main content wrapper for Anchor applications.
 * Provides consistent vertical padding and flex-grow behavior.
 *
 * @example
 * ```tsx
 * <AppShell header={<Header />} footer={<Footer />}>
 *   <AppMain>
 *     <Container>
 *       {children}
 *     </Container>
 *   </AppMain>
 * </AppShell>
 * ```
 */
export function AppMain({
  children,
  className,
  noPadding = false,
}: AppMainProps) {
  return (
    <main
      className={cn(
        "flex-1",
        !noPadding && "py-8",
        className
      )}
    >
      {children}
    </main>
  );
}

import { cn } from "../../utils/cn";

export interface AppMainProps {
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disable default padding
   */
  noPadding?: boolean;
}

/**
 * AppMain - Main content wrapper for Anchor applications.
 * Provides consistent vertical padding and flex-grow behavior.
 *
 * @example
 * ```tsx
 * <AppShell header={<Header />} footer={<Footer />}>
 *   <AppMain>
 *     <Container>
 *       {children}
 *     </Container>
 *   </AppMain>
 * </AppShell>
 * ```
 */
export function AppMain({
  children,
  className,
  noPadding = false,
}: AppMainProps) {
  return (
    <main
      className={cn(
        "flex-1",
        !noPadding && "py-8",
        className
      )}
    >
      {children}
    </main>
  );
}

