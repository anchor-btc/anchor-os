'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// APPLE-INSPIRED GLASS HEADER VARIANTS
// ============================================================================

const headerVariants = {
  // Premium glass effect - the default Apple-style
  glass: {
    base: 'bg-white/[0.02] backdrop-blur-2xl border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    scrolled:
      'bg-slate-900/80 backdrop-blur-2xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]',
  },
  // Transparent until scroll
  transparent: {
    base: 'bg-transparent border-transparent',
    scrolled:
      'bg-slate-900/90 backdrop-blur-2xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  },
  // Always visible solid background
  solid: {
    base: 'bg-slate-900 border-slate-800',
    scrolled: 'bg-slate-900 border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
  },
  // Semi-transparent blur (legacy)
  blur: {
    base: 'bg-slate-900/50 backdrop-blur-xl border-white/[0.05]',
    scrolled:
      'bg-slate-900/90 backdrop-blur-2xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  },
  // Dark theme variant (legacy)
  dark: {
    base: 'bg-slate-900/50 backdrop-blur-xl border-slate-700/50',
    scrolled:
      'bg-slate-900/95 backdrop-blur-2xl border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
  },
} as const;

export type HeaderVariant = keyof typeof headerVariants;

export interface AppHeaderProps {
  /**
   * Header content (navigation, logo, etc.)
   */
  children: React.ReactNode;
  /**
   * Visual variant of the header
   * - glass: Premium Apple-style glass effect (default)
   * - transparent: Invisible until scroll
   * - solid: Always visible with solid background
   * - blur: Semi-transparent with blur (legacy)
   * - dark: Dark theme variant (legacy)
   */
  variant?: HeaderVariant;
  /**
   * Whether the header should be sticky
   */
  sticky?: boolean;
  /**
   * Disable scroll detection (header stays in base state)
   */
  disableScrollEffect?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AppHeader - Apple-inspired floating glass navigation header.
 *
 * Features:
 * - Premium glassmorphism with backdrop blur
 * - Smooth scroll-triggered transitions
 * - Subtle inner glow and shadow effects
 * - Multiple visual variants
 *
 * @example
 * ```tsx
 * <AppHeader variant="glass">
 *   <Container>
 *     <nav className="flex items-center justify-between h-16">
 *       <AppLogo appName="Threads" appIcon={Anchor} accentColor="orange" />
 *       <NavGroup>...</NavGroup>
 *     </nav>
 *   </Container>
 * </AppHeader>
 * ```
 */
export function AppHeader({
  children,
  variant = 'glass',
  sticky = true,
  disableScrollEffect = false,
  className,
}: AppHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disableScrollEffect) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [disableScrollEffect]);

  const variantStyles = headerVariants[variant];
  const currentStyles =
    isScrolled || disableScrollEffect ? variantStyles.scrolled : variantStyles.base;

  return (
    <header
      className={cn(
        // Base styles
        'border-b',
        // Smooth Apple-style transition
        'transition-all duration-500 ease-out',
        // Sticky positioning
        sticky && 'sticky top-0 z-50',
        // Current variant styles
        currentStyles,
        className
      )}
    >
      {children}
    </header>
  );
}

export { headerVariants };
