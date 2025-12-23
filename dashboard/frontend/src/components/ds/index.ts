/**
 * Dashboard Design System
 *
 * A collection of reusable components for consistent UI across the dashboard.
 * Inspired by the Electrum page aesthetic.
 *
 * @example
 * ```tsx
 * import { PageHeader, Section, IconBox, StatCard } from "@/components/ds";
 * ```
 */

// Color tokens
export { dsColors, getColorClasses, type DSColor } from "./colors";

// Core components
export { IconBox, type IconBoxProps } from "./icon-box";
export { PageHeader, type PageHeaderProps } from "./page-header";
export {
  Section,
  SectionHeader,
  SectionContent,
  type SectionProps,
  type SectionHeaderProps,
  type SectionContentProps,
} from "./section";
export { StatCard, StatGrid, type StatCardProps, type StatGridProps } from "./stat-card";
export {
  StatusDot,
  getStatusVariant,
  type StatusDotProps,
  type StatusVariant,
} from "./status-dot";
export {
  ActionButton,
  RefreshButton,
  type ActionButtonProps,
  type RefreshButtonProps,
} from "./action-button";
export { InfoBox, type InfoBoxProps } from "./info-box";
export { ConfigValue, type ConfigValueProps } from "./config-value";
export { Grid, type GridProps } from "./grid";
export { FeatureCard, type FeatureCardProps } from "./feature-card";
export {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  type ModalProps,
  type ModalHeaderProps,
  type ModalContentProps,
  type ModalFooterProps,
} from "./modal";
export { Tabs, Tab, type TabsProps, type TabProps } from "./tabs";

