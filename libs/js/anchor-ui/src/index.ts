/**
 * @AnchorProtocol/ui - Anchor Design System
 *
 * A collection of React components built with Tailwind CSS
 * for building consistent UIs across Anchor applications.
 *
 * @example
 * ```tsx
 * import { Button, Card, Input, cn } from "@AnchorProtocol/ui";
 *
 * // Or import individually for better tree-shaking:
 * import { Button } from "@AnchorProtocol/ui/button";
 * import { Card } from "@AnchorProtocol/ui/card";
 * ```
 */

// Components
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/card";
export { Input, type InputProps } from "./components/input";
export {
  Container,
  containerSizes,
  type ContainerProps,
} from "./components/container";
export {
  Footer,
  accentColors,
  type FooterProps,
} from "./components/footer";

export {
  HeroSection,
  type HeroSectionProps,
  type HeroAction,
  type HeroAccentColor,
} from "./components/hero-section";

export {
  StatsGrid,
  StatCard,
  type StatsGridProps,
  type StatCardProps,
  type StatItem,
} from "./components/stats-card";

export {
  HowItWorks,
  HowItWorksStepCard,
  type HowItWorksProps,
  type HowItWorksStepCardProps,
  type HowItWorksStep,
  type HowItWorksAccentColor,
} from "./components/how-it-works";

export {
  AppBackground,
  APP_BACKGROUND_CLASS,
  type AppBackgroundProps,
} from "./components/app-background";

// Layout Components
export {
  AppShell,
  type AppShellProps,
  AppHeader,
  headerVariants,
  type AppHeaderProps,
  type HeaderVariant,
  AppMain,
  type AppMainProps,
  AppLogo,
  accentGradients,
  accentTextColors,
  logoSizes,
  type AppLogoProps,
  type AccentColor,
  type LogoSize,
  NavLink,
  accentActiveColors,
  type NavLinkProps,
  NavGroup,
  gapSizes,
  type NavGroupProps,
} from "./components/layout";

// Utilities
export { cn } from "./utils/cn";

// Re-export Tailwind preset for convenience
export { anchorPreset } from "../tailwind.config";
