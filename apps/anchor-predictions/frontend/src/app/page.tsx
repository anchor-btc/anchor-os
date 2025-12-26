"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Eye, 
  Plus, 
  BarChart3, 
  Users, 
  Coins, 
  CheckCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from "lucide-react";
import { fetchStats, fetchMarkets, type Market } from "@/lib/api";
import { cn, formatSats, formatPercent, shortenHash, statusColor, priceToColor } from "@/lib/utils";

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = "amber" 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  const colorClasses = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className={cn(
      "rounded-xl border p-5 backdrop-blur-sm",
      colorClasses[color as keyof typeof colorClasses] || colorClasses.amber
    )}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-sm opacity-60 mt-1">{subValue}</p>}
    </div>
  );
}

function MarketCard({ market }: { market: Market }) {
  const isYesFavored = market.yes_price > 0.5;
  
  return (
    <Link
      href={`/markets/${market.market_id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/50 hover:bg-white/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
          {market.question}
        </h3>
        <span className={cn("px-2 py-1 rounded text-xs font-medium shrink-0", statusColor(market.status))}>
          {market.status.toUpperCase()}
        </span>
      </div>

      {/* Probability Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-400 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            YES {formatPercent(market.yes_price)}
          </span>
          <span className="text-red-400 font-medium flex items-center gap-1">
            NO {formatPercent(market.no_price)}
            <ArrowDownRight className="w-4 h-4" />
          </span>
        </div>
        <div className="h-2 rounded-full bg-red-500/30 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${market.yes_price * 100}%` }}
          />
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
        <span className="text-xs text-gray-500">
          Block {market.resolution_block}
        </span>
      </div>
    </Link>
  );
}

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 p-8 mb-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,191,36,0.1),transparent_50%)]" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <TrendingUp className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Anchor Predictions</h1>
            <p className="text-amber-400/80">Binary Prediction Markets on Bitcoin</p>
          </div>
        </div>
        <p className="text-gray-300 max-w-2xl mb-6">
          Trade on real-world outcomes using Bitcoin. Markets are resolved by trusted oracles,
          with odds determined by an Automated Market Maker (AMM). Bet YES or NO on any question.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Market
          </Link>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            <Eye className="w-5 h-5" />
            Browse Markets
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: markets, isLoading: marketsLoading } = useQuery({
    queryKey: ["markets", "open"],
    queryFn: () => fetchMarkets("open", 6),
  });

  return (
    <div className="space-y-8">
      <HeroSection />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-4 text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
          </div>
        ) : (
          <>
            <StatCard
              icon={BarChart3}
              label="Active Markets"
              value={stats?.active_markets ?? 0}
              subValue={`${stats?.total_markets ?? 0} total`}
              color="amber"
            />
            <StatCard
              icon={Coins}
              label="Total Volume"
              value={formatSats(stats?.total_volume_sats ?? 0)}
              color="green"
            />
            <StatCard
              icon={Users}
              label="Total Bets"
              value={stats?.total_positions ?? 0}
              color="blue"
            />
            <StatCard
              icon={CheckCircle}
              label="Resolved"
              value={stats?.resolved_markets ?? 0}
              subValue={formatSats(stats?.total_payouts_sats ?? 0) + " paid"}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Active Markets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Active Markets
          </h2>
          <Link
            href="/markets"
            className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {marketsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading markets...</p>
          </div>
        ) : markets && markets.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <MarketCard key={market.market_id} market={market} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">No active markets</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create the first market
            </Link>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold mb-3">
              1
            </div>
            <h3 className="font-semibold text-white mb-2">Choose a Market</h3>
            <p className="text-gray-400 text-sm">
              Browse prediction markets or create your own question. Each market has a YES and NO outcome.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold mb-3">
              2
            </div>
            <h3 className="font-semibold text-white mb-2">Place Your Bet</h3>
            <p className="text-gray-400 text-sm">
              Bet on YES or NO. The AMM sets prices based on market sentiment. Earlier bets get better odds.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold mb-3">
              3
            </div>
            <h3 className="font-semibold text-white mb-2">Collect Winnings</h3>
            <p className="text-gray-400 text-sm">
              When the oracle resolves the market, winners can claim their payout. All on Bitcoin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
