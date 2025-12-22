"use client";

import * as React from "react";
import { cn } from "../utils/cn";

// ============================================================================
// APPLE-INSPIRED HOW IT WORKS COMPONENT
// Static cards with subtle hover effects - no entrance animations
// ============================================================================

export interface HowItWorksStep {
  /** Step number or label (e.g., "1", "2", "3") */
  step: string | number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
}

// Gradient definitions for step numbers
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

// Background tints for step indicator
const accentBgTints = {
  emerald: "from-emerald-500/20 to-emerald-600/10",
  orange: "from-orange-500/20 to-orange-600/10",
  amber: "from-amber-500/20 to-amber-600/10",
  purple: "from-purple-500/20 to-purple-600/10",
  blue: "from-blue-500/20 to-blue-600/10",
  red: "from-red-500/20 to-red-600/10",
  green: "from-green-500/20 to-green-600/10",
  cyan: "from-cyan-500/20 to-cyan-600/10",
} as const;

// Ring colors for step indicator
const accentRings = {
  emerald: "ring-emerald-500/20",
  orange: "ring-orange-500/20",
  amber: "ring-amber-500/20",
  purple: "ring-purple-500/20",
  blue: "ring-blue-500/20",
  red: "ring-red-500/20",
  green: "ring-green-500/20",
  cyan: "ring-cyan-500/20",
} as const;

export type HowItWorksAccentColor = keyof typeof accentGradients;

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
 * HowItWorks - Clean section component displaying numbered steps.
 * 
 * Design philosophy:
 * - No entrance animations (content is already settled)
 * - Subtle hover effects only (200ms transitions)
 * - Glass card effect without excessive glow
 *
 * @example
 * ```tsx
 * <HowItWorks
 *   title="How It Works"
 *   accentColor="emerald"
 *   steps={[
 *     { step: "1", title: "Upload File", description: "Select any file." },
 *     { step: "2", title: "Generate Hash", description: "A fingerprint is computed." },
 *     { step: "3", title: "Record on Bitcoin", description: "Hash is recorded." },
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
  const gradient = accentGradients[accentColor];
  const bgTint = accentBgTints[accentColor];
  const ring = accentRings[accentColor];

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
        <h2 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">
          {title}
        </h2>
      )}
      <div className={cn("grid gap-6", gridCols)}>
        {steps.map((item, index) => (
          <div
            key={index}
            className={cn(
              // Glass card base
              "bg-white/[0.03] backdrop-blur-sm rounded-2xl",
              "border border-white/[0.05]",
              "p-7 text-center",
              // Subtle hover - just tint change, no translate
              "transition-colors duration-200",
              "hover:bg-white/[0.04]",
              "hover:border-white/[0.08]"
            )}
          >
            {/* Step indicator with gradient number */}
            <div
              className={cn(
                "w-14 h-14 rounded-2xl",
                "bg-gradient-to-br",
                bgTint,
                "flex items-center justify-center mx-auto mb-5",
                "ring-1",
                ring
              )}
            >
              <span 
                className={cn(
                  "text-2xl font-bold bg-clip-text text-transparent",
                  gradient
                )}
              >
                {item.step}
              </span>
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-3 tracking-tight">
              {item.title}
            </h3>
            
            {/* Description */}
            <p className="text-slate-400 text-sm leading-relaxed">
              {item.description}
            </p>
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
 * HowItWorksStepCard - A single step card with subtle hover effects.
 */
export function HowItWorksStepCard({
  step,
  title,
  description,
  accentColor = "emerald",
  className,
}: HowItWorksStepCardProps) {
  const gradient = accentGradients[accentColor];
  const bgTint = accentBgTints[accentColor];
  const ring = accentRings[accentColor];

  return (
    <div
      className={cn(
        // Glass card base
        "bg-white/[0.03] backdrop-blur-sm rounded-2xl",
        "border border-white/[0.05]",
        "p-7 text-center",
        // Subtle hover - just tint change
        "transition-colors duration-200",
        "hover:bg-white/[0.04]",
        "hover:border-white/[0.08]",
        className
      )}
    >
      {/* Step indicator */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl",
          "bg-gradient-to-br",
          bgTint,
          "flex items-center justify-center mx-auto mb-5",
          "ring-1",
          ring
        )}
      >
        <span 
          className={cn(
            "text-2xl font-bold bg-clip-text text-transparent",
            gradient
          )}
        >
          {step}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-3 tracking-tight">
        {title}
      </h3>
      
      <p className="text-slate-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default HowItWorks;
