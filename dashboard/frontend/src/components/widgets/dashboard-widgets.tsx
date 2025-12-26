'use client';

import { useTranslation } from 'react-i18next';
import { useWidgetConfig } from '@/hooks/use-widget-config';
import { WidgetConfig } from '@/types/widgets';
import { WidgetGrid } from './widget-grid';
import { WidgetPicker } from './widget-picker';
import { WalletWidget } from '../wallet-widget';
import { NodeStats } from '../node-stats';
import { RecentTransactions } from '../recent-transactions';
import { ResourceCharts } from '../resource-charts';
import { QuickLaunch } from '../quick-launch';
import { IndexerStatsWidget } from '../indexer-stats';
import { BackupStatusWidget } from './backup-status-widget';
import { MempoolSummaryWidget } from './mempool-summary-widget';
import { BitcoinPriceWidget } from './bitcoin-price-widget';
import { AppsWidget, ExplorersWidget, NetworkWidget, KernelWidget } from './services-widget';
import { Pencil, Check, RotateCcw, Loader2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ds';

export function DashboardWidgets() {
  const { t } = useTranslation();
  const {
    widgets,
    isEditMode,
    isLoaded,
    availableWidgets,
    addWidget,
    removeWidget,
    changeSize,
    reorderWidgets,
    toggleEditMode,
    resetToDefaults,
  } = useWidgetConfig();

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'quick-launch':
        return <QuickLaunch />;
      case 'resource-charts':
        return <ResourceCharts />;
      case 'wallet':
        return <WalletWidget />;
      case 'recent-transactions':
        return <RecentTransactions />;
      case 'node-stats':
        return <NodeStats />;
      case 'indexer-stats':
        return <IndexerStatsWidget />;
      case 'backup-status':
        return <BackupStatusWidget />;
      case 'mempool-summary':
        return <MempoolSummaryWidget />;
      case 'bitcoin-price':
        return <BitcoinPriceWidget />;
      case 'apps':
        return <AppsWidget />;
      case 'explorers':
        return <ExplorersWidget />;
      case 'network':
        return <NetworkWidget />;
      case 'kernel':
        return <KernelWidget />;
      default:
        return (
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-muted-foreground">Unknown widget: {widget.type}</p>
          </div>
        );
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Controls */}
      <PageHeader
        icon={LayoutDashboard}
        iconColor="purple"
        title={t('dashboard.title')}
        subtitle={t('app.tagline')}
        actions={
          <div className="flex items-center gap-2">
            {isEditMode && (
              <>
                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('dashboard.resetWidgets')}
                </button>
                <WidgetPicker availableWidgets={availableWidgets} onAddWidget={addWidget} />
              </>
            )}
            <button
              onClick={toggleEditMode}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                isEditMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              )}
            >
              {isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('dashboard.doneEditing')}
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  {t('dashboard.editWidgets')}
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Widget Grid */}
      <WidgetGrid
        widgets={widgets}
        isEditMode={isEditMode}
        onReorder={reorderWidgets}
        onRemove={removeWidget}
        onChangeSize={changeSize}
        renderWidget={renderWidget}
      />

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-card border-2 border-dashed border-border rounded-xl">
          <p className="text-muted-foreground mb-4">{t('dashboard.noWidgets')}</p>
          <WidgetPicker availableWidgets={availableWidgets} onAddWidget={addWidget} />
        </div>
      )}
    </div>
  );
}
