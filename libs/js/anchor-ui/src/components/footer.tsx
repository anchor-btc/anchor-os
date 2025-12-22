"use client";

import * as React from "react";
import { ExternalLink, Heart, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";
import { Container } from "./container";

// ============================================================================
// APPLE-INSPIRED FOOTER DESIGN
// Minimal, elegant, with subtle interactions
// ============================================================================

const accentGradients = {
  orange: "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400",
  emerald: "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300",
  blue: "bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400",
  purple: "bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400",
  amber: "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-300",
  rose: "bg-gradient-to-r from-rose-400 via-pink-400 to-red-400",
  cyan: "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400",
} as const;

const accentColors = {
  orange: {
    gradient: "from-orange-500 to-orange-700",
    text: "text-orange-400",
    hover: "hover:text-orange-300",
  },
  emerald: {
    gradient: "from-emerald-500 to-emerald-700",
    text: "text-emerald-400",
    hover: "hover:text-emerald-300",
  },
  blue: {
    gradient: "from-blue-500 to-blue-700",
    text: "text-blue-400",
    hover: "hover:text-blue-300",
  },
  purple: {
    gradient: "from-purple-500 to-purple-700",
    text: "text-purple-400",
    hover: "hover:text-purple-300",
  },
  amber: {
    gradient: "from-amber-500 to-amber-700",
    text: "text-amber-400",
    hover: "hover:text-amber-300",
  },
  rose: {
    gradient: "from-rose-500 to-rose-700",
    text: "text-rose-400",
    hover: "hover:text-rose-300",
  },
  cyan: {
    gradient: "from-cyan-500 to-cyan-700",
    text: "text-cyan-400",
    hover: "hover:text-cyan-300",
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
   * @deprecated Use minimal design without gradient bar
   */
  showGradientBar?: boolean;
}

/**
 * Footer - Apple-inspired minimal footer component.
 * 
 * Features:
 * - Ultra-minimal design with generous spacing
 * - Gradient text on app name
 * - Subtle hover effects with elevation
 * - Animated heart icon
 * - Clean typography with tracking
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
  showGradientBar = false,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const colors = accentColors[accentColor];
  const gradient = accentGradients[accentColor];

  return (
    <footer 
      className={cn(
        "border-t border-white/[0.05] mt-20 bg-transparent",
        className
      )}
    >
      <Container className="py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left - Brand with gradient app name */}
          <a 
            href="/" 
            className="flex items-center gap-3 group transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br shadow-lg",
                colors.gradient,
                "ring-1 ring-white/10",
                "group-hover:shadow-xl group-hover:scale-105 transition-all duration-300"
              )}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">
              Anchor
              <span className={cn("bg-clip-text text-transparent", gradient)}>
                {appName}
              </span>
            </span>
          </a>

          {/* Center - Copyright with animated heart */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="tracking-wide">© {currentYear} Anchor Protocol</span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 tracking-wide">
              Built with
              <Heart 
                className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" 
              />
              on Bitcoin
            </span>
          </div>

          {/* Right - Links with hover effects */}
          <div className="flex items-center gap-6">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-sm flex items-center gap-1.5",
                "transition-all duration-300",
                "hover:-translate-y-0.5",
                colors.text,
                colors.hover
              )}
            >
              <span className="tracking-wide">Docs</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-sm flex items-center gap-1.5",
                "transition-all duration-300",
                "hover:-translate-y-0.5",
                colors.text,
                colors.hover
              )}
            >
              <span className="tracking-wide">GitHub</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export { accentColors };
