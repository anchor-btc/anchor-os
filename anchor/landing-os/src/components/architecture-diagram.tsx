"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Layer {
  id: string;
  label: string;
  description: string;
  y: number;
  height: number;
  color: string;
  children?: { label: string; x: number; width: number }[];
}

const layers: Layer[] = [
  {
    id: "dashboard",
    label: "ANCHOR OS DASHBOARD",
    description: "Beautiful web interface for managing your entire Bitcoin stack",
    y: 20,
    height: 60,
    color: "#f97316",
  },
  {
    id: "apps",
    label: "APPLICATIONS",
    description: "Decentralized apps: Threads, Pixel, Map, Proof, DNS, Tokens, and more",
    y: 100,
    height: 70,
    color: "#3b82f6",
    children: [
      { label: "Threads", x: 50, width: 80 },
      { label: "Pixel", x: 150, width: 80 },
      { label: "Map", x: 250, width: 80 },
      { label: "Proof", x: 350, width: 80 },
      { label: "...", x: 450, width: 50 },
    ],
  },
  {
    id: "indexer",
    label: "ANCHOR INDEXER",
    description: "Indexes Anchor Protocol messages from the blockchain",
    y: 190,
    height: 50,
    color: "#8b5cf6",
  },
  {
    id: "electrum",
    label: "ELECTRUM SERVER",
    description: "Electrs or Fulcrum for wallet connectivity and queries",
    y: 260,
    height: 50,
    color: "#eab308",
  },
  {
    id: "bitcoin",
    label: "BITCOIN CORE",
    description: "Full Bitcoin node with complete transaction validation",
    y: 330,
    height: 60,
    color: "#f97316",
  },
];

export function ArchitectureDiagram() {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-primary text-xs font-medium mb-4">
            ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">The Stack</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A modular architecture built on Bitcoin Core. 
            Each layer is independent, upgradeable, and optional.
          </p>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="glass-card p-8 rounded-2xl overflow-hidden">
            <svg viewBox="0 0 600 420" className="w-full h-auto">
              {/* Connection lines */}
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Vertical connection line */}
              <line
                x1="300"
                y1="80"
                x2="300"
                y2="330"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Layers */}
              {layers.map((layer, index) => (
                <g
                  key={layer.id}
                  onMouseEnter={() => setHoveredLayer(layer.id)}
                  onMouseLeave={() => setHoveredLayer(null)}
                  className="cursor-pointer"
                >
                  <motion.rect
                    x="50"
                    y={layer.y}
                    width="500"
                    height={layer.height}
                    rx="8"
                    fill={hoveredLayer === layer.id ? `${layer.color}20` : "#18181b"}
                    stroke={hoveredLayer === layer.id ? layer.color : "#27272a"}
                    strokeWidth="2"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                  />
                  
                  {/* Layer label */}
                  <text
                    x="300"
                    y={layer.y + (layer.children ? 25 : layer.height / 2 + 5)}
                    textAnchor="middle"
                    className={cn(
                      "text-sm font-bold transition-colors pointer-events-none",
                      hoveredLayer === layer.id ? "fill-primary" : "fill-foreground"
                    )}
                    style={{ fill: hoveredLayer === layer.id ? layer.color : "#fafafa" }}
                  >
                    {layer.label}
                  </text>

                  {/* Child boxes (for apps layer) */}
                  {layer.children && (
                    <g>
                      {layer.children.map((child, childIndex) => (
                        <g key={child.label}>
                          <rect
                            x={child.x}
                            y={layer.y + 35}
                            width={child.width}
                            height={28}
                            rx="4"
                            fill={hoveredLayer === layer.id ? `${layer.color}30` : "#27272a"}
                            stroke={hoveredLayer === layer.id ? layer.color : "#3f3f46"}
                            strokeWidth="1"
                          />
                          <text
                            x={child.x + child.width / 2}
                            y={layer.y + 54}
                            textAnchor="middle"
                            className="text-xs fill-muted-foreground pointer-events-none"
                          >
                            {child.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  )}
                </g>
              ))}
            </svg>

            {/* Info Panel */}
            <div className="mt-6 min-h-[80px] p-4 bg-card/50 rounded-xl border border-white/5">
              {hoveredLayer ? (
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1"
                    style={{ backgroundColor: layers.find((l) => l.id === hoveredLayer)?.color }}
                  />
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      {layers.find((l) => l.id === hoveredLayer)?.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {layers.find((l) => l.id === hoveredLayer)?.description}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">
                    Hover over a layer to learn more about each component
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

