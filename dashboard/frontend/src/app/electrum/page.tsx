"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Loader2,
  RefreshCw,
  Activity,
  Server,
  Link2,
  Blocks,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Play,
  Square,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-7 h-7 text-yellow-500" />
            {t("electrum.title", "Electrum Servers")}
          </h1>
          <p className="text-muted-foreground">
            {t("electrum.subtitle", "Manage your Electrum servers - both can run simultaneously")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchStatus()}
            disabled={statusRefetching}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-muted-foreground",
                statusRefetching && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      {/* Server Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Electrs Card */}
        <ServerCard
          info={electrs}
          name="Electrs"
          description={t("electrum.electrsDesc", "Lightweight, fast sync, lower resource usage")}
          icon={<Zap className="w-6 h-6" />}
          color="yellow"
          onSetDefault={() => handleSetDefaultClick("electrs")}
          onStartStop={(isRunning) => handleStartStop("electrs", isRunning)}
          isActionPending={serverActionMutation.isPending}
          isSetDefaultPending={setDefaultMutation.isPending}
        />

        {/* Fulcrum Card */}
        <ServerCard
          info={fulcrum}
          name="Fulcrum"
          description={t("electrum.fulcrumDesc", "High-performance, faster queries, more features")}
          icon={<Layers className="w-6 h-6" />}
          color="emerald"
          onSetDefault={() => handleSetDefaultClick("fulcrum")}
          onStartStop={(isRunning) => handleStartStop("fulcrum", isRunning)}
          isActionPending={serverActionMutation.isPending}
          isSetDefaultPending={setDefaultMutation.isPending}
        />
      </div>

      {/* Connection Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {t("electrum.connectionInfo", "Connection Information")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("electrum.connectionDesc", "Use these details to connect to Electrum servers")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ConnectionInfo
            label={t("electrum.electrsHost", "Electrs (Docker)")}
            value="core-electrs:50001"
            isDefault={defaultServer === "electrs"}
          />
          <ConnectionInfo
            label={t("electrum.electrsExternal", "Electrs (External)")}
            value="localhost:50001"
            isDefault={defaultServer === "electrs"}
          />
          <ConnectionInfo
            label={t("electrum.fulcrumHost", "Fulcrum (Docker)")}
            value="core-fulcrum:50002"
            isDefault={defaultServer === "fulcrum"}
          />
          <ConnectionInfo
            label={t("electrum.fulcrumExternal", "Fulcrum (External)")}
            value="localhost:50002"
            isDefault={defaultServer === "fulcrum"}
          />
        </div>

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
      </div>

      {/* Default Server Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              {t("electrum.defaultServer", "Default Server")}: <span className="text-primary">{defaultServer === "electrs" ? "Electrs" : "Fulcrum"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("electrum.defaultDesc", "Dependent services (Mempool, BTC RPC Explorer) use the default server.")}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
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
        </div>
      )}

      {/* Confirm Set Default Modal */}
      {showConfirmDefault && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t("electrum.confirmDefault", "Change Default Server?")}
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                "electrum.confirmDefaultDesc",
                "This will restart dependent services (Mempool, BTC RPC Explorer) to use the new server. The target server must be running."
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDefault(false);
                  setTargetServer(null);
                }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Server Card Component
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
}: {
  info: ServerInfo | undefined;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: "yellow" | "emerald";
  onSetDefault: () => void;
  onStartStop: (isRunning: boolean) => void;
  isActionPending: boolean;
  isSetDefaultPending: boolean;
}) {
  const { t } = useTranslation();
  const isRunning = info?.status === "running";
  const isDefault = info?.is_default || false;

  const colorClasses = {
    yellow: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500",
      text: "text-yellow-500",
      iconBg: "bg-yellow-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500",
      text: "text-emerald-500",
      iconBg: "bg-emerald-500/20",
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 transition-all",
        isDefault ? `${colors.bg} ${colors.border}` : "bg-card border-border"
      )}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isDefault ? colors.iconBg : "bg-muted"
            )}>
              <div className={cn(isDefault ? colors.text : "text-muted-foreground")}>
                {icon}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground">{name}</h3>
                {isDefault && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                    {t("electrum.default", "Default")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  isRunning ? "text-success" : "text-muted-foreground"
                )}>
                  {isRunning && <Activity className="w-3 h-3 animate-pulse" />}
                  {info?.status || "stopped"}
                </span>
                <span className="text-xs text-muted-foreground">
                  • Port {info?.port || (color === "yellow" ? "50001" : "50002")}
                </span>
              </div>
            </div>
          </div>
          {isDefault && (
            <CheckCircle2 className={cn("w-5 h-5", colors.text)} />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-2">
        <button
          onClick={() => onStartStop(isRunning)}
          disabled={isActionPending}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            isRunning
              ? "bg-destructive/10 hover:bg-destructive/20 text-destructive"
              : "bg-success/10 hover:bg-success/20 text-success"
          )}
        >
          {isActionPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRunning ? (
            <>
              <Square className="w-4 h-4" />
              {t("electrum.stop", "Stop")}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t("electrum.start", "Start")}
            </>
          )}
        </button>
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
      </div>
    </div>
  );
}

// Connection Info Component
function ConnectionInfo({
  label,
  value,
  isDefault,
}: {
  label: string;
  value: string;
  isDefault: boolean;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg",
      isDefault ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
    )}>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {isDefault && <Star className="w-3 h-3 text-primary" />}
      </p>
      <p className="font-medium text-foreground font-mono text-sm">{value}</p>
    </div>
  );
}
