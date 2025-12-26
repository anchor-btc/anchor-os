import Link from 'next/link';
import { Users, Activity } from 'lucide-react';
import type { Token } from '@/lib/api';
import { formatNumber, formatRelativeTime } from '@/lib/utils';

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  // Calculate progress
  const minted = BigInt(token.mintedSupply);
  const max = BigInt(token.maxSupply);
  const progress = max > 0n ? Number((minted * 100n) / max) : 0;

  return (
    <Link
      href={`/token/${token.ticker}`}
      className="token-card block bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-orange-500/50"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-orange-400">{token.ticker}</h3>
          <p className="text-gray-500 text-sm">{formatRelativeTime(token.createdAt)}</p>
        </div>
        <div className="flex gap-1">
          {token.isOpenMint && (
            <span className="w-2 h-2 bg-green-400 rounded-full" title="Open Mint" />
          )}
          {token.isBurnable && (
            <span className="w-2 h-2 bg-red-400 rounded-full" title="Burnable" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Minted</span>
          <span className="text-gray-300">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-400">
          <Users className="w-4 h-4" />
          <span>{formatNumber(token.holderCount)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Activity className="w-4 h-4" />
          <span>{formatNumber(token.txCount)}</span>
        </div>
        <div className="text-gray-500">{token.decimals} decimals</div>
      </div>
    </Link>
  );
}
