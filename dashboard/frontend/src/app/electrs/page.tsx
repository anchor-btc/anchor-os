"use client";

import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Loader2,
  RefreshCw,
  Activity,
  Server,
  Database,
  Terminal,
  ScrollText,
  Link2,
  Blocks,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContainers, fetchContainerLogs } from "@/lib/api";
import { useState } from "react";

// Import DS components
import { PageHeader, RefreshButton } from "@/components/ds";

export default function ElectrsPage() {
  const { t } = useTranslation();
  const [showFullLogs, setShowFullLogs] = useState(false);

  const {
    data: containersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["electrs-logs"],
    queryFn: () => fetchContainerLogs("anchor-core-electrs"),
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];
  const electrsContainer = containers.find(
    (c) => c.name === "anchor-core-electrs"
  );
  const bitcoinContainer = containers.find(
    (c) => c.name === "anchor-core-bitcoin"
  );
  const isRunning = electrsContainer?.state === "running";
  const bitcoinRunning = bitcoinContainer?.state === "running";

  const logLines = logsData?.logs || [];
  const recentLogs = logLines.slice(-50);

  // Parse sync status from logs
  const syncInfo = parseSyncStatus(recentLogs);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Zap}
        iconColor="yellow"
        title={t("electrs.title")}
        subtitle={isRunning ? t("electrs.subtitle") : t("electrs.notRunning")}
        actions={
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
                <Activity className="w-4 h-4 animate-pulse" />
                Live
              </span>
            )}
            <RefreshButton loading={isRefetching} onClick={() => refetch()} />
          </div>
        }
      />

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Server className="w-5 h-5" />}
          label={t("node.status")}
          value={isRunning ? t("node.running") : t("node.stopped")}
          color={isRunning ? "green" : "red"}
          t={t}
        />
        <StatCard
          icon={<Link2 className="w-5 h-5" />}
          label={t("electrs.electrumPort")}
          value="50001"
          color="yellow"
          t={t}
        />
        <StatCard
          icon={<Blocks className="w-5 h-5" />}
          label={t("electrs.bitcoinNode")}
          value={bitcoinRunning ? t("electrs.connected") : t("electrs.disconnected")}
          color={bitcoinRunning ? "green" : "red"}
          t={t}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t("electrs.syncStatus")}
          value={syncInfo.synced ? t("electrs.synced") : t("electrs.syncing")}
          color={syncInfo.synced ? "green" : "yellow"}
          t={t}
        />
      </div>

      {/* Connection Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("electrs.connectionDetails")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("electrs.useDetails")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{t("electrs.internalHost")}</p>
            <p className="font-medium text-foreground font-mono text-sm">core-electrs:50001</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{t("electrs.externalHost")}</p>
            <p className="font-medium text-foreground font-mono text-sm">localhost:50001</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{t("electrs.protocol")}</p>
            <p className="font-medium text-foreground font-mono text-sm">TCP (Electrum Protocol)</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{t("electrs.network")}</p>
            <p className="font-medium text-foreground font-mono text-sm">regtest</p>
          </div>
        </div>
      </div>

      {/* Services Using Electrs */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("electrs.connectedServices")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("electrs.servicesUsing")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <p className="font-medium text-foreground">Mempool.space</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Full block explorer with address lookups and transaction search
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <p className="font-medium text-foreground">BTC RPC Explorer</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Lightweight explorer with address balance queries
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("electrs.features")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("electrs.capabilities")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            title={t("electrs.addressLookup")}
            description={t("electrs.addressLookupDesc")}
          />
          <FeatureCard
            title={t("electrs.utxoQueries")}
            description={t("electrs.utxoQueriesDesc")}
          />
          <FeatureCard
            title={t("electrs.transactionSearch")}
            description={t("electrs.transactionSearchDesc")}
          />
          <FeatureCard
            title={t("electrs.balanceQueries")}
            description={t("electrs.balanceQueriesDesc")}
          />
          <FeatureCard
            title={t("electrs.blockHeaders")}
            description={t("electrs.blockHeadersDesc")}
          />
          <FeatureCard
            title={t("electrs.merkleProofs")}
            description={t("electrs.merkleProofsDesc")}
          />
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("electrs.recentActivity")}</h2>
              <p className="text-sm text-muted-foreground">{t("electrs.latestLogs")}</p>
            </div>
          </div>
          <button
            onClick={() => setShowFullLogs(!showFullLogs)}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            {showFullLogs ? t("common.showLess") : t("common.showMore")}
          </button>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentLogs.length > 0 ? (
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
            {(showFullLogs ? recentLogs : recentLogs.slice(-8)).map((line, i) => (
              <div key={i} className="text-slate-300 py-0.5 whitespace-pre-wrap">
                {formatLogLine(line)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t("electrs.noLogs")}</p>
          </div>
        )}
      </div>

      {/* Not running message */}
      {!isRunning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("electrs.notRunningMsg")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("electrs.startWith")}:{" "}
            <code className="bg-muted px-2 py-1 rounded">
              docker compose up -d core-electrs
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "yellow" | "green" | "red" | "blue";
  t?: (key: string) => string;
}) {
  const colorClasses = {
    yellow: "bg-yellow-500/10 text-yellow-500",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    blue: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold font-tabular text-foreground">{value}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function parseSyncStatus(logs: string[]): { status: string; synced: boolean } {
  // Look for sync-related messages in logs
  const recentLogs = logs.slice(-20).join(" ");
  
  if (recentLogs.includes("synchronized") || recentLogs.includes("100%")) {
    return { status: "Synced", synced: true };
  }
  
  if (recentLogs.includes("indexing") || recentLogs.includes("syncing")) {
    return { status: "Syncing...", synced: false };
  }
  
  if (logs.length === 0) {
    return { status: "Unknown", synced: false };
  }
  
  return { status: "Ready", synced: true };
}

function formatLogLine(line: string): string {
  return line.replace(/\x1b\[[0-9;]*m/g, "").trim();
}
