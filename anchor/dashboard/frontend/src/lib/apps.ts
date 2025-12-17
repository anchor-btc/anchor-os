// App definitions - groups containers into logical apps

export interface ContainerConfig {
  name: string;
  label: string; // Display label (e.g., "Frontend", "Backend", "API", "Database")
  port?: number;
}

export interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url?: string;
  internalUrl?: string; // Internal dashboard route (e.g., /testnet)
  port?: number; // Main frontend port
  backendPort?: number; // Backend API port (if separate)
  containers: string[]; // container names that make up this app
  containerConfigs?: ContainerConfig[]; // Detailed container configuration with labels
  category: "app" | "explorer" | "networking" | "core";
  featured?: boolean;
}

export const apps: App[] = [
  // =============================================
  // APPS (alphabetical)
  // =============================================
  {
    id: "app-dns",
    name: "Anchor DNS",
    description: "Decentralized DNS on Bitcoin - register .bit domains",
    icon: "Globe",
    color: "cyan",
    url: "http://localhost:3009",
    port: 3009,
    backendPort: 3010,
    containers: ["anchor-app-dns-frontend", "anchor-app-dns-backend"],
    containerConfigs: [
      { name: "anchor-app-dns-frontend", label: "Frontend", port: 3009 },
      { name: "anchor-app-dns-backend", label: "Backend", port: 3010 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-lottery",
    name: "Anchor Lottery",
    description: "Trustless lottery with DLC-based payouts on Bitcoin",
    icon: "Ticket",
    color: "amber",
    url: "http://localhost:3021",
    port: 3021,
    backendPort: 3022,
    containers: ["anchor-app-lottery-frontend", "anchor-app-lottery-backend", "anchor-app-lottery-postgres"],
    containerConfigs: [
      { name: "anchor-app-lottery-frontend", label: "Frontend", port: 3021 },
      { name: "anchor-app-lottery-backend", label: "Backend", port: 3022 },
      { name: "anchor-app-lottery-postgres", label: "Database" },
    ],
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
    backendPort: 3008,
    containers: ["anchor-app-map-frontend", "anchor-app-map-backend"],
    containerConfigs: [
      { name: "anchor-app-map-frontend", label: "Frontend", port: 3007 },
      { name: "anchor-app-map-backend", label: "Backend", port: 3008 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-oracles",
    name: "Anchor Oracles",
    description: "Decentralized oracle network for Bitcoin with staking and reputation",
    icon: "Eye",
    color: "purple",
    url: "http://localhost:3019",
    port: 3019,
    backendPort: 3020,
    containers: ["anchor-app-oracles-frontend", "anchor-app-oracles-backend", "anchor-app-oracles-postgres"],
    containerConfigs: [
      { name: "anchor-app-oracles-frontend", label: "Frontend", port: 3019 },
      { name: "anchor-app-oracles-backend", label: "Backend", port: 3020 },
      { name: "anchor-app-oracles-postgres", label: "Database" },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-pixel",
    name: "Anchor Pixel",
    description: "Collaborative pixel canvas powered by Bitcoin transactions",
    icon: "Grid3X3",
    color: "purple",
    url: "http://localhost:3005",
    port: 3005,
    backendPort: 3006,
    containers: ["anchor-app-pixel-frontend", "anchor-app-pixel-backend"],
    containerConfigs: [
      { name: "anchor-app-pixel-frontend", label: "Frontend", port: 3005 },
      { name: "anchor-app-pixel-backend", label: "Backend", port: 3006 },
    ],
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
    backendPort: 3012,
    containers: ["anchor-app-proof-frontend", "anchor-app-proof-backend"],
    containerConfigs: [
      { name: "anchor-app-proof-frontend", label: "Frontend", port: 3013 },
      { name: "anchor-app-proof-backend", label: "Backend", port: 3012 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-threads",
    name: "Anchor Threads",
    description: "Social threads and messaging on Bitcoin using the ANCHOR protocol",
    icon: "MessageSquare",
    color: "orange",
    url: "http://localhost:3000",
    port: 3000,
    backendPort: 3002,
    containers: ["anchor-app-threads-frontend", "anchor-app-threads-backend"],
    containerConfigs: [
      { name: "anchor-app-threads-frontend", label: "Frontend", port: 3000 },
      { name: "anchor-app-threads-backend", label: "Backend", port: 3002 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-tokens",
    name: "Anchor Tokens",
    description: "UTXO-based tokens on Bitcoin - deploy, mint, transfer like Runes",
    icon: "Coins",
    color: "amber",
    url: "http://localhost:3017",
    port: 3017,
    backendPort: 3018,
    containers: ["anchor-app-tokens-frontend", "anchor-app-tokens-backend"],
    containerConfigs: [
      { name: "anchor-app-tokens-frontend", label: "Frontend", port: 3017 },
      { name: "anchor-app-tokens-backend", label: "Backend", port: 3018 },
    ],
    category: "app",
    featured: true,
  },

  // =============================================
  // EXPLORERS (alphabetical)
  // =============================================
  {
    id: "explorer-bitfeed",
    name: "Bitfeed",
    description: "Real-time Bitcoin transaction visualizer",
    icon: "Activity",
    color: "pink",
    url: "http://localhost:3018",
    port: 3018,
    containers: ["anchor-explorer-bitfeed-web", "anchor-explorer-bitfeed-api"],
    containerConfigs: [
      { name: "anchor-explorer-bitfeed-web", label: "Web", port: 3018 },
      { name: "anchor-explorer-bitfeed-api", label: "API" },
    ],
    category: "explorer",
    featured: true,
  },
  {
    id: "explorer-btc-rpc",
    name: "BTC RPC Explorer",
    description: "Simple and lightweight Bitcoin block explorer",
    icon: "Search",
    color: "yellow",
    url: "http://localhost:3015",
    port: 3015,
    containers: ["anchor-explorer-btc-rpc"],
    category: "explorer",
    featured: false,
  },
  {
    id: "explorer-mempool",
    name: "Mempool Explorer",
    description: "Full Bitcoin block explorer powered by mempool.space",
    icon: "Bitcoin",
    color: "orange",
    url: "http://localhost:3003",
    port: 3003,
    containers: ["anchor-explorer-mempool-web", "anchor-explorer-mempool-api", "anchor-explorer-mempool-db"],
    containerConfigs: [
      { name: "anchor-explorer-mempool-web", label: "Web", port: 3003 },
      { name: "anchor-explorer-mempool-api", label: "API", port: 8999 },
      { name: "anchor-explorer-mempool-db", label: "Database" },
    ],
    category: "explorer",
    featured: true,
  },

  // =============================================
  // NETWORKING (alphabetical)
  // =============================================
  {
    id: "networking-cloudflare",
    name: "Cloudflare Tunnel",
    description: "Expose Anchor services to the internet via Cloudflare",
    icon: "Cloud",
    color: "orange",
    internalUrl: "/cloudflare",
    containers: ["anchor-networking-cloudflare"],
    category: "networking",
    featured: false,
  },
  {
    id: "networking-tailscale",
    name: "Tailscale VPN",
    description: "Connect your Anchor stack to your Tailscale network",
    icon: "Network",
    color: "blue",
    internalUrl: "/tailscale",
    containers: ["anchor-networking-tailscale"],
    category: "networking",
    featured: false,
  },

  // =============================================
  // CORE (alphabetical)
  // =============================================
  {
    id: "core-electrs",
    name: "Electrs",
    description: "Electrum Server - efficient address and UTXO indexing",
    icon: "Zap",
    color: "yellow",
    internalUrl: "/electrs",
    port: 50001,
    containers: ["anchor-core-electrs"],
    category: "core",
  },
  {
    id: "core-indexer",
    name: "Anchor Indexer",
    description: "Indexes ANCHOR messages from the blockchain",
    icon: "Search",
    color: "cyan",
    internalUrl: "/indexer",
    containers: ["anchor-core-indexer"],
    category: "core",
  },
  {
    id: "core-testnet",
    name: "Anchor Testnet",
    description: "Automatically generates test transactions and mines blocks",
    icon: "Pickaxe",
    color: "amber",
    internalUrl: "/testnet",
    port: 3014,
    containers: ["anchor-core-testnet"],
    category: "core",
    featured: true,
  },
  {
    id: "core-wallet",
    name: "Anchor Wallet",
    description: "REST API for creating and broadcasting transactions",
    icon: "Wallet",
    color: "green",
    url: "http://localhost:3001/swagger-ui",
    internalUrl: "/wallet",
    port: 3001,
    containers: ["anchor-core-wallet"],
    category: "core",
  },
  {
    id: "core-bitcoin",
    name: "Bitcoin Node",
    description: "Bitcoin Core - full-featured node with mining support",
    icon: "Bitcoin",
    color: "orange",
    internalUrl: "/node",
    port: 18443,
    containers: ["anchor-core-bitcoin"],
    category: "core",
  },
  {
    id: "core-postgres",
    name: "Database",
    description: "PostgreSQL database for storing indexed data",
    icon: "Database",
    color: "blue",
    internalUrl: "/database",
    port: 5432,
    containers: ["anchor-core-postgres"],
    category: "core",
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
