"use client";

import { Globe, Database, Blocks, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export function StatsCard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 animate-pulse"
          >
            <div className="h-8 w-8 bg-slate-700 rounded-lg mb-2" />
            <div className="h-6 w-16 bg-slate-700 rounded mb-1" />
            <div className="h-4 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: Globe,
      value: stats?.total_domains || 0,
      label: "Domains",
      color: "text-bitcoin-orange",
      bg: "bg-bitcoin-orange/20",
    },
    {
      icon: Database,
      value: stats?.total_records || 0,
      label: "DNS Records",
      color: "text-blue-400",
      bg: "bg-blue-400/20",
    },
    {
      icon: Blocks,
      value: stats?.last_block_height || 0,
      label: "Block Height",
      color: "text-green-400",
      bg: "bg-green-400/20",
    },
    {
      icon: Clock,
      value: stats?.last_update
        ? formatDistanceToNow(new Date(stats.last_update), { addSuffix: true })
        : "N/A",
      label: "Last Update",
      color: "text-purple-400",
      bg: "bg-purple-400/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, i) => (
        <div
          key={i}
          className="bg-slate-800/50 rounded-xl border border-slate-700 p-4"
        >
          <div className={`p-2 ${item.bg} rounded-lg w-fit mb-2`}>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </div>
          <p className="text-2xl font-bold text-white">
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value}
          </p>
          <p className="text-sm text-slate-400">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
