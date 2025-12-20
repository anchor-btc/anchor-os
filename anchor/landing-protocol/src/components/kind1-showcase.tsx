"use client";

import { motion } from "framer-motion";

const CODE_EXAMPLE = `import { createMessage, AnchorKind } from '@AnchorProtocol/anchor-sdk'

// Create a text message
const message = createMessage({
  kind: AnchorKind.Text,
  body: 'Hello, Bitcoin! ⚡'
})

// Broadcast to the network
const result = await wallet.broadcast(message)
console.log('txid:', result.txid)`;

const HEX_RESULT = "A11C0001 01 00 48656C6C6F2C20426974636F696E2120E29AA1";

const DECODED_PARTS = [
  { label: "Magic", value: "A11C0001", color: "text-purple-400" },
  { label: "Kind", value: "01", color: "text-blue-400" },
  { label: "Anchors", value: "00", color: "text-cyan-400" },
  { label: "Body", value: "48656C6C6F...", color: "text-accent" },
];

export function Kind1Showcase() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-mono mb-4">
            Kind 1
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">Text Messages</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The most common message type. Perfect for social posts, comments, and annotations.
            UTF-8 encoded, human-readable, and permanent.
          </p>
        </motion.div>

        {/* Three Column Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2 bg-muted/30 border border-muted rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-muted">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">
                example.ts
              </span>
            </div>
            <pre className="p-4 overflow-x-auto code-scroll">
              <code className="text-sm font-mono">
                {CODE_EXAMPLE.split("\n").map((line, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-muted-foreground/50 select-none mr-4">
                      {String(i + 1).padStart(2, " ")}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightSyntax(line),
                      }}
                    />
                  </div>
                ))}
              </code>
            </pre>
          </motion.div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {/* Hex Output */}
            <div className="bg-muted/30 border border-muted rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                HEX OUTPUT
              </div>
              <div className="font-mono text-sm text-foreground break-all leading-relaxed">
                {HEX_RESULT}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-muted/30 border border-muted rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-3 font-medium">
                BREAKDOWN
              </div>
              <div className="space-y-2">
                {DECODED_PARTS.map((part) => (
                  <div key={part.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{part.label}</span>
                    <span className={`font-mono text-xs ${part.color}`}>
                      {part.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decoded */}
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
              <div className="text-xs text-accent mb-2 font-medium">
                DECODED
              </div>
              <div className="text-lg font-medium text-foreground">
                &quot;Hello, Bitcoin! ⚡&quot;
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid sm:grid-cols-3 gap-6 mt-12"
        >
          {[
            {
              icon: "📝",
              title: "UTF-8 Encoded",
              description: "Full Unicode support including emojis",
            },
            {
              icon: "⚡",
              title: "Up to 74 Bytes",
              description: "Compact messages in OP_RETURN",
            },
            {
              icon: "🔗",
              title: "Threading",
              description: "Reply to any message with anchors",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="text-center p-6 bg-muted/20 rounded-xl border border-muted hover:border-accent/30 transition-colors"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <div className="font-semibold text-foreground mb-1">
                {feature.title}
              </div>
              <div className="text-sm text-muted-foreground">
                {feature.description}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Try It CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <a
            href="#decoder"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
            Try it in the Decoder
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function highlightSyntax(line: string): string {
  return line
    .replace(
      /(import|from|const|await|async)/g,
      '<span class="text-purple-400">$1</span>'
    )
    .replace(
      /('[@\w\/\-.]+')/g,
      '<span class="text-green-400">$1</span>'
    )
    .replace(
      /(AnchorKind|createMessage|broadcast)/g,
      '<span class="text-blue-400">$1</span>'
    )
    .replace(
      /(\/\/.*)/g,
      '<span class="text-muted-foreground">$1</span>'
    )
    .replace(
      /(kind|body|txid|result|message|wallet)/g,
      '<span class="text-cyan-400">$1</span>'
    )
    .replace(
      /(\.\w+)/g,
      '<span class="text-accent">$1</span>'
    );
}

