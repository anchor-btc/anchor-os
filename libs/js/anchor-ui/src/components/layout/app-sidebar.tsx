"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

export interface AppSidebarProps {
  /**
   * Position of the sidebar
   */
  position?: "left" | "right";
  /**
   * Whether the sidebar is collapsed
   */
  collapsed?: boolean;
  /**
   * Callback when toggle button is clicked
   */
  onToggle?: () => void;
  /**
   * Width class when expanded (default: "w-80")
   */
  width?: string;
  /**
   * Sidebar content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes for the sidebar container
   */
  className?: string;
  /**
   * Whether to show the toggle button
   */
  showToggle?: boolean;
}

/**
 * AppSidebar - Collapsible sidebar component for fullscreen apps.
 * 
 * Features:
 * - Configurable position (left/right)
 * - Collapsible with smooth animation
 * - Toggle button with chevron icon
 * - Glassmorphism styling
 * - Hidden on mobile by default
 *
 * @example
 * ```tsx
 * const [collapsed, setCollapsed] = useState(false);
 * 
 * <AppSidebar
 *   position="right"
 *   collapsed={collapsed}
 *   onToggle={() => setCollapsed(!collapsed)}
 * >
 *   <PaintPanel />
 *   <ColorPicker />
 * </AppSidebar>
 * ```
 */
export function AppSidebar({
  position = "right",
  collapsed = false,
  onToggle,
  width = "w-80",
  children,
  className,
  showToggle = true,
}: AppSidebarProps) {
  const isLeft = position === "left";

  const toggleButton = showToggle && onToggle && (
    <button
      onClick={onToggle}
      className={cn(
        "hidden lg:flex items-center justify-center w-5",
        "bg-white/[0.02] hover:bg-white/[0.06]",
        "transition-colors duration-200",
        "text-white/30 hover:text-white/60",
        isLeft ? "border-r border-white/[0.06]" : "border-l border-white/[0.06]"
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isLeft ? (
        collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />
      ) : (
        collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
      )}
    </button>
  );

  return (
    <>
      {/* Toggle button - positioned before sidebar if right, after if left */}
      {isLeft && toggleButton}

      {/* Sidebar content */}
      {!collapsed && (
        <aside
          className={cn(
            width,
            "bg-white/[0.02] backdrop-blur-sm",
            "overflow-y-auto hidden lg:block",
            "transition-all duration-200",
            isLeft ? "border-r border-white/[0.06]" : "border-l border-white/[0.06]",
            className
          )}
        >
          <div className="p-4 space-y-4">
            {children}
          </div>
        </aside>
      )}

      {/* Toggle button - positioned after sidebar if right */}
      {!isLeft && toggleButton}
    </>
  );
}

/**
 * AppSidebarSection - Section within a sidebar with optional title.
 */
export interface AppSidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AppSidebarSection({
  title,
  children,
  className,
}: AppSidebarSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

