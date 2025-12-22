"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export interface HowItWorksStep {
  /** Step number or label (e.g., "1", "2", "3") */
  step: string | number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
}

// Accent color variants for step indicator
const accentColors = {
  emerald: {
    text: "text-emerald-500",
    bg: "bg-emerald-500/20",
  },
  orange: {
    text: "text-orange-500",
    bg: "bg-orange-500/20",
  },
  amber: {
    text: "text-amber-500",
    bg: "bg-amber-500/20",
  },
  purple: {
    text: "text-purple-500",
    bg: "bg-purple-500/20",
  },
  blue: {
    text: "text-blue-500",
    bg: "bg-blue-500/20",
  },
  red: {
    text: "text-red-500",
    bg: "bg-red-500/20",
  },
  green: {
    text: "text-green-500",
    bg: "bg-green-500/20",
  },
  cyan: {
    text: "text-cyan-500",
    bg: "bg-cyan-500/20",
  },
} as const;

export type HowItWorksAccentColor = keyof typeof accentColors;

export interface HowItWorksProps {
  /** Title for the section (e.g., "How It Works") */
  title?: string;
  /** Array of steps to display */
  steps: HowItWorksStep[];
  /** Accent color for step numbers */
  accentColor?: HowItWorksAccentColor;
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number;
    md?: number;
    lg?: number;
  };
  /** Additional class names for the container */
  className?: string;
}

/**
 * HowItWorks - A section component displaying numbered steps.
 * Based on Anchor Proofs design pattern.
 *
 * @example
 * ```tsx
 * <HowItWorks
 *   title="How It Works"
 *   accentColor="emerald"
 *   steps={[
 *     { step: "1", title: "Upload File", description: "Select any file from your device." },
 *     { step: "2", title: "Generate Hash", description: "A unique fingerprint is computed locally." },
 *     { step: "3", title: "Record on Bitcoin", description: "The hash is recorded on the blockchain." },
 *   ]}
 * />
 * ```
 */
export function HowItWorks({
  title = "How It Works",
  steps,
  accentColor = "emerald",
  columns = { default: 1, md: 3 },
  className,
}: HowItWorksProps) {
  const colors = accentColors[accentColor];

  const gridCols = cn(
    columns.default === 1 && "grid-cols-1",
    columns.default === 2 && "grid-cols-2",
    columns.default === 3 && "grid-cols-3",
    columns.default === 4 && "grid-cols-4",
    columns.md === 2 && "md:grid-cols-2",
    columns.md === 3 && "md:grid-cols-3",
    columns.md === 4 && "md:grid-cols-4",
    columns.lg === 3 && "lg:grid-cols-3",
    columns.lg === 4 && "lg:grid-cols-4"
  );

  return (
    <div className={className}>
      {title && (
        <h2 className="text-xl font-bold text-white mb-6 text-center">{title}</h2>
      )}
      <div className={cn("grid gap-6", gridCols)}>
        {steps.map((item, index) => (
          <div
            key={index}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4",
                colors.bg
              )}
            >
              <span className={cn("text-2xl font-bold", colors.text)}>
                {item.step}
              </span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
            <p className="text-slate-400 text-sm">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface HowItWorksStepCardProps {
  /** Step number or label (e.g., "1", "2", "3") */
  step: string | number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Accent color for step number */
  accentColor?: HowItWorksAccentColor;
  /** Additional class names */
  className?: string;
}

/**
 * HowItWorksStepCard - A single step card for the How It Works section.
 *
 * @example
 * ```tsx
 * <HowItWorksStepCard
 *   step="1"
 *   title="Upload File"
 *   description="Select any file from your device."
 *   accentColor="emerald"
 * />
 * ```
 */
export function HowItWorksStepCard({
  step,
  title,
  description,
  accentColor = "emerald",
  className,
}: HowItWorksStepCardProps) {
  const colors = accentColors[accentColor];

  return (
    <div
      className={cn(
        "bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center",
        className
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4",
          colors.bg
        )}
      >
        <span className={cn("text-2xl font-bold", colors.text)}>{step}</span>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

export default HowItWorks;

