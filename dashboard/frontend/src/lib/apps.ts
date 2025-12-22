// App definitions - groups containers into logical apps

export interface ContainerConfig {
  name: string;
  label: string; // Display label (e.g., "Frontend", "Backend", "API", "Database")
  port?: number;
}

export interface App {
  id: string;
  name: string;
  description: string; // Fallback description (English)
  descriptionKey: string; // Translation key for i18n
  icon: string;
  color: string;
  url?: string;
  internalUrl?: string; // Internal dashboard route (e.g., /testnet)
  port?: number; // Main frontend port
  backendPort?: number; // Backend API port (if separate)
  containers: string[]; // container names that make up this app
  containerConfigs?: ContainerConfig[]; // Detailed container configuration with labels
  category: "app" | "explorer" | "networking" | "core" | "electrum" | "anchor" | "storage" | "monitoring";
  featured?: boolean;
  supportsIframe?: boolean; // Whether the app can be loaded in an iframe (default: true)
}

export const apps: App[] = [
  // =============================================
  // APPS (alphabetical)
  // =============================================
  {
    id: "app-domains",
    name: "Anchor Domains",
    description: "Decentralized DNS on Bitcoin - register .btc, .sat, .anchor, .anc, .bit domains",
    descriptionKey: "appDescriptions.app-domains",
    icon: "Globe",
    color: "cyan",
    url: "http://localhost:3400",
    port: 3400,
    backendPort: 3401,
    containers: ["anchor-app-domains-frontend", "anchor-app-domains-backend"],
    containerConfigs: [
      { name: "anchor-app-domains-frontend", label: "Frontend", port: 3400 },
      { name: "anchor-app-domains-backend", label: "Backend", port: 3401 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-predictions",
    name: "Anchor Predictions",
    description: "Trustless lottery with DLC-based payouts on Bitcoin",
    descriptionKey: "appDescriptions.app-predictions",
    icon: "Ticket",
    color: "amber",
    url: "http://localhost:3800",
    port: 3800,
    backendPort: 3801,
    containers: ["anchor-app-predictions-frontend", "anchor-app-predictions-backend", "anchor-app-predictions-postgres"],
    containerConfigs: [
      { name: "anchor-app-predictions-frontend", label: "Frontend", port: 3800 },
      { name: "anchor-app-predictions-backend", label: "Backend", port: 3801 },
      { name: "anchor-app-predictions-postgres", label: "Database" },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-places",
    name: "Anchor Places",
    description: "Place permanent markers on a map using Bitcoin",
    descriptionKey: "appDescriptions.app-places",
    icon: "MapPin",
    color: "blue",
    url: "http://localhost:3300",
    port: 3300,
    backendPort: 3301,
    containers: ["anchor-app-places-frontend", "anchor-app-places-backend"],
    containerConfigs: [
      { name: "anchor-app-places-frontend", label: "Frontend", port: 3300 },
      { name: "anchor-app-places-backend", label: "Backend", port: 3301 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-oracles",
    name: "Anchor Oracles",
    description: "Decentralized oracle network for Bitcoin with staking and reputation",
    descriptionKey: "appDescriptions.app-oracles",
    icon: "Eye",
    color: "purple",
    url: "http://localhost:3700",
    port: 3700,
    backendPort: 3701,
    containers: ["anchor-app-oracles-frontend", "anchor-app-oracles-backend", "anchor-app-oracles-postgres"],
    containerConfigs: [
      { name: "anchor-app-oracles-frontend", label: "Frontend", port: 3700 },
      { name: "anchor-app-oracles-backend", label: "Backend", port: 3701 },
      { name: "anchor-app-oracles-postgres", label: "Database" },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-canvas",
    name: "Anchor Canvas",
    description: "Collaborative pixel canvas powered by Bitcoin transactions",
    descriptionKey: "appDescriptions.app-canvas",
    icon: "Grid3X3",
    color: "rose",
    url: "http://localhost:3200",
    port: 3200,
    backendPort: 3201,
    containers: ["anchor-app-canvas-frontend", "anchor-app-canvas-backend"],
    containerConfigs: [
      { name: "anchor-app-canvas-frontend", label: "Frontend", port: 3200 },
      { name: "anchor-app-canvas-backend", label: "Backend", port: 3201 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-proof",
    name: "Anchor Proofs",
    description: "Proof of Existence - timestamp files on Bitcoin",
    descriptionKey: "appDescriptions.app-proof",
    icon: "FileCheck",
    color: "emerald",
    url: "http://localhost:3500",
    port: 3500,
    backendPort: 3501,
    containers: ["anchor-app-proofs-frontend", "anchor-app-proofs-backend"],
    containerConfigs: [
      { name: "anchor-app-proofs-frontend", label: "Frontend", port: 3500 },
      { name: "anchor-app-proofs-backend", label: "Backend", port: 3501 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-threads",
    name: "Anchor Threads",
    description: "Social threads and messaging on Bitcoin using the ANCHOR protocol",
    descriptionKey: "appDescriptions.app-threads",
    icon: "MessageSquare",
    color: "cyan",
    url: "http://localhost:3100",
    port: 3100,
    backendPort: 3101,
    containers: ["anchor-app-threads-frontend", "anchor-app-threads-backend"],
    containerConfigs: [
      { name: "anchor-app-threads-frontend", label: "Frontend", port: 3100 },
      { name: "anchor-app-threads-backend", label: "Backend", port: 3101 },
    ],
    category: "app",
    featured: true,
  },
  {
    id: "app-tokens",
    name: "Anchor Tokens",
    description: "UTXO-based tokens on Bitcoin - deploy, mint, transfer like Runes",
    descriptionKey: "appDescriptions.app-tokens",
    icon: "Coins",
    color: "amber",
    url: "http://localhost:3600",
    port: 3600,
    backendPort: 3601,
    containers: ["anchor-app-tokens-frontend", "anchor-app-tokens-backend"],
    containerConfigs: [
      { name: "anchor-app-tokens-frontend", label: "Frontend", port: 3600 },
      { name: "anchor-app-tokens-backend", label: "Backend", port: 3601 },
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
    descriptionKey: "appDescriptions.explorer-bitfeed",
    icon: "Activity",
    color: "pink",
    url: "http://localhost:4020",
    port: 4020,
    containers: ["anchor-explorer-bitfeed-web", "anchor-explorer-bitfeed-api"],
    containerConfigs: [
      { name: "anchor-explorer-bitfeed-web", label: "Web", port: 4020 },
      { name: "anchor-explorer-bitfeed-api", label: "API" },
    ],
    category: "explorer",
    featured: true,
  },
  {
    id: "explorer-btc-rpc",
    name: "BTC RPC Explorer",
    description: "Simple and lightweight Bitcoin block explorer",
    descriptionKey: "appDescriptions.explorer-btc-rpc",
    icon: "Search",
    color: "yellow",
    url: "http://localhost:4010",
    port: 4010,
    containers: ["anchor-explorer-btc-rpc"],
    category: "explorer",
    featured: false,
  },
  {
    id: "explorer-esplora",
    name: "Esplora",
    description: "Blockstream's full-featured Bitcoin block explorer with REST API",
    descriptionKey: "appDescriptions.explorer-esplora",
    icon: "Layers",
    color: "emerald",
    url: "http://localhost:4030",
    port: 4030,
    containers: ["anchor-explorer-esplora"],
    category: "explorer",
    featured: true,
    supportsIframe: false, // Esplora has X-Frame-Options: SAMEORIGIN
  },
  {
    id: "explorer-mempool",
    name: "Mempool Space",
    description: "Full Bitcoin block explorer powered by mempool.space",
    descriptionKey: "appDescriptions.explorer-mempool",
    icon: "Bitcoin",
    color: "orange",
    url: "http://localhost:4000",
    port: 4000,
    containers: ["anchor-explorer-mempool-web", "anchor-explorer-mempool-api", "anchor-explorer-mempool-db"],
    containerConfigs: [
      { name: "anchor-explorer-mempool-web", label: "Web", port: 4000 },
      { name: "anchor-explorer-mempool-api", label: "API" },
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
    descriptionKey: "appDescriptions.networking-cloudflare",
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
    descriptionKey: "appDescriptions.networking-tailscale",
    icon: "Network",
    color: "blue",
    internalUrl: "/tailscale",
    containers: ["anchor-networking-tailscale"],
    category: "networking",
    featured: false,
  },
  {
    id: "networking-tor",
    name: "Tor Network",
    description: "Privacy network for anonymous Bitcoin connections and hidden services",
    descriptionKey: "appDescriptions.networking-tor",
    icon: "Shield",
    color: "purple",
    internalUrl: "/tor",
    containers: ["anchor-networking-tor"],
    category: "networking",
    featured: false,
  },

  // =============================================
  // ELECTRUM SERVERS (alphabetical)
  // =============================================
  {
    id: "core-electrs",
    name: "Electrs",
    description: "Electrum Server - lightweight and efficient",
    descriptionKey: "appDescriptions.core-electrs",
    icon: "Zap",
    color: "yellow",
    internalUrl: "/electrum",
    port: 50001,
    containers: ["anchor-core-electrs"],
    category: "electrum",
  },
  {
    id: "core-fulcrum",
    name: "Fulcrum",
    description: "Electrum Server - high-performance alternative",
    descriptionKey: "appDescriptions.core-fulcrum",
    icon: "Layers",
    color: "emerald",
    internalUrl: "/electrum",
    port: 50001,
    containers: ["anchor-core-fulcrum"],
    category: "electrum",
  },

  // =============================================
  // ANCHOR PROTOCOL (alphabetical)
  // =============================================
  {
    id: "anchor-docs",
    name: "Anchor Docs",
    description: "Protocol documentation - kinds, SDK, examples, and API reference",
    descriptionKey: "appDescriptions.anchor-docs",
    icon: "BookOpen",
    color: "amber",
    url: "http://localhost:3900",
    port: 3900,
    containers: ["anchor-docs"],
    containerConfigs: [
      { name: "anchor-docs", label: "Docs", port: 3900 },
    ],
    category: "anchor",
    featured: true,
  },
  {
    id: "core-indexer",
    name: "Anchor Indexer",
    description: "Indexes ANCHOR messages from the blockchain",
    descriptionKey: "appDescriptions.core-indexer",
    icon: "Search",
    color: "cyan",
    internalUrl: "/indexer",
    containers: ["anchor-core-indexer"],
    category: "anchor",
  },
  {
    id: "core-testnet",
    name: "Anchor Testnet",
    description: "Automatically generates test transactions and mines blocks",
    descriptionKey: "appDescriptions.core-testnet",
    icon: "Pickaxe",
    color: "amber",
    internalUrl: "/testnet",
    port: 8002,
    containers: ["anchor-core-testnet"],
    category: "anchor",
    featured: true,
  },
  {
    id: "core-wallet",
    name: "Anchor Wallet",
    description: "REST API for creating and broadcasting transactions",
    descriptionKey: "appDescriptions.core-wallet",
    icon: "Wallet",
    color: "green",
    url: "http://localhost:8001/swagger-ui",
    internalUrl: "/wallet",
    port: 8001,
    containers: ["anchor-core-wallet"],
    category: "anchor",
  },

  // =============================================
  // STORAGE / INFRASTRUCTURE (alphabetical)
  // =============================================
  {
    id: "core-bitcoin",
    name: "Bitcoin Node",
    description: "Bitcoin Core - full-featured node with mining support",
    descriptionKey: "appDescriptions.core-bitcoin",
    icon: "Bitcoin",
    color: "orange",
    internalUrl: "/node",
    port: 18443,
    containers: ["anchor-core-bitcoin"],
    category: "storage",
  },
  {
    id: "core-postgres",
    name: "Database",
    description: "PostgreSQL database for storing indexed data",
    descriptionKey: "appDescriptions.core-postgres",
    icon: "Database",
    color: "blue",
    internalUrl: "/database",
    port: 5432,
    containers: ["anchor-core-postgres"],
    category: "storage",
  },

  // =============================================
  // MONITORING
  // =============================================
  {
    id: "monitoring-netdata",
    name: "Netdata",
    description: "Real-time system and container monitoring dashboard",
    descriptionKey: "appDescriptions.monitoring-netdata",
    icon: "Activity",
    color: "green",
    url: "http://localhost:19999",
    internalUrl: "/monitoring",
    port: 19999,
    containers: ["anchor-monitoring-netdata"],
    category: "monitoring",
    featured: true,
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
