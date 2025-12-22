import { ClassValue } from 'clsx';

/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx for conditional classes with tailwind-merge
 * to handle conflicting Tailwind classes properly.
 *
 * @example
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * // Properly merges "px-4 px-2" to "px-2" if className contains it
 * ```
 */
declare function cn(...inputs: ClassValue[]): string;

export { cn };
