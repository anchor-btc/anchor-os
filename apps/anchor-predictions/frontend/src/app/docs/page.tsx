export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Documentation</h1>
        <p className="text-gray-400 mt-2">Technical reference for Anchor Predictions</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Message Types</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="pb-2">Kind</th>
                <th className="pb-2">Value</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">MarketCreate</td>
                <td className="py-2 text-amber-300">40</td>
                <td className="py-2 text-gray-400">Create a new prediction market</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">PlaceBet</td>
                <td className="py-2 text-amber-300">41</td>
                <td className="py-2 text-gray-400">Place a bet on YES or NO</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">MarketResolve</td>
                <td className="py-2 text-amber-300">42</td>
                <td className="py-2 text-gray-400">Oracle attestation of outcome</td>
              </tr>
              <tr>
                <td className="py-2 text-white">ClaimWinnings</td>
                <td className="py-2 text-amber-300">43</td>
                <td className="py-2 text-gray-400">Claim winnings from resolved market</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">MarketCreate Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] market_id (unique identifier)
[2 bytes]  question_len (big-endian)
[N bytes]  question (UTF-8 string)
[2 bytes]  description_len (big-endian)
[M bytes]  description (UTF-8 string, optional)
[4 bytes]  resolution_block (when oracle resolves)
[32 bytes] oracle_pubkey (designated oracle)
[8 bytes]  initial_liquidity (AMM pool size)`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">PlaceBet Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] market_id
[1 byte]   outcome: 0=NO, 1=YES
[8 bytes]  amount_sats (big-endian)
[8 bytes]  min_shares (slippage protection)
[33 bytes] user_pubkey (compressed)`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">MarketResolve Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] market_id
[1 byte]   resolution: 0=NO, 1=YES, 2=INVALID
[32 bytes] oracle_pubkey
[64 bytes] schnorr_signature`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">AMM Formula</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`# Constant Product Market Maker
k = YES_pool × NO_pool (invariant)

# Prices (0.0 to 1.0)
yes_price = NO_pool / (YES_pool + NO_pool)
no_price = YES_pool / (YES_pool + NO_pool)

# Buying YES shares with amount A:
new_NO_pool = NO_pool + A
new_YES_pool = k / new_NO_pool
shares_out = YES_pool - new_YES_pool`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">API Reference</h2>
          <p className="text-gray-400 mb-4">The Anchor Predictions API is available at:</p>
          <code className="block p-3 rounded-lg bg-black/50 text-amber-300 font-mono text-sm">
            http://localhost:3801/swagger-ui
          </code>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Resolution Flow</h2>
          <ol className="space-y-3 text-gray-400 list-decimal list-inside">
            <li>Market reaches resolution block height</li>
            <li>Oracle evaluates the real-world outcome</li>
            <li>Oracle publishes MarketResolve message with Schnorr signature</li>
            <li>Backend updates all positions: winners marked, payouts calculated</li>
            <li>Winners claim their shares (each share worth 1 unit)</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
