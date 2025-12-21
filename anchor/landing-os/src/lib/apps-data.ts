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
    name: "Anchor Threads",
    description: "Social messaging on Bitcoin. Create permanent, censorship-resistant posts and replies.",
    icon: "💬",
    color: "from-blue-500 to-cyan-400",
    category: "app",
  },
  {
    id: "anchor-places",
    name: "Anchor Map",
    description: "Permanent geo-markers on the blockchain. Mark locations that last forever.",
    icon: "🗺️",
    color: "from-green-500 to-emerald-400",
    category: "app",
  },
  {
    id: "anchor-pixel",
    name: "Anchor Pixel",
    description: "Collaborative pixel canvas. Create art on Bitcoin, one pixel at a time.",
    icon: "🎨",
    color: "from-purple-500 to-pink-400",
    category: "app",
  },
  {
    id: "anchor-proof",
    name: "Anchor Proof",
    description: "Proof of Existence. Timestamp documents permanently on the blockchain.",
    icon: "📜",
    color: "from-amber-500 to-yellow-400",
    category: "app",
  },
  {
    id: "anchor-dns",
    name: "Anchor DNS",
    description: "Decentralized .bit domains. Own your web3 identity on Bitcoin.",
    icon: "🌐",
    color: "from-indigo-500 to-blue-400",
    category: "app",
  },
  {
    id: "anchor-tokens",
    name: "Anchor Tokens",
    description: "Create and manage tokens on Bitcoin. Simple, secure, sovereign.",
    icon: "🪙",
    color: "from-orange-500 to-amber-400",
    category: "app",
  },
  {
    id: "anchor-oracles",
    name: "Anchor Oracles",
    description: "Decentralized oracle network. Bring real-world data to Bitcoin.",
    icon: "🔮",
    color: "from-violet-500 to-purple-400",
    category: "app",
  },
  {
    id: "anchor-predictions",
    name: "Anchor Lottery",
    description: "Trustless lottery with DLC payouts. Provably fair Bitcoin lottery.",
    icon: "🎰",
    color: "from-rose-500 to-red-400",
    category: "app",
  },
];

export const coreFeatures = [
  {
    id: "bitcoin-node",
    title: "Full Bitcoin Node",
    description: "Run Bitcoin Core with full validation. Support for regtest and mainnet.",
    icon: "₿",
    color: "from-orange-500 to-amber-400",
  },
  {
    id: "electrum-server",
    title: "Electrum Server",
    description: "Choose between Electrs or Fulcrum for wallet connectivity.",
    icon: "⚡",
    color: "from-yellow-500 to-orange-400",
  },
  {
    id: "anchor-protocol",
    title: "Anchor Protocol",
    description: "Index and create on-chain messages with our native protocol.",
    icon: "⚓",
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "backup-system",
    title: "Backup System",
    description: "Encrypted backups with Restic. Never lose your data.",
    icon: "💾",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "tor-integration",
    title: "Tor Integration",
    description: "Privacy-first networking. Connect through the Tor network.",
    icon: "🧅",
    color: "from-purple-500 to-violet-400",
  },
  {
    id: "monitoring",
    title: "Real-time Monitoring",
    description: "Netdata system dashboard. Monitor everything in real-time.",
    icon: "📊",
    color: "from-pink-500 to-rose-400",
  },
];

