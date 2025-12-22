"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TxPart {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TX_PARTS: TxPart[] = [
  {
    id: "input",
    label: "Input",
    description: "UTXO being spent (your Bitcoin)",
    x: 50,
    y: 120,
    width: 140,
    height: 60,
  },
  {
    id: "tx",
    label: "Transaction",
    description: "Bitcoin transaction containing the message",
    x: 280,
    y: 80,
    width: 160,
    height: 140,
  },
  {
    id: "payment",
    label: "Payment",
    description: "Optional payment output",
    x: 530,
    y: 60,
    width: 120,
    height: 50,
  },
  {
    id: "change",
    label: "Change",
    description: "Remaining Bitcoin back to you",
    x: 530,
    y: 130,
    width: 120,
    height: 50,
  },
  {
    id: "opreturn",
    label: "OP_RETURN",
    description: 'Anchor message: "Hello, Bitcoin! ⚡"',
    x: 530,
    y: 200,
    width: 120,
    height: 50,
  },
];

export function TransactionVisualizer() {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  return (
    <section className="py-24 px-6 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">Inside a Transaction</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Anchor messages are embedded in standard Bitcoin transactions using OP_RETURN.
            Hover over the parts to explore.
          </p>
        </motion.div>

        {/* SVG Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative bg-background border border-muted rounded-2xl p-6 overflow-hidden"
        >
          <svg
            viewBox="0 0 700 300"
            className="w-full h-auto"
            style={{ minHeight: 300 }}
          >
            {/* Connection Lines */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={hoveredPart ? "#f59e0b" : "#52525b"}
                />
              </marker>
            </defs>

            {/* Input to TX */}
            <motion.line
              x1="190"
              y1="150"
              x2="275"
              y2="150"
              stroke={hoveredPart === "input" || hoveredPart === "tx" ? "#f59e0b" : "#52525b"}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />

            {/* TX to Payment */}
            <motion.line
              x1="440"
              y1="120"
              x2="525"
              y2="85"
              stroke={hoveredPart === "tx" || hoveredPart === "payment" ? "#f59e0b" : "#52525b"}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />

            {/* TX to Change */}
            <motion.line
              x1="440"
              y1="150"
              x2="525"
              y2="155"
              stroke={hoveredPart === "tx" || hoveredPart === "change" ? "#f59e0b" : "#52525b"}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.7 }}
            />

            {/* TX to OP_RETURN */}
            <motion.line
              x1="440"
              y1="180"
              x2="525"
              y2="225"
              stroke={hoveredPart === "tx" || hoveredPart === "opreturn" ? "#f59e0b" : "#52525b"}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />

            {/* Transaction Parts */}
            {TX_PARTS.map((part, index) => (
              <motion.g
                key={part.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                onMouseEnter={() => {
                  setHoveredPart(part.id);
                  if (part.id === "opreturn") setShowMessage(true);
                }}
                onMouseLeave={() => {
                  setHoveredPart(null);
                  if (part.id === "opreturn") setShowMessage(false);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={part.x}
                  y={part.y}
                  width={part.width}
                  height={part.height}
                  rx="8"
                  className={cn(
                    "transition-all duration-200",
                    hoveredPart === part.id
                      ? "fill-accent/20 stroke-accent"
                      : part.id === "opreturn"
                      ? "fill-accent/10 stroke-accent/50"
                      : "fill-muted/50 stroke-muted"
                  )}
                  strokeWidth="2"
                />
                <text
                  x={part.x + part.width / 2}
                  y={part.y + part.height / 2 + 5}
                  textAnchor="middle"
                  className={cn(
                    "text-sm font-medium transition-colors",
                    hoveredPart === part.id ? "fill-accent" : "fill-foreground"
                  )}
                >
                  {part.label}
                </text>
              </motion.g>
            ))}

            {/* Message Reveal */}
            {showMessage && (
              <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <rect
                  x="480"
                  y="255"
                  width="200"
                  height="35"
                  rx="6"
                  className="fill-accent/20 stroke-accent"
                  strokeWidth="1"
                />
                <text
                  x="580"
                  y="278"
                  textAnchor="middle"
                  className="fill-accent text-xs font-mono"
                >
                  &quot;Hello, Bitcoin! ⚡&quot;
                </text>
              </motion.g>
            )}
          </svg>

          {/* Info Panel */}
          <div className="mt-6 min-h-[80px] p-4 bg-muted/30 rounded-xl border border-muted">
            {hoveredPart ? (
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-accent mt-1 animate-pulse" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {TX_PARTS.find((p) => p.id === hoveredPart)?.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {TX_PARTS.find((p) => p.id === hoveredPart)?.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">
                  Hover over transaction parts to explore. Try the OP_RETURN output!
                </span>
              </div>
            )}
          </div>

          {/* Explore Real TX Button */}
          <div className="mt-4 text-center">
            <a
              href="https://mempool.space"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Explore real transactions on mempool.space
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

