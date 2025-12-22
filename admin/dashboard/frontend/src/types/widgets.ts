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
  nameKey: string;
  description: string;
  descriptionKey: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  icon: string;
}

// Widget definitions with metadata
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'quick-launch',
    name: 'Quick Launch',
    nameKey: 'widgetNames.quickLaunch',
    description: 'Quick access to your favorite apps',
    descriptionKey: 'widgetDescriptions.quickLaunch',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    icon: 'Rocket',
  },
  {
    type: 'resource-charts',
    name: 'Resource Monitor',
    nameKey: 'widgetNames.resourceCharts',
    description: 'CPU, Memory, and Docker stats',
    descriptionKey: 'widgetDescriptions.resourceCharts',
    defaultSize: 'large',
    allowedSizes: ['medium', 'large'],
    icon: 'Activity',
  },
  {
    type: 'wallet',
    name: 'Wallet',
    nameKey: 'widgetNames.wallet',
    description: 'Bitcoin wallet balance and addresses',
    descriptionKey: 'widgetDescriptions.wallet',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Wallet',
  },
  {
    type: 'recent-transactions',
    name: 'Recent Transactions',
    nameKey: 'widgetNames.recentTransactions',
    description: 'Latest blockchain transactions',
    descriptionKey: 'widgetDescriptions.recentTransactions',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'ArrowLeftRight',
  },
  {
    type: 'node-stats',
    name: 'Node Stats',
    nameKey: 'widgetNames.nodeStats',
    description: 'Bitcoin node statistics',
    descriptionKey: 'widgetDescriptions.nodeStats',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Bitcoin',
  },
  {
    type: 'indexer-stats',
    name: 'Indexer Stats',
    nameKey: 'widgetNames.indexerStats',
    description: 'ANCHOR indexer statistics',
    descriptionKey: 'widgetDescriptions.indexerStats',
    defaultSize: 'medium',
    allowedSizes: ['small', 'medium', 'large'],
    icon: 'Database',
  },
  {
    type: 'backup-status',
    name: 'Backup Status',
    nameKey: 'widgetNames.backupStatus',
    description: 'Last backup and storage info',
    descriptionKey: 'widgetDescriptions.backupStatus',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'HardDrive',
  },
  {
    type: 'mempool-summary',
    name: 'Mempool Summary',
    nameKey: 'widgetNames.mempoolSummary',
    description: 'Mempool size and fee estimates',
    descriptionKey: 'widgetDescriptions.mempoolSummary',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Layers',
  },
  {
    type: 'bitcoin-price',
    name: 'Bitcoin Price',
    nameKey: 'widgetNames.bitcoinPrice',
    description: 'Current BTC price in USD',
    descriptionKey: 'widgetDescriptions.bitcoinPrice',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'TrendingUp',
  },
  {
    type: 'apps',
    name: 'Apps',
    nameKey: 'widgetNames.apps',
    description: 'All Anchor apps with status',
    descriptionKey: 'widgetDescriptions.apps',
    defaultSize: 'medium',
    allowedSizes: ['medium', 'large'],
    icon: 'AppWindow',
  },
  {
    type: 'explorers',
    name: 'Explorers',
    nameKey: 'widgetNames.explorers',
    description: 'Block explorers and visualizers',
    descriptionKey: 'widgetDescriptions.explorers',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Search',
  },
  {
    type: 'networking',
    name: 'Networking',
    nameKey: 'widgetNames.networking',
    description: 'VPN and tunnel services',
    descriptionKey: 'widgetDescriptions.networking',
    defaultSize: 'small',
    allowedSizes: ['small', 'medium'],
    icon: 'Network',
  },
  {
    type: 'kernel',
    name: 'Kernel',
    nameKey: 'widgetNames.kernel',
    description: 'Core infrastructure services',
    descriptionKey: 'widgetDescriptions.kernel',
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
