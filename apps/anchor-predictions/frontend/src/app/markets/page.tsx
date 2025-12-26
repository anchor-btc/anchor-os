'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Coins,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
} from 'lucide-react';
import { fetchMarkets, type Market } from '@/lib/api';
import { cn, formatSats, formatPercent, statusColor } from '@/lib/utils';

function MarketCard({ market }: { market: Market }) {
  return (
    <Link
      href={`/markets/${market.market_id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/50 hover:bg-white/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
          {market.question}
        </h3>
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium shrink-0',
            statusColor(market.status)
          )}
        >
          {market.status.toUpperCase()}
        </span>
      </div>

      {market.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{market.description}</p>
      )}

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
        <div className="h-3 rounded-full bg-red-500/30 overflow-hidden">
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
        <span className="text-xs text-gray-500">Resolves @ block {market.resolution_block}</span>
      </div>
    </Link>
  );
}

export default function MarketsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: markets,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['markets', statusFilter],
    queryFn: () => fetchMarkets(statusFilter, 100),
  });

  const filteredMarkets = markets?.filter((m) =>
    m.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-amber-400" />
            Prediction Markets
          </h1>
          <p className="text-gray-400 mt-1">Browse and bet on real-world outcomes</p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Market
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {[
              { value: undefined, label: 'All' },
              { value: 'open', label: 'Active' },
              { value: 'resolved', label: 'Resolved' },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  statusFilter === option.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      {isLoading ? (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <Loader2 className="w-8 h-8 mx-auto text-amber-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading markets...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 mb-2">Failed to load markets</p>
          <p className="text-gray-500 text-sm mb-4">
            {(error as Error)?.message || 'Connection error'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      ) : filteredMarkets && filteredMarkets.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.market_id} market={market} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <TrendingUp className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-4">
            {searchQuery ? 'No markets match your search' : 'No markets found'}
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Market
          </Link>
        </div>
      )}
    </div>
  );
}
