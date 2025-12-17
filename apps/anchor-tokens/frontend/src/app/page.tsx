"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Coins, TrendingUp, Users, Activity, Plus, Send, Flame } from "lucide-react";
import { Header } from "@/components/header";
import { StatsCard } from "@/components/stats-card";
import { TokenCard } from "@/components/token-card";
import { getStats, getTokens } from "@/lib/api";

export default function Home() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokens", 1, 6],
    queryFn: () => getTokens(1, 6),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-400 bg-clip-text text-transparent">
            Anchor Tokens
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            UTXO-based tokens on Bitcoin. Deploy, mint, and transfer tokens with the efficiency of Runes and the power of the Anchor Protocol.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/deploy"
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Deploy Token
            </Link>
            <Link
              href="/tokens"
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Coins className="w-5 h-5" />
              Browse Tokens
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <StatsCard
            title="Total Tokens"
            value={stats?.totalTokens ?? 0}
            icon={<Coins className="w-6 h-6 text-orange-400" />}
          />
          <StatsCard
            title="Total Holders"
            value={stats?.totalHolders ?? 0}
            icon={<Users className="w-6 h-6 text-blue-400" />}
          />
          <StatsCard
            title="Total Operations"
            value={stats?.totalOperations ?? 0}
            icon={<Activity className="w-6 h-6 text-green-400" />}
          />
          <StatsCard
            title="Last Block"
            value={stats?.lastBlockHeight ?? "N/A"}
            icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
          />
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Deploy Tokens</h3>
            <p className="text-gray-400">
              Create your own token with custom ticker, decimals, and supply. Choose between open mint or fixed supply.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transfer Tokens</h3>
            <p className="text-gray-400">
              Send tokens to any Bitcoin address. Split and merge UTXOs for optimal fee efficiency.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <Flame className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Burn Tokens</h3>
            <p className="text-gray-400">
              Permanently destroy tokens to reduce supply. Only available for tokens with burnable flag enabled.
            </p>
          </div>
        </div>

        {/* Recent Tokens */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recent Tokens</h2>
            <Link
              href="/tokens"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              View All →
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 bg-gray-800/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : tokens?.data?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.data.map((token) => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
              <Coins className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No tokens deployed yet</p>
              <Link
                href="/deploy"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Deploy First Token
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>Anchor Tokens - Built on the Anchor Protocol</p>
          <p className="text-sm mt-2">
            UTXO-based tokens with 75% fee discount using Witness Data carrier
          </p>
        </div>
      </footer>
    </div>
  );
}
