'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContainers,
  startContainer,
  stopContainer,
  fetchInstallationStatus,
  fetchAvailableServices,
  installService,
  uninstallService,
  ServiceInstallStatus,
} from '@/lib/api';
import { apps } from '@/lib/apps';
import { AppCard } from '@/components/app-card';
import { AppListItem } from '@/components/app-list-item';
import { MultiLogsModal } from '@/components/multi-logs-modal';
import { MultiTerminalModal } from '@/components/multi-terminal-modal';
import { isRequiredService } from '@/lib/service-rules';
import { Loader2, AppWindow, Search, Network, Cpu, Anchor, LayoutGrid, List } from 'lucide-react';

// Import DS components
import { PageHeader, Section, SectionHeader, Grid, ActionButton, Tabs, Tab } from '@/components/ds';

type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'anchor-apps-view-mode';

export default function AppsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [logsContainers, setLogsContainers] = useState<string[] | null>(null);
  const [terminalContainers, setTerminalContainers] = useState<string[] | null>(null);
  const [installingService, setInstallingService] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load saved view mode from localStorage on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (mode: string) => {
    if (mode === 'grid' || mode === 'list') {
      setViewMode(mode);
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  };

  const {
    data: containersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['containers'],
    queryFn: fetchContainers,
    refetchInterval: 3000,
  });

  // Fetch installation status to know which services are installed
  const { data: installationStatus } = useQuery({
    queryKey: ['installation-status'],
    queryFn: fetchInstallationStatus,
    refetchInterval: 5000,
  });

  // Fetch available services for more details
  const { data: servicesData } = useQuery({
    queryKey: ['available-services'],
    queryFn: fetchAvailableServices,
  });

  const containers = containersData?.containers || [];
  const installedServices = installationStatus?.installed_services || [];
  const services = servicesData?.services || [];

  // Helper to get install status for an app
  const getInstallStatus = (appId: string): ServiceInstallStatus => {
    if (installingService === appId) return 'installing';
    if (installedServices.includes(appId)) return 'installed';

    const serviceExists = services.find((s) => s.id === appId);
    if (serviceExists) return 'not_installed';

    return 'installed';
  };

  // Install service mutation
  const installMutation = useMutation({
    mutationFn: async (appId: string) => {
      setInstallingService(appId);
      return installService(appId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-status'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setInstallingService(null);
    },
    onError: () => {
      setInstallingService(null);
    },
  });

  // Uninstall service mutation
  const uninstallMutation = useMutation({
    mutationFn: async ({
      serviceId,
      removeContainers,
    }: {
      serviceId: string;
      removeContainers: boolean;
    }) => {
      return uninstallService(serviceId, removeContainers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-status'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });

  const handleInstall = (appId: string) => {
    installMutation.mutate(appId);
  };

  const handleUninstall = async (appId: string, removeContainers?: boolean) => {
    await uninstallMutation.mutateAsync({
      serviceId: appId,
      removeContainers: removeContainers ?? false,
    });
  };

  // Get all container names from all apps
  const allContainerNames = apps.flatMap((app) => app.containers);

  // Count running/stopped
  const runningContainers = containers.filter(
    (c) => allContainerNames.includes(c.name) && c.state === 'running'
  );
  const stoppedContainers = allContainerNames.filter(
    (name) => !containers.find((c) => c.name === name && c.state === 'running')
  );

  // Start all mutation
  const startAllMutation = useMutation({
    mutationFn: async () => {
      for (const name of stoppedContainers) {
        try {
          await startContainer(name);
        } catch {
          console.error(`Failed to start ${name}`);
        }
      }
    },
    onSuccess: () => refetch(),
  });

  // Stop all mutation
  const stopAllMutation = useMutation({
    mutationFn: async () => {
      for (const container of runningContainers) {
        try {
          await stopContainer(container.name);
        } catch {
          console.error(`Failed to stop ${container.name}`);
        }
      }
    },
    onSuccess: () => refetch(),
  });

  const appsList = apps.filter((app) => app.category === 'app');
  const explorerApps = apps.filter((app) => app.category === 'explorer');
  const anchorApps = apps.filter((app) => app.category === 'anchor');
  const kernelApps = apps.filter((app) => app.category === 'kernel');
  const networkApps = apps.filter((app) => app.category === 'network');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={AppWindow}
          iconColor="purple"
          title={t('apps.title')}
          subtitle={t('apps.subtitle')}
          actions={
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Tabs value={viewMode} onChange={handleViewModeChange}>
                <Tab value="grid" icon={LayoutGrid}>
                  {t('apps.gridView', 'Grid')}
                </Tab>
                <Tab value="list" icon={List}>
                  {t('apps.listView', 'List')}
                </Tab>
              </Tabs>

              <div className="w-px h-6 bg-border" />

              <ActionButton
                variant="start"
                loading={startAllMutation.isPending}
                onClick={() => startAllMutation.mutate()}
                disabled={startAllMutation.isPending || stoppedContainers.length === 0}
                label={t('apps.startAll')}
              />
              <ActionButton
                variant="stop"
                loading={stopAllMutation.isPending}
                onClick={() => stopAllMutation.mutate()}
                disabled={stopAllMutation.isPending || runningContainers.length === 0}
                label={t('apps.stopAll')}
              />
            </div>
          }
        />

        {/* Apps */}
        <section>
          <SectionHeader
            icon={AppWindow}
            iconColor="primary"
            title={t('sidebar.apps')}
            subtitle={t('apps.bitcoinApps')}
          />
          {viewMode === 'grid' ? (
            <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md" className="mt-4">
              {appsList.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  containers={containers}
                  onToggle={() => refetch()}
                  onShowLogs={(names) => setLogsContainers(names)}
                  onShowTerminal={(names) => setTerminalContainers(names)}
                  installStatus={getInstallStatus(app.id)}
                  onInstall={() => handleInstall(app.id)}
                  onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                  isRequired={isRequiredService(app.id, installedServices)}
                />
              ))}
            </Grid>
          ) : (
            <Section className="mt-4 p-0 overflow-hidden">
              {appsList.map((app) => (
                <AppListItem
                  key={app.id}
                  app={app}
                  containers={containers}
                  onToggle={() => refetch()}
                  onShowLogs={(names) => setLogsContainers(names)}
                  onShowTerminal={(names) => setTerminalContainers(names)}
                  installStatus={getInstallStatus(app.id)}
                  onInstall={() => handleInstall(app.id)}
                  onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                  isRequired={isRequiredService(app.id, installedServices)}
                />
              ))}
            </Section>
          )}
        </section>

        {/* Explorers */}
        {explorerApps.length > 0 && (
          <section>
            <SectionHeader
              icon={Search}
              iconColor="blue"
              title={t('sidebar.explorers')}
              subtitle={t('apps.blockchainExplorers')}
            />
            {viewMode === 'grid' ? (
              <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md" className="mt-4">
                {explorerApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={() => handleUninstall(app.id)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Grid>
            ) : (
              <Section className="mt-4 p-0 overflow-hidden">
                {explorerApps.map((app) => (
                  <AppListItem
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={() => handleUninstall(app.id)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Section>
            )}
          </section>
        )}

        {/* Kernel */}
        {kernelApps.length > 0 && (
          <section>
            <SectionHeader
              icon={Cpu}
              iconColor="orange"
              title={t('sidebar.kernel')}
              subtitle={t('apps.coreInfrastructure')}
            />
            {viewMode === 'grid' ? (
              <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md" className="mt-4">
                {kernelApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Grid>
            ) : (
              <Section className="mt-4 p-0 overflow-hidden">
                {kernelApps.map((app) => (
                  <AppListItem
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Section>
            )}
          </section>
        )}

        {/* Network */}
        {networkApps.length > 0 && (
          <section>
            <SectionHeader
              icon={Network}
              iconColor="purple"
              title={t('sidebar.network')}
              subtitle={t('apps.tunnelsVpn')}
            />
            {viewMode === 'grid' ? (
              <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md" className="mt-4">
                {networkApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Grid>
            ) : (
              <Section className="mt-4 p-0 overflow-hidden">
                {networkApps.map((app) => (
                  <AppListItem
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Section>
            )}
          </section>
        )}

        {/* Anchor Protocol */}
        {anchorApps.length > 0 && (
          <section>
            <SectionHeader
              icon={Anchor}
              iconColor="cyan"
              title={t('sidebar.protocol')}
              subtitle={t('apps.anchorProtocol')}
            />
            {viewMode === 'grid' ? (
              <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md" className="mt-4">
                {anchorApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Grid>
            ) : (
              <Section className="mt-4 p-0 overflow-hidden">
                {anchorApps.map((app) => (
                  <AppListItem
                    key={app.id}
                    app={app}
                    containers={containers}
                    onToggle={() => refetch()}
                    onShowLogs={(names) => setLogsContainers(names)}
                    onShowTerminal={(names) => setTerminalContainers(names)}
                    installStatus={getInstallStatus(app.id)}
                    onInstall={() => handleInstall(app.id)}
                    onUninstall={(removeContainers) => handleUninstall(app.id, removeContainers)}
                    isRequired={isRequiredService(app.id, installedServices)}
                  />
                ))}
              </Section>
            )}
          </section>
        )}
      </div>

      {/* Logs Modal */}
      <MultiLogsModal containerNames={logsContainers} onClose={() => setLogsContainers(null)} />

      {/* Terminal Modal */}
      <MultiTerminalModal
        containerNames={terminalContainers}
        onClose={() => setTerminalContainers(null)}
      />
    </>
  );
}
