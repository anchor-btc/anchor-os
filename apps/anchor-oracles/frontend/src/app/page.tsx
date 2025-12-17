"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, FileCheck, Coins, Star, Calendar, AlertTriangle } from "lucide-react";
import { fetchStats, fetchOracles, fetchAttestations, fetchCategories } from "@/lib/api";
import { StatsCard, OracleCard } from "@/components";
import { formatSats } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const { data: oracles } = useQuery({
    queryKey: ["oracles", 6],
    queryFn: () => fetchOracles(6),
  });

  const { data: attestations } = useQuery({
    queryKey: ["attestations", 10],
    queryFn: () => fetchAttestations(10),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-4">Anchor Oracles</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Decentralized oracle network for Bitcoin. Stake, attest, and earn rewards
          by providing accurate real-world data to the blockchain.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Active Oracles"
          value={stats?.active_oracles ?? 0}
          icon={Users}
          iconColor="text-purple-400"
        />
        <StatsCard
          title="Total Attestations"
          value={stats?.total_attestations ?? 0}
          icon={FileCheck}
          iconColor="text-green-400"
        />
        <StatsCard
          title="Total Staked"
          value={formatSats(stats?.total_staked ?? 0)}
          icon={Coins}
          iconColor="text-amber-400"
        />
        <StatsCard
          title="Avg Reputation"
          value={(stats?.avg_reputation ?? 50).toFixed(1)}
          icon={Star}
          iconColor="text-yellow-400"
        />
        <StatsCard
          title="Pending Events"
          value={stats?.pending_events ?? 0}
          icon={Calendar}
          iconColor="text-blue-400"
        />
        <StatsCard
          title="Active Disputes"
          value={stats?.active_disputes ?? 0}
          icon={AlertTriangle}
          iconColor="text-red-400"
        />
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Oracle Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories?.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-white/10 bg-white/5 p-3 text-center hover:border-purple-500/50 transition-colors"
            >
              <p className="font-medium text-white">{cat.name}</p>
              <p className="text-xs text-gray-400 mt-1">{cat.oracle_count} oracles</p>
              <p className="text-xs text-gray-500">{cat.attestation_count} attests</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Oracles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Top Oracles</h2>
          <a href="/oracles" className="text-sm text-purple-400 hover:text-purple-300">
            View all →
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {oracles?.map((oracle) => (
            <OracleCard key={oracle.id} oracle={oracle} />
          ))}
        </div>
      </div>

      {/* Recent Attestations */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Attestations</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Oracle</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attestations?.map((att) => (
                <tr key={att.id} className="text-sm hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{att.oracle_name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                      {att.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {att.event_description || att.event_id.slice(0, 16)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      att.status === "valid"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {att.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {(!attestations || attestations.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No attestations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

