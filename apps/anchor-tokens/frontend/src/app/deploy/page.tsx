"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { createDeployTx, broadcastTx, mineBlocks } from "@/lib/api";

export default function DeployPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    ticker: "",
    decimals: 8,
    maxSupply: "21000000",
    mintLimit: "",
    openMint: true,
    burnable: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const deployMutation = useMutation({
    mutationFn: async () => {
      // Create the transaction
      const result = await createDeployTx({
        ticker: formData.ticker.toUpperCase(),
        decimals: formData.decimals,
        maxSupply: formData.maxSupply,
        mintLimit: formData.mintLimit || undefined,
        openMint: formData.openMint,
        burnable: formData.burnable,
        carrier: 4, // WitnessData for 75% discount
      });

      // Broadcast it
      await broadcastTx(result.hex);

      // Mine a block to confirm (regtest only)
      try {
        await mineBlocks(1);
      } catch {
        // Mining might fail if not regtest, that's ok
      }

      return result;
    },
    onSuccess: (data) => {
      setTxid(data.txid);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.ticker || formData.ticker.length < 1 || formData.ticker.length > 32) {
      setError("Ticker must be 1-32 characters");
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(formData.ticker)) {
      setError("Ticker must be alphanumeric only");
      return;
    }

    if (formData.decimals < 0 || formData.decimals > 18) {
      setError("Decimals must be between 0 and 18");
      return;
    }

    const maxSupply = BigInt(formData.maxSupply || "0");
    if (maxSupply <= 0n) {
      setError("Max supply must be greater than 0");
      return;
    }

    deployMutation.mutate();
  };

  if (txid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Token Deployed!</h1>
            <p className="text-gray-400 mb-6">
              Your token <span className="text-orange-400 font-bold">{formData.ticker.toUpperCase()}</span> has been deployed successfully.
            </p>
            <p className="font-mono text-sm bg-gray-900 p-3 rounded-lg break-all mb-6">
              {txid}
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href={`/token/${formData.ticker.toUpperCase()}`}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                View Token
              </Link>
              <button
                onClick={() => {
                  setTxid(null);
                  setFormData({
                    ticker: "",
                    decimals: 8,
                    maxSupply: "21000000",
                    mintLimit: "",
                    openMint: true,
                    burnable: true,
                  });
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Deploy Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Deploy Token</h1>
              <p className="text-gray-400">Create a new UTXO-based token</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Ticker <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                placeholder="e.g., ANCHOR"
                maxLength={32}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors font-mono text-xl"
              />
              <p className="text-gray-500 text-sm mt-1">1-32 alphanumeric characters</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Decimals <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.decimals}
                  onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={18}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-gray-500 text-sm mt-1">0-18 decimal places</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Supply <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.maxSupply}
                  onChange={(e) => setFormData({ ...formData, maxSupply: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="21000000"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mint Limit (Optional)
              </label>
              <input
                type="text"
                value={formData.mintLimit}
                onChange={(e) => setFormData({ ...formData, mintLimit: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="Maximum tokens per mint (leave empty for no limit)"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors font-mono"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.openMint}
                  onChange={(e) => setFormData({ ...formData, openMint: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <span className="font-medium">Open Mint</span>
                  <p className="text-gray-500 text-sm">Anyone can mint tokens (like fair launch)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.burnable}
                  onChange={(e) => setFormData({ ...formData, burnable: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <span className="font-medium">Burnable</span>
                  <p className="text-gray-500 text-sm">Allow token holders to burn their tokens</p>
                </div>
              </label>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Fee Optimization</h3>
              <p className="text-gray-400 text-sm">
                This transaction uses the <span className="text-orange-400">Witness Data carrier</span> for a 75% fee discount compared to OP_RETURN.
              </p>
            </div>

            <button
              type="submit"
              disabled={deployMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {deployMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5" />
                  Deploy Token
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
