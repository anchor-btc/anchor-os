"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchContainers, 
  startContainer, 
  stopContainer,
  fetchInstallationStatus,
  fetchAvailableServices,
  installService,
  uninstallService,
  ServiceInstallStatus,
} from "@/lib/api";
import { apps } from "@/lib/apps";
import { AppCard } from "@/components/app-card";
import { MultiLogsModal } from "@/components/multi-logs-modal";
import { MultiTerminalModal } from "@/components/multi-terminal-modal";
import { isRequiredService } from "@/lib/service-rules";
import { Loader2, AppWindow, Search, Network, Play, Square, Zap, Anchor, Database, Activity } from "lucide-react";

export default function AppsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [logsContainers, setLogsContainers] = useState<string[] | null>(null);
  const [terminalContainers, setTerminalContainers] = useState<string[] | null>(null);
  const [installingService, setInstallingService] = useState<string | null>(null);

  const {
    data: containersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 3000,
  });

  // Fetch installation status to know which services are installed
  const { data: installationStatus } = useQuery({
    queryKey: ["installation-status"],
    queryFn: fetchInstallationStatus,
    refetchInterval: 5000,
  });

  // Fetch available services for more details
  const { data: servicesData } = useQuery({
    queryKey: ["available-services"],
    queryFn: fetchAvailableServices,
  });

  const containers = containersData?.containers || [];
  const installedServices = installationStatus?.installed_services || [];
  const services = servicesData?.services || [];

  // Helper to get install status for an app
  // App IDs in apps.ts are already the service IDs (e.g., "app-dns", "core-bitcoin")
  const getInstallStatus = (appId: string): ServiceInstallStatus => {
    if (installingService === appId) return "installing";
    if (installedServices.includes(appId)) return "installed";
    
    // Check if service exists in available services (meaning it can be installed)
    const serviceExists = services.find(s => s.id === appId);
    if (serviceExists) return "not_installed";
    
    return "installed"; // Default for unknown services
  };

  // Install service mutation
  const installMutation = useMutation({
    mutationFn: async (appId: string) => {
      setInstallingService(appId);
      return installService(appId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setInstallingService(null);
    },
    onError: () => {
      setInstallingService(null);
    },
  });

  // Uninstall service mutation
  const uninstallMutation = useMutation({
    mutationFn: async ({ serviceId, removeContainers }: { serviceId: string; removeContainers: boolean }) => {
      return uninstallService(serviceId, removeContainers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const handleInstall = (appId: string) => {
    installMutation.mutate(appId);
  };

  const handleUninstall = async (appId: string, removeContainers?: boolean) => {
    await uninstallMutation.mutateAsync({ serviceId: appId, removeContainers: removeContainers ?? false });
  };

  // Get all container names from all apps
  const allContainerNames = apps.flatMap((app) => app.containers);
  
  // Count running/stopped
  const runningContainers = containers.filter(
    (c) => allContainerNames.includes(c.name) && c.state === "running"
  );
  const stoppedContainers = allContainerNames.filter(
    (name) => !containers.find((c) => c.name === name && c.state === "running")
  );

  // Start all mutation
  const startAllMutation = useMutation({
    mutationFn: async () => {
      // Start containers sequentially to avoid overwhelming Docker
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
      // Stop containers sequentially
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

  const appsList = apps.filter((app) => app.category === "app");
  const explorerApps = apps.filter((app) => app.category === "explorer");
  const networkingApps = apps.filter((app) => app.category === "networking");
  const electrumApps = apps.filter((app) => app.category === "electrum");
  const anchorApps = apps.filter((app) => app.category === "anchor");
  const storageApps = apps.filter((app) => app.category === "storage");
  const monitoringApps = apps.filter((app) => app.category === "monitoring");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("apps.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("apps.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startAllMutation.mutate()}
              disabled={startAllMutation.isPending || stoppedContainers.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-success/10 hover:bg-success/20 text-success rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {t("apps.startAll")}
            </button>
            <button
              onClick={() => stopAllMutation.mutate()}
              disabled={stopAllMutation.isPending || runningContainers.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stopAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {t("apps.stopAll")}
            </button>
          </div>
        </div>

        {/* Apps */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AppWindow className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{t("sidebar.apps")}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {t("apps.bitcoinApps")}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          </div>
        </section>

        {/* Explorers */}
        {explorerApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.explorers")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.blockchainExplorers")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            </div>
          </section>
        )}

        {/* Networking */}
        {networkingApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.networking")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.tunnelsVpn")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {networkingApps.map((app) => (
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
            </div>
          </section>
        )}

        {/* Electrum Servers */}
        {electrumApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.electrum")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.electrumServers")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {electrumApps.map((app) => (
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
            </div>
          </section>
        )}

        {/* Anchor Protocol */}
        {anchorApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Anchor className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.protocol")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.anchorProtocol")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            </div>
          </section>
        )}

        {/* Storage */}
        {storageApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.storage")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.storageServices")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {storageApps.map((app) => (
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
            </div>
          </section>
        )}

        {/* Monitoring */}
        {monitoringApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">{t("sidebar.monitoring")}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {t("apps.monitoringServices")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {monitoringApps.map((app) => (
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
            </div>
          </section>
        )}

      </div>

      {/* Logs Modal (with tabs for multiple containers) */}
      <MultiLogsModal
        containerNames={logsContainers}
        onClose={() => setLogsContainers(null)}
      />

      {/* Terminal Modal (with tabs for multiple containers) */}
      <MultiTerminalModal
        containerNames={terminalContainers}
        onClose={() => setTerminalContainers(null)}
      />
    </>
  );
}
