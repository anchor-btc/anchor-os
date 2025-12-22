"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { LucideIcon } from "lucide-react";

// ============================================================================
// APPLE-INSPIRED DESIGN SYSTEM
// ============================================================================

// Gradient definitions for accent words - creates that premium Apple shimmer
const accentGradients = {
  emerald: "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300",
  orange: "bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400",
  amber: "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-300",
  purple: "bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400",
  blue: "bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400",
  red: "bg-gradient-to-r from-red-400 via-rose-400 to-pink-400",
  green: "bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400",
  cyan: "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400",
} as const;

// Glow colors for the accent word drop-shadow
const accentGlows = {
  emerald: "drop-shadow-[0_0_35px_rgba(16,185,129,0.4)]",
  orange: "drop-shadow-[0_0_35px_rgba(249,115,22,0.4)]",
  amber: "drop-shadow-[0_0_35px_rgba(245,158,11,0.4)]",
  purple: "drop-shadow-[0_0_35px_rgba(168,85,247,0.4)]",
  blue: "drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]",
  red: "drop-shadow-[0_0_35px_rgba(239,68,68,0.4)]",
  green: "drop-shadow-[0_0_35px_rgba(34,197,94,0.4)]",
  cyan: "drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]",
} as const;

// Button hover glow effects
const buttonGlows = {
  emerald: "hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]",
  orange: "hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]",
  amber: "hover:shadow-[0_0_40px_rgba(245,158,11,0.3)]",
  purple: "hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]",
  blue: "hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]",
  red: "hover:shadow-[0_0_40px_rgba(239,68,68,0.3)]",
  green: "hover:shadow-[0_0_40px_rgba(34,197,94,0.3)]",
  cyan: "hover:shadow-[0_0_40px_rgba(6,182,212,0.3)]",
} as const;

// Accent color border for primary buttons
const accentBorders = {
  emerald: "border-emerald-500/30 hover:border-emerald-400/50",
  orange: "border-orange-500/30 hover:border-orange-400/50",
  amber: "border-amber-500/30 hover:border-amber-400/50",
  purple: "border-purple-500/30 hover:border-purple-400/50",
  blue: "border-blue-500/30 hover:border-blue-400/50",
  red: "border-red-500/30 hover:border-red-400/50",
  green: "border-green-500/30 hover:border-green-400/50",
  cyan: "border-cyan-500/30 hover:border-cyan-400/50",
} as const;

// Accent background tints for primary buttons
const accentBgTints = {
  emerald: "bg-emerald-500/10 hover:bg-emerald-500/20",
  orange: "bg-orange-500/10 hover:bg-orange-500/20",
  amber: "bg-amber-500/10 hover:bg-amber-500/20",
  purple: "bg-purple-500/10 hover:bg-purple-500/20",
  blue: "bg-blue-500/10 hover:bg-blue-500/20",
  red: "bg-red-500/10 hover:bg-red-500/20",
  green: "bg-green-500/10 hover:bg-green-500/20",
  cyan: "bg-cyan-500/10 hover:bg-cyan-500/20",
} as const;

// Text colors for primary buttons
const accentTextColors = {
  emerald: "text-emerald-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
  red: "text-red-400",
  green: "text-green-400",
  cyan: "text-cyan-400",
} as const;

export type HeroAccentColor = keyof typeof accentGradients;

export interface HeroAction {
  /** Link href */
  href: string;
  /** Button label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Button variant: primary uses accent color, secondary uses slate */
  variant?: "primary" | "secondary";
}

export interface HeroSectionProps {
  /** Optional eyebrow/tagline text above the title */
  tagline?: string;
  /** Title text - the accented word will be highlighted */
  title: string;
  /** The word to highlight with gradient accent */
  accentWord?: string;
  /** Subtitle/description text */
  subtitle: string;
  /** Accent color for highlighted word and primary button */
  accentColor?: HeroAccentColor;
  /** Call-to-action buttons */
  actions?: HeroAction[];
  /** Enable/disable animations (default: true) */
  animated?: boolean;
  /** Size variant */
  size?: "default" | "large";
  /** Additional class names */
  className?: string;
  /** Children rendered below the actions */
  children?: React.ReactNode;
}

