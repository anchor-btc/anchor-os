"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchNodeStatus, shortenHash } from "@/lib/api";
import { Bitcoin, Loader2, Blocks, Network, HardDrive, Clock } from "lucide-react";
import Link from "next/link";

export function NodeStats() {
  const { t } = useTranslation();
  const { data: status, isLoading, error } = useQuery({
    queryKey: ["node-status"],
    queryFn: fetchNodeStatus,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-14">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 text-error">
          <Bitcoin className="w-4 h-4" />
          <span className="text-sm">{t("widgets.nodeUnavailable")}</span>
        </div>
      </div>
    );
  }

  const { blockchain, mempool, network } = status;

  return (
    <Link href="/node" className="block">
      <div className="bg-card border border-border rounded-xl p-4 card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Bitcoin className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("widgets.bitcoinNode")}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {network.subversion.replace(/\//g, "")}
              </p>
            </div>
          </div>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded uppercase">
            {blockchain.chain}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <StatItem
            icon={<Blocks className="w-3.5 h-3.5" />}
            label={t("widgets.blockHeight")}
            value={blockchain.blocks.toLocaleString()}
          />
          <StatItem
            icon={<Network className="w-3.5 h-3.5" />}
            label={t("widgets.connections")}
            value={network.connections.toString()}
          />
          <StatItem
            icon={<HardDrive className="w-3.5 h-3.5" />}
            label={t("widgets.mempool")}
            value={`${mempool.size} txs`}
          />
          <StatItem
            icon={<Clock className="w-3.5 h-3.5" />}
            label={t("widgets.bestBlock")}
            value={shortenHash(blockchain.bestblockhash, 4)}
          />
        </div>
      </div>
    </Link>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium font-tabular text-foreground">{value}</p>
      </div>
    </div>
  );
}
