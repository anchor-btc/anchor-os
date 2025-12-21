"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, Trophy, Clock, Users, Coins, ExternalLink } from "lucide-react";
import { fetchLottery, fetchLotteryTickets, fetchLotteryWinners, fetchPrizeTiers } from "@/lib/api";
import { cn, formatSats, formatNumbers, lotteryTypeColor, statusColor, shortenHash } from "@/lib/utils";

export default function LotteryDetailPage() {
  const params = useParams();
  const lotteryId = params.id as string;
  
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const { data: lottery, isLoading } = useQuery({
    queryKey: ["lottery", lotteryId],
    queryFn: () => fetchLottery(lotteryId),
    enabled: !!lotteryId,
  });

  const { data: tickets } = useQuery({
    queryKey: ["lottery-tickets", lotteryId],
    queryFn: () => fetchLotteryTickets(lotteryId, 20),
    enabled: !!lotteryId,
  });

  const { data: winners } = useQuery({
    queryKey: ["lottery-winners", lotteryId],
    queryFn: () => fetchLotteryWinners(lotteryId),
    enabled: !!lotteryId && lottery?.status === "completed",
  });

  const { data: prizeTiers } = useQuery({
    queryKey: ["prize-tiers", lottery?.lottery_type],
    queryFn: () => fetchPrizeTiers(lottery?.lottery_type ?? 0),
    enabled: !!lottery,
  });

  const toggleNumber = (n: number) => {
    if (!lottery) return;
    if (selectedNumbers.includes(n)) {
      setSelectedNumbers(selectedNumbers.filter(x => x !== n));
    } else if (selectedNumbers.length < lottery.number_count) {
      setSelectedNumbers([...selectedNumbers, n].sort((a, b) => a - b));
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading lottery...</div>;
  }

  if (!lottery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Lottery not found</p>
        <Link href="/" className="text-amber-400 hover:underline">
          ← Back to lotteries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to lotteries
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("px-3 py-1 rounded text-sm font-medium", lotteryTypeColor(lottery.lottery_type))}>
                {lottery.lottery_type_name}
              </span>
              <span className={cn("px-3 py-1 rounded text-sm font-medium", statusColor(lottery.status))}>
                {lottery.status}
              </span>
            </div>
            <p className="text-gray-500 font-mono text-sm">{lottery.lottery_id}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Current Jackpot</p>
            <p className="text-3xl font-bold text-amber-400">{formatSats(lottery.total_pool_sats)}</p>
          </div>
        </div>

        {/* Winning Numbers (if completed) */}
        {lottery.status === "completed" && lottery.winning_numbers && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
            <p className="text-amber-400 text-sm font-medium mb-2">Winning Numbers</p>
            <div className="flex items-center justify-center gap-3">
              {lottery.winning_numbers.map((n, i) => (
                <div
                  key={i}
                  className="lottery-ball w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black text-lg font-bold shadow-lg"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <Ticket className="w-4 h-4" />
              <span className="text-xl font-bold">{lottery.ticket_count}</span>
            </div>
            <p className="text-xs text-gray-500">Tickets Sold</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-400">
              <Coins className="w-4 h-4" />
              <span className="text-xl font-bold">{formatSats(lottery.ticket_price_sats)}</span>
            </div>
            <p className="text-xs text-gray-500">Per Ticket</p>
          </div>
          <div className="text-center">
            <span className="text-xl font-bold text-purple-400">{lottery.number_count}/{lottery.number_max}</span>
            <p className="text-xs text-gray-500">Pick N from M</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="text-xl font-bold">#{lottery.draw_block}</span>
            </div>
            <p className="text-xs text-gray-500">Draw Block</p>
          </div>
          <div className="text-center">
            <span className="text-xl font-bold text-gray-400">{lottery.token_type_name}</span>
            <p className="text-xs text-gray-500">Token Type</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Number Picker (if open) */}
        {lottery.status === "open" && (
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Pick {lottery.number_count} Numbers
            </h2>
            
            <div className="grid grid-cols-10 gap-2 mb-6">
              {Array.from({ length: lottery.number_max }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                    selectedNumbers.includes(n)
                      ? "bg-amber-500 text-black scale-110"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Selected: {selectedNumbers.length}/{lottery.number_count}
                </p>
                {selectedNumbers.length > 0 && (
                  <p className="text-lg text-white font-mono">
                    {formatNumbers(selectedNumbers)}
                  </p>
                )}
              </div>
              <button
                disabled={selectedNumbers.length !== lottery.number_count}
                className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                Buy Ticket ({formatSats(lottery.ticket_price_sats)})
              </button>
            </div>
          </div>
        )}

        {/* Prize Tiers */}
        <div className={cn(
          "rounded-xl border border-white/10 bg-white/5 p-6",
          lottery.status === "open" ? "" : "lg:col-span-2"
        )}>
          <h2 className="text-lg font-bold text-white mb-4">Prize Tiers</h2>
          <div className="space-y-2">
            {prizeTiers?.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-white font-medium">{tier.description}</span>
                  <span className="text-gray-500 text-sm ml-2">({tier.matches_required} matches)</span>
                </div>
                <span className="text-amber-400 font-bold">{tier.payout_percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Winners (if completed) */}
        {lottery.status === "completed" && winners && winners.length > 0 && (
          <div className="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Winners
            </h2>
            <div className="space-y-3">
              {winners.map((winner) => (
                <div key={winner.ticket_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-white font-mono text-sm">{shortenHash(winner.buyer_pubkey)}</p>
                    <p className="text-gray-400 text-sm">
                      {winner.matching_numbers} matches • Tier {winner.prize_tier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{formatSats(winner.prize_sats)}</p>
                    <p className={cn(
                      "text-xs",
                      winner.claimed ? "text-green-400" : "text-yellow-400"
                    )}>
                      {winner.claimed ? "Claimed" : "Unclaimed"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Tickets */}
      {tickets && tickets.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">Recent Tickets</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Numbers</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="text-sm hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400 font-mono">
                    {shortenHash(ticket.buyer_pubkey, 6)}
                  </td>
                  <td className="px-4 py-3 text-white font-mono">
                    {formatNumbers(ticket.numbers)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {formatSats(ticket.amount_sats)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ticket.block_height ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`#tx/${ticket.txid}`} className="text-amber-400 hover:text-amber-300">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

