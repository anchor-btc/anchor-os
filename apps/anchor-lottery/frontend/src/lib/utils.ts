import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatNumbers(numbers: number[]): string {
  return numbers.map(n => n.toString().padStart(2, '0')).join(' - ');
}

export function lotteryTypeName(type: number): string {
  switch (type) {
    case 0: return "Daily";
    case 1: return "Weekly";
    case 2: return "Jackpot";
    default: return "Unknown";
  }
}

export function lotteryTypeColor(type: number): string {
  switch (type) {
    case 0: return "bg-blue-500/20 text-blue-400";
    case 1: return "bg-purple-500/20 text-purple-400";
    case 2: return "bg-amber-500/20 text-amber-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "open": return "bg-green-500/20 text-green-400";
    case "drawing": return "bg-yellow-500/20 text-yellow-400";
    case "completed": return "bg-blue-500/20 text-blue-400";
    case "cancelled": return "bg-red-500/20 text-red-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
}

