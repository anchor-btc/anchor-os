// App definitions - groups containers into logical apps

export interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url?: string;
  internalUrl?: string; // Internal dashboard route (e.g., /testnet)
  port?: number;
  containers: string[]; // container names that make up this app
  category: "app" | "tool" | "infrastructure";
  featured?: boolean;
}

export const apps: App[] = [
  // =============================================
  // TOOLS (tool-)
  // =============================================
  {
    id: "app-threads",
    name: "Anchor Threads",
    description: "Social threads and messaging on Bitcoin using the ANCHOR protocol",
    icon: "MessageSquare",
    color: "orange",
    url: "http://localhost:3000",
    port: 3000,
    containers: ["anchor-app-threads-frontend", "anchor-app-threads-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "tool-mempool",
    name: "Mempool Explorer",
    description: "Full Bitcoin block explorer powered by mempool.space",
    icon: "Bitcoin",
    color: "orange",
    url: "http://localhost:3003",
    port: 3003,
    containers: ["anchor-tool-mempool-web", "anchor-tool-mempool-api", "anchor-tool-mempool-db"],
    category: "tool",
    featured: true,
  },
  {
    id: "tool-btc-explorer",
    name: "BTC RPC Explorer",
    description: "Simple and lightweight Bitcoin block explorer",
    icon: "Search",
    color: "yellow",
    url: "http://localhost:3015",
    port: 3015,
    containers: ["anchor-tool-btc-explorer"],
    category: "tool",
    featured: false,
  },
  {
    id: "tool-testnet",
    name: "Anchor Testnet",
    description: "Automatically generates test transactions and mines blocks",
    icon: "Pickaxe",
    color: "amber",
    internalUrl: "/testnet",
    port: 3014,
    containers: ["anchor-tool-testnet"],
    category: "tool",
    featured: true,
  },

  // =============================================
  // APPS (app-)
  // =============================================
  {
    id: "app-pixel",
    name: "Anchor Pixel",
    description: "Collaborative pixel canvas powered by Bitcoin transactions",
    icon: "Grid3X3",
    color: "purple",
    url: "http://localhost:3005",
    port: 3005,
    containers: ["anchor-app-pixel-frontend", "anchor-app-pixel-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "app-map",
    name: "Anchor Map",
    description: "Place permanent markers on a map using Bitcoin",
    icon: "MapPin",
    color: "blue",
    url: "http://localhost:3007",
    port: 3007,
    containers: ["anchor-app-map-frontend", "anchor-app-map-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "app-dns",
    name: "Anchor DNS",
    description: "Decentralized DNS on Bitcoin - register .bit domains",
    icon: "Globe",
    color: "cyan",
    url: "http://localhost:3009",
    port: 3009,
    containers: ["anchor-app-dns-frontend", "anchor-app-dns-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "app-proof",
    name: "Anchor Proof",
    description: "Proof of Existence - timestamp files on Bitcoin",
    icon: "FileCheck",
    color: "emerald",
    url: "http://localhost:3013",
    port: 3013,
    containers: ["anchor-app-proof-frontend", "anchor-app-proof-backend"],
    category: "app",
    featured: true,
  },

  // =============================================
  // INFRASTRUCTURE (infra-)
  // =============================================
  {
    id: "infra-bitcoin",
    name: "Bitcoin Node",
    description: "Bitcoin Core - full-featured node with mining support",
    icon: "Bitcoin",
    color: "orange",
    port: 18443,
    containers: ["anchor-infra-bitcoin"],
    category: "infrastructure",
  },
  {
    id: "tool-wallet",
    name: "Anchor Wallet",
    description: "REST API for creating and broadcasting transactions",
    icon: "Wallet",
    color: "green",
    url: "http://localhost:3001/swagger-ui",
    port: 3001,
    containers: ["anchor-tool-wallet"],
    category: "tool",
  },
  {
    id: "infra-postgres",
    name: "Database",
    description: "PostgreSQL database for storing indexed data",
    icon: "Database",
    color: "blue",
    port: 5432,
    containers: ["anchor-infra-postgres"],
    category: "infrastructure",
  },
  {
    id: "infra-indexer",
    name: "Anchor Indexer",
    description: "Indexes ANCHOR messages from the blockchain",
    icon: "Search",
    color: "cyan",
    containers: ["anchor-infra-indexer"],
    category: "infrastructure",
  },
];

export function getAppStatus(
  appContainers: string[],
  allContainers: { name: string; state: string }[]
): "running" | "partial" | "stopped" {
  const containerStates = appContainers.map((name) => {
    const container = allContainers.find((c) => c.name === name);
    return container?.state === "running";
  });

  const runningCount = containerStates.filter(Boolean).length;

  if (runningCount === appContainers.length) return "running";
  if (runningCount > 0) return "partial";
  return "stopped";
}
