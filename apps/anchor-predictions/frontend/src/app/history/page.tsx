"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Coins } from "lucide-react";
import Link from "next/link";
import { fetchHistory } from "@/lib/api";
import { cn, formatSats, formatNumbers, lotteryTypeColor, shortenHash } from "@/lib/utils";

export default function HistoryPage() {
  const { data: lotteries, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(50),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Lottery History</h1>
        <p className="text-gray-400 mt-2">Past lottery results and winners</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading history...</div>
      ) : lotteries && lotteries.length > 0 ? (
        <div className="space-y-4">
          {lotteries.map((lottery) => (
            <Link
              key={lottery.id}
              href={`/lotteries/${lottery.lottery_id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", lotteryTypeColor(lottery.lottery_type))}>
                      {lottery.lottery_type_name}
                    </span>
                    <span className="text-gray-500 text-sm">Block #{lottery.draw_block}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{shortenHash(lottery.lottery_id)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-400">{formatSats(lottery.total_pool_sats)}</p>
                  <p className="text-xs text-gray-500">Jackpot</p>
                </div>
              </div>

              {lottery.winning_numbers && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400 text-sm">Winning:</span>
                  <div className="flex items-center gap-1">
                    {lottery.winning_numbers.map((n, i) => (
                      <span
                        key={i}
                        className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 text-sm font-bold"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {lottery.ticket_count} tickets
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {formatSats(lottery.ticket_price_sats)} each
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No completed lotteries yet</p>
        </div>
      )}
    </div>
  );
}

