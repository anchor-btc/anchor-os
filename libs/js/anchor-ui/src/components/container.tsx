import * as React from "react";
import { cn } from "../utils/cn";

const containerSizes = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container size variant
   * - sm: max-w-4xl (896px)
   * - md: max-w-5xl (1024px)
   * - lg: max-w-6xl (1152px) - default, Anchor standard
   * - xl: max-w-7xl (1280px)
   */
  size?: keyof typeof containerSizes;
  /**
   * HTML element to render as
   */
  as?: "div" | "main" | "section" | "article" | "nav" | "header" | "footer";
}

/**
 * Container component for consistent page width and spacing across Anchor apps.
 *
 * @example
 * ```tsx
 * <Container>
 *   <h1>Page content</h1>
 * </Container>
 *
 * <Container size="xl" as="main" className="py-8">
 *   <h1>Wider main content</h1>
 * </Container>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("container mx-auto px-4", containerSizes[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = "Container";

export { Container, containerSizes };

import { cn } from "../utils/cn";

const containerSizes = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container size variant
   * - sm: max-w-4xl (896px)
   * - md: max-w-5xl (1024px)
   * - lg: max-w-6xl (1152px) - default, Anchor standard
   * - xl: max-w-7xl (1280px)
   */
  size?: keyof typeof containerSizes;
  /**
   * HTML element to render as
   */
  as?: "div" | "main" | "section" | "article" | "nav" | "header" | "footer";
}

/**
 * Container component for consistent page width and spacing across Anchor apps.
 *
 * @example
 * ```tsx
 * <Container>
 *   <h1>Page content</h1>
 * </Container>
 *
 * <Container size="xl" as="main" className="py-8">
 *   <h1>Wider main content</h1>
 * </Container>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("container mx-auto px-4", containerSizes[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = "Container";

export { Container, containerSizes };

import { cn } from "../utils/cn";

const containerSizes = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container size variant
   * - sm: max-w-4xl (896px)
   * - md: max-w-5xl (1024px)
   * - lg: max-w-6xl (1152px) - default, Anchor standard
   * - xl: max-w-7xl (1280px)
   */
  size?: keyof typeof containerSizes;
  /**
   * HTML element to render as
   */
  as?: "div" | "main" | "section" | "article" | "nav" | "header" | "footer";
}

/**
 * Container component for consistent page width and spacing across Anchor apps.
 *
 * @example
 * ```tsx
 * <Container>
 *   <h1>Page content</h1>
 * </Container>
 *
 * <Container size="xl" as="main" className="py-8">
 *   <h1>Wider main content</h1>
 * </Container>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("container mx-auto px-4", containerSizes[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = "Container";

export { Container, containerSizes };

import { cn } from "../utils/cn";

const containerSizes = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
} as const;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container size variant
   * - sm: max-w-4xl (896px)
   * - md: max-w-5xl (1024px)
   * - lg: max-w-6xl (1152px) - default, Anchor standard
   * - xl: max-w-7xl (1280px)
   */
  size?: keyof typeof containerSizes;
  /**
   * HTML element to render as
   */
  as?: "div" | "main" | "section" | "article" | "nav" | "header" | "footer";
}

/**
 * Container component for consistent page width and spacing across Anchor apps.
 *
 * @example
 * ```tsx
 * <Container>
 *   <h1>Page content</h1>
 * </Container>
 *
 * <Container size="xl" as="main" className="py-8">
 *   <h1>Wider main content</h1>
 * </Container>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("container mx-auto px-4", containerSizes[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Container.displayName = "Container";

export { Container, containerSizes };

