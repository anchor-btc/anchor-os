"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNodeStatus, shortenHash } from "@/lib/api";
import { Bitcoin, Loader2, Blocks, Network, HardDrive, Clock } from "lucide-react";
import Link from "next/link";

export function NodeStats() {
  const { data: status, isLoading, error } = useQuery({
    queryKey: ["node-status"],
    queryFn: fetchNodeStatus,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center gap-3 text-error">
          <Bitcoin className="w-5 h-5" />
          <span className="text-sm">Node unavailable</span>
        </div>
      </div>
    );
  }

  const { blockchain, mempool, network } = status;

  return (
    <Link href="/node" className="block">
      <div className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bitcoin Node</p>
              <p className="text-xs text-muted-foreground font-mono">
                {network.subversion.replace(/\//g, "")}
              </p>
            </div>
          </div>
          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md uppercase">
            {blockchain.chain}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatItem
            icon={<Blocks className="w-4 h-4" />}
            label="Block Height"
            value={blockchain.blocks.toLocaleString()}
          />
          <StatItem
            icon={<Network className="w-4 h-4" />}
            label="Connections"
            value={network.connections.toString()}
          />
          <StatItem
            icon={<HardDrive className="w-4 h-4" />}
            label="Mempool"
            value={`${mempool.size} txs`}
          />
          <StatItem
            icon={<Clock className="w-4 h-4" />}
            label="Best Block"
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
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium font-tabular text-foreground">{value}</p>
      </div>
    </div>
  );
}

