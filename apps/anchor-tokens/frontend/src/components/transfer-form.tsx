'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Plus, Trash2, Loader2, AlertCircle, Check, Wallet, Info } from 'lucide-react';
import { createTransferTx, broadcastTx, mineBlocks, getWalletTokens } from '@/lib/api';
import { formatTokenAmount } from '@/lib/utils';
import type { Token } from '@/lib/api';

interface TransferFormProps {
  token: Token;
  onSuccess?: () => void;
}

interface Allocation {
  address: string;
  amount: string;
}

export function TransferForm({ token, onSuccess }: TransferFormProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([{ address: '', amount: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  // Get wallet balance for this token
  const { data: walletTokens } = useQuery({
    queryKey: ['walletTokens'],
    queryFn: getWalletTokens,
    refetchInterval: 10000,
  });

  const tokenBalance = walletTokens?.balances?.find((b) => b.ticker === token.ticker);
  const availableBalance = tokenBalance ? BigInt(tokenBalance.balance) : 0n;

  const addAllocation = () => {
    setAllocations([...allocations, { address: '', amount: '' }]);
  };

  const removeAllocation = (index: number) => {
    if (allocations.length > 1) {
      setAllocations(allocations.filter((_, i) => i !== index));
    }
  };

  const updateAllocation = (index: number, field: keyof Allocation, value: string) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  const totalToSend = allocations.reduce((sum, a) => {
    const amount = BigInt(a.amount || '0');
    return sum + amount;
  }, 0n);

  const transferMutation = useMutation({
    mutationFn: async () => {
      const result = await createTransferTx({
        ticker: token.ticker,
        allocations: allocations.map((a) => ({
          address: a.address,
          amount: a.amount,
        })),
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

    // Validation
    for (const alloc of allocations) {
      if (!alloc.address || !alloc.amount) {
        setError('All recipients must have an address and amount');
        return;
      }

      const amount = BigInt(alloc.amount || '0');
      if (amount <= 0n) {
        setError('Amounts must be greater than 0');
        return;
      }
    }

    if (totalToSend > availableBalance) {
      setError(
        `Insufficient balance. You have ${formatTokenAmount(availableBalance.toString(), token.decimals)} ${token.ticker}`
      );
      return;
    }

    transferMutation.mutate();
  };

  if (txid) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-xl font-semibold mb-2">Transfer Successful!</p>
        <p className="text-gray-400 mb-4">
          Sent {formatTokenAmount(totalToSend.toString(), token.decimals)} {token.ticker} to{' '}
          {allocations.length} recipient{allocations.length > 1 ? 's' : ''}
        </p>
        <div className="bg-gray-900/50 rounded-xl p-3 mb-6">
          <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
          <p className="font-mono text-sm text-gray-400 break-all">{txid}</p>
        </div>
        <button
          onClick={() => {
            setTxid(null);
            setAllocations([{ address: '', amount: '' }]);
          }}
          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Make Another Transfer
        </button>
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

      {/* Balance Card */}
      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Your Balance</span>
          </div>
          <p className="font-mono font-medium text-white">
            {formatTokenAmount(availableBalance.toString(), token.decimals, 4)} {token.ticker}
          </p>
        </div>
        {tokenBalance && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {tokenBalance.utxoCount} UTXO{tokenBalance.utxoCount !== 1 ? 's' : ''} available
          </p>
        )}
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium mb-3 text-gray-300">Recipients</label>
        <div className="space-y-3">
          {allocations.map((alloc, index) => (
            <div key={index} className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Recipient {index + 1}</span>
                {allocations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAllocation(index)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={alloc.address}
                  onChange={(e) => updateAllocation(index, 'address', e.target.value)}
                  placeholder="bc1q... or bcrt1..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm"
                />
                <div className="relative">
                  <input
                    type="text"
                    value={alloc.amount}
                    onChange={(e) =>
                      updateAllocation(index, 'amount', e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono pr-20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {token.ticker}
                  </span>
                </div>
                {/* Quick Amount for Single Recipient */}
                {allocations.length === 1 && availableBalance > 0n && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateAllocation(index, 'amount', availableBalance.toString())}
                      className="px-3 py-1.5 text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    >
                      Max
                    </button>
                    {[25, 50, 75].map((pct) => {
                      const pctAmount = (availableBalance * BigInt(pct)) / 100n;
                      if (pctAmount <= 0n) return null;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateAllocation(index, 'amount', pctAmount.toString())}
                          className="px-3 py-1.5 text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                        >
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAllocation}
          className="flex items-center gap-2 mt-3 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Another Recipient
        </button>
      </div>

      {/* Summary */}
      {totalToSend > 0n && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <Info className="w-4 h-4 text-blue-400" />
          <p className="text-sm text-blue-400">
            Total:{' '}
            <span className="font-semibold">
              {formatTokenAmount(totalToSend.toString(), token.decimals)}
            </span>{' '}
            {token.ticker}
            {totalToSend > availableBalance && (
              <span className="text-red-400 ml-2">(exceeds balance!)</span>
            )}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={transferMutation.isPending || totalToSend <= 0n || totalToSend > availableBalance}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
      >
        {transferMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send {token.ticker}
          </>
        )}
      </button>
    </form>
  );
}
