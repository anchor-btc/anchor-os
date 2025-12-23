"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Loader2,
  Link2,
  Blocks,
  AlertTriangle,
  Layers,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchContainers,
  fetchContainerLogs,
  fetchElectrumStatus,
  setDefaultElectrumServer,
  electrumServerAction,
  ElectrumServer,
  ServerInfo,
} from "@/lib/api";
import { useState } from "react";

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Section,
  SectionHeader,
  Grid,
  ConfigValue,
  InfoBox,
  FeatureCard,
  ActionButton,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/components/ds";

export default function ElectrumPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showConfirmDefault, setShowConfirmDefault] = useState(false);
  const [targetServer, setTargetServer] = useState<ElectrumServer | null>(null);

  const {
    data: electrumStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isRefetching: statusRefetching,
  } = useQuery({
    queryKey: ["electrum-status"],
    queryFn: fetchElectrumStatus,
    refetchInterval: 5000,
  });

  const {
    data: containersData,
    isLoading: containersLoading,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  // Get logs from the default server
  const defaultServer = electrumStatus?.default_server || "electrs";
  const defaultContainer = defaultServer === "electrs" 
    ? "anchor-core-electrs" 
    : "anchor-core-fulcrum";

  const { data: logsData } = useQuery({
    queryKey: ["electrum-logs", defaultContainer],
    queryFn: () => fetchContainerLogs(defaultContainer),
    refetchInterval: 5000,
  });

  // Server action mutation (start/stop)
  const serverActionMutation = useMutation({
    mutationFn: ({ server, action }: { server: ElectrumServer; action: "start" | "stop" }) =>
      electrumServerAction(server, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electrum-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (server: ElectrumServer) => setDefaultElectrumServer(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electrum-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setShowConfirmDefault(false);
      setTargetServer(null);
    },
  });

  const containers = containersData?.containers || [];
  const bitcoinContainer = containers.find((c) => c.name === "anchor-core-bitcoin");
  const bitcoinRunning = bitcoinContainer?.state === "running";

  const logLines = logsData?.logs || [];
  const recentLogs = logLines.slice(-30);

  const handleSetDefaultClick = (server: ElectrumServer) => {
    if (server !== defaultServer) {
      setTargetServer(server);
      setShowConfirmDefault(true);
    }
  };

  const confirmSetDefault = () => {
    if (targetServer) {
      setDefaultMutation.mutate(targetServer);
    }
  };

  const handleStartStop = (server: ElectrumServer, isRunning: boolean) => {
    serverActionMutation.mutate({
      server,
      action: isRunning ? "stop" : "start",
    });
  };

  const handleCloseModal = () => {
    setShowConfirmDefault(false);
    setTargetServer(null);
  };

  if (statusLoading || containersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const electrs = electrumStatus?.electrs;
  const fulcrum = electrumStatus?.fulcrum;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Zap}
        iconColor="yellow"
        title={t("electrum.title", "Electrum Servers")}
        subtitle={t("electrum.subtitle", "Manage your Electrum servers - both can run simultaneously")}
        actions={
          <RefreshButton
            loading={statusRefetching}
            onClick={() => refetchStatus()}
          />
        }
      />

      {/* Server Cards */}
      <Grid cols={{ default: 1, lg: 2 }} gap="lg">
        {/* Electrs Card */}
        <ServerCard
          info={electrs}
          name="Electrs"
          description={t("electrum.electrsDesc", "Lightweight, fast sync, lower resource usage")}
          icon={Zap}
          color="yellow"
          onSetDefault={() => handleSetDefaultClick("electrs")}
          onStartStop={(isRunning) => handleStartStop("electrs", isRunning)}
          isActionPending={serverActionMutation.isPending}
          isSetDefaultPending={setDefaultMutation.isPending}
          t={t}
        />

        {/* Fulcrum Card */}
        <ServerCard
          info={fulcrum}
          name="Fulcrum"
          description={t("electrum.fulcrumDesc", "High-performance, faster queries, more features")}
          icon={Layers}
          color="emerald"
          onSetDefault={() => handleSetDefaultClick("fulcrum")}
          onStartStop={(isRunning) => handleStartStop("fulcrum", isRunning)}
          isActionPending={serverActionMutation.isPending}
          isSetDefaultPending={setDefaultMutation.isPending}
          t={t}
        />
      </Grid>

      {/* Connection Info */}
      <Section>
        <SectionHeader
          icon={Link2}
          iconColor="yellow"
          title={t("electrum.connectionInfo", "Connection Information")}
          subtitle={t("electrum.connectionDesc", "Use these details to connect to Electrum servers")}
        />

        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap="md">
          <ConfigValue
            label={t("electrum.electrsHost", "Electrs (Docker)")}
            value="core-electrs:50001"
            isDefault={defaultServer === "electrs"}
            mono
            copyable
          />
          <ConfigValue
            label={t("electrum.electrsExternal", "Electrs (External)")}
            value="localhost:50001"
            isDefault={defaultServer === "electrs"}
            mono
            copyable
          />
          <ConfigValue
            label={t("electrum.fulcrumHost", "Fulcrum (Docker)")}
            value="core-fulcrum:50002"
            isDefault={defaultServer === "fulcrum"}
            mono
            copyable
          />
          <ConfigValue
            label={t("electrum.fulcrumExternal", "Fulcrum (External)")}
            value="localhost:50002"
            isDefault={defaultServer === "fulcrum"}
            mono
            copyable
          />
        </Grid>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Blocks className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("electrum.bitcoinNode", "Bitcoin Node")}:
            </span>
            <span className={cn(
              "text-sm font-medium",
              bitcoinRunning ? "text-success" : "text-destructive"
            )}>
              {bitcoinRunning ? t("electrum.connected", "Connected") : t("electrum.disconnected", "Disconnected")}
            </span>
          </div>
        </div>
      </Section>

      {/* Default Server Info */}
      <InfoBox variant="info" icon={Star} title={t("electrum.defaultServer", "Default Server")}>
        <span className="text-primary font-medium">
          {defaultServer === "electrs" ? "Electrs" : "Fulcrum"}
        </span>
        {" - "}
        {t("electrum.defaultDesc", "Dependent services (Mempool, BTC RPC Explorer) use the default server.")}
      </InfoBox>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <Section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">
              {t("electrum.recentLogs", "Recent Logs")} ({defaultServer === "electrs" ? "Electrs" : "Fulcrum"})
            </h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {t("electrum.defaultLabel", "Default Server")}
            </span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
            {recentLogs.map((line, i) => (
              <div key={i} className="text-muted-foreground py-0.5">
                {line}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Confirm Set Default Modal */}
      <Modal open={showConfirmDefault} onClose={handleCloseModal}>
        <ModalHeader
          icon={AlertTriangle}
          iconColor="warning"
          title={t("electrum.confirmDefault", "Change Default Server?")}
        />
        <ModalContent>
          {t(
            "electrum.confirmDefaultDesc",
            "This will restart dependent services (Mempool, BTC RPC Explorer) to use the new server. The target server must be running."
          )}
        </ModalContent>
        <ModalFooter>
          <button
            onClick={handleCloseModal}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            onClick={confirmSetDefault}
            disabled={setDefaultMutation.isPending}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {setDefaultMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Star className="w-4 h-4" />
            )}
            {t("electrum.setDefault", "Set as Default")}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// Server Card Component (using FeatureCard internally)
import { LucideIcon } from "lucide-react";
import { TFunction } from "i18next";

function ServerCard({
  info,
  name,
  description,
  icon,
  color,
  onSetDefault,
  onStartStop,
  isActionPending,
  isSetDefaultPending,
  t,
}: {
  info: ServerInfo | undefined;
  name: string;
  description: string;
  icon: LucideIcon;
  color: "yellow" | "emerald";
  onSetDefault: () => void;
  onStartStop: (isRunning: boolean) => void;
  isActionPending: boolean;
  isSetDefaultPending: boolean;
  t: TFunction;
}) {
  const isRunning = info?.status === "running";
  const isDefault = info?.is_default || false;

  return (
    <FeatureCard
      icon={icon}
      color={color}
      title={name}
      subtitle={info?.status || "stopped"}
      description={description}
      isActive={isDefault}
      badge={t("electrum.default", "Default")}
      isRunning={isRunning}
      info={`Port ${info?.port || (color === "yellow" ? "50001" : "50002")}`}
      actions={
        <>
          <ActionButton
            variant={isRunning ? "stop" : "start"}
            loading={isActionPending}
            onClick={() => onStartStop(isRunning)}
            fullWidth
          />
          {!isDefault && (
            <button
              onClick={onSetDefault}
              disabled={isSetDefaultPending || !isRunning}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                isRunning
                  ? "bg-primary/10 hover:bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title={!isRunning ? t("electrum.startFirst", "Start the server first") : ""}
            >
              <Star className="w-4 h-4" />
              {t("electrum.setDefault", "Set Default")}
            </button>
          )}
        </>
      }
    />
  );
}
