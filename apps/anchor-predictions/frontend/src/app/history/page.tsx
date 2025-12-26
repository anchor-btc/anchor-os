"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  Trophy, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Coins,
  Users,
  CheckCircle,
  XCircle,
  ArrowUpRight
} from "lucide-react";
import { fetchHistory, type Market } from "@/lib/api";
import { cn, formatSats, formatPercent, shortenHash, resolutionColor } from "@/lib/utils";

function ResolvedMarketCard({ market }: { market: Market }) {
  const isYesWin = market.resolution === 1;
  
  return (
    <Link
      href={`/markets/${market.market_id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
          {market.question}
        </h3>
        <div className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shrink-0",
          resolutionColor(market.resolution)
        )}>
          {isYesWin ? (
            <CheckCircle className="w-4 h-4" />
          ) : market.resolution === 0 ? (
            <XCircle className="w-4 h-4" />
          ) : null}
          {market.resolution_name}
        </div>
      </div>

      {/* Final Odds */}
      <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/5">
        <p className="text-xs text-gray-500 mb-2">Final Odds</p>
        <div className="flex gap-4">
          <div className={cn(
            "flex-1 text-center py-2 rounded",
            isYesWin ? "bg-green-500/20 border border-green-500/30" : "bg-white/5"
          )}>
            <p className={cn("font-bold", isYesWin ? "text-green-400" : "text-gray-400")}>
              YES {formatPercent(market.yes_price)}
            </p>
          </div>
          <div className={cn(
            "flex-1 text-center py-2 rounded",
            market.resolution === 0 ? "bg-red-500/20 border border-red-500/30" : "bg-white/5"
          )}>
            <p className={cn("font-bold", market.resolution === 0 ? "text-red-400" : "text-gray-400")}>
              NO {formatPercent(market.no_price)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Coins className="w-4 h-4" />
            {formatSats(market.total_volume_sats)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {market.position_count} bets
          </span>
        </div>
        <span className="flex items-center gap-1 text-amber-400">
          View Details
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

export default function HistoryPage() {
  const { data: markets, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(50),
  });

  // Calculate stats
  const stats = markets ? {
    total: markets.length,
    yesWins: markets.filter(m => m.resolution === 1).length,
    noWins: markets.filter(m => m.resolution === 0).length,
    totalVolume: markets.reduce((sum, m) => sum + m.total_volume_sats, 0),
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-7 h-7 text-amber-400" />
          Market History
        </h1>
        <p className="text-gray-400 mt-1">Browse resolved prediction markets</p>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-gray-400 text-sm">Resolved Markets</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.yesWins}</p>
            <p className="text-gray-400 text-sm">YES Outcomes</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.noWins}</p>
            <p className="text-gray-400 text-sm">NO Outcomes</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{formatSats(stats.totalVolume)}</p>
            <p className="text-gray-400 text-sm">Total Volume</p>
          </div>
        </div>
      )}

      {/* Markets */}
      {isLoading ? (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <Loader2 className="w-8 h-8 mx-auto text-amber-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading history...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 mb-2">Failed to load history</p>
          <p className="text-gray-500 text-sm mb-4">{(error as Error)?.message || "Connection error"}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      ) : markets && markets.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {markets.map((market) => (
            <ResolvedMarketCard key={market.market_id} market={market} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No resolved markets yet</p>
          <p className="text-sm text-gray-500">
            Markets will appear here after they are resolved by oracles
          </p>
        </div>
      )}
    </div>
  );
}
