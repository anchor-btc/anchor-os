"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

const accentGradients = {
  orange: "from-orange-500 to-orange-700",
  emerald: "from-emerald-500 to-emerald-700",
  blue: "from-blue-500 to-blue-700",
  purple: "from-purple-500 to-purple-700",
  amber: "from-amber-500 to-amber-700",
  rose: "from-rose-500 to-rose-700",
  cyan: "from-cyan-500 to-cyan-700",
} as const;

const accentTextColors = {
  orange: "text-orange-500",
  emerald: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  cyan: "text-cyan-500",
} as const;

const logoSizes = {
  sm: {
    container: "w-6 h-6 rounded-md",
    icon: "w-4 h-4",
    text: "text-lg",
  },
  md: {
    container: "w-8 h-8 rounded-lg",
    icon: "w-5 h-5",
    text: "text-xl",
  },
  lg: {
    container: "w-10 h-10 rounded-xl",
    icon: "w-6 h-6",
    text: "text-2xl",
  },
} as const;

export type AccentColor = keyof typeof accentGradients;
export type LogoSize = keyof typeof logoSizes;

export interface AppLogoProps {
  /**
   * Name of the app (displayed after "Anchor")
   */
  appName: string;
  /**
   * Lucide icon component for the app
   */
  appIcon: LucideIcon;
  /**
   * Accent color for gradient and text highlight
   */
  accentColor: AccentColor;
  /**
   * URL to navigate to when clicked
   */
  href?: string;
  /**
   * Size variant
   */
  size?: LogoSize;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show subtitle
   */
  subtitle?: string;
}

/**
 * AppLogo - Standardized logo component for Anchor applications.
 * Displays icon with gradient background and "Anchor{AppName}" text.
 *
 * @example
 * ```tsx
 * <AppLogo
 *   appName="Threads"
 *   appIcon={Anchor}
 *   accentColor="orange"
 * />
 * ```
 */
export function AppLogo({
  appName,
  appIcon: Icon,
  accentColor,
  href = "/",
  size = "md",
  className,
  subtitle,
}: AppLogoProps) {
  const sizeStyles = logoSizes[size];
  const gradient = accentGradients[accentColor];
  const textColor = accentTextColors[accentColor];

  const content = (
    <>
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-105 mr-1",
          gradient,
          sizeStyles.container
        )}
      >
        <Icon className={cn("text-white", sizeStyles.icon)} />
      </div>
      <div className="flex flex-col">
        <span className={cn("font-bold", sizeStyles.text)}>
          Anchor<span className={textColor}> {appName}</span>
        </span>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </>
  );

  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-2 group",
        className
      )}
    >
      {content}
    </a>
  );
}

export { accentGradients, accentTextColors, logoSizes };
