"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { LucideIcon } from "lucide-react";

// Accent color variants
const accentColors = {
  emerald: {
    text: "text-emerald-500",
    bg: "bg-emerald-600",
    bgHover: "hover:bg-emerald-500",
  },
  orange: {
    text: "text-orange-500",
    bg: "bg-orange-500",
    bgHover: "hover:bg-orange-600",
  },
  amber: {
    text: "text-amber-500",
    bg: "bg-amber-500",
    bgHover: "hover:bg-amber-600",
  },
  purple: {
    text: "text-purple-500",
    bg: "bg-purple-500",
    bgHover: "hover:bg-purple-600",
  },
  blue: {
    text: "text-blue-500",
    bg: "bg-blue-500",
    bgHover: "hover:bg-blue-600",
  },
  red: {
    text: "text-red-500",
    bg: "bg-red-500",
    bgHover: "hover:bg-red-600",
  },
  green: {
    text: "text-green-500",
    bg: "bg-green-500",
    bgHover: "hover:bg-green-600",
  },
  cyan: {
    text: "text-cyan-500",
    bg: "bg-cyan-500",
    bgHover: "hover:bg-cyan-600",
  },
} as const;

export type HeroAccentColor = keyof typeof accentColors;

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
  /** Title text - the accented word should be wrapped with {accent} */
  title: string;
  /** The word to highlight with accent color */
  accentWord?: string;
  /** Subtitle/description text */
  subtitle: string;
  /** Accent color for highlighted word and primary button */
  accentColor?: HeroAccentColor;
  /** Call-to-action buttons */
  actions?: HeroAction[];
  /** Additional class names */
  className?: string;
  /** Children rendered below the actions */
  children?: React.ReactNode;
}

/**
 * HeroSection - A reusable hero section component for Anchor applications.
 * Provides a centered layout with title (with accent word), subtitle, and CTA buttons.
 *
 * @example
 * ```tsx
 * <HeroSection
 *   title="Proof of Existence on Bitcoin"
 *   accentWord="Bitcoin"
 *   subtitle="Timestamp any file on the Bitcoin blockchain."
 *   accentColor="emerald"
 *   actions={[
 *     { href: "/stamp", label: "Stamp a File", icon: FileCheck, variant: "primary" },
 *     { href: "/validate", label: "Validate a File", icon: Shield, variant: "secondary" },
 *   ]}
 * />
 * ```
 */
export function HeroSection({
  title,
  accentWord,
  subtitle,
  accentColor = "emerald",
  actions = [],
  className,
  children,
}: HeroSectionProps) {
  const colors = accentColors[accentColor];

  // Split title to highlight accent word
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
        <span className={colors.text}>{accentWord}</span>
        {parts.slice(1).join(accentWord)}
      </>
    );
  };

  return (
    <div className={cn("text-center", className)}>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
        {renderTitle()}
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">{subtitle}</p>

      {/* CTA Buttons */}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isPrimary = action.variant !== "secondary";

            return (
              <a
                key={index}
                href={action.href}
                className={cn(
                  "w-full sm:w-auto px-8 py-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2",
                  isPrimary
                    ? cn("text-white", colors.bg, colors.bgHover)
                    : "bg-slate-700 text-white hover:bg-slate-600"
                )}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {action.label}
              </a>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}

export default HeroSection;

