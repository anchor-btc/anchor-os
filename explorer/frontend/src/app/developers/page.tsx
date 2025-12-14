"use client";

import {
  Code,
  Package,
  Server,
  Database,
  Globe,
  Cpu,
  Box,
  MessageSquare,
  Link2,
  Layers,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";

export default function DevelopersPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <section className="py-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Developers</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to build with the ANCHOR protocol
        </p>
      </section>

      {/* Quick Links */}
      <nav className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <QuickLink href="#stack" icon={<Layers className="h-5 w-5" />} label="Stack" />
        <QuickLink href="#sdks" icon={<Package className="h-5 w-5" />} label="SDKs" />
        <QuickLink href="#api" icon={<Link2 className="h-5 w-5" />} label="API Reference" />
        <QuickLink href="https://github.com/AnchorProtocol/anchor" icon={<Code className="h-5 w-5" />} label="Source Code" external />
        <QuickLink href="https://discord.gg/anchorprotocol" icon={<MessageSquare className="h-5 w-5" />} label="Discord" external discord />
      </nav>

      {/* Stack Section */}
      <section id="stack" className="scroll-mt-20">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          Technology Stack
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StackCard
            icon={<Box className="h-5 w-5" />}
            title="Bitcoin Core"
            description="Regtest node for development"
            tech="v27.0"
            color="orange"
          />
          <StackCard
            icon={<Database className="h-5 w-5" />}
            title="PostgreSQL"
            description="Message storage & indexing"
            tech="v16"
            color="blue"
          />
          <StackCard
            icon={<Server className="h-5 w-5" />}
            title="Rust Backend"
            description="Indexer, Wallet & Explorer APIs"
            tech="Rust 1.87+"
            color="orange"
          />
          <StackCard
            icon={<Globe className="h-5 w-5" />}
            title="Next.js Frontend"
            description="Web explorer interface"
            tech="Next.js 15"
            color="gray"
          />
          <StackCard
            icon={<Cpu className="h-5 w-5" />}
            title="Docker"
            description="Container orchestration"
            tech="Compose"
            color="blue"
          />
          <StackCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Testnet Generator"
            description="Auto message generation"
            tech="Rust"
            color="green"
          />
        </div>

        {/* Quick Start */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Quick Start</h3>
          <CodeBlock
            language="bash"
            code={`# Clone and run
git clone https://github.com/AnchorProtocol/anchor
cd anchor
docker compose up -d

# Services
# Explorer:    http://localhost:3000
# Wallet API:  http://localhost:3001
# Explorer API: http://localhost:3002`}
          />
        </div>
      </section>

      {/* SDKs Section */}
      <section id="sdks" className="scroll-mt-20">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          SDKs
        </h2>

        <div className="space-y-6">
          {/* TypeScript SDK */}
          <SdkCard
            name="@AnchorProtocol/sdk"
            language="TypeScript"
            runtime="Node.js + Browser"
            color="blue"
            install="npm install @AnchorProtocol/sdk"
            features={["ESM + CJS", "Browser Support", "PSBT Builder", "Full Types"]}
            codeLanguage="typescript"
            example={`import { AnchorWallet, WalletConfig } from "@AnchorProtocol/sdk";

const wallet = new AnchorWallet(
  WalletConfig.regtest("http://localhost:18443", "user", "pass")
);

// Create a message
const result = await wallet.createRootMessage("Hello, ANCHOR!");

// Reply
await wallet.createReply("Reply!", result.txid, 0);`}
            browserNote='Import from "@AnchorProtocol/sdk/browser" for browser-only usage'
          />

          {/* Rust SDK */}
          <SdkCard
            name="anchor-wallet-lib"
            language="Rust"
            runtime="Native"
            color="orange"
            install='anchor-wallet-lib = "0.1"'
            installPrefix="# Cargo.toml"
            features={["Bitcoin Core RPC", "Transaction Builder", "UTXO Management", "Multi-network"]}
            codeLanguage="rust"
            example={`use anchor_wallet_lib::{AnchorWallet, WalletConfig};

let config = WalletConfig::regtest(
    "http://127.0.0.1:18443", "user", "pass"
);
let wallet = AnchorWallet::new(config)?;

// Create a message
let txid = wallet.create_root_message("Hello!")?;

// Reply
wallet.create_reply("Reply!", &txid, 0)?;`}
          />
        </div>
      </section>

      {/* API Reference Section */}
      <section id="api" className="scroll-mt-20">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Link2 className="h-6 w-6 text-primary" />
          API Reference
        </h2>

        <p className="text-muted-foreground mb-6">
          Explore our REST APIs with interactive documentation powered by Swagger UI.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="http://localhost:3002/swagger-ui/"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 hover:border-green-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-xl text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Explorer API</h3>
                <p className="text-sm text-green-600 font-mono">localhost:3002</p>
              </div>
            </div>
            <p className="text-green-700 text-sm mb-4">
              Query messages, threads, stats, and explore the ANCHOR protocol data.
            </p>
            <div className="flex items-center gap-2 text-green-600 font-semibold group-hover:text-green-700">
              Open Swagger UI
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          <a
            href="http://localhost:3001/swagger-ui/"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Wallet API</h3>
                <p className="text-sm text-blue-600 font-mono">localhost:3001</p>
              </div>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              Create transactions, manage UTXOs, and broadcast ANCHOR messages.
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:text-blue-700">
              Open Swagger UI
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>
      </section>

      {/* Discord CTA */}
      <section className="bg-[#5865F2] rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-xl">
              <DiscordIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Need Help?</h3>
              <p className="text-white/80 text-sm">Join our Discord for dev support and discussions</p>
            </div>
          </div>
          <a
            href="https://discord.gg/anchorprotocol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-white text-[#5865F2] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <DiscordIcon className="h-5 w-5" />
            Join Discord
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-border pt-8 text-center">
        <p className="text-muted-foreground">
          Need help? Check the{" "}
          <Link href="/about" className="text-primary hover:underline">
            protocol documentation
          </Link>{" "}
          or{" "}
          <a
            href="https://github.com/AnchorProtocol/anchor/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            open an issue
          </a>
          .
        </p>
      </section>
    </div>
  );
}

