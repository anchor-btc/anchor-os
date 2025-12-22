"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Coins, TrendingUp, Users, Activity, Plus, Send, Flame } from "lucide-react";
import { Container, HeroSection, HowItWorks, StatsGrid } from "@AnchorProtocol/ui";
import { TokenCard } from "@/components/token-card";
import { getStats, getTokens } from "@/lib/api";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokens", 1, 6],
    queryFn: () => getTokens(1, 6),
  });

  const statsItems = [
    {
      icon: Coins,
      value: stats?.totalTokens ?? 0,
      label: "Total Tokens",
      color: "text-amber-400",
      bgColor: "bg-amber-400/20",
    },
    {
      icon: Users,
      value: stats?.totalHolders ?? 0,
      label: "Total Holders",
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: Activity,
      value: stats?.totalOperations ?? 0,
      label: "Total Operations",
      color: "text-green-400",
      bgColor: "bg-green-400/20",
    },
    {
      icon: TrendingUp,
      value: stats?.lastBlockHeight ?? "N/A",
      label: "Last Block",
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Deploy Tokens",
      description: "Create your own token with custom ticker, decimals, and supply. Choose between open mint or fixed supply.",
    },
    {
      step: "2",
      title: "Transfer Tokens",
      description: "Send tokens to any Bitcoin address. Split and merge UTXOs for optimal fee efficiency.",
    },
    {
      step: "3",
      title: "Burn Tokens",
      description: "Permanently destroy tokens to reduce supply. Only available for tokens with burnable flag enabled.",
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="UTXO-based Tokens on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Deploy, mint, and transfer tokens with the efficiency of Runes and the power of the Anchor Protocol."
        accentColor="amber"
        actions={[
          { href: "/deploy", label: "Deploy Token", icon: Plus, variant: "primary" },
          { href: "/tokens", label: "Browse Tokens", icon: Coins, variant: "secondary" },
        ]}
      />

      {/* How It Works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="amber"
        columns={{ default: 1, md: 3 }}
      />

      {/* Stats Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsGrid
          items={statsItems}
          columns={{ default: 2, md: 4 }}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Tokens */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Tokens</h2>
          <Link
            href="/tokens"
            className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
          >
            View All →
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 bg-slate-800/50 rounded-xl animate-pulse"
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
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Coins className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No tokens deployed yet</p>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Deploy First Token
            </Link>
          </div>
        )}
      </div>
    </Container>
  );
}
