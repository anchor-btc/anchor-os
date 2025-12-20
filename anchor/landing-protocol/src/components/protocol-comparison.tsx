"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  anchor: "yes" | "no" | "partial" | string;
  ordinals: "yes" | "no" | "partial" | string;
  nostr: "yes" | "no" | "partial" | string;
}

const COMPARISONS: ComparisonRow[] = [
  {
    feature: "Message Threading",
    anchor: "yes",
    ordinals: "no",
    nostr: "no",
  },
  {
    feature: "Multiple Carriers",
    anchor: "yes",
    ordinals: "no",
    nostr: "no",
  },
  {
    feature: "Structured Types",
    anchor: "yes",
    ordinals: "partial",
    nostr: "yes",
  },
  {
    feature: "Small Messages (<100B)",
    anchor: "yes",
    ordinals: "no",
    nostr: "yes",
  },
  {
    feature: "Data Permanence",
    anchor: "yes",
    ordinals: "yes",
    nostr: "partial",
  },
  {
    feature: "Block Timestamping",
    anchor: "yes",
    ordinals: "yes",
    nostr: "no",
  },
  {
    feature: "Censorship Resistance",
    anchor: "yes",
    ordinals: "yes",
    nostr: "partial",
  },
  {
    feature: "Fee Efficiency",
    anchor: "yes",
    ordinals: "partial",
    nostr: "yes",
  },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "yes") {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    );
  }
  if (status === "no") {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
    );
  }
  if (status === "partial") {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
        </div>
      </div>
    );
  }
  return <span className="text-muted-foreground text-sm">{status}</span>;
}

export function ProtocolComparison() {
  return (
    <section className="py-24 px-6 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">Why Anchor?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Compare Anchor Protocol with other data embedding and messaging solutions.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-background border border-muted rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 border-b border-muted">
            <div className="text-sm font-medium text-muted-foreground">
              Feature
            </div>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm font-semibold text-accent">Anchor</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-muted-foreground">Ordinals</span>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-muted-foreground">Nostr</span>
            </div>
          </div>

          {/* Rows */}
          {COMPARISONS.map((row, index) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className={cn(
                "grid grid-cols-4 gap-4 p-4 items-center",
                index !== COMPARISONS.length - 1 && "border-b border-muted"
              )}
            >
              <div className="text-sm text-foreground font-medium">
                {row.feature}
              </div>
              <StatusIcon status={row.anchor} />
              <StatusIcon status={row.ordinals} />
              <StatusIcon status={row.nostr} />
            </motion.div>
          ))}
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Supported</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span>Not Supported</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

