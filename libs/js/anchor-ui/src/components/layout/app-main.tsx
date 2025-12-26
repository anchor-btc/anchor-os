import * as React from 'react';
import { cn } from '../../utils/cn';
import { Container, type ContainerProps } from '../container';

const mainSizes = {
  sm: 'max-w-4xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
} as const;

export interface AppMainProps {
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disable default padding
   */
  noPadding?: boolean;
  /**
   * Container size variant - uses built-in Container when set
   * - sm: max-w-4xl (896px)
   * - md: max-w-5xl (1024px)
   * - lg: max-w-6xl (1152px) - Anchor standard
   * - xl: max-w-7xl (1280px)
   * - full: no max-width
   * When not set, children are rendered directly without Container wrapper
   */
  size?: keyof typeof mainSizes;
  /**
   * Extra classes for the inner container (when size is set)
   */
  containerClassName?: string;
}

/**
 * AppMain - Main content wrapper for Anchor applications.
 * Provides consistent vertical padding, flex-grow behavior, and optional container.
 *
 * @example
 * ```tsx
 * // With built-in container (recommended)
 * <AppMain size="lg">
 *   <h1>Centered content with max-width</h1>
 * </AppMain>
 *
 * // Without container (custom layout)
 * <AppMain>
 *   <Container>{children}</Container>
 * </AppMain>
 *
 * // Full width with padding
 * <AppMain size="full">
 *   <FullWidthComponent />
 * </AppMain>
 * ```
 */
export function AppMain({
  children,
  className,
  noPadding = false,
  size,
  containerClassName,
}: AppMainProps) {
  const content = size ? (
    <Container
      size={size === 'full' ? 'xl' : (size as ContainerProps['size'])}
      className={cn(size === 'full' && 'max-w-full', containerClassName)}
    >
      {children}
    </Container>
  ) : (
    children
  );

  return <main className={cn('flex-1', !noPadding && 'py-8', className)}>{content}</main>;
}

export { mainSizes };
