"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Ticket, Trophy, Coins, TrendingUp, Users, Clock, PlusCircle, Eye } from "lucide-react";
import { Container, HeroSection, HowItWorks, StatsGrid } from "@AnchorProtocol/ui";
import { fetchStats, fetchLotteries } from "@/lib/api";
import { LotteryCard } from "@/components";
import { formatSats } from "@/lib/utils";

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: activeLotteries } = useQuery({
    queryKey: ["lotteries", "open"],
    queryFn: () => fetchLotteries("open", 9),
  });

  const statsItems = [
    {
      icon: Ticket,
      value: stats?.active_lotteries ?? 0,
      label: "Active Markets",
      color: "text-amber-400",
      bgColor: "bg-amber-400/20",
    },
    {
      icon: Users,
      value: stats?.total_tickets_sold ?? 0,
      label: "Tickets Sold",
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: TrendingUp,
      value: formatSats(stats?.total_volume_sats ?? 0),
      label: "Total Volume",
      color: "text-green-400",
      bgColor: "bg-green-400/20",
    },
    {
      icon: Coins,
      value: formatSats(stats?.total_payouts_sats ?? 0),
      label: "Total Payouts",
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
    {
      icon: Trophy,
      value: formatSats(stats?.biggest_jackpot_sats ?? 0),
      label: "Biggest Jackpot",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/20",
    },
    {
      icon: Clock,
      value: stats?.completed_lotteries ?? 0,
      label: "Completed",
      color: "text-slate-400",
      bgColor: "bg-slate-400/20",
    },
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Pick Numbers",
      description: "Choose your lucky numbers from the available range",
    },
    {
      step: "2",
      title: "Buy Ticket",
      description: "Pay with BTC and receive a DLC-backed ticket",
    },
    {
      step: "3",
      title: "Wait for Draw",
      description: "Oracle attests to winning numbers at draw block",
    },
    {
      step: "4",
      title: "Claim Prize",
      description: "DLC automatically settles — no trust required",
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="Trustless Predictions on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Prediction markets powered by Discreet Log Contracts. Pick your numbers, buy tickets, and win — all on-chain."
        accentColor="amber"
        actions={[
          { href: "/create", label: "Create Market", icon: PlusCircle, variant: "primary" },
          { href: "/markets", label: "Browse Markets", icon: Eye, variant: "secondary" },
        ]}
      />

      {/* How it works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="amber"
        columns={{ default: 1, md: 4 }}
      />

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsGrid
          items={statsItems}
          columns={{ default: 2, md: 3, lg: 6 }}
          isLoading={statsLoading}
        />
      </div>

      {/* Active Markets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Active Markets</h2>
          <Link href="/markets" className="text-sm text-amber-400 hover:text-amber-300">
            View all →
          </Link>
        </div>
        
        {activeLotteries && activeLotteries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLotteries.map((lottery) => (
              <LotteryCard key={lottery.id} lottery={lottery} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-slate-700 bg-slate-800/50">
            <Ticket className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">No active markets</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
            >
              Create the first market
            </Link>
          </div>
        )}
      </div>
    </Container>
  );
}
