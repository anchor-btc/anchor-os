"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { mineBlocks, shortenHash, NodeStatus, NodeConfig } from "@/lib/api";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Section,
  SectionHeader,
  Grid,
  StatCard,
} from "@/components/ds";

interface NodeOverviewTabProps {
  status: NodeStatus | undefined;
  nodeConfig: NodeConfig | undefined;
  nodeRunning: boolean;
  refetch: () => void;
}

export function NodeOverviewTab({
  status,
  nodeConfig,
  nodeRunning,
  refetch,
}: NodeOverviewTabProps) {
  const { t } = useTranslation();
  const [blocksToMine, setBlocksToMine] = useState(1);

  const blockchain = status?.blockchain;
  const mempool = status?.mempool;
  const network = status?.network;

  const mineMutation = useMutation({
    mutationFn: () => mineBlocks(blocksToMine),
    onSuccess: () => {
      refetch();
    },
  });

  if (!nodeRunning) {
    return (
      <Section className="text-center py-12">
        <Bitcoin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t("node.notRunning")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t("node.startNodeCmd")}: <code className="bg-muted px-2 py-1 rounded">docker compose up -d core-bitcoin</code>
        </p>
      </Section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      {blockchain && network && (
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
      {blockchain?.chain === "regtest" && (
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

      {/* Detailed Info */}
      {blockchain && mempool && network && (
        <>
          <Grid cols={{ default: 1, lg: 2 }} gap="lg">
            {/* Blockchain Info */}
            <Section>
              <SectionHeader
                icon={Database}
                iconColor="blue"
                title={t("node.blockchainInfo")}
              />
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
              <SectionHeader
                icon={Zap}
                iconColor="yellow"
                title={t("node.mempoolInfo")}
              />
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
            <SectionHeader
              icon={Network}
              iconColor="cyan"
              title={t("node.networkInfo")}
            />
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

