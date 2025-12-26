'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Eye, AlertCircle, RefreshCw, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { fetchOraclesByAddresses } from '@/lib/api';
import { OracleCard } from '@/components';

const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || 'http://localhost:8001';

export default function MyOraclesPage() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Fetch user's wallet addresses
  useEffect(() => {
    async function loadAddresses() {
      setIsLoadingAddresses(true);
      setAddressError(null);
      try {
        const res = await fetch(`${WALLET_URL}/wallet/addresses`);
        if (!res.ok) throw new Error('Failed to fetch addresses');
        const data = await res.json();
        setAddresses(data.addresses || []);
      } catch (e: unknown) {
        setAddressError(e instanceof Error ? e.message : 'Failed to load addresses');
      } finally {
        setIsLoadingAddresses(false);
      }
    }
    loadAddresses();
  }, []);

  // Fetch oracles by wallet addresses
  const {
    data: myOracles = [],
    isLoading: isLoadingOracles,
    refetch,
  } = useQuery({
    queryKey: ['my-oracles', addresses],
    queryFn: () => fetchOraclesByAddresses(addresses),
    enabled: addresses.length > 0,
  });

  const isLoading = isLoadingAddresses || isLoadingOracles;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Oracles</h1>
          <p className="text-gray-400 mt-2">Oracles registered with your Nostr identities</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/register"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Oracle
          </Link>
        </div>
      </div>

      {/* Wallet Status */}
      {addressError ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to connect to wallet</p>
            <p className="text-sm text-red-400/70">{addressError}</p>
          </div>
        </div>
      ) : (
        addresses.length > 0 && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-purple-300">
              <Wallet className="w-4 h-4" />
              <span className="font-medium">{addresses.length}</span> wallet addresses linked
            </div>
            <p className="text-xs text-purple-400/70 mt-1">
              Showing oracles created from your wallet
            </p>
          </div>
        )
      )}

      {/* My Oracles Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
          Loading your oracles...
        </div>
      ) : myOracles.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
          <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No oracles registered yet</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Register your first oracle to start providing trusted data to the network.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Register Your First Oracle
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">
              {myOracles.length} Oracle{myOracles.length !== 1 ? 's' : ''} Found
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myOracles.map((oracle) => (
              <OracleCard key={oracle.id} oracle={oracle} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
