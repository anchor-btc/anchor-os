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
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeftRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchContainers,
  fetchContainerLogs,
  fetchElectrumStatus,
  switchElectrumServer,
  ElectrumServer,
} from "@/lib/api";
import { useState } from "react";

export default function ElectrumPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
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

  const activeServer = electrumStatus?.active_server;
  const activeContainer = activeServer === "electrs" 
    ? "anchor-core-electrs" 
    : activeServer === "fulcrum" 
      ? "anchor-core-fulcrum" 
      : null;

  const { data: logsData } = useQuery({
    queryKey: ["electrum-logs", activeContainer],
    queryFn: async () => {
      if (!activeContainer) return { container_id: "", logs: [] as string[] };
      return fetchContainerLogs(activeContainer);
    },
    refetchInterval: 5000,
    enabled: !!activeContainer,
  });

  const switchMutation = useMutation({
    mutationFn: (server: ElectrumServer) => switchElectrumServer(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electrum-status"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setShowConfirmSwitch(false);
      setTargetServer(null);
    },
  });

  const containers = containersData?.containers || [];
  const electrsContainer = containers.find((c) => c.name === "anchor-core-electrs");
  const fulcrumContainer = containers.find((c) => c.name === "anchor-core-fulcrum");
  const bitcoinContainer = containers.find((c) => c.name === "anchor-core-bitcoin");

  const isRunning = activeServer !== null;
  const bitcoinRunning = bitcoinContainer?.state === "running";

  const logLines = logsData?.logs || [];
  const recentLogs = logLines.slice(-30);

  const handleSwitchClick = (server: ElectrumServer) => {
    if (server !== activeServer) {
      setTargetServer(server);
      setShowConfirmSwitch(true);
    }
  };

  const confirmSwitch = () => {
    if (targetServer) {
      switchMutation.mutate(targetServer);
    }
  };

  if (statusLoading || containersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-7 h-7 text-yellow-500" />
            {t("electrum.title", "Electrum Server")}
          </h1>
          <p className="text-muted-foreground">
            {t("electrum.subtitle", "Choose and manage your Electrum server")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
              <Activity className="w-4 h-4 animate-pulse" />
              {t("electrs.live", "Live")}
            </span>
          )}
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

      {/* Server Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Electrs Card */}
        <button
          onClick={() => handleSwitchClick("electrs")}
          disabled={switchMutation.isPending}
          className={cn(
            "relative p-6 rounded-xl border-2 transition-all text-left",
            activeServer === "electrs"
              ? "bg-yellow-500/10 border-yellow-500"
              : "bg-card border-border hover:border-muted-foreground/50"
          )}
        >
          {activeServer === "electrs" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-yellow-500" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              activeServer === "electrs" ? "bg-yellow-500/20" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-6 h-6",
                activeServer === "electrs" ? "text-yellow-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {t("electrum.electrs", "Electrs")}
              </h3>
              <p className={cn(
                "text-xs",
                electrsContainer?.state === "running" ? "text-success" : "text-muted-foreground"
              )}>
                {electrsContainer?.state || "stopped"}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("electrum.electrsDesc", "Lightweight, fast sync, lower resource usage")}
          </p>
        </button>

        {/* Fulcrum Card */}
        <button
          onClick={() => handleSwitchClick("fulcrum")}
          disabled={switchMutation.isPending}
          className={cn(
            "relative p-6 rounded-xl border-2 transition-all text-left",
            activeServer === "fulcrum"
              ? "bg-emerald-500/10 border-emerald-500"
              : "bg-card border-border hover:border-muted-foreground/50"
          )}
        >
          {activeServer === "fulcrum" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              activeServer === "fulcrum" ? "bg-emerald-500/20" : "bg-muted"
            )}>
              <Layers className={cn(
                "w-6 h-6",
                activeServer === "fulcrum" ? "text-emerald-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {t("electrum.fulcrum", "Fulcrum")}
              </h3>
              <p className={cn(
                "text-xs",
                fulcrumContainer?.state === "running" ? "text-success" : "text-muted-foreground"
              )}>
                {fulcrumContainer?.state || "stopped"}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("electrum.fulcrumDesc", "Full-featured, faster queries, higher resource usage")}
          </p>
        </button>
      </div>

      {/* Switching in progress */}
      {switchMutation.isPending && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-warning animate-spin" />
          <div>
            <p className="font-medium text-warning">
              {t("electrum.switching", "Switching servers...")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("electrum.switchingDesc", "Restarting dependent services...")}
            </p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Server className="w-5 h-5" />}
          label={t("electrum.activeServer", "Active Server")}
          value={activeServer ? (activeServer === "electrs" ? "Electrs" : "Fulcrum") : t("node.stopped", "Stopped")}
          color={isRunning ? "green" : "red"}
        />
        <StatCard
          icon={<Link2 className="w-5 h-5" />}
          label={t("electrs.electrumPort", "Electrum Port")}
          value="50001"
          color="yellow"
        />
        <StatCard
          icon={<Blocks className="w-5 h-5" />}
          label={t("electrs.bitcoinNode", "Bitcoin Node")}
          value={bitcoinRunning ? t("electrs.connected", "Connected") : t("electrs.disconnected", "Disconnected")}
          color={bitcoinRunning ? "green" : "red"}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t("electrs.syncStatus", "Sync Status")}
          value={isRunning ? t("electrs.ready", "Ready") : t("electrs.unknown", "Unknown")}
          color={isRunning ? "green" : "yellow"}
        />
      </div>

      {/* Connection Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {t("electrs.connectionDetails", "Connection Details")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("electrs.useDetails", "Use these details to connect to the Electrum server")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {t("electrs.internalHost", "Internal Host (Docker)")}
            </p>
            <p className="font-medium text-foreground font-mono text-sm">
              {activeServer === "fulcrum" ? "core-fulcrum:50001" : "core-electrs:50001"}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {t("electrs.externalHost", "External Host")}
            </p>
            <p className="font-medium text-foreground font-mono text-sm">localhost:50001</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {t("electrs.protocol", "Protocol")}
            </p>
            <p className="font-medium text-foreground font-mono text-sm">TCP (Electrum)</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {t("electrs.network", "Network")}
            </p>
            <p className="font-medium text-foreground font-mono text-sm">regtest</p>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      {isRunning && recentLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">
            {t("electrs.recentActivity", "Recent Activity")}
          </h2>
          <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
            {recentLogs.map((line, i) => (
              <div key={i} className="text-muted-foreground py-0.5">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Switch Modal */}
      {showConfirmSwitch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t("electrum.confirmSwitch", "Switch Server?")}
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                "electrum.switchConfirm",
                "This will restart dependent services (Mempool, BTC RPC Explorer). Continue?"
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmSwitch(false);
                  setTargetServer(null);
                }}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={confirmSwitch}
                disabled={switchMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {switchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4" />
                )}
                {t("electrum.switch", "Switch")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "blue";
}) {
  const colorClasses = {
    green: "text-success bg-success/10",
    red: "text-destructive bg-destructive/10",
    yellow: "text-warning bg-warning/10",
    blue: "text-primary bg-primary/10",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
