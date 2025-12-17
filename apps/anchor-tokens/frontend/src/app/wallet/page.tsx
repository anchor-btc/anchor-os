"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Coins, ArrowRightLeft, Search, ExternalLink, RefreshCw } from "lucide-react";
import { Header } from "@/components/header";
import { BalanceDisplay } from "@/components/balance-display";
import Link from "next/link";
import { 
  getAddressBalances, 
  getAddressUtxos, 
  getWalletAddress, 
  getWalletBalance, 
  getWalletTokens 
} from "@/lib/api";
import { truncateMiddle, formatNumber } from "@/lib/utils";

export default function WalletPage() {
  const [address, setAddress] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [viewMode, setViewMode] = useState<"wallet" | "address">("wallet");

  const { data: walletAddress } = useQuery({
    queryKey: ["walletAddress"],
    queryFn: async () => {
      try {
        const result = await getWalletAddress();
        return result.address;
      } catch {
        return null;
      }
    },
  });

  const { data: walletBalance } = useQuery({
    queryKey: ["walletBalance"],
    queryFn: getWalletBalance,
  });

  // Get all wallet tokens (from all wallet addresses)
  const { 
    data: walletTokens, 
    isLoading: walletTokensLoading, 
    refetch: refetchWalletTokens 
  } = useQuery({
    queryKey: ["walletTokens"],
    queryFn: getWalletTokens,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Address-specific queries (for search)
  const { data: addressBalances, isLoading: addressBalancesLoading } = useQuery({
    queryKey: ["addressBalances", searchAddress],
    queryFn: () => getAddressBalances(searchAddress),
    enabled: !!searchAddress && viewMode === "address",
  });

  const { data: addressUtxos } = useQuery({
    queryKey: ["addressUtxos", searchAddress],
    queryFn: () => getAddressUtxos(searchAddress),
    enabled: !!searchAddress && viewMode === "address",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (address) {
      setSearchAddress(address);
      setViewMode("address");
    }
  };

  const showWalletView = () => {
    setViewMode("wallet");
    setSearchAddress("");
    setAddress("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Wallet</h1>
              <p className="text-gray-400">View token balances and UTXOs</p>
            </div>
          </div>
          {viewMode === "address" && (
            <button
              onClick={showWalletView}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back to My Wallet
            </button>
          )}
        </div>

        {/* Wallet Info */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Connected Wallet</h2>
            <button
              onClick={() => refetchWalletTokens()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Primary Address</p>
              <p className="font-mono text-sm break-all">{walletAddress || "Loading..."}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">BTC Balance</p>
              <p className="text-xl font-semibold">
                {walletBalance ? (walletBalance.total / 100_000_000).toFixed(8) : "0.00000000"} BTC
              </p>
            </div>
          </div>
        </div>

        {/* Address Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Search by specific address..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Wallet View - Show all wallet tokens */}
        {viewMode === "wallet" && (
          <>
            {/* Token Balances */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-orange-400" />
                My Token Balances
                <span className="text-sm text-gray-400 font-normal ml-2">
                  (across all wallet addresses)
                </span>
              </h2>

              {walletTokensLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-700/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : walletTokens?.balances?.length ? (
                <div className="space-y-3">
                  {walletTokens.balances.map((balance) => (
                    <Link
                      key={balance.tokenId}
                      href={`/token/${balance.ticker}`}
                      className="block"
                    >
                      <BalanceDisplay balance={balance} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="mb-4">No token balances yet</p>
                  <Link
                    href="/tokens"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Browse tokens to mint →
                  </Link>
                </div>
              )}
            </div>

            {/* Token UTXOs */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                My Token UTXOs
                {walletTokens?.utxos?.length ? (
                  <span className="text-sm text-gray-400 font-normal ml-2">
                    ({walletTokens.utxos.length} token UTXOs / {walletTokens.totalUtxos} total wallet UTXOs)
                  </span>
                ) : null}
              </h2>

              {walletTokens?.utxos?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-400 font-medium">Token</th>
                        <th className="text-left p-3 text-gray-400 font-medium">UTXO</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Owner</th>
                        <th className="text-right p-3 text-gray-400 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletTokens.utxos.map((utxo) => (
                        <tr 
                          key={`${utxo.txid}:${utxo.vout}`} 
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="p-3">
                            <Link href={`/token/${utxo.ticker}`}>
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm font-medium hover:bg-orange-500/30 transition-colors">
                                {utxo.ticker}
                              </span>
                            </Link>
                          </td>
                          <td className="p-3 font-mono text-sm">
                            <span className="text-gray-400">
                              {truncateMiddle(utxo.txid, 8, 6)}:{utxo.vout}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-sm text-gray-400">
                            {utxo.ownerAddress ? truncateMiddle(utxo.ownerAddress, 8, 6) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatNumber(BigInt(utxo.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No token UTXOs</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Address View - Show specific address tokens */}
        {viewMode === "address" && searchAddress && (
          <>
            {/* Current Address */}
            <div className="text-center mb-6 p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm">Viewing balances for address</p>
              <p className="font-mono break-all">{searchAddress}</p>
            </div>

            {/* Token Balances */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-orange-400" />
                Token Balances
              </h2>

              {addressBalancesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-700/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : addressBalances?.length ? (
                <div className="space-y-3">
                  {addressBalances.map((balance) => (
                    <BalanceDisplay key={balance.tokenId} balance={balance} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No token balances for this address</p>
                </div>
              )}
            </div>

            {/* UTXOs */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                Token UTXOs
              </h2>

              {addressUtxos?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-400 font-medium">Token</th>
                        <th className="text-left p-3 text-gray-400 font-medium">UTXO</th>
                        <th className="text-right p-3 text-gray-400 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addressUtxos.map((utxo) => (
                        <tr key={`${utxo.txid}:${utxo.vout}`} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="p-3">
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm font-medium">
                              {utxo.ticker}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-sm">
                            <a
                              href={`#${utxo.txid}`}
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              {truncateMiddle(utxo.txid, 8, 6)}:{utxo.vout}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatNumber(BigInt(utxo.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No token UTXOs for this address</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
