"use client";

import Link from "next/link";
import { Star, CheckCircle, AlertCircle, Coins } from "lucide-react";
import { cn, shortenPubkey, formatSats } from "@/lib/utils";
import type { Oracle } from "@/lib/api";

interface OracleCardProps {
  oracle: Oracle;
}

export function OracleCard({ oracle }: OracleCardProps) {
  const successRate = oracle.total_attestations > 0
    ? Math.round((oracle.successful_attestations / oracle.total_attestations) * 100)
    : 100;

  return (
    <Link href={`/oracles/${oracle.pubkey}`}>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-purple-500/50 hover:bg-white/[0.07] transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">{oracle.name}</h3>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {shortenPubkey(oracle.pubkey)}
            </p>
          </div>
          <div className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            oracle.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
          )}>
            {oracle.status}
          </div>
        </div>

        {oracle.description && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{oracle.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-3">
          {oracle.category_names.map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400">
              <Star className="w-3 h-3" />
              <span className="text-sm font-medium">{oracle.reputation_score.toFixed(0)}</span>
            </div>
            <p className="text-xs text-gray-500">Rep</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span className="text-sm font-medium">{successRate}%</span>
            </div>
            <p className="text-xs text-gray-500">Success</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <AlertCircle className="w-3 h-3" />
              <span className="text-sm font-medium">{oracle.total_attestations}</span>
            </div>
            <p className="text-xs text-gray-500">Attests</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Coins className="w-3 h-3" />
              <span className="text-sm font-medium">{formatSats(oracle.stake_sats)}</span>
            </div>
            <p className="text-xs text-gray-500">Stake</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

