import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { TokenBalance } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface BalanceDisplayProps {
  balance: TokenBalance;
}

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  // Format the balance with decimals
  const rawBalance = BigInt(balance.balance);
  const divisor = 10n ** BigInt(balance.decimals);
  const intPart = rawBalance / divisor;
  const fracPart = rawBalance % divisor;

  let displayBalance: string;
  if (balance.decimals === 0) {
    displayBalance = formatNumber(intPart);
  } else {
    const fracStr = fracPart.toString().padStart(balance.decimals, '0');
    const trimmedFrac = fracStr.replace(/0+$/, '');
    displayBalance = trimmedFrac
      ? `${formatNumber(intPart)}.${trimmedFrac}`
      : formatNumber(intPart);
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <span className="text-orange-400 font-bold text-sm">{balance.ticker.slice(0, 2)}</span>
        </div>
        <div>
          <Link
            href={`/token/${balance.ticker}`}
            className="font-semibold hover:text-orange-400 transition-colors"
          >
            {balance.ticker}
          </Link>
          <p className="text-gray-500 text-sm">
            {balance.utxoCount} UTXO{balance.utxoCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-lg">{displayBalance}</p>
          <p className="text-gray-500 text-sm">{balance.decimals} decimals</p>
        </div>
        <Link
          href={`/token/${balance.ticker}`}
          className="p-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
