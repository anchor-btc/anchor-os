import { TrendingUp, Lock, Eye, Coins, Shield, Zap, BarChart3 } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">How It Works</h1>
        <p className="text-gray-400 mt-2">Understanding binary prediction markets on Bitcoin</p>
      </div>

      {/* Overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
        <p className="text-gray-400">
          Anchor Predictions enables trustless binary (YES/NO) prediction markets on Bitcoin.
          Markets are created with questions about future events, and users bet on outcomes
          using an Automated Market Maker (AMM). Oracles resolve markets, and winners receive payouts.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">1. Create Market</h3>
          <p className="text-gray-400 text-sm">
            Anyone can create a prediction market by asking a YES/NO question, setting a resolution
            date, and designating an oracle from the Anchor Oracles network.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">2. Place Your Bet</h3>
          <p className="text-gray-400 text-sm">
            Bet on YES or NO. The AMM automatically sets prices based on market demand.
            Earlier bets at longer odds yield bigger potential returns.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">3. Oracle Resolution</h3>
          <p className="text-gray-400 text-sm">
            At the resolution block, the designated oracle attests to the outcome (YES or NO)
            by publishing a Schnorr signature on-chain.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Coins className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">4. Collect Winnings</h3>
          <p className="text-gray-400 text-sm">
            Winners claim their shares. Each share is worth the full payout (1 unit).
            The more shares you hold on the winning side, the more you earn.
          </p>
        </div>
      </div>

      {/* AMM Explanation */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">How the AMM Works</h2>
        <p className="text-gray-400 mb-4">
          Anchor Predictions uses a Constant Product Market Maker (CPMM) — the same model
          used by Uniswap. This ensures there&apos;s always liquidity for any bet size.
        </p>
        <div className="bg-black/50 p-4 rounded-lg font-mono text-sm mb-4">
          <p className="text-green-400">k = YES_pool × NO_pool (constant)</p>
          <p className="text-amber-400 mt-2">Price of YES = NO_pool / (YES_pool + NO_pool)</p>
          <p className="text-red-400 mt-1">Price of NO = YES_pool / (YES_pool + NO_pool)</p>
        </div>
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Dynamic Pricing:</strong> As more people bet YES,
              the YES price increases and NO price decreases.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Price Impact:</strong> Larger bets move the price
              more. You can see the expected price impact before betting.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Fair Payouts:</strong> Winners receive shares worth
              the full pool value proportional to their stake.
            </span>
          </li>
        </ul>
      </div>

      {/* Example */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Example Trade</h2>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>
            <strong className="text-white">Market:</strong> &quot;Will Bitcoin reach $100,000 by end of 2025?&quot;
          </p>
          <p>
            <strong className="text-white">Current Price:</strong> YES = 65%, NO = 35%
          </p>
          <p>
            <strong className="text-white">Your Bet:</strong> 10,000 sats on YES
          </p>
          <p>
            <strong className="text-white">Shares Received:</strong> ~15,385 shares (at 0.65 avg price)
          </p>
          <p>
            <strong className="text-white">If YES wins:</strong> Your 15,385 shares are worth ~15,385 sats
          </p>
          <p>
            <strong className="text-white">Profit:</strong> ~5,385 sats (53% return)
          </p>
        </div>
      </div>

      {/* Oracle Trust */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Oracle Trust Model
        </h2>
        <p className="text-gray-400 mb-4">
          Markets are resolved by oracles from the Anchor Oracles network. Trust is ensured through:
        </p>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>• <strong className="text-white">Staking:</strong> Oracles stake Bitcoin as collateral</li>
          <li>• <strong className="text-white">Reputation:</strong> Track record visible to all users</li>
          <li>• <strong className="text-white">Disputes:</strong> Challenge and slash dishonest oracles</li>
          <li>• <strong className="text-white">Selection:</strong> Market creators choose trusted oracles</li>
        </ul>
        <a
          href="http://localhost:3701"
          className="inline-block mt-4 text-purple-400 hover:text-purple-300"
        >
          Browse oracles on Anchor Oracles →
        </a>
      </div>
    </div>
  );
}
