"use client";

import { useQuery } from "@tanstack/react-query";
import { Ticket, Trophy, Coins, TrendingUp, Users, Clock } from "lucide-react";
import { fetchStats, fetchLotteries } from "@/lib/api";
import { StatsCard, LotteryCard } from "@/components";
import { formatSats } from "@/lib/utils";

export default function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: activeLotteries } = useQuery({
    queryKey: ["lotteries", "open"],
    queryFn: () => fetchLotteries("open", 9),
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-4">Anchor Lottery</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Trustless lottery powered by Bitcoin and Discreet Log Contracts.
          Pick your numbers, buy tickets, and win — all on-chain.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Active Lotteries"
          value={stats?.active_lotteries ?? 0}
          icon={Ticket}
          iconColor="text-amber-400"
        />
        <StatsCard
          title="Tickets Sold"
          value={stats?.total_tickets_sold ?? 0}
          icon={Users}
          iconColor="text-blue-400"
        />
        <StatsCard
          title="Total Volume"
          value={formatSats(stats?.total_volume_sats ?? 0)}
          icon={TrendingUp}
          iconColor="text-green-400"
        />
        <StatsCard
          title="Total Payouts"
          value={formatSats(stats?.total_payouts_sats ?? 0)}
          icon={Coins}
          iconColor="text-purple-400"
        />
        <StatsCard
          title="Biggest Jackpot"
          value={formatSats(stats?.biggest_jackpot_sats ?? 0)}
          icon={Trophy}
          iconColor="text-yellow-400"
        />
        <StatsCard
          title="Completed"
          value={stats?.completed_lotteries ?? 0}
          icon={Clock}
          iconColor="text-gray-400"
        />
      </div>

      {/* Active Lotteries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Active Lotteries</h2>
          <a href="/lotteries" className="text-sm text-amber-400 hover:text-amber-300">
            View all →
          </a>
        </div>
        
        {activeLotteries && activeLotteries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLotteries.map((lottery) => (
              <LotteryCard key={lottery.id} lottery={lottery} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
            <Ticket className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">No active lotteries</p>
            <a
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
            >
              Create the first lottery
            </a>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Pick Numbers", desc: "Choose your lucky numbers from the available range" },
            { step: "2", title: "Buy Ticket", desc: "Pay with BTC and receive a DLC-backed ticket" },
            { step: "3", title: "Wait for Draw", desc: "Oracle attests to winning numbers at draw block" },
            { step: "4", title: "Claim Prize", desc: "DLC automatically settles — no trust required" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-amber-400 font-bold text-lg">{item.step}</span>
              </div>
              <h3 className="font-medium text-white mb-1">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

