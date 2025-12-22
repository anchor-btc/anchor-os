"use client";

import { useQuery } from "@tanstack/react-query";
import { Header, DomainCard } from "@/components";
import { getWalletUtxos, getDomainsByOwner, listPendingTransactions } from "@/lib/api";
import type { PendingTransaction } from "@/lib/api";
import { Loader2, User, Globe, Clock } from "lucide-react";

export default function MyDomainsPage() {
  // First get wallet UTXOs to find domain ownership TXIDs
  const { data: utxos, isLoading: utxosLoading } = useQuery({
    queryKey: ["wallet-utxos"],
    queryFn: getWalletUtxos,
    refetchInterval: 5000, // Refetch every 5 seconds to catch new UTXOs
  });

  // Get unique txids from wallet UTXOs
  const walletTxids = utxos ? [...new Set(utxos.map((u) => u.txid))] : [];

  // Then find domains where owner_txid matches any wallet UTXO
  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ["my-domains", walletTxids],
    queryFn: () => getDomainsByOwner(walletTxids),
    enabled: walletTxids.length > 0,
    refetchInterval: 5000, // Refetch to see confirmed domains
  });

  // Fetch pending transactions
  const { data: pendingTxs } = useQuery({
    queryKey: ["pending-transactions"],
    queryFn: listPendingTransactions,
    refetchInterval: 3000, // Refetch more frequently to catch confirmations
  });

  // Create a map of pending transactions by domain name
  const pendingMap = new Map<string, PendingTransaction>();
  if (pendingTxs) {
    pendingTxs.forEach((tx) => {
      pendingMap.set(tx.domain_name.toLowerCase(), tx);
    });
  }

  // Get pending registrations that don't have a confirmed domain yet
  const pendingRegistrations = pendingTxs?.filter(
    (tx) => tx.operation === "register" && !domains?.some((d) => d.name.toLowerCase() === tx.domain_name.toLowerCase())
  ) || [];

  const isLoading = utxosLoading || domainsLoading;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-bitcoin-orange/20 rounded-lg">
              <User className="h-6 w-6 text-bitcoin-orange" />
            </div>
            <h1 className="text-3xl font-bold text-white">My Domains</h1>
          </div>
          <p className="text-slate-400">
            Domains owned by your wallet. Only you can update these domains.
          </p>
        </div>

        {/* Pending Registrations Section */}
        {pendingRegistrations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-yellow-400">
                Pending Registrations ({pendingRegistrations.length})
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRegistrations.map((pending) => (
                <div
                  key={pending.txid}
                  className="bg-slate-800/50 rounded-xl border border-yellow-500/50 p-6 animate-pulse"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                    <span className="text-sm font-medium text-yellow-400">
                      Awaiting confirmation
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Globe className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{pending.domain_name}</h3>
                      <p className="text-sm text-slate-400 font-mono">
                        {pending.txid.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  {pending.records && pending.records.length > 0 && (
                    <p className="text-sm text-slate-400">
                      {pending.records.length} record(s) pending
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-bitcoin-orange" />
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => (
              <DomainCard 
                key={domain.id} 
                domain={domain} 
                pending={pendingMap.get(domain.name.toLowerCase())}
              />
            ))}
          </div>
        ) : pendingRegistrations.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Globe className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              No Domains Found
            </h2>
            <p className="text-slate-400 mb-4">
              You don&apos;t own any domains yet. Register one to get started!
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-bitcoin-orange text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
            >
              Register a Domain
            </a>
          </div>
        ) : null}

        {/* Info Card */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Domain Ownership
          </h3>
          <p className="text-sm text-slate-500">
            Your domains are secured by Bitcoin UTXOs. The owner of the UTXO has
            exclusive control over the domain. When you update a domain, ownership
            is transferred to a new UTXO in your wallet.
          </p>
        </div>
      </main>
    </div>
  );
}

