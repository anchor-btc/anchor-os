"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  MessageSquare,
  Grid3X3,
  Image,
  MapPin,
  Globe,
  FileCheck,
  Coins,
  Activity,
  TrendingUp,
  Box,
  FileCode,
  Stamp,
  Leaf,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011";

interface MessageKindCount {
  kind: number;
  kind_name: string;
  count: number;
}

interface CarrierCount {
  carrier: number;
  carrier_name: string;
  count: number;
}

interface IndexerStats {
  total_messages: number;
  total_blocks_with_messages: number;
  messages_by_kind: MessageKindCount[];
  messages_by_carrier: CarrierCount[];
  recent_messages_24h: number;
  last_indexed_block: number | null;
}

async function fetchIndexerStats(): Promise<IndexerStats> {
  const res = await fetch(`${API_URL}/indexer/stats`);
  if (!res.ok) throw new Error("Failed to fetch indexer stats");
  return res.json();
}

const kindIcons: Record<string, React.ElementType> = {
  Text: MessageSquare,
  Pixel: Grid3X3,
  Image: Image,
  Map: MapPin,
  DNS: Globe,
  Proof: FileCheck,
  "Token Deploy": Coins,
  "Token Mint": Coins,
  "Token Transfer": Coins,
};

const kindColors: Record<string, string> = {
  Text: "text-orange-500 bg-orange-500/10",
  Pixel: "text-purple-500 bg-purple-500/10",
  Image: "text-pink-500 bg-pink-500/10",
  Map: "text-blue-500 bg-blue-500/10",
  DNS: "text-cyan-500 bg-cyan-500/10",
  Proof: "text-emerald-500 bg-emerald-500/10",
  "Token Deploy": "text-amber-500 bg-amber-500/10",
  "Token Mint": "text-amber-500 bg-amber-500/10",
  "Token Transfer": "text-amber-500 bg-amber-500/10",
};

const carrierIcons: Record<string, React.ElementType> = {
  "OP_RETURN": Box,
  "Inscription": FileCode,
  "Stamps": Stamp,
  "Taproot Annex": Leaf,
  "Witness Data": Eye,
};

const carrierColors: Record<string, string> = {
  "OP_RETURN": "text-blue-500 bg-blue-500/10",
  "Inscription": "text-orange-500 bg-orange-500/10",
  "Stamps": "text-pink-500 bg-pink-500/10",
  "Taproot Annex": "text-green-500 bg-green-500/10",
  "Witness Data": "text-purple-500 bg-purple-500/10",
};

export function IndexerStatsWidget() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["indexer-stats"],
    queryFn: fetchIndexerStats,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Link href="/indexer" className="block">
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Anchor Indexer</p>
              <p className="text-sm text-muted-foreground">Unavailable</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const totalMessages = stats.total_messages;
  const topKinds = stats.messages_by_kind.slice(0, 4);
  const topCarriers = stats.messages_by_carrier || [];

  return (
    <Link href="/indexer" className="block">
      <div className="bg-card border border-border rounded-xl overflow-hidden card-hover">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Anchor Indexer</p>
                <p className="text-sm font-medium text-foreground">Protocol Messages</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-success">
              <Activity className="w-2.5 h-2.5 animate-pulse" />
              Live
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="py-2 px-3 text-center">
            <p className="text-sm font-bold font-tabular text-foreground">
              {totalMessages.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Messages</p>
          </div>
          <div className="py-2 px-3 text-center">
            <p className="text-sm font-bold font-tabular text-foreground">
              {stats.total_blocks_with_messages.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Blocks</p>
          </div>
          <div className="py-2 px-3 text-center">
            <p className="text-sm font-bold font-tabular text-foreground">
              {stats.last_indexed_block?.toLocaleString() || "-"}
            </p>
            <p className="text-[10px] text-muted-foreground">Last Block</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          {/* Message Types */}
          <div className="p-3">
            <div className="flex items-center gap-1 mb-2 text-[10px] text-muted-foreground">
              <TrendingUp className="w-2.5 h-2.5" />
              Message Types
            </div>
            <div className="space-y-1">
              {topKinds.map((kind) => {
                const Icon = kindIcons[kind.kind_name] || MessageSquare;
                const colorClass = kindColors[kind.kind_name] || "text-gray-500 bg-gray-500/10";
                
                return (
                  <div key={kind.kind} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center", colorClass)}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] text-foreground">{kind.kind_name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-tabular">
                      {kind.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Carrier Types */}
          <div className="p-3">
            <div className="flex items-center gap-1 mb-2 text-[10px] text-muted-foreground">
              <Box className="w-2.5 h-2.5" />
              Carrier Types
            </div>
            <div className="space-y-1">
              {topCarriers.map((carrier) => {
                const Icon = carrierIcons[carrier.carrier_name] || Box;
                const colorClass = carrierColors[carrier.carrier_name] || "text-gray-500 bg-gray-500/10";
                const percentage = totalMessages > 0 
                  ? ((carrier.count / totalMessages) * 100).toFixed(0)
                  : "0";
                
                return (
                  <div key={carrier.carrier} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center", colorClass)}>
                        <Icon className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] text-foreground">{carrier.carrier_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{percentage}%</span>
                      <span className="text-[10px] text-muted-foreground font-tabular">
                        {carrier.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
