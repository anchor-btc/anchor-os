"use client";

import { useState } from "react";
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
  RefreshCw,
  Pickaxe,
  Database,
  Zap,
  Shield,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Settings,
  Terminal,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NodePage() {
  const [blocksToMine, setBlocksToMine] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showCommand, setShowCommand] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    error,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bitcoin Node</h1>
          <p className="text-muted-foreground">
            {nodeRunning && network
              ? `${network.subversion.replace(/\//g, "")} on ${blockchain?.chain}`
              : "Node not running"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          <RefreshCw
            className={cn(
              "w-4 h-4 text-muted-foreground",
              isRefetching && "animate-spin"
            )}
          />
        </button>
      </div>

      {/* Version Selector */}
      {nodeConfig && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Bitcoin Core Version</h2>
              <p className="text-sm text-muted-foreground">
                Select the version to run
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
              Get Build Command
            </button>

            {selectedVersion !== nodeConfig.current_version && (
              <span className="text-sm text-muted-foreground">
                Switching versions requires rebuilding the Docker image
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
                    `docker compose build --build-arg BITCOIN_VERSION=${switchMutation.data?.version} infra-bitcoin && docker compose up -d infra-bitcoin`
                  )}
                  className="p-1.5 hover:bg-muted rounded"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <pre className="text-sm text-muted-foreground font-mono bg-background p-3 rounded overflow-x-auto">
{`# Build with new version
docker compose build --build-arg BITCOIN_VERSION=${switchMutation.data.version} infra-bitcoin

# Restart the node
docker compose up -d infra-bitcoin`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Main Stats Grid - only show when node is running */}
      {nodeRunning && blockchain && network && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Blocks className="w-5 h-5" />}
            label="Block Height"
            value={blockchain.blocks.toLocaleString()}
            color="orange"
          />
          <StatCard
            icon={<Network className="w-5 h-5" />}
            label="Connections"
            value={`${network.connections} (${network.connections_in}↓ ${network.connections_out}↑)`}
            color="blue"
          />
          <StatCard
            icon={<HardDrive className="w-5 h-5" />}
            label="Disk Usage"
            value={`${(blockchain.size_on_disk / 1024 / 1024).toFixed(1)} MB`}
            color="purple"
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Difficulty"
            value={blockchain.difficulty.toExponential(2)}
            color="green"
          />
        </div>
      )}

      {/* Mining Section (for regtest) */}
      {nodeRunning && blockchain?.chain === "regtest" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Pickaxe className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Mine Blocks</h2>
              <p className="text-sm text-muted-foreground">
                Generate new blocks on regtest
              </p>
            </div>
          </div>

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
              Mine {blocksToMine} Block{blocksToMine > 1 ? "s" : ""}
            </button>
          </div>

          {mineMutation.isSuccess && (
            <p className="mt-4 text-sm text-success">
              Successfully mined {mineMutation.data?.blocks.length} block(s)!
            </p>
          )}
        </div>
      )}

      {/* Detailed Info - only show when node is running */}
      {nodeRunning && blockchain && mempool && network && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blockchain Info */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-muted-foreground" />
                Blockchain Info
              </h2>
              <div className="space-y-3">
                <InfoRow label="Chain" value={blockchain.chain} />
                <InfoRow label="Blocks" value={blockchain.blocks.toLocaleString()} />
                <InfoRow label="Headers" value={blockchain.headers.toLocaleString()} />
                <InfoRow
                  label="Best Block"
                  value={shortenHash(blockchain.bestblockhash, 12)}
                  mono
                />
                <InfoRow
                  label="Verification Progress"
                  value={`${(blockchain.verificationprogress * 100).toFixed(2)}%`}
                />
                <InfoRow label="Pruned" value={blockchain.pruned ? "Yes" : "No"} />
              </div>
            </div>

            {/* Mempool Info */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-muted-foreground" />
                Mempool Info
              </h2>
              <div className="space-y-3">
                <InfoRow label="Loaded" value={mempool.loaded ? "Yes" : "No"} />
                <InfoRow label="Transactions" value={mempool.size.toLocaleString()} />
                <InfoRow
                  label="Size"
                  value={`${(mempool.bytes / 1024).toFixed(2)} KB`}
                />
                <InfoRow
                  label="Memory Usage"
                  value={`${(mempool.usage / 1024 / 1024).toFixed(2)} MB`}
                />
                <InfoRow
                  label="Total Fees"
                  value={`${mempool.total_fee.toFixed(8)} BTC`}
                />
                <InfoRow
                  label="Min Relay Fee"
                  value={`${(mempool.minrelaytxfee * 100000000).toFixed(0)} sat/kB`}
                />
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-muted-foreground" />
              Network Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow label="Version" value={network.version.toString()} />
              <InfoRow
                label="Subversion"
                value={network.subversion.replace(/\//g, "")}
              />
              <InfoRow
                label="Protocol Version"
                value={network.protocolversion.toString()}
              />
              <InfoRow
                label="Connections"
                value={network.connections.toString()}
              />
              <InfoRow
                label="Inbound"
                value={network.connections_in.toString()}
              />
              <InfoRow
                label="Outbound"
                value={network.connections_out.toString()}
              />
              <InfoRow
                label="Network Active"
                value={network.networkactive ? "Yes" : "No"}
              />
            </div>
          </div>
        </>
      )}

      {/* Node not running message */}
      {!nodeRunning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Node Not Running
          </h2>
          <p className="text-muted-foreground mb-4">
            Start the Bitcoin node with: <code className="bg-muted px-2 py-1 rounded">docker compose up -d infra-bitcoin</code>
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
  color: "orange" | "blue" | "purple" | "green";
}) {
  const colorClasses = {
    orange: "bg-orange-500/10 text-orange-500",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    green: "bg-green-500/10 text-green-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 card-hover">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold font-tabular text-foreground">{value}</p>
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
}: {
  version: string;
  releaseDate: string;
  features: string[];
  isDefault: boolean;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
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
            Default
          </span>
        )}
        {isActive && (
          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Running
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
