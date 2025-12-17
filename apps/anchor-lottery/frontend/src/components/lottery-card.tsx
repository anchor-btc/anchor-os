"use client";

import Link from "next/link";
import { Ticket, Users, Coins, Clock } from "lucide-react";
import { cn, formatSats, lotteryTypeColor, statusColor, shortenHash } from "@/lib/utils";
import type { Lottery } from "@/lib/api";

interface LotteryCardProps {
  lottery: Lottery;
}

export function LotteryCard({ lottery }: LotteryCardProps) {
  return (
    <Link href={`/lotteries/${lottery.lottery_id}`}>
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-amber-500/50 hover:bg-white/[0.07] transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", lotteryTypeColor(lottery.lottery_type))}>
                {lottery.lottery_type_name}
              </span>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusColor(lottery.status))}>
                {lottery.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">
              {shortenHash(lottery.lottery_id)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Jackpot</p>
            <p className="text-lg font-bold text-amber-400">{formatSats(lottery.total_pool_sats)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 py-3 bg-white/5 rounded-lg">
          {Array.from({ length: lottery.number_count }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 text-sm font-bold"
            >
              ?
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <Ticket className="w-4 h-4" />
              <span className="font-medium">{lottery.ticket_count}</span>
            </div>
            <p className="text-xs text-gray-500">Tickets</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-green-400">
              <Coins className="w-4 h-4" />
              <span className="font-medium">{formatSats(lottery.ticket_price_sats)}</span>
            </div>
            <p className="text-xs text-gray-500">Per Ticket</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-purple-400">
              <Clock className="w-4 h-4" />
              <span className="font-medium">#{lottery.draw_block}</span>
            </div>
            <p className="text-xs text-gray-500">Draw Block</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

