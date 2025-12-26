'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNodeStatus, fetchNodeConfig, rebuildContainer } from '@/lib/api';
import {
  Bitcoin,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Check,
  X,
  Activity,
  Settings,
  FileText,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Tabs,
  Tab,
  ActionButton,
} from '@/components/ds';

// Tab components
import { NodeOverviewTab } from '@/components/node/overview-tab';
import { NodeSettingsTab } from '@/components/node/settings-tab';
import { NodeLogsTab } from '@/components/node/logs-tab';

export default function NodePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [rebuildProgress, setRebuildProgress] = useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['node-status'],
    queryFn: fetchNodeStatus,
    refetchInterval: 3000,
  });

  const {
    data: nodeConfig,
    isLoading: nodeConfigLoading,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ['node-config'],
    queryFn: fetchNodeConfig,
    refetchInterval: 5000,
  });

  const rebuildMutation = useMutation({
    mutationFn: ({ version }: { version: string }) =>
      rebuildContainer('core-bitcoin', { BITCOIN_VERSION: version }),
    onMutate: () => {
      setRebuildProgress('Building new image...');
    },
    onSuccess: (data) => {
      if (data.success) {
        setRebuildProgress('Successfully rebuilt!');
        queryClient.invalidateQueries({ queryKey: ['node-config'] });
        queryClient.invalidateQueries({ queryKey: ['node-status'] });
        refetchConfig();
        refetch();
        setTimeout(() => {
          setShowConfirmModal(false);
          setRebuildProgress('');
          setPendingVersion(null);
        }, 2000);
      } else {
        setRebuildProgress(`Error: ${data.message}`);
      }
    },
    onError: (error) => {
      setRebuildProgress(`Error: ${error.message}`);
    },
  });

  const handleVersionSelect = (version: string) => {
    if (version !== nodeConfig?.current_version) {
      setPendingVersion(version);
      setShowConfirmModal(true);
    }
    setShowVersionDropdown(false);
  };

  const handleConfirmSwitch = () => {
    if (pendingVersion) {
      rebuildMutation.mutate({ version: pendingVersion });
    }
  };

  const handleCancelSwitch = () => {
    setShowConfirmModal(false);
    setPendingVersion(null);
    setRebuildProgress('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowVersionDropdown(false);
    if (showVersionDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showVersionDropdown]);

  if (isLoading && nodeConfigLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nodeRunning = !!(nodeConfig?.is_running && status);
  const blockchain = status?.blockchain;
  const network = status?.network;
  const currentVersion = nodeConfig?.current_version || '30.0';

  return (
    <div className="space-y-6">
      {/* Header with Version Dropdown */}
      <PageHeader
        icon={Bitcoin}
        iconColor="orange"
        title={t('node.title')}
        subtitle={
          nodeRunning && network
            ? `${network.subversion.replace(/\//g, '')} on ${blockchain?.chain}`
            : t('node.nodeNotRunning')
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Version Dropdown */}
            {nodeConfig && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVersionDropdown(!showVersionDropdown);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg font-medium transition-colors"
                >
                  <Bitcoin className="w-4 h-4" />
                  <span>v{currentVersion}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      showVersionDropdown && 'rotate-180'
                    )}
                  />
                </button>

                {showVersionDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-border bg-muted/50">
                      <p className="text-sm font-medium text-foreground">
                        {t('node.selectVersion')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('node.switchRequiresRebuild')}
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {nodeConfig.available_versions.map((ver) => {
                        const isActive = currentVersion === ver.version;
                        return (
                          <button
                            key={ver.version}
                            onClick={() => handleVersionSelect(ver.version)}
                            className={cn(
                              'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0',
                              isActive && 'bg-orange-500/5'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Bitcoin className="w-4 h-4 text-orange-500" />
                                <span className="font-semibold text-foreground">
                                  v{ver.version}
                                </span>
                                {ver.is_default && (
                                  <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded">
                                    {t('node.default')}
                                  </span>
                                )}
                              </div>
                              {isActive && (
                                <span className="flex items-center gap-1 text-xs text-success">
                                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                  {t('node.running')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{ver.release_date}</p>
                            <ul className="text-[11px] text-muted-foreground">
                              {ver.features.slice(0, 2).map((f, i) => (
                                <li key={i} className="truncate">
                                  • {f}
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status indicator */}
            {nodeRunning && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
                <Activity className="w-4 h-4 animate-pulse" />
                {t('common.running')}
              </span>
            )}

            <RefreshButton loading={isRefetching} onClick={() => refetch()} />
          </div>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="overview" icon={Activity}>
          {t('node.overview', 'Overview')}
        </Tab>
        <Tab value="settings" icon={Settings}>
          {t('settings.title', 'Settings')}
        </Tab>
        <Tab value="logs" icon={FileText}>
          {t('node.logs', 'Logs')}
        </Tab>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <NodeOverviewTab
          status={status}
          nodeConfig={nodeConfig}
          nodeRunning={nodeRunning}
          refetch={refetch}
        />
      )}

      {activeTab === 'settings' && <NodeSettingsTab nodeConfig={nodeConfig} />}

      {activeTab === 'logs' && <NodeLogsTab />}

      {/* Version Switch Confirmation Modal */}
      {showConfirmModal && pendingVersion && (
        <Modal open={showConfirmModal} onClose={handleCancelSwitch}>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t('node.switchVersion', 'Switch Bitcoin Core Version')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  v{currentVersion} → v{pendingVersion}
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalContent>
            <div className="space-y-4">
              {!rebuildMutation.isPending && !rebuildProgress && (
                <>
                  <p className="text-sm text-foreground">
                    {t(
                      'node.switchWarning',
                      'This will stop the Bitcoin node, rebuild the Docker image with the new version, and restart it.'
                    )}
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('node.estimatedTime', 'Estimated time')}: ~1-2{' '}
                        {t('common.minutes', 'minutes')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-warning">
                        {t('node.nodeWillRestart', 'Node will be temporarily unavailable')}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {(rebuildMutation.isPending || rebuildProgress) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {rebuildMutation.isPending && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                    {rebuildProgress.includes('Successfully') && (
                      <Check className="w-5 h-5 text-success" />
                    )}
                    {rebuildProgress.includes('Error') && (
                      <X className="w-5 h-5 text-destructive" />
                    )}
                    <span className="text-sm font-medium text-foreground">{rebuildProgress}</span>
                  </div>

                  {rebuildMutation.isPending && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            {!rebuildMutation.isPending && !rebuildProgress.includes('Successfully') && (
              <>
                <ActionButton
                  variant="secondary"
                  onClick={handleCancelSwitch}
                  label={t('common.cancel')}
                />
                <ActionButton
                  variant="primary"
                  onClick={handleConfirmSwitch}
                  icon={Bitcoin}
                  label={t('node.switchNow', 'Switch Now')}
                />
              </>
            )}
            {rebuildProgress.includes('Successfully') && (
              <ActionButton
                variant="primary"
                onClick={handleCancelSwitch}
                icon={Check}
                label={t('common.done', 'Done')}
              />
            )}
            {rebuildProgress.includes('Error') && (
              <>
                <ActionButton
                  variant="secondary"
                  onClick={handleCancelSwitch}
                  label={t('common.close')}
                />
                <ActionButton
                  variant="primary"
                  onClick={handleConfirmSwitch}
                  icon={Bitcoin}
                  label={t('common.retry', 'Retry')}
                />
              </>
            )}
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
