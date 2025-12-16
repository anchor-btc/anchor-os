"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchNodeStatus,
  mineBlocks,
  shortenHash,
} from "@/lib/api";
import {
  Bitcoin,
  Loader2,
  Blocks,
  Network,
  HardDrive,
  Clock,
  RefreshCw,
  Pickaxe,
  Database,
  Zap,
  Shield,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NodePage() {
  const [blocksToMine, setBlocksToMine] = useState(1);

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

  const mineMutation = useMutation({
    mutationFn: () => mineBlocks(blocksToMine),
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="text-center py-16">
        <Bitcoin className="w-12 h-12 text-error mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Node Unavailable
        </h2>
        <p className="text-muted-foreground">
          Could not connect to the Bitcoin node
        </p>
      </div>
    );
  }

  const { blockchain, mempool, network } = status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bitcoin Node</h1>
          <p className="text-muted-foreground">
            {network.subversion.replace(/\//g, "")} on {blockchain.chain}
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

      {/* Main Stats Grid */}
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

      {/* Mining Section (for regtest) */}
      {blockchain.chain === "regtest" && (
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

      {/* Detailed Info */}
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

