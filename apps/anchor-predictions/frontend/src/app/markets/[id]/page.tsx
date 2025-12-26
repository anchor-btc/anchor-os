"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Coins, 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Trophy,
  AlertCircle,
  RefreshCw,
  Info,
  Gift
} from "lucide-react";
import { 
  fetchMarket, 
  fetchMarketPositions, 
  fetchMarketWinners,
  getBetQuote,
  placeBet,
  claimWinnings,
  type BetQuote
} from "@/lib/api";
import { cn, formatSats, formatPercent, shortenHash, statusColor, resolutionColor, outcomeColor } from "@/lib/utils";
import { useWallet } from "@/contexts";

// Generate a deterministic pubkey from address (for demo purposes)
function addressToPubkey(address: string): string {
  // Create a 33-byte compressed pubkey (02 prefix + 32 bytes derived from address hash)
  const encoder = new TextEncoder();
  const data = encoder.encode(address + "anchor-predictions");
  let hash = 0x02; // Start with compressed pubkey prefix
  const result = [0x02]; // 02 = compressed pubkey prefix
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash + (data[i % data.length] || 0)) | 0;
    result.push(Math.abs(hash % 256));
  }
  return result.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const queryClient = useQueryClient();
  const { address, connected } = useWallet();

  // Betting state
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [quote, setQuote] = useState<BetQuote | null>(null);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; positionId?: number } | null>(null);
  
  // Generate user pubkey from wallet address
  const userPubkey = address ? addressToPubkey(address) : "";

  // Queries
  const { data: market, isLoading: marketLoading, isError, error, refetch } = useQuery({
    queryKey: ["market", marketId],
    queryFn: () => fetchMarket(marketId),
  });

  const { data: positions } = useQuery({
    queryKey: ["market-positions", marketId],
    queryFn: () => fetchMarketPositions(marketId, 50),
  });

  const { data: winners } = useQuery({
    queryKey: ["market-winners", marketId],
    queryFn: () => fetchMarketWinners(marketId),
    enabled: market?.status === "resolved",
  });

  // Get quote when outcome and amount change
  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOutcome === null || !betAmount) return null;
      return getBetQuote(marketId, {
        outcome: selectedOutcome!,
        amount_sats: parseInt(betAmount),
        user_pubkey: userPubkey || "placeholder",
      });
    },
    onSuccess: (data) => {
      if (data) setQuote(data);
    },
  });

  // Place bet mutation
  const betMutation = useMutation({
    mutationFn: async () => {
      return placeBet(marketId, {
        outcome: selectedOutcome!,
        amount_sats: parseInt(betAmount),
        user_pubkey: userPubkey,
        bet_address: address || undefined, // Include wallet address for real Bitcoin tx
      });
    },
    onSuccess: (data) => {
      setBetResult({ success: true, message: data.message + (data.is_real_tx ? ` TXID: ${data.txid}` : "") });
      setBetAmount("");
      setQuote(null);
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["market-positions", marketId] });
    },
    onError: (error: Error) => {
      setBetResult({ success: false, message: error.message });
    },
  });

  // Claim winnings mutation
  const claimMutation = useMutation({
    mutationFn: async (positionId: number) => {
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to claim winnings.");
      }
      return claimWinnings(marketId, { position_id: positionId, payout_address: address });
    },
    onSuccess: (data, positionId) => {
      const message = data.payout_sats 
        ? `${data.message} TXID: ${data.claim_txid?.slice(0, 16)}...`
        : data.message;
      setClaimResult({ success: true, message, positionId });
      queryClient.invalidateQueries({ queryKey: ["market-winners", marketId] });
    },
    onError: (error: Error, positionId) => {
      setClaimResult({ success: false, message: error.message, positionId });
    },
  });

  const handleClaim = (positionId: number) => {
    if (!connected || !address) {
      setClaimResult({ success: false, message: "Please connect your wallet first", positionId });
      return;
    }
    setClaimResult(null);
    claimMutation.mutate(positionId);
  };

  const handleGetQuote = () => {
    if (selectedOutcome !== null && betAmount) {
      quoteMutation.mutate();
    }
  };

  const handlePlaceBet = () => {
    setBetResult(null);
    betMutation.mutate();
  };

  if (marketLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (isError || !market) {
    return (
      <div className="text-center py-12 rounded-xl border border-red-500/20 bg-red-500/5">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p className="text-red-400 mb-2">Failed to load market</p>
        <p className="text-gray-500 text-sm mb-4">{(error as Error)?.message || "Market not found"}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const isOpen = market.status === "open";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/markets"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Markets
      </Link>

      {/* Market Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{market.question}</h1>
            {market.description && (
              <p className="text-gray-400">{market.description}</p>
            )}
          </div>
          <span className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", statusColor(market.status))}>
            {market.status.toUpperCase()}
          </span>
        </div>

        {/* Large Probability Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div 
            className={cn(
              "rounded-xl p-5 border-2 transition-all cursor-pointer",
              selectedOutcome === 1
                ? "border-green-500 bg-green-500/20"
                : "border-green-500/30 bg-green-500/10 hover:border-green-500/60"
            )}
            onClick={() => isOpen && setSelectedOutcome(1)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-5 h-5" />
                YES
              </span>
              {market.resolution === 1 && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
            </div>
            <p className="text-4xl font-bold text-white">{formatPercent(market.yes_price)}</p>
            <p className="text-gray-400 text-sm mt-1">{formatSats(market.total_yes_sats)} bet</p>
          </div>
          <div 
            className={cn(
              "rounded-xl p-5 border-2 transition-all cursor-pointer",
              selectedOutcome === 0
                ? "border-red-500 bg-red-500/20"
                : "border-red-500/30 bg-red-500/10 hover:border-red-500/60"
            )}
            onClick={() => isOpen && setSelectedOutcome(0)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <ArrowDownRight className="w-5 h-5" />
                NO
              </span>
              {market.resolution === 0 && (
                <CheckCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <p className="text-4xl font-bold text-white">{formatPercent(market.no_price)}</p>
            <p className="text-gray-400 text-sm mt-1">{formatSats(market.total_no_sats)} bet</p>
          </div>
        </div>

        {/* Market Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Total Volume</p>
            <p className="text-white font-medium flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" />
              {formatSats(market.total_volume_sats)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Total Bets</p>
            <p className="text-white font-medium flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-400" />
              {market.position_count}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Resolves At</p>
            <p className="text-white font-medium flex items-center gap-1">
              <Clock className="w-4 h-4 text-purple-400" />
              Block {market.resolution_block}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Resolution</p>
            <p className={cn("font-medium px-2 py-0.5 rounded inline-block", resolutionColor(market.resolution))}>
              {market.resolution_name}
            </p>
          </div>
        </div>
      </div>

      {/* Betting Interface (only if open) */}
      {isOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Place Your Bet
          </h2>

          {selectedOutcome === null ? (
            <div className="text-center py-6 text-gray-400">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Click on YES or NO above to select your prediction</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={cn(
                  "px-4 py-2 rounded-lg font-semibold",
                  selectedOutcome === 1 
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : "bg-red-500/20 text-red-400 border border-red-500/50"
                )}>
                  Betting {selectedOutcome === 1 ? "YES" : "NO"}
                </span>
                <button
                  onClick={() => setSelectedOutcome(selectedOutcome === 1 ? 0 : 1)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Switch to {selectedOutcome === 1 ? "NO" : "YES"}
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Bet Amount (sats)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => {
                      setBetAmount(e.target.value);
                      setQuote(null);
                    }}
                    placeholder="Enter amount in sats..."
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  {[1000, 10000, 100000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        setBetAmount(String(amt));
                        setQuote(null);
                      }}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-gray-300 transition-colors"
                    >
                      {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote */}
              {quote && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Quote Preview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">You Pay</p>
                      <p className="text-white font-medium">{formatSats(quote.amount_sats)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">You Get</p>
                      <p className="text-white font-medium">{quote.shares_out.toLocaleString()} shares</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Price</p>
                      <p className="text-white font-medium">{formatPercent(quote.avg_price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price Impact</p>
                      <p className={cn(
                        "font-medium",
                        quote.price_impact > 0.05 ? "text-red-400" : "text-green-400"
                      )}>
                        {formatPercent(quote.price_impact)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Result message */}
              {betResult && (
                <div className={cn(
                  "rounded-lg p-4 flex items-center gap-3",
                  betResult.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {betResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <p>{betResult.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleGetQuote}
                  disabled={!betAmount || quoteMutation.isPending}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {quoteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Get Quote
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={!quote || !connected || betMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {betMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {connected ? "Place Bet" : "Connect Wallet"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Winners (if resolved) */}
      {market.status === "resolved" && winners && winners.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Winners
          </h2>

          {/* Claim Result */}
          {claimResult && (
            <div className={cn(
              "rounded-lg p-3 mb-4 flex items-center gap-2",
              claimResult.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {claimResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <p className="text-sm">{claimResult.message}</p>
            </div>
          )}

          <div className="space-y-3">
            {winners.map((winner) => {
              const isMyWin = winner.user_pubkey === userPubkey;
              const isClaimingThis = claimMutation.isPending && claimResult?.positionId === winner.position_id;
              
              return (
                <div
                  key={winner.position_id}
                  className={cn(
                    "rounded-lg border p-4 flex items-center justify-between",
                    isMyWin ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm">{shortenHash(winner.user_pubkey)}</p>
                      {isMyWin && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">You</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      Bet {winner.outcome_name} • {formatSats(winner.amount_sats)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{formatSats(winner.payout_sats)}</p>
                    </div>
                    {winner.claimed ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-400">
                        Claimed
                      </span>
                    ) : isMyWin ? (
                      <button
                        onClick={() => handleClaim(winner.position_id)}
                        disabled={isClaimingThis}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isClaimingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                        Claim
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-400">
                        Unclaimed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Bets */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Recent Bets
        </h2>
        {positions && positions.length > 0 ? (
          <div className="space-y-2">
            {positions.slice(0, 10).map((pos) => (
              <div
                key={pos.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    pos.outcome === 1 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {pos.outcome_name}
                  </span>
                  <span className="text-gray-400 font-mono text-xs">
                    {shortenHash(pos.user_pubkey)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white">{formatSats(pos.amount_sats)}</span>
                  <span className="text-gray-500">@ {formatPercent(pos.avg_price)}</span>
                  <a
                    href={`#tx/${pos.txid}`}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-6">No bets yet. Be the first!</p>
        )}
      </div>

      {/* Oracle Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Oracle</h3>
        <p className="text-white font-mono text-sm">{shortenHash(market.oracle_pubkey, 12)}</p>
      </div>
    </div>
  );
}
