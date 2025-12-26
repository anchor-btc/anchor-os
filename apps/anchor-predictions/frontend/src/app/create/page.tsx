'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Info, Loader2, CheckCircle, XCircle, ChevronDown, HelpCircle } from 'lucide-react';
import { createMarket, fetchOracles, type Oracle } from '@/lib/api';
import { cn, shortenHash } from '@/lib/utils';

export default function CreateMarketPage() {
  useRouter(); // Keep for future navigation

  // Form state
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionBlock, setResolutionBlock] = useState('');
  const [selectedOracle, setSelectedOracle] = useState<Oracle | null>(null);
  const [showOracleSelect, setShowOracleSelect] = useState(false);
  const [initialLiquidity, setInitialLiquidity] = useState('1000000000');

  // Result state
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch oracles
  const { data: oracles, isLoading: oraclesLoading } = useQuery({
    queryKey: ['oracles'],
    queryFn: fetchOracles,
  });

  // Create market mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOracle) throw new Error('Please select an oracle.');
      if (!question.trim()) throw new Error('Please enter a question.');
      if (!resolutionBlock) throw new Error('Please enter a resolution block.');

      return createMarket({
        question: question.trim(),
        description: description.trim() || undefined,
        resolution_block: parseInt(resolutionBlock),
        oracle_pubkey: selectedOracle.pubkey,
        initial_liquidity_sats: parseInt(initialLiquidity),
      });
    },
    onSuccess: (data) => {
      setResult({ success: true, message: data.message });
    },
    onError: (error: Error) => {
      setResult({ success: false, message: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    createMutation.mutate();
  };

  const handleSelectOracle = (oracle: Oracle) => {
    setSelectedOracle(oracle);
    setShowOracleSelect(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Plus className="w-7 h-7 text-amber-400" />
          Create Prediction Market
        </h1>
        <p className="text-gray-400 mt-1">
          Ask a yes/no question and let the market predict the outcome
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Question *</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will Bitcoin reach $100,000 by end of 2025?"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-lg"
              required
            />
            <p className="text-gray-500 text-xs mt-2">
              Ask a clear yes/no question that can be objectively verified
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context or resolution criteria..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Resolution */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            Resolution Settings
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution Block *
            </label>
            <input
              type="number"
              value={resolutionBlock}
              onChange={(e) => setResolutionBlock(e.target.value)}
              placeholder="e.g., 900000"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              required
            />
            <p className="text-gray-500 text-xs mt-2">
              The Bitcoin block height at which the market will be resolved
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Oracle *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOracleSelect(!showOracleSelect)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-left flex items-center justify-between hover:border-white/20 transition-colors"
              >
                {selectedOracle ? (
                  <div>
                    <p className="text-white font-medium">{selectedOracle.name}</p>
                    <p className="text-gray-500 text-sm font-mono">
                      {shortenHash(selectedOracle.pubkey)}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-500">Select an oracle...</span>
                )}
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-400 transition-transform',
                    showOracleSelect && 'rotate-180'
                  )}
                />
              </button>

              {showOracleSelect && (
                <div className="absolute z-10 w-full mt-2 rounded-lg border border-white/10 bg-gray-900 shadow-xl max-h-60 overflow-auto">
                  {oraclesLoading ? (
                    <div className="p-4 text-center text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading oracles...
                    </div>
                  ) : oracles && oracles.length > 0 ? (
                    oracles.map((oracle) => (
                      <button
                        key={oracle.id}
                        type="button"
                        onClick={() => handleSelectOracle(oracle)}
                        className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0"
                      >
                        <p className="text-white font-medium">{oracle.name}</p>
                        <p className="text-gray-500 text-sm">{oracle.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>Score: {oracle.reputation_score}</span>
                          <span>Attestations: {oracle.total_attestations}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">No oracles available</div>
                  )}
                </div>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              The oracle that will attest to the market outcome
            </p>
          </div>
        </div>

        {/* AMM Settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            AMM Settings
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial Liquidity (pool units)
            </label>
            <input
              type="number"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              placeholder="1000000000"
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <p className="text-gray-500 text-xs mt-2">
              Higher liquidity = lower slippage for bettors. Default: 1 billion units
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              <strong>How AMM works:</strong> The market starts with 50/50 odds. As users bet,
              prices adjust based on demand. Betting on YES increases YES price and decreases NO
              price, and vice versa.
            </p>
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={cn(
              'rounded-xl p-4 flex items-start gap-3',
              result.success
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            )}
          >
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                {result.success ? 'Market created!' : 'Error'}
              </p>
              <p className="text-gray-400 text-sm mt-1">{result.message}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={createMutation.isPending || !question || !resolutionBlock || !selectedOracle}
          className="w-full px-6 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Market...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Create Market
            </>
          )}
        </button>
      </form>
    </div>
  );
}
