"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

const headerVariants = {
  transparent: {
    base: "bg-transparent border-transparent",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  solid: {
    base: "bg-background border-border",
    scrolled: "bg-background border-border shadow-sm",
  },
  blur: {
    base: "bg-background/50 backdrop-blur-sm border-border/50",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  dark: {
    base: "bg-slate-900/50 backdrop-blur-sm border-slate-700/50",
    scrolled: "bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-sm",
  },
} as const;

export type HeaderVariant = keyof typeof headerVariants;

export interface AppHeaderProps {
  /**
   * Header content (navigation, logo, etc.)
   */
  children: React.ReactNode;
  /**
   * Visual variant of the header
   * - transparent: Invisible until scroll
   * - solid: Always visible with background
   * - blur: Semi-transparent with blur effect
   * - dark: Dark theme variant
   */
  variant?: HeaderVariant;
  /**
   * Whether the header should be sticky
   */
  sticky?: boolean;
  /**
   * Disable scroll detection (header stays in base state)
   */
  disableScrollEffect?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppHeader - Standardized header wrapper with scroll detection.
 * Handles sticky positioning, background transitions, and consistent styling.
 *
 * @example
 * ```tsx
 * <AppHeader variant="blur">
 *   <Container>
 *     <nav className="flex items-center justify-between h-16">
 *       <AppLogo appName="Threads" appIcon={Anchor} accentColor="orange" />
 *       <NavGroup>...</NavGroup>
 *     </nav>
 *   </Container>
 * </AppHeader>
 * ```
 */
export function AppHeader({
  children,
  variant = "blur",
  sticky = true,
  disableScrollEffect = false,
  className,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disableScrollEffect) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [disableScrollEffect]);

  const variantStyles = headerVariants[variant];
  const currentStyles = isScrolled || disableScrollEffect 
    ? variantStyles.scrolled 
    : variantStyles.base;

  return (
    <header
      className={cn(
        "transition-all duration-300 border-b",
        sticky && "sticky top-0 z-50",
        currentStyles,
        className
      )}
    >
      {children}
    </header>
  );
}

export { headerVariants };


import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

const headerVariants = {
  transparent: {
    base: "bg-transparent border-transparent",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  solid: {
    base: "bg-background border-border",
    scrolled: "bg-background border-border shadow-sm",
  },
  blur: {
    base: "bg-background/50 backdrop-blur-sm border-border/50",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  dark: {
    base: "bg-slate-900/50 backdrop-blur-sm border-slate-700/50",
    scrolled: "bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-sm",
  },
} as const;

export type HeaderVariant = keyof typeof headerVariants;

export interface AppHeaderProps {
  /**
   * Header content (navigation, logo, etc.)
   */
  children: React.ReactNode;
  /**
   * Visual variant of the header
   * - transparent: Invisible until scroll
   * - solid: Always visible with background
   * - blur: Semi-transparent with blur effect
   * - dark: Dark theme variant
   */
  variant?: HeaderVariant;
  /**
   * Whether the header should be sticky
   */
  sticky?: boolean;
  /**
   * Disable scroll detection (header stays in base state)
   */
  disableScrollEffect?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppHeader - Standardized header wrapper with scroll detection.
 * Handles sticky positioning, background transitions, and consistent styling.
 *
 * @example
 * ```tsx
 * <AppHeader variant="blur">
 *   <Container>
 *     <nav className="flex items-center justify-between h-16">
 *       <AppLogo appName="Threads" appIcon={Anchor} accentColor="orange" />
 *       <NavGroup>...</NavGroup>
 *     </nav>
 *   </Container>
 * </AppHeader>
 * ```
 */
export function AppHeader({
  children,
  variant = "blur",
  sticky = true,
  disableScrollEffect = false,
  className,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disableScrollEffect) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [disableScrollEffect]);

  const variantStyles = headerVariants[variant];
  const currentStyles = isScrolled || disableScrollEffect 
    ? variantStyles.scrolled 
    : variantStyles.base;

  return (
    <header
      className={cn(
        "transition-all duration-300 border-b",
        sticky && "sticky top-0 z-50",
        currentStyles,
        className
      )}
    >
      {children}
    </header>
  );
}

export { headerVariants };


import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

const headerVariants = {
  transparent: {
    base: "bg-transparent border-transparent",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  solid: {
    base: "bg-background border-border",
    scrolled: "bg-background border-border shadow-sm",
  },
  blur: {
    base: "bg-background/50 backdrop-blur-sm border-border/50",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  dark: {
    base: "bg-slate-900/50 backdrop-blur-sm border-slate-700/50",
    scrolled: "bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-sm",
  },
} as const;

export type HeaderVariant = keyof typeof headerVariants;

export interface AppHeaderProps {
  /**
   * Header content (navigation, logo, etc.)
   */
  children: React.ReactNode;
  /**
   * Visual variant of the header
   * - transparent: Invisible until scroll
   * - solid: Always visible with background
   * - blur: Semi-transparent with blur effect
   * - dark: Dark theme variant
   */
  variant?: HeaderVariant;
  /**
   * Whether the header should be sticky
   */
  sticky?: boolean;
  /**
   * Disable scroll detection (header stays in base state)
   */
  disableScrollEffect?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppHeader - Standardized header wrapper with scroll detection.
 * Handles sticky positioning, background transitions, and consistent styling.
 *
 * @example
 * ```tsx
 * <AppHeader variant="blur">
 *   <Container>
 *     <nav className="flex items-center justify-between h-16">
 *       <AppLogo appName="Threads" appIcon={Anchor} accentColor="orange" />
 *       <NavGroup>...</NavGroup>
 *     </nav>
 *   </Container>
 * </AppHeader>
 * ```
 */
export function AppHeader({
  children,
  variant = "blur",
  sticky = true,
  disableScrollEffect = false,
  className,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disableScrollEffect) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [disableScrollEffect]);

  const variantStyles = headerVariants[variant];
  const currentStyles = isScrolled || disableScrollEffect 
    ? variantStyles.scrolled 
    : variantStyles.base;

  return (
    <header
      className={cn(
        "transition-all duration-300 border-b",
        sticky && "sticky top-0 z-50",
        currentStyles,
        className
      )}
    >
      {children}
    </header>
  );
}

export { headerVariants };


import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

const headerVariants = {
  transparent: {
    base: "bg-transparent border-transparent",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  solid: {
    base: "bg-background border-border",
    scrolled: "bg-background border-border shadow-sm",
  },
  blur: {
    base: "bg-background/50 backdrop-blur-sm border-border/50",
    scrolled: "bg-background/95 backdrop-blur-md border-border shadow-sm",
  },
  dark: {
    base: "bg-slate-900/50 backdrop-blur-sm border-slate-700/50",
    scrolled: "bg-slate-900/95 backdrop-blur-md border-slate-700 shadow-sm",
  },
} as const;

export type HeaderVariant = keyof typeof headerVariants;

export interface AppHeaderProps {
  /**
   * Header content (navigation, logo, etc.)
   */
  children: React.ReactNode;
  /**
   * Visual variant of the header
   * - transparent: Invisible until scroll
   * - solid: Always visible with background
   * - blur: Semi-transparent with blur effect
   * - dark: Dark theme variant
   */
  variant?: HeaderVariant;
  /**
   * Whether the header should be sticky
   */
  sticky?: boolean;
  /**
   * Disable scroll detection (header stays in base state)
   */
  disableScrollEffect?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppHeader - Standardized header wrapper with scroll detection.
 * Handles sticky positioning, background transitions, and consistent styling.
 *
 * @example
 * ```tsx
 * <AppHeader variant="blur">
 *   <Container>
 *     <nav className="flex items-center justify-between h-16">
 *       <AppLogo appName="Threads" appIcon={Anchor} accentColor="orange" />
 *       <NavGroup>...</NavGroup>
 *     </nav>
 *   </Container>
 * </AppHeader>
 * ```
 */
export function AppHeader({
  children,
  variant = "blur",
  sticky = true,
  disableScrollEffect = false,
  className,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disableScrollEffect) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [disableScrollEffect]);

  const variantStyles = headerVariants[variant];
  const currentStyles = isScrolled || disableScrollEffect 
    ? variantStyles.scrolled 
    : variantStyles.base;

  return (
    <header
      className={cn(
        "transition-all duration-300 border-b",
        sticky && "sticky top-0 z-50",
        currentStyles,
        className
      )}
    >
      {children}
    </header>
  );
}

export { headerVariants };

