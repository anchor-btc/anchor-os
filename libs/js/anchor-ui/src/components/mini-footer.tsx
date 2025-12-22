"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export interface MiniFooterProps {
  /**
   * Content for the left section
   */
  leftContent?: React.ReactNode;
  /**
   * Content for the center section
   */
  centerContent?: React.ReactNode;
  /**
   * Content for the right section
   */
  rightContent?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * MiniFooter - Minimal footer component for fullscreen apps.
 * 
 * Features:
 * - Fixed small height (h-7)
 * - Three-zone layout (left, center, right)
 * - Monospace font for technical info
 * - Subtle styling that doesn't distract
 *
 * @example
 * ```tsx
 * <MiniFooter
 *   leftContent={<span>4580 × 4580</span>}
 *   centerContent={<span>Powered by Bitcoin & Anchor Protocol</span>}
 *   rightContent={<span>v1.0.0</span>}
 * />
 * ```
 */
export function MiniFooter({
  leftContent,
  centerContent,
  rightContent,
  className,
}: MiniFooterProps) {
  return (
    <footer
      className={cn(
        "h-7 flex items-center justify-between px-4",
        "bg-white/[0.02] border-t border-white/[0.06]",
        "text-[10px] text-white/30 font-mono",
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-2">
        {leftContent}
      </div>

      {/* Center section */}
      <div className="flex items-center gap-2">
        {centerContent}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {rightContent}
      </div>
    </footer>
  );
}

/**
 * MiniFooterDivider - Visual divider between footer items.
 */
export function MiniFooterDivider() {
  return <span className="text-white/10">|</span>;
}

