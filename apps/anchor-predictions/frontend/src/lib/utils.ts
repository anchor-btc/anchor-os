import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export function formatSats(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(4)} BTC`;
  }
  if (sats >= 1_000_000) {
    return `${(sats / 1_000_000).toFixed(2)}M sats`;
  }
  if (sats >= 1_000) {
    return `${(sats / 1_000).toFixed(1)}k sats`;
  }
  return `${sats} sats`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatOdds(price: number): string {
  if (price <= 0 || price >= 1) return 'N/A';
  return (1 / price).toFixed(2);
}

export function outcomeColor(outcome: number): string {
  return outcome === 1
    ? 'bg-green-500/20 text-green-400 border-green-500/50'
    : 'bg-red-500/20 text-red-400 border-red-500/50';
}

export function statusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-green-500/20 text-green-400';
    case 'resolved':
      return 'bg-blue-500/20 text-blue-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export function resolutionColor(resolution: number | null): string {
  if (resolution === null) return 'bg-yellow-500/20 text-yellow-400';
  if (resolution === 1) return 'bg-green-500/20 text-green-400';
  if (resolution === 0) return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-400';
}

export function priceToColor(price: number): string {
  // Higher price = more likely = greener
  if (price >= 0.7) return 'text-green-400';
  if (price >= 0.5) return 'text-yellow-400';
  if (price >= 0.3) return 'text-orange-400';
  return 'text-red-400';
}
