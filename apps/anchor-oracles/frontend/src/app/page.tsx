"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users, FileCheck, Coins, Star, Calendar, AlertTriangle, Eye, PlusCircle } from "lucide-react";
import { Container, HeroSection, HowItWorks, StatsGrid } from "@AnchorProtocol/ui";
import { fetchStats, fetchOracles, fetchAttestations, fetchCategories } from "@/lib/api";
import { OracleCard } from "@/components";
import { formatSats } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
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

  const statsItems = [
    {
      icon: Users,
      value: stats?.active_oracles ?? 0,
      label: "Active Oracles",
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
    {
      icon: FileCheck,
      value: stats?.total_attestations ?? 0,
      label: "Total Attestations",
      color: "text-green-400",
      bgColor: "bg-green-400/20",
    },
    {
      icon: Coins,
      value: formatSats(stats?.total_staked ?? 0),
      label: "Total Staked",
      color: "text-amber-400",
      bgColor: "bg-amber-400/20",
    },
    {
      icon: Star,
      value: (stats?.avg_reputation ?? 50).toFixed(1),
      label: "Avg Reputation",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/20",
    },
    {
      icon: Calendar,
      value: stats?.pending_events ?? 0,
      label: "Pending Events",
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: AlertTriangle,
      value: stats?.active_disputes ?? 0,
      label: "Active Disputes",
      color: "text-red-400",
      bgColor: "bg-red-400/20",
    },
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Register Oracle",
      description: "Stake sats and create your oracle identity on the Bitcoin blockchain.",
    },
    {
      step: "2",
      title: "Attest Events",
      description: "Provide accurate attestations for real-world events in your category.",
    },
    {
      step: "3",
      title: "Earn Rewards",
      description: "Build reputation and earn rewards for consistent, accurate attestations.",
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="Decentralized Oracle Network on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Stake, attest, and earn rewards by providing accurate real-world data to the blockchain."
        accentColor="purple"
        actions={[
          { href: "/register", label: "Register Oracle", icon: PlusCircle, variant: "primary" },
          { href: "/oracles", label: "Browse Oracles", icon: Eye, variant: "secondary" },
        ]}
      />

      {/* How It Works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="purple"
        columns={{ default: 1, md: 3 }}
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

      {/* Categories */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Oracle Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories?.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-center hover:border-purple-500/50 transition-colors"
            >
              <p className="font-medium text-white">{cat.name}</p>
              <p className="text-xs text-slate-400 mt-1">{cat.oracle_count} oracles</p>
              <p className="text-xs text-slate-500">{cat.attestation_count} attests</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Oracles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Top Oracles</h2>
          <Link href="/oracles" className="text-sm text-purple-400 hover:text-purple-300">
            View all →
          </Link>
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
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                <th className="px-4 py-3">Oracle</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {attestations?.map((att) => (
                <tr key={att.id} className="text-sm hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-white">{att.oracle_name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                      {att.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">
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
                  <td className="px-4 py-3 text-slate-500">
                    {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {(!attestations || attestations.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No attestations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Container>
  );
}
