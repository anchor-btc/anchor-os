'use client';

import { motion } from 'framer-motion';
import { MessageSquare, LayoutGrid, Archive, Zap, Lock, Clock, Database, FileText } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: <MessageSquare className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Message Threading',
    description:
      'Reference parent messages with anchors to create threaded conversations and complex data relationships.',
  },
  {
    icon: <LayoutGrid className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Multiple Carriers',
    description:
      'Embed data via OP_RETURN, Inscriptions, Witness Data, Stamps, and more. Your choice, maximum flexibility.',
  },
  {
    icon: <Archive className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Structured Types (Kinds)',
    description:
      'Built-in message types for text, images, DNS, tokens, proofs, votes, and more. Extensible by design.',
  },
  {
    icon: <Zap className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Fee Efficiency',
    description:
      'Compact encoding optimized for small payloads. Messages as small as 10 bytes fit easily in OP_RETURN.',
  },
  {
    icon: <Lock className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Censorship Resistance',
    description:
      'Once confirmed, your data is immutable. No central authority can modify or delete your messages.',
  },
  {
    icon: <Clock className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Block Timestamping',
    description:
      'Every message is cryptographically timestamped by the Bitcoin network. Proof of existence guaranteed.',
  },
  {
    icon: <Database className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Data Permanence',
    description:
      'Your data lives as long as Bitcoin. No servers to maintain, no subscriptions, no data loss.',
  },
  {
    icon: <FileText className="w-6 h-6" strokeWidth={1.5} />,
    title: 'Small Messages',
    description:
      'Perfect for compact payloads. Text, hashes, references—all optimized for blockchain efficiency.',
  },
];

export function ProtocolComparison() {
  return (
    <section className="py-24 px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">Protocol Features</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build Bitcoin-native applications with permanent, structured data
            embedded directly on the blockchain.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="group p-6 bg-background border border-muted rounded-2xl hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <a
            href="https://docs.anchor-protocol.com/kinds"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Explore All Message Kinds
          </a>
        </motion.div>
      </div>
    </section>
  );
}
