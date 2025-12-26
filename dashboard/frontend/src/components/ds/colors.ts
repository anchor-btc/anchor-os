/**
 * Dashboard Design System - Color Tokens
 *
 * Predefined color configurations for consistent styling across components.
 * Each color includes background, text, and border classes.
 */

export const dsColors = {
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-500',
    border: 'border-orange-500',
    hoverBg: 'hover:bg-orange-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    border: 'border-yellow-500',
    hoverBg: 'hover:bg-yellow-500/30',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-500',
    border: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-500/30',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    border: 'border-blue-500',
    hoverBg: 'hover:bg-blue-500/30',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-500',
    border: 'border-purple-500',
    hoverBg: 'hover:bg-purple-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-500',
    border: 'border-cyan-500',
    hoverBg: 'hover:bg-cyan-500/30',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-500',
    border: 'border-red-500',
    hoverBg: 'hover:bg-red-500/30',
  },
  pink: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-500',
    border: 'border-pink-500',
    hoverBg: 'hover:bg-pink-500/30',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-500',
    border: 'border-amber-500',
    hoverBg: 'hover:bg-amber-500/30',
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-500',
    border: 'border-green-500',
    hoverBg: 'hover:bg-green-500/30',
  },
  // Semantic colors using CSS variables
  primary: {
    bg: 'bg-primary/20',
    text: 'text-primary',
    border: 'border-primary',
    hoverBg: 'hover:bg-primary/30',
  },
  success: {
    bg: 'bg-success/20',
    text: 'text-success',
    border: 'border-success',
    hoverBg: 'hover:bg-success/30',
  },
  warning: {
    bg: 'bg-warning/20',
    text: 'text-warning',
    border: 'border-warning',
    hoverBg: 'hover:bg-warning/30',
  },
  error: {
    bg: 'bg-error/20',
    text: 'text-error',
    border: 'border-error',
    hoverBg: 'hover:bg-error/30',
  },
  muted: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    hoverBg: 'hover:bg-muted/80',
  },
} as const;

export type DSColor = keyof typeof dsColors;

/**
 * Get color classes for a given color key
 */
export function getColorClasses(color: DSColor) {
  return dsColors[color];
}
