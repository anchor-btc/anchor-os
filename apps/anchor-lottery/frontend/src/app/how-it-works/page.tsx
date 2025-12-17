import { Ticket, Lock, Eye, Coins, Shield, Zap } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">How It Works</h1>
        <p className="text-gray-400 mt-2">Understanding trustless lottery on Bitcoin</p>
      </div>

      {/* Overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
        <p className="text-gray-400">
          Anchor Lottery uses Discreet Log Contracts (DLCs) to enable trustless lottery payouts on Bitcoin.
          Unlike traditional lotteries where you must trust the operator, our system ensures that winners
          automatically receive their funds without any party being able to cheat or withhold payments.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
            <Ticket className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">1. Create Lottery</h3>
          <p className="text-gray-400 text-sm">
            Anyone can create a lottery by specifying the number range, draw block, ticket price,
            and designating an oracle from the Anchor Oracles network to attest to the winning numbers.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">2. Buy Tickets with DLC</h3>
          <p className="text-gray-400 text-sm">
            When you buy a ticket, you create a Discreet Log Contract. This locks your payment in a
            special Bitcoin script that can only be unlocked based on the oracle&apos;s attestation.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">3. Oracle Attestation</h3>
          <p className="text-gray-400 text-sm">
            At the draw block, the designated oracle generates winning numbers (typically using the
            block hash for randomness) and publishes a Schnorr signature attesting to the outcome.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
            <Coins className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">4. Automatic Settlement</h3>
          <p className="text-gray-400 text-sm">
            The oracle&apos;s signature &quot;unlocks&quot; the DLC adaptor signatures for winning tickets.
            Winners can now complete their transaction and claim their prize — no permission needed.
          </p>
        </div>
      </div>

      {/* DLC Explanation */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">What is a DLC?</h2>
        <p className="text-gray-400 mb-4">
          A Discreet Log Contract is a type of Bitcoin smart contract that enables conditional payments
          based on external data. The key innovation is that:
        </p>
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">No Custody:</strong> The oracle never holds the funds.
              They only sign a message attesting to the outcome.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Privacy:</strong> The oracle doesn&apos;t know who is betting
              on what. They just publish the outcome.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Trustless:</strong> Once the oracle publishes their signature,
              winners can claim funds without any further cooperation.
            </span>
          </li>
        </ul>
      </div>

      {/* Prize Distribution */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Prize Distribution</h2>
        <p className="text-gray-400 mb-4">
          Prizes are distributed based on how many numbers you match:
        </p>
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              <th className="pb-2">Tier</th>
              <th className="pb-2">Matches</th>
              <th className="pb-2">Pool Share</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-white/5">
              <td className="py-2 text-amber-400">Jackpot</td>
              <td className="py-2 text-white">All 6</td>
              <td className="py-2 text-white">50%</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-gray-300">Second</td>
              <td className="py-2 text-white">5 of 6</td>
              <td className="py-2 text-white">25%</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 text-gray-300">Third</td>
              <td className="py-2 text-white">4 of 6</td>
              <td className="py-2 text-white">15%</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-300">Fourth</td>
              <td className="py-2 text-white">3 of 6</td>
              <td className="py-2 text-white">10%</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">
          * Prize tiers vary by lottery type. See each lottery for specific distribution.
        </p>
      </div>

      {/* Oracle Trust */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Oracle Trust Model
        </h2>
        <p className="text-gray-400 mb-4">
          While DLCs remove the need to trust anyone with custody of funds, you still need to trust
          the oracle to attest honestly. Anchor Oracles addresses this with:
        </p>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>• <strong className="text-white">Staking:</strong> Oracles stake Bitcoin as collateral</li>
          <li>• <strong className="text-white">Reputation:</strong> Track record visible to all</li>
          <li>• <strong className="text-white">Disputes:</strong> Challenge and slash dishonest oracles</li>
          <li>• <strong className="text-white">Multi-oracle:</strong> Use multiple oracles for critical events</li>
        </ul>
        <a
          href="http://localhost:3019"
          className="inline-block mt-4 text-purple-400 hover:text-purple-300"
        >
          Browse oracles on Anchor Oracles →
        </a>
      </div>
    </div>
  );
}

