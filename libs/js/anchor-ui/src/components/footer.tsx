"use client";

import * as React from "react";
import { ExternalLink, Heart, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";
import { Container } from "./container";

const accentColors = {
  orange: {
    gradient: "from-orange-500 to-orange-700",
    text: "text-orange-500",
    bar: "from-orange-500 via-amber-500 to-orange-500",
  },
  emerald: {
    gradient: "from-emerald-500 to-emerald-700",
    text: "text-emerald-500",
    bar: "from-emerald-500 via-teal-500 to-emerald-500",
  },
  blue: {
    gradient: "from-blue-500 to-blue-700",
    text: "text-blue-500",
    bar: "from-blue-500 via-cyan-500 to-blue-500",
  },
  purple: {
    gradient: "from-purple-500 to-purple-700",
    text: "text-purple-500",
    bar: "from-purple-500 via-violet-500 to-purple-500",
  },
  amber: {
    gradient: "from-amber-500 to-amber-700",
    text: "text-amber-500",
    bar: "from-amber-500 via-yellow-500 to-amber-500",
  },
  rose: {
    gradient: "from-rose-500 to-rose-700",
    text: "text-rose-500",
    bar: "from-rose-500 via-pink-500 to-rose-500",
  },
} as const;

export interface FooterProps {
  /**
   * App name to display (e.g., "Threads", "Proofs", "Domains")
   */
  appName: string;
  /**
   * Lucide icon component to display
   */
  appIcon: LucideIcon;
  /**
   * Accent color for the app
   */
  accentColor: keyof typeof accentColors;
  /**
   * Documentation URL
   */
  docsUrl?: string;
  /**
   * GitHub repository URL
   */
  githubUrl?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show the decorative gradient bar at the bottom
   */
  showGradientBar?: boolean;
}

/**
 * Standardized footer component for Anchor apps.
 *
 * @example
 * ```tsx
 * import { Footer } from "@AnchorProtocol/ui";
 * import { Anchor } from "lucide-react";
 *
 * <Footer
 *   appName="Threads"
 *   appIcon={Anchor}
 *   accentColor="orange"
 *   docsUrl="http://localhost:3900/apps/threads"
 * />
 * ```
 */
export function Footer({
  appName,
  appIcon: Icon,
  accentColor,
  docsUrl = "http://localhost:3900",
  githubUrl = "https://github.com/AnchorProtocol/anchor",
  className,
  showGradientBar = true,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const colors = accentColors[accentColor];

  return (
    <footer className={cn("border-t border-border mt-16 bg-secondary/50", className)}>
      <Container className="py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left - Brand */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br",
                  colors.gradient
                )}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">
                Anchor<span className={colors.text}>{appName}</span>
              </span>
            </a>
          </div>

          {/* Center - Copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {currentYear} Anchor Protocol.</span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1">
              Built with{" "}
              <Heart className="h-3 w-3 text-destructive fill-destructive" /> on
              Bitcoin
            </span>
          </div>

          {/* Right - Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hover:opacity-80 transition-colors flex items-center gap-1",
                colors.text
              )}
            >
              Docs
              <ExternalLink className="h-3 w-3" />
            </a>
            <span>•</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hover:opacity-80 transition-colors flex items-center gap-1",
                colors.text
              )}
            >
              GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </Container>

      {/* Decorative gradient bar */}
      {showGradientBar && (
        <div className={cn("h-1 bg-gradient-to-r", colors.bar)} />
      )}
    </footer>
  );
}

export { accentColors };
