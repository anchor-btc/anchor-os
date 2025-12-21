"use client";

import { useQuery } from "@tanstack/react-query";
import { FileCheck, Shield, XCircle, Hash, Database } from "lucide-react";
import { getStats } from "@/lib/api";
import { formatFileSize } from "@/lib/hash";

export function StatsCard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 animate-pulse"
          >
            <div className="h-8 w-8 bg-slate-700 rounded-lg mb-3" />
            <div className="h-6 w-16 bg-slate-700 rounded mb-1" />
            <div className="h-4 w-20 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Proofs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-emerald-500/20">
          <FileCheck className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats?.total_proofs.toLocaleString() || "0"}
        </div>
        <div className="text-sm text-slate-400">Total Proofs</div>
      </div>

      {/* Active Proofs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-green-500/20">
          <Shield className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats?.active_proofs.toLocaleString() || "0"}
        </div>
        <div className="text-sm text-slate-400">Active Proofs</div>
      </div>

      {/* Revoked */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-red-500/20">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats?.revoked_proofs.toLocaleString() || "0"}
        </div>
        <div className="text-sm text-slate-400">Revoked</div>
      </div>

      {/* SHA-256 */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-blue-500/20">
          <Hash className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats?.sha256_proofs.toLocaleString() || "0"}
        </div>
        <div className="text-sm text-slate-400">SHA-256</div>
      </div>

      {/* SHA-512 */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-purple-500/20">
          <Hash className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats?.sha512_proofs.toLocaleString() || "0"}
        </div>
        <div className="text-sm text-slate-400">SHA-512</div>
      </div>

      {/* Total Size */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-orange-500/20">
          <Database className="w-4 h-4 text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-white">
          {stats ? formatFileSize(stats.total_file_size) : "0 B"}
        </div>
        <div className="text-sm text-slate-400">Total Size</div>
      </div>
    </div>
  );
}
