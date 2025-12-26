"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Loader2, 
  Search, 
  TrendingUp,
  Trophy,
  Clock,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Wallet,
  CheckCircle,
  XCircle
} from "lucide-react";
import { fetchMyPositions, fetchAllPositions, claimWinnings, type Position } from "@/lib/api";
import { cn, formatSats, formatPercent, shortenHash } from "@/lib/utils";
import { useWallet } from "@/contexts";

// Generate deterministic pubkey from address (same as market page)
function addressToPubkey(address: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(address + "anchor-predictions");
  let hash = 0x02;
  const result = [0x02];
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash + (data[i % data.length] || 0)) | 0;
    result.push(Math.abs(hash % 256));
  }
  return result.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function MyBetsPage() {
  const { address, connected } = useWallet();
  const queryClient = useQueryClient();
  
  const [pubkey, setPubkey] = useState("");
  const [searchPubkey, setSearchPubkey] = useState("");
  const [viewMode, setViewMode] = useState<"mine" | "all">("all"); // Default to showing all bets
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; positionId?: number } | null>(null);

  // Auto-set pubkey from wallet
  useEffect(() => {
    if (connected && address) {
      const walletPubkey = addressToPubkey(address);
      setPubkey(walletPubkey);
      setSearchPubkey(walletPubkey);
    }
  }, [connected, address]);

  // Query for user's positions
  const { data: myPositions, isLoading: myLoading, isError: myError, error: myErrorMsg, refetch: refetchMy } = useQuery({
    queryKey: ["my-positions", searchPubkey],
    queryFn: () => fetchMyPositions(searchPubkey),
    enabled: viewMode === "mine" && !!searchPubkey,
  });

  // Query for all positions
  const { data: allPositions, isLoading: allLoading, isError: allError, error: allErrorMsg, refetch: refetchAll } = useQuery({
    queryKey: ["all-positions"],
    queryFn: () => fetchAllPositions(50),
    enabled: viewMode === "all",
  });

  const positions = viewMode === "all" ? allPositions : myPositions;
  const isLoading = viewMode === "all" ? allLoading : myLoading;
  const isError = viewMode === "all" ? allError : myError;
  const error = viewMode === "all" ? allErrorMsg : myErrorMsg;
  const refetch = viewMode === "all" ? refetchAll : refetchMy;

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async ({ marketId, positionId }: { marketId: string; positionId: number }) => {
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to claim winnings.");
      }
      return claimWinnings(marketId, { position_id: positionId, payout_address: address });
    },
    onSuccess: (data, variables) => {
      const message = data.payout_sats 
        ? `${data.message} TXID: ${data.claim_txid?.slice(0, 16)}...`
        : data.message;
      setClaimResult({ success: true, message, positionId: variables.positionId });
      queryClient.invalidateQueries({ queryKey: ["my-positions", searchPubkey] });
      queryClient.invalidateQueries({ queryKey: ["all-positions"] });
    },
    onError: (error: Error, variables) => {
      setClaimResult({ success: false, message: error.message, positionId: variables.positionId });
    },
  });

  const handleClaim = (marketId: string, positionId: number) => {
    if (!connected || !address) {
      setClaimResult({ success: false, message: "Please connect your wallet first", positionId });
      return;
    }
    setClaimResult(null);
    claimMutation.mutate({ marketId, positionId });
  };

  const handleSearch = () => {
    if (pubkey.trim()) {
      setSearchPubkey(pubkey.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Calculate stats
  const stats = positions ? {
    total: positions.length,
    totalBet: positions.reduce((sum, p) => sum + p.amount_sats, 0),
    totalWon: positions.filter(p => p.is_winner).reduce((sum, p) => sum + p.payout_sats, 0),
    winners: positions.filter(p => p.is_winner).length,
    pending: positions.filter(p => !p.is_winner && p.payout_sats === 0).length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-7 h-7 text-amber-400" />
            {viewMode === "all" ? "All Bets" : "My Bets"}
          </h1>
          <p className="text-gray-400 mt-1">
            {viewMode === "all" 
              ? "View all prediction market positions"
              : "View your prediction market positions"
            }
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setViewMode("all")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "all"
                ? "bg-amber-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            All Bets
          </button>
          <button
            onClick={() => setViewMode("mine")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "mine"
                ? "bg-amber-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            My Bets
          </button>
        </div>
      </div>

      {/* Wallet Status - only show for "My Bets" mode */}
      {viewMode === "mine" && connected ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <p className="text-green-400 font-medium">Wallet Connected</p>
              <p className="text-gray-400 text-sm font-mono">{shortenHash(address || "", 8)}</p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Refresh
            </button>
          </div>
        </div>
      ) : viewMode === "mine" ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Wallet Not Connected</p>
              <p className="text-gray-400 text-sm">Connect your wallet to view your bets automatically</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Manual Pubkey Search (fallback) - only show for My Bets mode */}
      {viewMode === "mine" && !connected && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Or search by Public Key
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your public key to view bets..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSearch}
              disabled={!pubkey.trim() || isLoading}
              className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              View Bets
            </button>
          </div>
          {isError && searchPubkey && (
            <p className="text-red-400 text-sm mt-2">Error: {(error as Error)?.message}</p>
          )}
        </div>
      )}

      {/* Claim Result Message */}
      {claimResult && (
        <div className={cn(
          "rounded-xl p-4 flex items-center gap-3",
          claimResult.success 
            ? "bg-green-500/20 border border-green-500/30" 
            : "bg-red-500/20 border border-red-500/30"
        )}>
          {claimResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <p className={claimResult.success ? "text-green-400" : "text-red-400"}>
            {claimResult.message}
          </p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-gray-400 text-sm">Total Bets</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{formatSats(stats.totalBet)}</p>
            <p className="text-gray-400 text-sm">Total Bet</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{formatSats(stats.totalWon)}</p>
            <p className="text-gray-400 text-sm">Total Won</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.winners}</p>
            <p className="text-gray-400 text-sm">Wins</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-gray-400 text-sm">Pending</p>
          </div>
        </div>
      )}

      {/* Positions List */}
      {isLoading && searchPubkey ? (
        <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading positions...
        </div>
      ) : positions && positions.length > 0 ? (
        <div className="space-y-3">
          {positions.map((position) => (
            <Link
              key={position.id}
              href={`/markets/${position.market_id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-amber-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1",
                    position.outcome === 1 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  )}>
                    {position.outcome === 1 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {position.outcome_name}
                  </span>
                  {position.is_winner && (
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Winner
                    </span>
                  )}
                </div>
                <p className="text-amber-400 font-bold">{formatSats(position.amount_sats)}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-400">
                  <span>Shares: <span className="text-white">{position.shares.toLocaleString()}</span></span>
                  <span className="mx-2">•</span>
                  <span>Avg Price: <span className="text-white">{formatPercent(position.avg_price)}</span></span>
                </div>
                {position.is_winner && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-medium flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      {formatSats(position.payout_sats)}
                    </span>
                    {position.claimed ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                        Claimed
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClaim(position.market_id, position.id);
                        }}
                        disabled={claimMutation.isPending && claimResult?.positionId === position.id}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {claimMutation.isPending && claimResult?.positionId === position.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Gift className="w-3 h-3" />
                        )}
                        Claim
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-white/5">
                <span>Market: {shortenHash(position.market_id, 8)}</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Block {position.block_height ?? "-"}</span>
                  <a 
                    href={`#tx/${position.txid}`} 
                    className="text-amber-400 hover:text-amber-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : searchPubkey ? (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <TrendingUp className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No bets found</p>
          <p className="text-sm text-gray-500">
            This public key has no positions in any markets
          </p>
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
          <User className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">Enter your public key</p>
          <p className="text-sm text-gray-500">
            View all your bets across prediction markets
          </p>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium text-white mb-3">Position States</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">Pending</span>
            <p className="text-gray-400 mt-2">Market not yet resolved</p>
          </div>
          <div>
            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Winner</span>
            <p className="text-gray-400 mt-2">Your prediction was correct</p>
          </div>
          <div>
            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Lost</span>
            <p className="text-gray-400 mt-2">Your prediction was wrong</p>
          </div>
          <div>
            <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">Claimed</span>
            <p className="text-gray-400 mt-2">Winnings collected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

