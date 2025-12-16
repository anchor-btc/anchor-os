"use client";

import {
  Anchor,
  Code,
  FileText,
  Github,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <section className="text-center py-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Anchor className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">ANCHOR Protocol</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A minimalist metaprotocol for recording chained messages on the Bitcoin blockchain
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <a
            href="https://github.com/AnchorProtocol/anchor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Github className="h-5 w-5" />
            GitHub
          </a>
          <Link
            href="/developers"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Code className="h-5 w-5" />
            Developers
          </Link>
        </div>
      </section>

      {/* Navigation */}
      <nav className="flex flex-wrap justify-center gap-6 border-b border-border pb-6">
        <a href="#whitepaper" className="text-muted-foreground hover:text-primary transition-colors">
          Whitepaper
        </a>
        <a href="#specification" className="text-muted-foreground hover:text-primary transition-colors">
          Specification
        </a>
        <Link href="/developers" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          Developers <ExternalLink className="h-3 w-3" />
        </Link>
      </nav>

      {/* Whitepaper Section */}
      <section id="whitepaper" className="scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Whitepaper
        </h2>

        <div className="space-y-6">
          <Card title="Abstract">
            <p>
              ANCHOR is a minimalist metaprotocol for recording chained messages on the Bitcoin blockchain.
              Each message is embedded in a Bitcoin transaction (in v1, via OP_RETURN output) and can optionally
              reference one or more previous messages through <strong>anchors</strong>: small binary descriptors
              that carry a 64-bit prefix of the parent txid and the output index (vout).
            </p>
            <p className="mt-4">
              This basic primitive – "messages with multiple 64-bit anchors" – is sufficient to build:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Threaded conversations (forum/social network style)</li>
              <li>Version history</li>
              <li>Governance and voting flows</li>
              <li>State protocols and games</li>
              <li>Other coordination schemes on Bitcoin</li>
            </ul>
          </Card>

          <Card title="Motivation">
            <p>
              The Bitcoin blockchain is already used as a data layer for timestamping, token issuance,
              and various metadata registries. However, most of these uses:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Are made with specific protocols (tokens, certificates, etc.)</li>
              <li>Are coupled to a single format/carrier (e.g., only OP_RETURN, only inscriptions)</li>
              <li>Do not offer an explicit primitive for <strong>relating messages to each other</strong></li>
            </ul>
            <p className="mt-4">
              ANCHOR starts from a simple idea: if each message can optionally carry a list of references
              to previous transaction outputs, it's possible to reconstruct a dependency graph and use it
              as a foundation for multiple semantic protocols on Bitcoin.
            </p>
          </Card>

          <Card title="Design Goals">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Goal num={1} title="Minimalism" desc="Keep the format simple, clear, and easy to implement." />
              <Goal num={2} title="Bitcoin L1 Compatible" desc="No consensus changes required." />
              <Goal num={3} title="Carrier Agnostic" desc="Payload format independent of carrier (v1 uses OP_RETURN)." />
              <Goal num={4} title="Simple Indexing" desc="Linear parsing, fixed offsets, no complex formats." />
              <Goal num={5} title="Reorg Resilient" desc="Anchors based on txid prefix remain valid." />
              <Goal num={6} title="Collision Tolerant" desc="Prefix collisions are rare and localized." />
            </div>
          </Card>

          <Card title="Collision Analysis">
            <p>
              The 64-bit prefix space has approximately 2^64 ≈ 1.84 × 10^19 possible values.
              Using the birthday problem approximation:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4">Messages</th>
                    <th className="text-left py-2 px-4">Collision Probability</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50"><td className="py-2 px-4">1,000</td><td className="py-2 px-4">≈ 2.7 × 10⁻¹⁴</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 px-4">10,000</td><td className="py-2 px-4">≈ 2.7 × 10⁻¹²</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 px-4">100,000</td><td className="py-2 px-4">≈ 2.7 × 10⁻¹⁰</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 px-4">1,000,000</td><td className="py-2 px-4">≈ 1 in 37 million</td></tr>
                  <tr><td className="py-2 px-4">10,000,000</td><td className="py-2 px-4">≈ 1 in 370 thousand</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Even at scales of millions of anchors, the probability of collision is extremely low.
              When collisions do occur, they only make that specific anchor ambiguous.
            </p>
          </Card>
        </div>
      </section>

      {/* Specification Section */}
      <section id="specification" className="scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Code className="h-8 w-8 text-primary" />
          Protocol Specification v1
        </h2>

        <div className="space-y-6">
          <Card title="Magic Bytes">
            <p className="mb-4">
              ANCHOR v1 messages are identified by a 4-byte magic number at the start of the OP_RETURN data:
            </p>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-center">
              <span className="text-2xl text-primary font-bold">0xA11C0001</span>
              <p className="text-sm text-muted-foreground mt-2">
                A1 1C 00 01 → "ANCH" (leetspeak) + version 1
              </p>
            </div>
          </Card>

          <Card title="Payload Structure">
            <div className="flex flex-wrap gap-2 mb-6">
              <PayloadBlock name="Magic" bytes="4B" color="orange" />
              <PayloadBlock name="Kind" bytes="1B" color="blue" />
              <PayloadBlock name="Count" bytes="1B" color="purple" />
              <PayloadBlock name="Anchors" bytes="9B×N" color="green" />
              <PayloadBlock name="Body" bytes="var" color="gray" flex />
            </div>

            <div className="space-y-3">
              <Field name="Magic" bytes="4 bytes" desc="Fixed identifier 0xA11C0001" color="orange" />
              <Field name="Kind" bytes="1 byte" desc="0=generic, 1=text, 2=state, 3=vote" color="blue" />
              <Field name="Anchor Count" bytes="1 byte" desc="Number of anchors (0-255). Zero = root message." color="purple" />
              <Field name="Anchors" bytes="9×N bytes" desc="Each: 8 bytes txid prefix + 1 byte vout" color="green" />
              <Field name="Body" bytes="variable" desc="Message content (UTF-8 for text, binary otherwise)" color="gray" />
            </div>
          </Card>

          <Card title="Anchor Structure">
            <div className="flex gap-2 mb-6">
              <div className="flex-[8] bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4 text-center">
                <p className="font-mono font-semibold text-cyan-700">txid_prefix</p>
                <p className="text-xs text-cyan-600 mt-1">8 bytes (64 bits)</p>
              </div>
              <div className="flex-[1] bg-pink-50 border-2 border-pink-200 rounded-lg p-4 text-center">
                <p className="font-mono font-semibold text-pink-700">vout</p>
                <p className="text-xs text-pink-600 mt-1">1 byte</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="text-cyan-600 font-semibold">txid_prefix</span> — First 8 bytes of parent's txid (unique with minimal size)</p>
              <p><span className="text-pink-600 font-semibold">vout</span> — Output index of the parent ANCHOR message</p>
            </div>
          </Card>

          <Card title="Anchor Resolution">
            <div className="space-y-3">
              <Resolution matches="0" status="Orphan" desc="Parent not found" color="yellow" />
              <Resolution matches="1" status="Resolved" desc="Unique match found" color="green" />
              <Resolution matches="2+" status="Ambiguous" desc="Multiple matches" color="yellow" />
            </div>
          </Card>

          <Card title="Threading Semantics">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-foreground">anchor_count = 0</strong>: Message is a thread root</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-foreground">anchors[0]</strong>: Canonical parent for threading</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-foreground">anchors[1..]</strong>: Additional references (quotes, merges)</span>
              </li>
            </ul>
          </Card>
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
              <h3 className="text-xl font-bold">Join the Community</h3>
              <p className="text-white/80 text-sm">Get help, share ideas, and connect with builders</p>
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
          Ready to build?{" "}
          <Link href="/developers" className="text-primary hover:underline">
            Check out the developer docs →
          </Link>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Goal({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div>
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="text-sm">{desc}</p>
      </div>
    </div>
  );
}

function PayloadBlock({ name, bytes, color, flex }: { name: string; bytes: string; color: string; flex?: boolean }) {
  const colors: Record<string, string> = {
    orange: "bg-orange-100 border-orange-300 text-orange-700",
    blue: "bg-blue-100 border-blue-300 text-blue-700",
    purple: "bg-purple-100 border-purple-300 text-purple-700",
    green: "bg-green-100 border-green-300 text-green-700",
    gray: "bg-gray-100 border-gray-300 text-gray-700",
  };

  return (
    <div className={`${colors[color]} border-2 rounded-lg px-3 py-2 text-center ${flex ? "flex-1" : ""}`}>
      <p className="font-mono text-xs font-semibold">{name}</p>
      <p className="text-[10px] opacity-70">{bytes}</p>
    </div>
  );
}

function Field({ name, bytes, desc, color }: { name: string; bytes: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    orange: "text-orange-700 bg-orange-100",
    blue: "text-blue-700 bg-blue-100",
    purple: "text-purple-700 bg-purple-100",
    green: "text-green-700 bg-green-100",
    gray: "text-gray-700 bg-gray-100",
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className={`flex-shrink-0 px-2 py-1 rounded font-mono text-xs font-semibold ${colors[color]}`}>
        {bytes}
      </div>
      <div>
        <span className="font-semibold text-foreground">{name}</span>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Resolution({ matches, status, desc, color }: { matches: string; status: string; desc: string; color: "green" | "yellow" }) {
  const colors = {
    green: "text-green-700 bg-green-100 border-green-200",
    yellow: "text-yellow-700 bg-yellow-100 border-yellow-200",
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex-shrink-0 w-10 text-center font-mono font-bold">{matches}</div>
      <div className={`px-3 py-1 rounded text-sm font-medium border ${colors[color]}`}>{status}</div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
