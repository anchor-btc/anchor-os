import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate a string in the middle with ellipsis
 */
export function truncateMiddle(str: string, startLen: number = 8, endLen: number = 8): string {
  if (str.length <= startLen + endLen + 3) return str;
  return `${str.slice(0, startLen)}...${str.slice(-endLen)}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number | bigint): string {
  return num.toLocaleString();
}

/**
 * Format token amount with decimals
 * @param amount - The raw amount (smallest unit)
 * @param decimals - Number of decimal places
 * @param displayDecimals - How many decimals to show (default: all)
 */
export function formatTokenAmount(
  amount: string | bigint,
  decimals: number,
  displayDecimals?: number
): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;

  if (decimals === 0) {
    return amountBigInt.toLocaleString();
  }

  const divisor = 10n ** BigInt(decimals);
  const integerPart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  // Pad fractional part with leading zeros
  let fractionalStr = fractionalPart.toString().padStart(decimals, '0');

  // Trim trailing zeros if displayDecimals is set
  if (displayDecimals !== undefined && displayDecimals < decimals) {
    fractionalStr = fractionalStr.slice(0, displayDecimals);
  }

  // Remove trailing zeros
  fractionalStr = fractionalStr.replace(/0+$/, '');

  if (fractionalStr === '') {
    return integerPart.toLocaleString();
  }

  return `${integerPart.toLocaleString()}.${fractionalStr}`;
}

/**
 * Calculate percentage with formatting
 */
export function formatPercentage(part: bigint, total: bigint, decimals: number = 2): string {
  if (total === 0n) return '0%';

  const multiplier = 10n ** BigInt(decimals + 2);
  const percentage = (part * multiplier) / total;
  const value = Number(percentage) / 10 ** decimals;

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format satoshis to BTC
 */
export function formatBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}
