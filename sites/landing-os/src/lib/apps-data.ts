export interface AppData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "app" | "core" | "explorer" | "networking";
}

export const apps: AppData[] = [
  {
    id: "anchor-threads",
    name: "Threads",
    description: "Decentralized social messaging. Permanent, censorship-resistant posts and conversations anchored on Bitcoin.",
    icon: "💬",
    color: "from-cyan-500 to-cyan-400",
    category: "app",
  },
  {
    id: "anchor-places",
    name: "Places",
    description: "Geo-tagging on Bitcoin. Mark locations, leave reviews, and create permanent geographic records.",
    icon: "📍",
    color: "from-blue-500 to-blue-400",
    category: "app",
  },
  {
    id: "anchor-canvas",
    name: "Canvas",
    description: "Collaborative pixel art canvas. Create and own artwork on Bitcoin, one pixel at a time.",
    icon: "⊞",
    color: "from-rose-500 to-rose-400",
    category: "app",
  },
  {
    id: "anchor-proofs",
    name: "Proofs",
    description: "Proof of Existence service. Timestamp documents, files, and data permanently on the blockchain.",
    icon: "✓",
    color: "from-emerald-500 to-emerald-400",
    category: "app",
  },
  {
    id: "anchor-domains",
    name: "Domains",
    description: "Bitcoin-native DNS. Register and manage .btc domains with true ownership, no renewals required.",
    icon: "🌐",
    color: "from-cyan-500 to-cyan-400",
    category: "app",
  },
  {
    id: "anchor-tokens",
    name: "Tokens",
    description: "Token creation and management. Issue, transfer, and track custom tokens on Bitcoin.",
    icon: "🪙",
    color: "from-amber-500 to-amber-400",
    category: "app",
  },
  {
    id: "anchor-oracles",
    name: "Oracles",
    description: "Decentralized price feeds and data oracles. Bring real-world data on-chain with attestations.",
    icon: "👁",
    color: "from-purple-500 to-purple-400",
    category: "app",
  },
  {
    id: "anchor-predictions",
    name: "Predictions",
    description: "Prediction markets powered by DLCs. Create and participate in trustless outcome-based markets.",
    icon: "🎫",
    color: "from-amber-500 to-amber-400",
    category: "app",
  },
];

export const coreFeatures = [
  {
    id: "bitcoin-node",
    title: "Bitcoin Core",
    description: "Full Bitcoin node with complete block validation. Verify every transaction independently. Supports regtest for development and mainnet for production.",
    icon: "₿",
    color: "from-orange-500 to-amber-400",
  },
  {
    id: "electrum-server",
    title: "Electrum Server",
    description: "High-performance address indexing with Electrs or Fulcrum. Connect any wallet and query balances, UTXOs, and transaction history instantly.",
    icon: "⚡",
    color: "from-yellow-500 to-orange-400",
  },
  {
    id: "anchor-protocol",
    title: "Protocol Indexer",
    description: "Anchor Protocol message indexer. Automatically parse, index, and serve on-chain data for all your applications via a REST API.",
    icon: "⚓",
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "backup-system",
    title: "Encrypted Backups",
    description: "Automated backup system with Restic. Schedule encrypted backups of your wallet, databases, and configuration to any storage backend.",
    icon: "💾",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "tor-integration",
    title: "Tor Network",
    description: "Built-in Tor integration for privacy. Run your node as a hidden service and connect to the Bitcoin network anonymously.",
    icon: "🧅",
    color: "from-purple-500 to-violet-400",
  },
  {
    id: "monitoring",
    title: "System Monitoring",
    description: "Real-time monitoring with Netdata. Track CPU, memory, disk, network, and custom Bitcoin metrics in a beautiful dashboard.",
    icon: "📊",
    color: "from-pink-500 to-rose-400",
  },
];
