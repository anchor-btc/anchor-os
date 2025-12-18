// Widget system types

export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetType =
  | 'quick-launch'
  | 'resource-charts'
  | 'wallet'
  | 'recent-transactions'
  | 'node-stats'
  | 'indexer-stats'
  | 'backup-status'
  | 'mempool-summary'
  | 'bitcoin-price'
  | 'apps'
  | 'explorers'
  | 'networking'
  | 'kernel';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  enabled: boolean;
  order: number;
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  icon: string;
}

// Widget definitions with metadata
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'quick-launch',
    name: 'Quick Launch',
    description: 'Quick access to your favorite apps',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    icon: 'Rocket',
  },
  {
    type: 'resource-charts',
    name: 'Resource Monitor',
    description: 'CPU, Memory, and Docker stats',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    icon: 'Activity',
  },
  {
    type: 'wallet',
    name: 'Wallet',
    description: 'Bitcoin wallet balance and addresses',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Wallet',
  },
  {
    type: 'recent-transactions',
    name: 'Recent Transactions',
    description: 'Latest blockchain transactions',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'ArrowLeftRight',
  },
  {
    type: 'node-stats',
    name: 'Node Stats',
    description: 'Bitcoin node statistics',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Bitcoin',
  },
  {
    type: 'indexer-stats',
    name: 'Indexer Stats',
    description: 'ANCHOR indexer statistics',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Database',
  },
  {
    type: 'backup-status',
    name: 'Backup Status',
    description: 'Last backup and storage info',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'HardDrive',
  },
  {
    type: 'mempool-summary',
    name: 'Mempool Summary',
    description: 'Mempool size and fee estimates',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Layers',
  },
  {
    type: 'bitcoin-price',
    name: 'Bitcoin Price',
    description: 'Current BTC price in USD',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'TrendingUp',
  },
  {
    type: 'apps',
    name: 'Apps',
    description: 'All Anchor apps with status',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    icon: 'AppWindow',
  },
  {
    type: 'explorers',
    name: 'Explorers',
    description: 'Block explorers and visualizers',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Search',
  },
  {
    type: 'networking',
    name: 'Networking',
    description: 'VPN and tunnel services',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Network',
  },
  {
    type: 'kernel',
    name: 'Kernel',
    description: 'Core infrastructure services',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    icon: 'Server',
  },
];

// Default widget configuration
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'widget-1', type: 'quick-launch', size: 'large', enabled: true, order: 0 },
  { id: 'widget-2', type: 'resource-charts', size: 'large', enabled: true, order: 1 },
  { id: 'widget-3', type: 'wallet', size: 'medium', enabled: true, order: 2 },
  { id: 'widget-4', type: 'recent-transactions', size: 'medium', enabled: true, order: 3 },
  { id: 'widget-5', type: 'node-stats', size: 'medium', enabled: true, order: 4 },
  { id: 'widget-6', type: 'indexer-stats', size: 'medium', enabled: true, order: 5 },
];

// Grid column spans for each size
export const SIZE_TO_COLS: Record<WidgetSize, number> = {
  small: 4,
  medium: 6,
  large: 12,
};
