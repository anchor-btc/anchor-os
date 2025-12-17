"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Plus, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import { createTransferTx, broadcastTx, mineBlocks } from "@/lib/api";
import type { Token } from "@/lib/api";

interface TransferFormProps {
  token: Token;
  onSuccess?: () => void;
}

interface Allocation {
  address: string;
  amount: string;
}

export function TransferForm({ token, onSuccess }: TransferFormProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([
    { address: "", amount: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const addAllocation = () => {
    setAllocations([...allocations, { address: "", amount: "" }]);
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
        setError("All allocations must have an address and amount");
        return;
      }

      const amount = BigInt(alloc.amount || "0");
      if (amount <= 0n) {
        setError("Amounts must be greater than 0");
        return;
      }
    }

    transferMutation.mutate();
  };

  if (txid) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-lg font-semibold mb-2">Transfer Successful!</p>
        <p className="font-mono text-sm text-gray-400 break-all mb-4">{txid}</p>
        <button
          onClick={() => {
            setTxid(null);
            setAllocations([{ address: "", amount: "" }]);
          }}
          className="text-orange-400 hover:text-orange-300"
        >
          Make Another Transfer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {allocations.map((alloc, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={alloc.address}
              onChange={(e) => updateAllocation(index, "address", e.target.value)}
              placeholder="Recipient address"
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <input
              type="text"
              value={alloc.amount}
              onChange={(e) =>
                updateAllocation(index, "amount", e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="Amount"
              className="w-32 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => removeAllocation(index)}
              disabled={allocations.length === 1}
              className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAllocation}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Recipient
      </button>

      <button
        type="submit"
        disabled={transferMutation.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {transferMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Transfer {token.ticker}
          </>
        )}
      </button>
    </form>
  );
}
