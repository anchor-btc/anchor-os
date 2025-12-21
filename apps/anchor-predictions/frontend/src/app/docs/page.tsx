export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Documentation</h1>
        <p className="text-gray-400 mt-2">Technical reference for Anchor Lottery</p>
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
                <td className="py-2 text-white">LotteryCreate</td>
                <td className="py-2 text-amber-300">40</td>
                <td className="py-2 text-gray-400">Create a new lottery</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">LotteryTicket</td>
                <td className="py-2 text-amber-300">41</td>
                <td className="py-2 text-gray-400">Buy a lottery ticket</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">LotteryDraw</td>
                <td className="py-2 text-amber-300">42</td>
                <td className="py-2 text-gray-400">Oracle attestation of winning numbers</td>
              </tr>
              <tr>
                <td className="py-2 text-white">LotteryClaim</td>
                <td className="py-2 text-amber-300">43</td>
                <td className="py-2 text-gray-400">Claim winnings with DLC proof</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Lottery Create Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] lottery_id (hash)
[1 byte]   lottery_type: 0=daily, 1=weekly, 2=jackpot
[1 byte]   number_count (how many numbers to pick)
[1 byte]   number_max (max value, e.g., 60)
[4 bytes]  draw_block (when to draw)
[8 bytes]  ticket_price_sats
[1 byte]   token_type: 0=BTC, 1=AnchorToken
[32 bytes] oracle_pubkey (designated oracle for draw)`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Lottery Ticket Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] lottery_id
[1 byte]   number_count
[N bytes]  numbers (1 byte each, sorted)
[33 bytes] buyer_pubkey (for DLC)
[8 bytes]  amount_paid`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Lottery Draw Message Body</h2>
          <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto">
            <code className="text-gray-300">{`[32 bytes] lottery_id
[4 bytes]  draw_block_height
[32 bytes] block_hash
[1 byte]   number_count
[N bytes]  winning_numbers
[64 bytes] schnorr_signature (Oracle signature for DLC)`}</code>
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">API Reference</h2>
          <p className="text-gray-400 mb-4">
            The Anchor Lottery API is available at:
          </p>
          <code className="block p-3 rounded-lg bg-black/50 text-amber-300 font-mono text-sm">
            http://localhost:3022/swagger-ui
          </code>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">DLC Settlement Flow</h2>
          <ol className="space-y-3 text-gray-400 list-decimal list-inside">
            <li>Ticket purchase creates DLC with adaptor signatures for each possible outcome</li>
            <li>Each outcome (0 matches, 1 match, ... N matches) has a different payout</li>
            <li>Oracle publishes Schnorr signature s for the actual outcome</li>
            <li>Winner combines adaptor signature with oracle&apos;s s to get valid signature</li>
            <li>Winner broadcasts settlement transaction to claim funds</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

