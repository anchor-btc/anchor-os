import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Protocol App Colors & Icons
// ============================================================================

export interface ProtocolAppConfig {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: string; // emoji or icon name
  path: string;
  port: number;
}

export const PROTOCOL_APPS: Record<string, ProtocolAppConfig> = {
  threads: {
    id: "threads",
    name: "Threads",
    color: "#3B82F6",
    bgColor: "bg-blue-500/10",
    icon: "💬",
    path: "/apps/threads",
    port: 3021,
  },
  pixel: {
    id: "pixel",
    name: "Pixel",
    color: "#EC4899",
    bgColor: "bg-pink-500/10",
    icon: "🎨",
    path: "/apps/pixel",
    port: 3022,
  },
  map: {
    id: "map",
    name: "Map",
    color: "#22C55E",
    bgColor: "bg-green-500/10",
    icon: "🗺️",
    path: "/apps/map",
    port: 3023,
  },
  dns: {
    id: "dns",
    name: "DNS",
    color: "#8B5CF6",
    bgColor: "bg-purple-500/10",
    icon: "🌐",
    path: "/apps/dns",
    port: 3024,
  },
  proof: {
    id: "proof",
    name: "Proof",
    color: "#14B8A6",
    bgColor: "bg-teal-500/10",
    icon: "📜",
    path: "/apps/proof",
    port: 3025,
  },
  tokens: {
    id: "tokens",
    name: "Tokens",
    color: "#F59E0B",
    bgColor: "bg-amber-500/10",
    icon: "🪙",
    path: "/apps/tokens",
    port: 3026,
  },
  oracles: {
    id: "oracles",
    name: "Oracles",
    color: "#EF4444",
    bgColor: "bg-red-500/10",
    icon: "🔮",
    path: "/apps/oracles",
    port: 3027,
  },
  predictions: {
    id: "predictions",
    name: "Predictions",
    color: "#F97316",
    bgColor: "bg-orange-500/10",
    icon: "📊",
    path: "/apps/predictions",
    port: 3028,
  },
};

export function getAppConfigById(appId: string): ProtocolAppConfig | undefined {
  return PROTOCOL_APPS[appId];
}

export function getAppUrl(appId: string, path?: string): string {
  const app = PROTOCOL_APPS[appId];
  if (!app) return "#";
  const basePath = path || "";
  return `http://localhost:${app.port}${basePath}`;
}

