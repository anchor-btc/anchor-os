import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
