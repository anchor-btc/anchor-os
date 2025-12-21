"use client";

import { useQuery } from "@tanstack/react-query";
import { Header, DomainCard } from "@/components";
import { getWalletUtxos, getDomainsByOwner } from "@/lib/api";
import { Loader2, User, Globe } from "lucide-react";

export default function MyDomainsPage() {
  // First get wallet UTXOs to find domain ownership TXIDs
  const { data: utxos, isLoading: utxosLoading } = useQuery({
    queryKey: ["wallet-utxos"],
    queryFn: getWalletUtxos,
  });

  // Get unique txids from wallet UTXOs
  const walletTxids = utxos ? [...new Set(utxos.map((u) => u.txid))] : [];

  // Then find domains where owner_txid matches any wallet UTXO
  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ["my-domains", walletTxids],
    queryFn: () => getDomainsByOwner(walletTxids),
    enabled: walletTxids.length > 0,
  });

  const isLoading = utxosLoading || domainsLoading;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12">
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-bitcoin-orange" />
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        ) : (
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
        )}

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

