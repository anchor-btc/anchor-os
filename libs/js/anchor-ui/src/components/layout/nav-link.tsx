"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { type AccentColor } from "./app-logo";

const accentActiveColors = {
  orange: "bg-orange-500/20 text-orange-500",
  emerald: "bg-emerald-500/20 text-emerald-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  amber: "bg-amber-500/20 text-amber-400",
  rose: "bg-rose-500/20 text-rose-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
} as const;

export interface NavLinkProps {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link content
   */
  children: React.ReactNode;
  /**
   * Optional icon to display before the label
   */
  icon?: LucideIcon;
  /**
   * Accent color for active state (defaults to primary)
   */
  accentColor?: AccentColor;
  /**
   * Force active state (useful for manual control)
   */
  isActive?: boolean;
  /**
   * Whether this is an external link
   */
  external?: boolean;
  /**
   * Hide label on small screens
   */
  hideOnMobile?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * NavLink - Navigation link with active state detection.
 * Automatically detects active state based on current pathname.
 *
 * @example
 * ```tsx
 * <NavLink href="/threads" icon={MessageSquare} accentColor="orange">
 *   Threads
 * </NavLink>
 *
 * <NavLink href="https://docs.anchor.dev" external>
 *   Docs
 * </NavLink>
 * ```
 */
export function NavLink({
  href,
  children,
  icon: Icon,
  accentColor = "orange",
  isActive: forcedActive,
  external = false,
  hideOnMobile = true,
  className,
}: NavLinkProps) {
  const pathname = usePathname();

  // Determine if link is active
  const isActive = forcedActive ?? (
    href === "/" 
      ? pathname === "/" 
      : pathname?.startsWith(href)
  );

  const activeColor = accentActiveColors[accentColor];

  const linkContent = (
    <>
      {Icon && <Icon className="w-4 h-4" />}
      <span className={cn(hideOnMobile && "hidden sm:inline")}>
        {children}
      </span>
      {external && <ExternalLink className="w-3 h-3 opacity-50" />}
    </>
  );

  const linkClasses = cn(
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
    isActive
      ? activeColor
      : "text-muted-foreground hover:text-foreground hover:bg-muted",
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {linkContent}
      </a>
    );
  }

  return (
    <a href={href} className={linkClasses}>
      {linkContent}
    </a>
  );
}

export { accentActiveColors };


import * as React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { type AccentColor } from "./app-logo";

const accentActiveColors = {
  orange: "bg-orange-500/20 text-orange-500",
  emerald: "bg-emerald-500/20 text-emerald-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  amber: "bg-amber-500/20 text-amber-400",
  rose: "bg-rose-500/20 text-rose-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
} as const;

export interface NavLinkProps {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link content
   */
  children: React.ReactNode;
  /**
   * Optional icon to display before the label
   */
  icon?: LucideIcon;
  /**
   * Accent color for active state (defaults to primary)
   */
  accentColor?: AccentColor;
  /**
   * Force active state (useful for manual control)
   */
  isActive?: boolean;
  /**
   * Whether this is an external link
   */
  external?: boolean;
  /**
   * Hide label on small screens
   */
  hideOnMobile?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * NavLink - Navigation link with active state detection.
 * Automatically detects active state based on current pathname.
 *
 * @example
 * ```tsx
 * <NavLink href="/threads" icon={MessageSquare} accentColor="orange">
 *   Threads
 * </NavLink>
 *
 * <NavLink href="https://docs.anchor.dev" external>
 *   Docs
 * </NavLink>
 * ```
 */
export function NavLink({
  href,
  children,
  icon: Icon,
  accentColor = "orange",
  isActive: forcedActive,
  external = false,
  hideOnMobile = true,
  className,
}: NavLinkProps) {
  const pathname = usePathname();

  // Determine if link is active
  const isActive = forcedActive ?? (
    href === "/" 
      ? pathname === "/" 
      : pathname?.startsWith(href)
  );

  const activeColor = accentActiveColors[accentColor];

  const linkContent = (
    <>
      {Icon && <Icon className="w-4 h-4" />}
      <span className={cn(hideOnMobile && "hidden sm:inline")}>
        {children}
      </span>
      {external && <ExternalLink className="w-3 h-3 opacity-50" />}
    </>
  );

  const linkClasses = cn(
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
    isActive
      ? activeColor
      : "text-muted-foreground hover:text-foreground hover:bg-muted",
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {linkContent}
      </a>
    );
  }

  return (
    <a href={href} className={linkClasses}>
      {linkContent}
    </a>
  );
}

