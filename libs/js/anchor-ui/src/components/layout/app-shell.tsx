"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppShellProps {
  /**
   * Main content of the application
   */
  children: React.ReactNode;
  /**
   * Header component to render at the top
   */
  header: React.ReactNode;
  /**
   * Optional footer component to render at the bottom
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes for the shell container
   */
  className?: string;
}

/**
 * AppShell - Main layout wrapper for Anchor applications.
 * Provides consistent page structure with header, main content, and footer.
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<Header />}
 *   footer={<Footer appName="Threads" appIcon={Anchor} accentColor="orange" />}
 * >
 *   <AppMain>{children}</AppMain>
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  header,
  footer,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}


import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppShellProps {
  /**
   * Main content of the application
   */
  children: React.ReactNode;
  /**
   * Header component to render at the top
   */
  header: React.ReactNode;
  /**
   * Optional footer component to render at the bottom
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes for the shell container
   */
  className?: string;
}

/**
 * AppShell - Main layout wrapper for Anchor applications.
 * Provides consistent page structure with header, main content, and footer.
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<Header />}
 *   footer={<Footer appName="Threads" appIcon={Anchor} accentColor="orange" />}
 * >
 *   <AppMain>{children}</AppMain>
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  header,
  footer,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}


import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppShellProps {
  /**
   * Main content of the application
   */
  children: React.ReactNode;
  /**
   * Header component to render at the top
   */
  header: React.ReactNode;
  /**
   * Optional footer component to render at the bottom
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes for the shell container
   */
  className?: string;
}

/**
 * AppShell - Main layout wrapper for Anchor applications.
 * Provides consistent page structure with header, main content, and footer.
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<Header />}
 *   footer={<Footer appName="Threads" appIcon={Anchor} accentColor="orange" />}
 * >
 *   <AppMain>{children}</AppMain>
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  header,
  footer,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}


import * as React from "react";
import { cn } from "../../utils/cn";

export interface AppShellProps {
  /**
   * Main content of the application
   */
  children: React.ReactNode;
  /**
   * Header component to render at the top
   */
  header: React.ReactNode;
  /**
   * Optional footer component to render at the bottom
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes for the shell container
   */
  className?: string;
}

/**
 * AppShell - Main layout wrapper for Anchor applications.
 * Provides consistent page structure with header, main content, and footer.
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<Header />}
 *   footer={<Footer appName="Threads" appIcon={Anchor} accentColor="orange" />}
 * >
 *   <AppMain>{children}</AppMain>
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  header,
  footer,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}