// Discord icon
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function QuickLink({
  href,
  icon,
  label,
  external,
  discord,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
  discord?: boolean;
}) {
  const baseClass = "flex items-center gap-2 p-4 rounded-lg transition-colors";
  const className = discord
    ? `${baseClass} bg-[#5865F2] text-white hover:bg-[#4752C4]`
    : `${baseClass} bg-card border border-border hover:border-primary hover:bg-primary/5`;
  
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {icon}
        <span className="font-medium">{label}</span>
        <ChevronRight className={`h-4 w-4 ml-auto ${discord ? "text-white/70" : "text-muted-foreground"}`} />
      </a>
    );
  }
  
  return (
    <a href={href} className={className}>
      {icon}
      <span className="font-medium">{label}</span>
    </a>
  );
}

function StackCard({
  icon,
  title,
  description,
  tech,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tech: string;
  color: "orange" | "blue" | "green" | "gray";
}) {
  const colors = {
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground">{tech}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SdkCard({
  name,
  language,
  runtime,
  color,
  install,
  installPrefix,
  features,
  example,
  browserNote,
  codeLanguage,
}: {
  name: string;
  language: string;
  runtime: string;
  color: "blue" | "orange";
  install: string;
  installPrefix?: string;
  features: string[];
  example: string;
  browserNote?: string;
  codeLanguage: "typescript" | "rust";
}) {
  const colors = {
    blue: {
      bg: "bg-gradient-to-r from-blue-50 to-cyan-50",
      border: "border-blue-200",
      title: "text-blue-800",
      subtitle: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
      code: "bg-white/80 border-blue-200",
      codeText: "text-blue-500",
      note: "bg-blue-100 text-blue-700",
    },
    orange: {
      bg: "bg-gradient-to-r from-orange-50 to-yellow-50",
      border: "border-orange-200",
      title: "text-orange-800",
      subtitle: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
      code: "bg-white/80 border-orange-200",
      codeText: "text-orange-500",
      note: "bg-orange-100 text-orange-700",
    },
  };

  const c = colors[color];

  return (
    <div className={`${c.bg} border-2 ${c.border} rounded-lg p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${c.badge} rounded-lg p-2`}>
          {color === "blue" ? <Code className="h-5 w-5" /> : <Server className="h-5 w-5" />}
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${c.title}`}>{name}</h3>
          <p className={`text-sm ${c.subtitle}`}>{language} • {runtime}</p>
        </div>
      </div>

      <div className={`${c.code} rounded-lg p-3 font-mono text-sm mb-4 border`}>
        {installPrefix && <p className={c.codeText}>{installPrefix}</p>}
        <p className="text-gray-800">{install}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {features.map((f) => (
          <span key={f} className={`${c.badge} text-xs px-2 py-1 rounded`}>
            {f}
          </span>
        ))}
      </div>

      <CodeBlock language={codeLanguage} code={example} />

      {browserNote && (
        <div className={`mt-4 p-3 ${c.note} rounded-lg text-sm`}>
          <strong>Browser:</strong> {browserNote}
        </div>
      )}
    </div>
  );
}


