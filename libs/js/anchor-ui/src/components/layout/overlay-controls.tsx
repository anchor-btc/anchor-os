"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

export type OverlayPosition = 
  | "top-left" 
  | "top-right" 
  | "bottom-left" 
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export interface OverlayControlsProps {
  /**
   * Position of the overlay controls
   */
  position: OverlayPosition;
  /**
   * Overlay content (buttons, search boxes, filters, etc.)
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Z-index for the overlay (default: 1000 for map compatibility)
   */
  zIndex?: number;
}

const positionClasses: Record<OverlayPosition, string> = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

/**
 * OverlayControls - Container for controls that overlay content (maps, canvas).
 * 
 * Features:
 * - Configurable position (corners and center)
 * - High z-index for map compatibility
 * - Pointer events auto (click-through on container, clickable on children)
 *
 * @example
 * ```tsx
 * <OverlayControls position="top-left">
 *   <SearchBox />
 *   <CategoryFilter />
 * </OverlayControls>
 * 
 * <OverlayControls position="bottom-right">
 *   <ZoomControls />
 * </OverlayControls>
 * ```
 */
export function OverlayControls({
  position,
  children,
  className,
  zIndex = 1000,
}: OverlayControlsProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        positionClasses[position],
        className
      )}
      style={{ zIndex }}
    >
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * OverlayControlsGroup - Groups related overlay controls.
 */
export interface OverlayControlsGroupProps {
  children: React.ReactNode;
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function OverlayControlsGroup({
  children,
  direction = "horizontal",
  className,
}: OverlayControlsGroupProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        direction === "vertical" ? "flex-col" : "flex-row items-center",
        className
      )}
    >
      {children}
    </div>
  );
}

