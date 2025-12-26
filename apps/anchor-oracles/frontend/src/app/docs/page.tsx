export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Documentation</h1>
        <p className="text-gray-400 mt-2">Learn how to use Anchor Oracles</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">What is Anchor Oracles?</h2>
          <p className="text-gray-400">
            Anchor Oracles is a decentralized oracle network built on Bitcoin using the Anchor Protocol.
            Oracles are entities that attest to real-world data, making it available for use in
            Bitcoin-based contracts like Discreet Log Contracts (DLCs).
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Oracle Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Block", desc: "Block hashes, timestamps, and chain data" },
              { name: "Prices", desc: "Cryptocurrency and asset prices from exchanges" },
              { name: "Sports", desc: "Sports events, scores, and game outcomes" },
              { name: "Weather", desc: "Weather conditions, temperatures, forecasts" },
              { name: "Elections", desc: "Political elections and voting results" },
              { name: "Random", desc: "Verifiable random numbers (VRF)" },
              { name: "Custom", desc: "Any other real-world events" },
            ].map((cat) => (
              <div key={cat.name} className="p-3 rounded-lg bg-white/5">
                <h3 className="font-medium text-purple-300">{cat.name}</h3>
                <p className="text-sm text-gray-400">{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

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
                <td className="py-2 text-white">Oracle</td>
                <td className="py-2 text-purple-300">30</td>
                <td className="py-2 text-gray-400">Register or update an oracle</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">OracleAttestation</td>
                <td className="py-2 text-purple-300">31</td>
                <td className="py-2 text-gray-400">Signed attestation of an outcome</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-white">OracleDispute</td>
                <td className="py-2 text-purple-300">32</td>
                <td className="py-2 text-gray-400">Challenge an attestation</td>
              </tr>
              <tr>
                <td className="py-2 text-white">OracleSlash</td>
                <td className="py-2 text-purple-300">33</td>
                <td className="py-2 text-gray-400">Slash oracle stake after dispute</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Reputation System</h2>
          <p className="text-gray-400 mb-4">
            Oracles build reputation over time based on:
          </p>
          <ul className="text-gray-400 space-y-2 list-disc list-inside">
            <li>Number of successful attestations</li>
            <li>Accuracy of attestations (no successful disputes against them)</li>
            <li>Response time to event requests</li>
            <li>Amount of stake locked as collateral</li>
          </ul>
          <p className="text-gray-400 mt-4">
            Reputation score ranges from 0 to 100, starting at 50 for new oracles.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">DLC Compatibility</h2>
          <p className="text-gray-400 mb-4">
            Oracle attestations use Schnorr signatures, making them compatible with 
            Discreet Log Contracts (DLCs). This enables trustless, conditional payments
            on Bitcoin based on oracle-attested outcomes.
          </p>
          <p className="text-gray-400">
            See the <a href="/lottery" className="text-purple-400 hover:underline">Anchor Lottery</a> 
            {" "}for an example of DLCs in action.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">API Reference</h2>
          <p className="text-gray-400 mb-4">
            The Anchor Oracles API is available at:
          </p>
          <code className="block p-3 rounded-lg bg-black/50 text-purple-300 font-mono text-sm">
            http://localhost:3701/swagger-ui
          </code>
        </section>
      </div>
    </div>
  );
}

