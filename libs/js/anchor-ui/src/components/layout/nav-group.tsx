import * as React from "react";
import { cn } from "../../utils/cn";

export interface NavGroupProps {
  /**
   * Navigation items (NavLink components)
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Gap size between items
   */
  gap?: "sm" | "md" | "lg";
}

const gapSizes = {
  sm: "gap-1",
  md: "gap-2",
  lg: "gap-4",
} as const;

/**
 * NavGroup - Container for navigation links.
 * Groups NavLink components with consistent spacing.
 *
 * @example
 * ```tsx
 * <NavGroup>
 *   <NavLink href="/threads" icon={MessageSquare}>Threads</NavLink>
 *   <NavLink href="/my-threads" icon={User}>My Threads</NavLink>
 *   <NavLink href="https://docs.anchor.dev" external>Docs</NavLink>
 * </NavGroup>
 * ```
 */
export function NavGroup({
  children,
  className,
  gap = "sm",
}: NavGroupProps) {
  return (
    <nav className={cn("flex items-center", gapSizes[gap], className)}>
      {children}
    </nav>
  );
}

export { gapSizes };
