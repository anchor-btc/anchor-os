// App definitions - groups containers into logical apps

export interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url?: string;
  port?: number;
  containers: string[]; // container names that make up this app
  category: "app" | "infrastructure";
  featured?: boolean;
}

export const apps: App[] = [
  // Featured Apps
  {
    id: "explorer",
    name: "ANCHOR Explorer",
    description: "Browse messages, threads and transactions on the ANCHOR protocol",
    icon: "Search",
    color: "orange",
    url: "http://localhost:3000",
    port: 3000,
    containers: ["anchor-explorer-web", "anchor-explorer-api"],
    category: "app",
    featured: true,
  },
  {
    id: "pixelmap",
    name: "PixelMap",
    description: "Collaborative pixel canvas powered by Bitcoin transactions",
    icon: "Grid3X3",
    color: "purple",
    url: "http://localhost:3005",
    port: 3005,
    containers: ["anchor-pixelmap-web", "anchor-pixelmap-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "anchormap",
    name: "AnchorMap",
    description: "Place permanent markers on a map using Bitcoin",
    icon: "MapPin",
    color: "blue",
    url: "http://localhost:3007",
    port: 3007,
    containers: ["anchor-anchormap-web", "anchor-anchormap-backend"],
    category: "app",
    featured: true,
  },
  {
    id: "btc-explorer",
    name: "Bitcoin Explorer",
    description: "Full Bitcoin block explorer for the regtest network",
    icon: "Bitcoin",
    color: "yellow",
    url: "http://localhost:3003",
    port: 3003,
    containers: ["anchor-btc-explorer"],
    category: "app",
    featured: true,
  },
  // Infrastructure
  {
    id: "bitcoin",
    name: "Bitcoin Node",
    description: "Bitcoin Core node running in regtest mode",
    icon: "Bitcoin",
    color: "orange",
    port: 18443,
    containers: ["anchor-bitcoin"],
    category: "infrastructure",
  },
  {
    id: "wallet",
    name: "Wallet Service",
    description: "REST API for creating and broadcasting transactions",
    icon: "Wallet",
    color: "green",
    url: "http://localhost:3001/swagger-ui",
    port: 3001,
    containers: ["anchor-wallet"],
    category: "infrastructure",
  },
  {
    id: "database",
    name: "Database",
    description: "PostgreSQL database for storing indexed data",
    icon: "Database",
    color: "blue",
    port: 5432,
    containers: ["anchor-postgres"],
    category: "infrastructure",
  },
  {
    id: "indexer",
    name: "Indexer",
    description: "Indexes ANCHOR messages from the blockchain",
    icon: "Search",
    color: "cyan",
    containers: ["anchor-indexer"],
    category: "infrastructure",
  },
  {
    id: "testnet",
    name: "Testnet Generator",
    description: "Automatically generates test transactions and mines blocks",
    icon: "Pickaxe",
    color: "amber",
    containers: ["anchor-testnet"],
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

