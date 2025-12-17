"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchLotteries } from "@/lib/api";
import { LotteryCard } from "@/components";

export default function LotteriesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("open");

  const { data: lotteries, isLoading } = useQuery({
    queryKey: ["lotteries", statusFilter],
    queryFn: () => fetchLotteries(statusFilter === "all" ? undefined : statusFilter, 50),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">All Lotteries</h1>
        <p className="text-gray-400 mt-2">Browse and join active lotteries</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {["open", "drawing", "completed", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
              statusFilter === status
                ? "bg-amber-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Lotteries Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading lotteries...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotteries?.map((lottery) => (
            <LotteryCard key={lottery.id} lottery={lottery} />
          ))}
          {(!lotteries || lotteries.length === 0) && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No lotteries found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

