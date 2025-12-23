"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchNodeStatus,
  mineBlocks,
  shortenHash,
  fetchNodeConfig,
  switchNodeVersion,
} from "@/lib/api";
import {
  Bitcoin,
  Loader2,
  Blocks,
  Network,
  HardDrive,
  Pickaxe,
  Database,
  Zap,
  Shield,
  Plus,
  Minus,
  Check,
  Settings,
  Terminal,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Section,
  SectionHeader,
  Grid,
  StatCard,
  InfoBox,
} from "@/components/ds";

export default function NodePage() {
  const { t } = useTranslation();
  const [blocksToMine, setBlocksToMine] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showCommand, setShowCommand] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["node-status"],
    queryFn: fetchNodeStatus,
    refetchInterval: 3000,
  });

  const {
    data: nodeConfig,
    isLoading: nodeConfigLoading,
  } = useQuery({
    queryKey: ["node-config"],
    queryFn: fetchNodeConfig,
    refetchInterval: 5000,
  });

  const mineMutation = useMutation({
    mutationFn: () => mineBlocks(blocksToMine),
    onSuccess: () => {
      refetch();
    },
  });

  const switchMutation = useMutation({
    mutationFn: ({ version, network }: { version: string; network: string }) =>
      switchNodeVersion(version, network),
    onSuccess: (data) => {
      if (data.requires_rebuild) {
        setShowCommand(true);
      }
      queryClient.invalidateQueries({ queryKey: ["node-config"] });
    },
  });

  // Set initial selected version from config
  if (nodeConfig && selectedVersion === null) {
    setSelectedVersion(nodeConfig.current_version || "30.0");
  }

  const handleSwitchVersion = () => {
    if (selectedVersion) {
      switchMutation.mutate({ version: selectedVersion, network: "regtest" });
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
  };

  if (isLoading && nodeConfigLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nodeRunning = nodeConfig?.is_running && status;
  const blockchain = status?.blockchain;
  const mempool = status?.mempool;
  const network = status?.network;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Bitcoin}
        iconColor="orange"
        title={t("node.title")}
        subtitle={
          nodeRunning && network
            ? `${network.subversion.replace(/\//g, "")} on ${blockchain?.chain}`
            : t("node.nodeNotRunning")
        }
        actions={
          <RefreshButton loading={isRefetching} onClick={() => refetch()} />
        }
      />

      {/* Version Selector */}
      {nodeConfig && (
        <Section>
          <SectionHeader
            icon={Settings}
            iconColor="orange"
            title={t("node.version")}
            subtitle={t("node.selectVersion")}
          />

          <Grid cols={{ default: 1, sm: 2, lg: 4 }} gap="sm">
            {nodeConfig.available_versions.map((ver) => (
              <VersionCard
                key={ver.version}
                version={ver.version}
                releaseDate={ver.release_date}
                features={ver.features}
                isDefault={ver.is_default}
                isActive={nodeConfig.current_version === ver.version && nodeConfig.is_running}
                isSelected={selectedVersion === ver.version}
                onSelect={() => setSelectedVersion(ver.version)}
                t={t}
              />
            ))}
          </Grid>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4">
            <button
              onClick={handleSwitchVersion}
              disabled={switchMutation.isPending || selectedVersion === nodeConfig.current_version}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {switchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Terminal className="w-4 h-4" />
              )}
              {t("node.getBuildCommand")}
            </button>

            {selectedVersion !== nodeConfig.current_version && (
              <span className="text-sm text-muted-foreground">
                {t("node.switchRequiresRebuild")}
              </span>
            )}
          </div>

          {/* Show build command */}
          {showCommand && switchMutation.data && (
            <div className="mt-4 p-4 bg-muted/50 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Run these commands to switch to v{switchMutation.data.version}:
                </span>
                <button
                  onClick={() => copyCommand(
                    `docker compose build --build-arg BITCOIN_VERSION=${switchMutation.data?.version} core-bitcoin && docker compose up -d core-bitcoin`
                  )}
                  className="p-1.5 hover:bg-muted rounded"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <pre className="text-sm text-muted-foreground font-mono bg-background p-3 rounded overflow-x-auto">
{`# Build with new version
docker compose build --build-arg BITCOIN_VERSION=${switchMutation.data.version} core-bitcoin

# Restart the node
docker compose up -d core-bitcoin`}
              </pre>
            </div>
          )}
        </Section>
      )}

      {/* Main Stats Grid - only show when node is running */}
      {nodeRunning && blockchain && network && (
        <Grid cols={{ default: 1, md: 2, lg: 4 }} gap="md">
          <StatCard
            icon={Blocks}
            label={t("node.blockHeight")}
            value={blockchain.blocks.toLocaleString()}
            color="orange"
          />
          <StatCard
            icon={Network}
            label={t("node.connections")}
            value={`${network.connections} (${network.connections_in}↓ ${network.connections_out}↑)`}
            color="blue"
          />
          <StatCard
            icon={HardDrive}
            label={t("node.diskUsage")}
            value={`${(blockchain.size_on_disk / 1024 / 1024).toFixed(1)} MB`}
            color="purple"
          />
          <StatCard
            icon={Shield}
            label={t("node.difficulty")}
            value={blockchain.difficulty.toExponential(2)}
            color="emerald"
          />
        </Grid>
      )}

      {/* Mining Section (for regtest) */}
      {nodeRunning && blockchain?.chain === "regtest" && (
        <Section>
          <SectionHeader
            icon={Pickaxe}
            iconColor="warning"
            title={t("node.mineBlocks")}
            subtitle={t("node.generateBlocks")}
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBlocksToMine(Math.max(1, blocksToMine - 1))}
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-lg font-bold font-tabular">
                {blocksToMine}
              </span>
              <button
                onClick={() => setBlocksToMine(Math.min(100, blocksToMine + 1))}
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => mineMutation.mutate()}
              disabled={mineMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-warning/10 hover:bg-warning/20 text-warning rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {mineMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pickaxe className="w-4 h-4" />
              )}
              {t("node.mineBlocks")} ({blocksToMine})
            </button>
          </div>

          {mineMutation.isSuccess && (
            <p className="mt-4 text-sm text-success">
              {t("node.successMined", { count: mineMutation.data?.blocks.length || 0 })}
            </p>
          )}
        </Section>
      )}

      {/* Detailed Info - only show when node is running */}
      {nodeRunning && blockchain && mempool && network && (
        <>
          <Grid cols={{ default: 1, lg: 2 }} gap="lg">
            {/* Blockchain Info */}
            <Section>
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-muted-foreground" />
                {t("node.blockchainInfo")}
              </h2>
              <div className="space-y-3">
                <InfoRow label={t("node.chain")} value={blockchain.chain} />
                <InfoRow label={t("node.blocks")} value={blockchain.blocks.toLocaleString()} />
                <InfoRow label={t("node.headers")} value={blockchain.headers.toLocaleString()} />
                <InfoRow
                  label={t("node.bestBlock")}
                  value={shortenHash(blockchain.bestblockhash, 12)}
                  mono
                />
                <InfoRow
                  label={t("node.verificationProgress")}
                  value={`${(blockchain.verificationprogress * 100).toFixed(2)}%`}
                />
                <InfoRow label={t("node.pruned")} value={blockchain.pruned ? t("common.yes") : t("common.no")} />
              </div>
            </Section>

            {/* Mempool Info */}
            <Section>
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-muted-foreground" />
                {t("node.mempoolInfo")}
              </h2>
              <div className="space-y-3">
                <InfoRow label={t("node.loaded")} value={mempool.loaded ? t("common.yes") : t("common.no")} />
                <InfoRow label={t("wallet.transactions")} value={mempool.size.toLocaleString()} />
                <InfoRow
                  label={t("node.size")}
                  value={`${(mempool.bytes / 1024).toFixed(2)} KB`}
                />
                <InfoRow
                  label={t("node.memoryUsage")}
                  value={`${(mempool.usage / 1024 / 1024).toFixed(2)} MB`}
                />
                <InfoRow
                  label={t("node.totalFees")}
                  value={`${mempool.total_fee.toFixed(8)} BTC`}
                />
                <InfoRow
                  label={t("node.minRelayFee")}
                  value={`${(mempool.minrelaytxfee * 100000000).toFixed(0)} sat/kB`}
                />
              </div>
            </Section>
          </Grid>

          {/* Network Info */}
          <Section>
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-muted-foreground" />
              {t("node.networkInfo")}
            </h2>
            <Grid cols={{ default: 1, md: 2, lg: 3 }} gap="md">
              <InfoRow label={t("node.version")} value={network.version.toString()} />
              <InfoRow
                label={t("node.subversion")}
                value={network.subversion.replace(/\//g, "")}
              />
              <InfoRow
                label={t("node.protocolVersion")}
                value={network.protocolversion.toString()}
              />
              <InfoRow
                label={t("node.connections")}
                value={network.connections.toString()}
              />
              <InfoRow
                label={t("node.inbound")}
                value={network.connections_in.toString()}
              />
              <InfoRow
                label={t("node.outbound")}
                value={network.connections_out.toString()}
              />
              <InfoRow
                label={t("node.networkActive")}
                value={network.networkactive ? t("common.yes") : t("common.no")}
              />
            </Grid>
          </Section>
        </>
      )}

      {/* Node not running message */}
      {!nodeRunning && (
        <Section className="text-center py-8">
          <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("node.notRunning")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("node.startNodeCmd")}: <code className="bg-muted px-2 py-1 rounded">docker compose up -d core-bitcoin</code>
          </p>
        </Section>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium text-foreground",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function VersionCard({
  version,
  releaseDate,
  features,
  isDefault,
  isActive,
  isSelected,
  onSelect,
  t,
}: {
  version: string;
  releaseDate: string;
  features: string[];
  isDefault: boolean;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string) => string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-4 rounded-xl border-2 text-left transition-all",
        isSelected
          ? "border-orange-500 bg-orange-500/5"
          : "border-border hover:border-muted-foreground/50",
        isActive && "ring-2 ring-success ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-orange-500" />
          <span className="font-bold text-foreground">v{version}</span>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">{releaseDate}</span>
        {isDefault && (
          <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">
            {t("node.default")}
          </span>
        )}
        {isActive && (
          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {t("node.running")}
          </span>
        )}
      </div>

      <ul className="text-xs text-muted-foreground space-y-1">
        {features.slice(0, 2).map((f, i) => (
          <li key={i} className="truncate">• {f}</li>
        ))}
      </ul>
    </button>
  );
}
