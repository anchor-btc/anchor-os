"use client";

import { useQuery } from "@tanstack/react-query";
import { Header, ProofCard } from "@/components";
import { getMyProofs } from "@/lib/api";
import { User, Loader2, FileCheck, Hash, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MyProofsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-proofs"],
    queryFn: () => getMyProofs(100),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">My Proofs</h1>
        </div>
        <p className="text-slate-400 mb-8">
          View all proofs created by your wallet addresses.
        </p>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-400 text-sm">Total Proofs</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.total_proofs}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-sm">Transactions</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.unique_transactions}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400 text-sm">Showing</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.proofs.length} proofs
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400">Loading your proofs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-2">Failed to load proofs</p>
            <p className="text-slate-500 text-sm">
              Make sure the wallet service is running and accessible.
            </p>
          </div>
        ) : data && data.proofs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.proofs.map((proof) => (
              <ProofCard key={proof.id} proof={proof} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No proofs found
            </h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              You haven&apos;t created any proofs yet. Start by stamping a file to
              create your first proof of existence.
            </p>
            <Link
              href="/stamp"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              <FileCheck className="w-5 h-5" />
              Create Your First Proof
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

