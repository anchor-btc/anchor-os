'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Coins, Loader2, AlertCircle, Check, Zap, Info } from 'lucide-react';
import { createMintTx, broadcastTx, mineBlocks } from '@/lib/api';
import { formatTokenAmount } from '@/lib/utils';
import type { Token } from '@/lib/api';

interface MintFormProps {
  token: Token;
  onSuccess?: () => void;
}

export function MintForm({ token, onSuccess }: MintFormProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const mintMutation = useMutation({
    mutationFn: async () => {
      const result = await createMintTx({
        ticker: token.ticker,
        amount,
        carrier: 4, // WitnessData
      });

      await broadcastTx(result.hex);

      try {
        await mineBlocks(1);
      } catch {
        // Might not be regtest
      }

      return result;
    },
    onSuccess: (data) => {
      setTxid(data.txid);
      setError(null);
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount) {
      setError('Please enter an amount');
      return;
    }

    const amountBigInt = BigInt(amount || '0');
    if (amountBigInt <= 0n) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check mint limit
    if (token.mintLimit) {
      const limit = BigInt(token.mintLimit);
      if (amountBigInt > limit) {
        setError(
          `Amount exceeds mint limit of ${formatTokenAmount(token.mintLimit, token.decimals)}`
        );
        return;
      }
    }

    // Check max supply
    const minted = BigInt(token.mintedSupply);
    const max = BigInt(token.maxSupply);
    if (minted + amountBigInt > max) {
      const remaining = max - minted;
      setError(
        `Cannot mint more than remaining: ${formatTokenAmount(remaining.toString(), token.decimals)}`
      );
      return;
    }

    mintMutation.mutate();
  };

  // Calculate stats
  const maxSupply = BigInt(token.maxSupply);
  const mintedSupply = BigInt(token.mintedSupply);
  const remainingSupply = maxSupply - mintedSupply;
  const mintLimit = token.mintLimit ? BigInt(token.mintLimit) : null;
  const effectiveMax = mintLimit && mintLimit < remainingSupply ? mintLimit : remainingSupply;

  if (txid) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-xl font-semibold mb-2">Mint Successful!</p>
        <p className="text-gray-400 mb-4">
          +{formatTokenAmount(amount, token.decimals)} {token.ticker}
        </p>
        <div className="bg-gray-900/50 rounded-xl p-3 mb-6">
          <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
          <p className="font-mono text-sm text-gray-400 break-all">{txid}</p>
        </div>
        <button
          onClick={() => {
            setTxid(null);
            setAmount('');
          }}
          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Mint More
        </button>
      </div>
    );
  }

  // Check if minting is available
  if (!token.isOpenMint) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-400" />
        </div>
        <p className="text-xl font-semibold mb-2">Minting Disabled</p>
        <p className="text-gray-400">This token does not have open minting enabled.</p>
      </div>
    );
  }

  if (remainingSupply <= 0n) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-xl font-semibold mb-2">Fully Minted!</p>
        <p className="text-gray-400">
          All {formatTokenAmount(token.maxSupply, token.decimals)} {token.ticker} have been minted.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Available to Mint</p>
          <p className="font-mono font-medium text-green-400">
            {formatTokenAmount(remainingSupply.toString(), token.decimals, 4)}
          </p>
        </div>
        {mintLimit && (
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
            <p className="text-xs text-gray-500 mb-1">Per-Mint Limit</p>
            <p className="font-mono font-medium text-orange-400">
              {formatTokenAmount(mintLimit.toString(), token.decimals, 4)}
            </p>
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">Amount to Mint</label>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            className="w-full px-4 py-4 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all font-mono text-lg pr-24"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            {token.ticker}
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mt-3">
          {mintLimit && (
            <button
              type="button"
              onClick={() => setAmount(effectiveMax.toString())}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
            >
              <Zap className="w-3 h-3" />
              Max ({formatTokenAmount(effectiveMax.toString(), token.decimals, 2)})
            </button>
          )}
          {[25, 50, 75].map((pct) => {
            const pctAmount = (effectiveMax * BigInt(pct)) / 100n;
            if (pctAmount <= 0n) return null;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setAmount(pctAmount.toString())}
                className="px-3 py-1.5 text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
              >
                {pct}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {amount && BigInt(amount) > 0n && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <Info className="w-4 h-4 text-green-400" />
          <p className="text-sm text-green-400">
            You will receive{' '}
            <span className="font-semibold">{formatTokenAmount(amount, token.decimals)}</span>{' '}
            {token.ticker}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={mintMutation.isPending || !amount}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/25"
      >
        {mintMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Coins className="w-5 h-5" />
            Mint Tokens
          </>
        )}
      </button>
    </form>
  );
}
