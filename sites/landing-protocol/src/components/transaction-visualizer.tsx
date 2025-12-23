"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface Carrier {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  maxSize: string;
}

const CARRIERS: Carrier[] = [
  {
    id: "opreturn",
    name: "OP_RETURN",
    icon: "📜",
    description: "Classic method. Up to 80 bytes in a single OP_RETURN output. Prunable and efficient.",
    color: "from-amber-500 to-orange-500",
    maxSize: "80 bytes",
  },
  {
    id: "inscriptions",
    name: "Inscriptions",
    icon: "✨",
    description: "Ordinals-style inscriptions in witness data. Supports larger payloads and complex data.",
    color: "from-purple-500 to-pink-500",
    maxSize: "~400KB",
  },
  {
    id: "witness",
    name: "Witness Data",
    icon: "🔐",
    description: "SegWit witness field for arbitrary data. Leverages witness discount for lower fees.",
    color: "from-blue-500 to-cyan-500",
    maxSize: "~4MB block",
  },
  {
    id: "stamps",
    name: "Stamps",
    icon: "📮",
    description: "Unprunable data embedded in transaction outputs. Permanent on all full nodes.",
    color: "from-green-500 to-emerald-500",
    maxSize: "Variable",
  },
];

const BASE_TX_PARTS: TxPart[] = [
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
];

export function TransactionVisualizer() {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [activeCarrierIndex, setActiveCarrierIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeCarrier = CARRIERS[activeCarrierIndex];

  // Auto-rotate carriers
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveCarrierIndex((prev) => (prev + 1) % CARRIERS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const txParts: TxPart[] = [
    ...BASE_TX_PARTS,
    {
      id: "carrier",
      label: activeCarrier.name,
      description: `Anchor message via ${activeCarrier.name}`,
      x: 530,
      y: 200,
      width: 120,
      height: 50,
    },
  ];

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
            Anchor Protocol supports <span className="text-accent font-semibold">multiple carriers</span> for embedding data.
            Choose the best method for your use case.
          </p>
        </motion.div>

        {/* Carrier Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {CARRIERS.map((carrier, index) => (
            <button
              key={carrier.id}
              onClick={() => {
                setActiveCarrierIndex(index);
                setIsPaused(true);
              }}
              className={cn(
                "px-4 py-2 rounded-xl border font-medium text-sm transition-all duration-300",
                index === activeCarrierIndex
                  ? `bg-gradient-to-r ${carrier.color} text-white border-transparent shadow-lg scale-105`
                  : "bg-background border-muted text-muted-foreground hover:border-accent/50 hover:text-foreground"
              )}
            >
              <span className="mr-2">{carrier.icon}</span>
              {carrier.name}
            </button>
          ))}
          
          {isPaused && (
            <button
              onClick={() => setIsPaused(false)}
              className="px-4 py-2 rounded-xl border border-accent/30 bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
              Auto-rotate
            </button>
          )}
        </motion.div>

        {/* Active Carrier Info */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCarrier.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mx-auto max-w-xl mb-8 p-4 rounded-xl border",
              "bg-gradient-to-r",
              activeCarrier.color,
              "bg-opacity-10 border-white/10"
            )}
            style={{
              background: `linear-gradient(135deg, ${getGradientColors(activeCarrier.color).from}15, ${getGradientColors(activeCarrier.color).to}10)`,
              borderColor: `${getGradientColors(activeCarrier.color).from}30`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeCarrier.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {activeCarrier.name}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground font-mono">
                    max: {activeCarrier.maxSize}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {activeCarrier.description}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

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
              <linearGradient id="carrierGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getGradientColors(activeCarrier.color).from} />
                <stop offset="100%" stopColor={getGradientColors(activeCarrier.color).to} />
              </linearGradient>
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

            {/* TX to Carrier */}
            <motion.line
              x1="440"
              y1="180"
              x2="525"
              y2="225"
              stroke={hoveredPart === "tx" || hoveredPart === "carrier" ? "url(#carrierGradient)" : "#52525b"}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />

            {/* Transaction Parts */}
            {txParts.map((part, index) => (
              <motion.g
                key={part.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                onMouseEnter={() => setHoveredPart(part.id)}
                onMouseLeave={() => setHoveredPart(null)}
                className="cursor-pointer"
              >
                {part.id === "carrier" ? (
                  <AnimatePresence mode="wait">
                    <motion.g
                      key={activeCarrier.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <rect
                        x={part.x}
                        y={part.y}
                        width={part.width}
                        height={part.height}
                        rx="8"
                        fill={`url(#carrierGradient)`}
                        fillOpacity={hoveredPart === part.id ? 0.3 : 0.15}
                        stroke="url(#carrierGradient)"
                        strokeWidth="2"
                        className="transition-all duration-200"
                      />
                      <text
                        x={part.x + part.width / 2}
                        y={part.y + part.height / 2 + 5}
                        textAnchor="middle"
                        className="text-sm font-medium fill-foreground"
                      >
                        {part.label}
                      </text>
                    </motion.g>
                  </AnimatePresence>
                ) : (
                  <>
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
                  </>
                )}
              </motion.g>
            ))}

            {/* Carrier Icon Animation */}
            <AnimatePresence mode="wait">
              <motion.text
                key={activeCarrier.id}
                x="590"
                y="232"
                textAnchor="middle"
                fontSize="20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeCarrier.icon}
              </motion.text>
            </AnimatePresence>
          </svg>

          {/* Info Panel */}
          <div className="mt-6 min-h-[80px] p-4 bg-muted/30 rounded-xl border border-muted">
            {hoveredPart ? (
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-accent mt-1 animate-pulse" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {txParts.find((p) => p.id === hoveredPart)?.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {txParts.find((p) => p.id === hoveredPart)?.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">
                  Hover over transaction parts to explore. Click a carrier to see different embedding methods!
                </span>
              </div>
            )}
          </div>

          {/* Carrier Progress Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {CARRIERS.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveCarrierIndex(index);
                  setIsPaused(true);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === activeCarrierIndex
                    ? "bg-accent w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function getGradientColors(gradientClass: string): { from: string; to: string } {
  const colorMap: Record<string, { from: string; to: string }> = {
    "from-amber-500 to-orange-500": { from: "#f59e0b", to: "#f97316" },
    "from-purple-500 to-pink-500": { from: "#a855f7", to: "#ec4899" },
    "from-blue-500 to-cyan-500": { from: "#3b82f6", to: "#06b6d4" },
    "from-green-500 to-emerald-500": { from: "#22c55e", to: "#10b981" },
  };
  return colorMap[gradientClass] || { from: "#f59e0b", to: "#f97316" };
}
