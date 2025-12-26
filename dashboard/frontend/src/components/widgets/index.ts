export { WidgetGrid } from './widget-grid';
export { WidgetWrapper } from './widget-wrapper';
export { WidgetPicker } from './widget-picker';
export { DashboardWidgets } from './dashboard-widgets';

// Re-export existing widgets for use in the grid
export { WalletWidget } from '../wallet-widget';
export { NodeStats } from '../node-stats';
export { RecentTransactions } from '../recent-transactions';
export { ResourceCharts } from '../resource-charts';
export { QuickLaunch } from '../quick-launch';
export { IndexerStatsWidget } from '../indexer-stats';

// New widgets
export { BackupStatusWidget } from './backup-status-widget';
export { MempoolSummaryWidget } from './mempool-summary-widget';
export { BitcoinPriceWidget } from './bitcoin-price-widget';
export {
  ServicesWidget,
  AppsWidget,
  ExplorersWidget,
  NetworkWidget,
  KernelWidget,
} from './services-widget';