export { accentActiveColors };


import * as React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { type AccentColor } from "./app-logo";

const accentActiveColors = {
  orange: "bg-orange-500/20 text-orange-500",
  emerald: "bg-emerald-500/20 text-emerald-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  amber: "bg-amber-500/20 text-amber-400",
  rose: "bg-rose-500/20 text-rose-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
} as const;

export interface NavLinkProps {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link content
   */
  children: React.ReactNode;
  /**
   * Optional icon to display before the label
   */
  icon?: LucideIcon;
  /**
   * Accent color for active state (defaults to primary)
   */
  accentColor?: AccentColor;
  /**
   * Force active state (useful for manual control)
   */
  isActive?: boolean;
  /**
   * Whether this is an external link
   */
  external?: boolean;
  /**
   * Hide label on small screens
   */
  hideOnMobile?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * NavLink - Navigation link with active state detection.
 * Automatically detects active state based on current pathname.
 *
 * @example
 * ```tsx
 * <NavLink href="/threads" icon={MessageSquare} accentColor="orange">
 *   Threads
 * </NavLink>
 *
 * <NavLink href="https://docs.anchor.dev" external>
 *   Docs
 * </NavLink>
 * ```
 */
export function NavLink({
  href,
  children,
  icon: Icon,
  accentColor = "orange",
  isActive: forcedActive,
  external = false,
  hideOnMobile = true,
  className,
}: NavLinkProps) {
  const pathname = usePathname();

  // Determine if link is active
  const isActive = forcedActive ?? (
    href === "/" 
      ? pathname === "/" 
      : pathname?.startsWith(href)
  );

  const activeColor = accentActiveColors[accentColor];

  const linkContent = (
    <>
      {Icon && <Icon className="w-4 h-4" />}
      <span className={cn(hideOnMobile && "hidden sm:inline")}>
        {children}
      </span>
      {external && <ExternalLink className="w-3 h-3 opacity-50" />}
    </>
  );

  const linkClasses = cn(
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
    isActive
      ? activeColor
      : "text-muted-foreground hover:text-foreground hover:bg-muted",
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {linkContent}
      </a>
    );
  }

  return (
    <a href={href} className={linkClasses}>
      {linkContent}
    </a>
  );
}

export { accentActiveColors };


import * as React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { type AccentColor } from "./app-logo";

const accentActiveColors = {
  orange: "bg-orange-500/20 text-orange-500",
  emerald: "bg-emerald-500/20 text-emerald-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  amber: "bg-amber-500/20 text-amber-400",
  rose: "bg-rose-500/20 text-rose-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
} as const;

export interface NavLinkProps {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link content
   */
  children: React.ReactNode;
  /**
   * Optional icon to display before the label
   */
  icon?: LucideIcon;
  /**
   * Accent color for active state (defaults to primary)
   */
  accentColor?: AccentColor;
  /**
   * Force active state (useful for manual control)
   */
  isActive?: boolean;
  /**
   * Whether this is an external link
   */
  external?: boolean;
  /**
   * Hide label on small screens
   */
  hideOnMobile?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * NavLink - Navigation link with active state detection.
 * Automatically detects active state based on current pathname.
 *
 * @example
 * ```tsx
 * <NavLink href="/threads" icon={MessageSquare} accentColor="orange">
 *   Threads
 * </NavLink>
 *
 * <NavLink href="https://docs.anchor.dev" external>
 *   Docs
 * </NavLink>
 * ```
 */
export function NavLink({
  href,
  children,
  icon: Icon,
  accentColor = "orange",
  isActive: forcedActive,
  external = false,
  hideOnMobile = true,
  className,
}: NavLinkProps) {
  const pathname = usePathname();

  // Determine if link is active
  const isActive = forcedActive ?? (
    href === "/" 
      ? pathname === "/" 
      : pathname?.startsWith(href)
  );

  const activeColor = accentActiveColors[accentColor];

  const linkContent = (
    <>
      {Icon && <Icon className="w-4 h-4" />}
      <span className={cn(hideOnMobile && "hidden sm:inline")}>
        {children}
      </span>
      {external && <ExternalLink className="w-3 h-3 opacity-50" />}
    </>
  );

  const linkClasses = cn(
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
    isActive
      ? activeColor
      : "text-muted-foreground hover:text-foreground hover:bg-muted",
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {linkContent}
      </a>
    );
  }

  return (
    <a href={href} className={linkClasses}>
      {linkContent}
    </a>
  );
}

export { accentActiveColors };