/**
 * HeroSection - Apple-inspired hero section component for Anchor applications.
 * 
 * Features:
 * - Bold typography with tight tracking
 * - Gradient text with glow effect on accent words
 * - Staggered fade-in animations
 * - Glassmorphic buttons with hover effects
 * - Generous spacing for visual breathing room
 *
 * @example
 * ```tsx
 * <HeroSection
 *   tagline="Introducing"
 *   title="Proof of Existence on Bitcoin"
 *   accentWord="Bitcoin"
 *   subtitle="Timestamp any file on the Bitcoin blockchain."
 *   accentColor="emerald"
 *   animated
 *   actions={[
 *     { href: "/stamp", label: "Stamp a File", icon: FileCheck, variant: "primary" },
 *     { href: "/validate", label: "Validate a File", icon: Shield, variant: "secondary" },
 *   ]}
 * />
 * ```
 */
export function HeroSection({
  tagline,
  title,
  accentWord,
  subtitle,
  accentColor = "emerald",
  actions = [],
  animated = true,
  size = "default",
  className,
  children,
}: HeroSectionProps) {
  // Animation classes - refined Apple-style timing
  // Uses cubic-bezier(0.16, 1, 0.3, 1) - Apple's signature easing
  const fadeInUp = animated
    ? "opacity-0 animate-hero-fade-in"
    : "";
  
  // Tighter stagger delays: 0, 80, 160, 240ms
  const delay = (ms: number) => 
    animated ? { animationDelay: `${Math.round(ms * 0.8)}ms` } : {};

  // Size variants
  const titleSize = size === "large"
    ? "text-5xl md:text-6xl lg:text-7xl"
    : "text-4xl md:text-5xl lg:text-6xl";

  const subtitleSize = size === "large"
    ? "text-xl md:text-2xl"
    : "text-lg md:text-xl";

  // Render title with gradient accent word
  const renderTitle = () => {
    if (!accentWord) {
      return title;
    }

    const parts = title.split(accentWord);
    if (parts.length === 1) {
      return title;
    }

    return (
      <>
        {parts[0]}
        <span
          className={cn(
            "bg-clip-text text-transparent",
            accentGradients[accentColor],
            accentGlows[accentColor]
          )}
        >
          {accentWord}
        </span>
        {parts.slice(1).join(accentWord)}
      </>
    );
  };

  return (
    <div className={cn("text-center py-12", className)}>
      {/* Tagline / Eyebrow */}
      {tagline && (
        <p
          className={cn(
            "text-sm uppercase tracking-[0.2em] text-slate-500 mb-6 font-medium",
            fadeInUp
          )}
          style={delay(0)}
        >
          {tagline}
        </p>
      )}

      {/* Title */}
      <h1
        className={cn(
          titleSize,
          "font-extrabold tracking-tight text-white mb-6",
          fadeInUp
        )}
        style={delay(tagline ? 100 : 0)}
      >
        {renderTitle()}
      </h1>

      {/* Subtitle */}
      <p
        className={cn(
          subtitleSize,
          "text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed",
          fadeInUp
        )}
        style={delay(tagline ? 200 : 100)}
      >
        {subtitle}
      </p>

      {/* CTA Buttons - Glassmorphic Style */}
      {actions.length > 0 && (
        <div
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-5",
            fadeInUp
          )}
          style={delay(tagline ? 300 : 200)}
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isPrimary = action.variant !== "secondary";

            return (
              <a
                key={index}
                href={action.href}
                className={cn(
                  // Base styles
                  "w-full sm:w-auto px-8 py-4 font-semibold rounded-2xl",
                  "flex items-center justify-center gap-2.5",
                  "transition-all duration-300 ease-out",
                  "backdrop-blur-xl border",
                  
                  // Primary: accent tint with glow
                  isPrimary && [
                    accentBgTints[accentColor],
                    accentBorders[accentColor],
                    accentTextColors[accentColor],
                    buttonGlows[accentColor],
                  ],
                  
                  // Secondary: neutral glass
                  !isPrimary && [
                    "bg-white/5 hover:bg-white/10",
                    "border-white/10 hover:border-white/20",
                    "text-slate-300 hover:text-white",
                    "hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
                  ]
                )}
                style={delay((tagline ? 300 : 200) + (index * 100))}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {action.label}
              </a>
            );
          })}
        </div>
      )}

      {/* Children */}
      {children && (
        <div
          className={cn("mt-12", fadeInUp)}
          style={delay(tagline ? 500 : 400)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default HeroSection;
