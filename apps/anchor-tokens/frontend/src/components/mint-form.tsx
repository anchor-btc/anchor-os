"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Coins, Loader2, AlertCircle, Check } from "lucide-react";
import { createMintTx, broadcastTx, mineBlocks } from "@/lib/api";
import type { Token } from "@/lib/api";

interface MintFormProps {
  token: Token;
  onSuccess?: () => void;
}

export function MintForm({ token, onSuccess }: MintFormProps) {
  const [amount, setAmount] = useState("");
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
      setError("Please enter an amount");
      return;
    }

    const amountBigInt = BigInt(amount || "0");
    if (amountBigInt <= 0n) {
      setError("Amount must be greater than 0");
      return;
    }

    // Check mint limit
    if (token.mintLimit) {
      const limit = BigInt(token.mintLimit);
      if (amountBigInt > limit) {
        setError(`Amount exceeds mint limit of ${token.mintLimit}`);
        return;
      }
    }

    // Check max supply
    const minted = BigInt(token.mintedSupply);
    const max = BigInt(token.maxSupply);
    if (minted + amountBigInt > max) {
      const remaining = max - minted;
      setError(`Cannot mint more than remaining supply: ${remaining.toString()}`);
      return;
    }

    mintMutation.mutate();
  };

  if (txid) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-lg font-semibold mb-2">Mint Successful!</p>
        <p className="text-gray-400 mb-2">
          Minted {amount} {token.ticker}
        </p>
        <p className="font-mono text-sm text-gray-500 break-all mb-4">{txid}</p>
        <button
          onClick={() => {
            setTxid(null);
            setAmount("");
          }}
          className="text-orange-400 hover:text-orange-300"
        >
          Mint More
        </button>
      </div>
    );
  }

  // Check if minting is available
  const isOpenMint = token.isOpenMint;
  const maxSupply = BigInt(token.maxSupply);
  const mintedSupply = BigInt(token.mintedSupply);
  const remainingSupply = maxSupply - mintedSupply;
  const isMintedOut = remainingSupply <= 0n;

  if (!isOpenMint) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-lg font-semibold mb-2">Minting Disabled</p>
        <p className="text-gray-400">
          This token does not have open minting enabled.
        </p>
      </div>
    );
  }

  if (isMintedOut) {
    return (
      <div className="text-center py-8">
        <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <p className="text-lg font-semibold mb-2">Fully Minted!</p>
        <p className="text-gray-400">
          All {token.maxSupply} {token.ticker} tokens have been minted.
        </p>
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

      <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Remaining Supply</span>
          <span className="font-mono">{remainingSupply.toString()}</span>
        </div>
        {token.mintLimit && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Mint Limit</span>
            <span className="font-mono">{token.mintLimit}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Amount to Mint
        </label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder={token.mintLimit || "Enter amount"}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors font-mono"
        />
        {token.mintLimit && (
          <button
            type="button"
            onClick={() => setAmount(token.mintLimit!)}
            className="text-sm text-orange-400 hover:text-orange-300 mt-2"
          >
            Use max limit ({token.mintLimit})
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={mintMutation.isPending || !amount}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {mintMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Coins className="w-4 h-4" />
            Mint {token.ticker}
          </>
        )}
      </button>
    </form>
  );
}
