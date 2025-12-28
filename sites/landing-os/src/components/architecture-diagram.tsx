'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StackLayer {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: string;
  components?: string[];
}

const stackLayers: StackLayer[] = [
  {
    id: 'dashboard',
    label: 'Anchor OS Dashboard',
    shortLabel: 'Dashboard',
    description:
      'Modern web interface to manage your entire Bitcoin infrastructure. Monitor services, configure apps, and interact with the blockchain from one place.',
    color: '#f97316',
    icon: '🖥️',
    components: ['React UI', 'Real-time Status', 'App Management'],
  },
  {
    id: 'apps',
    label: 'Applications Layer',
    shortLabel: 'Apps',
    description:
      'Decentralized applications running on your node. Each app is independently containerized and communicates through the shared API layer.',
    color: '#3b82f6',
    icon: '📦',
    components: [
      'Threads',
      'Canvas',
      'Places',
      'Proofs',
      'Domains',
      'Tokens',
      'Oracles',
      'Predictions',
    ],
  },
  {
    id: 'indexer',
    label: 'Anchor Indexer',
    shortLabel: 'Indexer',
    description:
      'Parses and indexes Anchor Protocol messages from the blockchain. Provides a REST API for querying on-chain data efficiently.',
    color: '#8b5cf6',
    icon: '🔍',
    components: ['Message Parser', 'Database', 'REST API'],
  },
  {
    id: 'electrum',
    label: 'Electrum Server',
    shortLabel: 'Electrum',
    description:
      'Indexes addresses and transactions for wallet connectivity. Choose between Electrs (lightweight) or Fulcrum (high-performance).',
    color: '#eab308',
    icon: '⚡',
    components: ['Electrs', 'Fulcrum', 'Wallet API'],
  },
  {
    id: 'bitcoin',
    label: 'Bitcoin Core',
    shortLabel: 'Bitcoin',
    description:
      'The foundation of your stack. Full node with complete transaction and block validation. Your keys, your node, your rules.',
    color: '#f97316',
    icon: '₿',
    components: ['Blockchain', 'Mempool', 'P2P Network'],
  },
];

export function ArchitectureDiagram() {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const activeLayer = stackLayers.find((l) => l.id === selectedLayer);

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <div className="max-w-6xl mx-auto">
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
            A modular architecture built on Bitcoin Core. Click on any layer to learn more about its
            components.
          </p>
        </motion.div>

        {/* Stack Visualization */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Stack Layers - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-3"
          >
            {stackLayers.map((layer, index) => (
              <motion.button
                key={layer.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                onClick={() => setSelectedLayer(selectedLayer === layer.id ? null : layer.id)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all duration-300 text-left group',
                  selectedLayer === layer.id
                    ? 'scale-[1.02] shadow-xl'
                    : 'hover:scale-[1.01] hover:shadow-lg'
                )}
                style={{
                  borderColor: selectedLayer === layer.id ? layer.color : 'transparent',
                  backgroundColor:
                    selectedLayer === layer.id ? `${layer.color}15` : 'rgba(255,255,255,0.03)',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${layer.color}20` }}
                  >
                    {layer.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="font-bold text-lg truncate transition-colors"
                        style={{ color: selectedLayer === layer.id ? layer.color : 'inherit' }}
                      >
                        {layer.shortLabel}
                      </h3>
                      <svg
                        className={cn(
                          'w-4 h-4 transition-transform duration-300',
                          selectedLayer === layer.id ? 'rotate-180' : ''
                        )}
                        style={{ color: selectedLayer === layer.id ? layer.color : '#a1a1aa' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{layer.label}</p>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Bottom indicator */}
            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <span>Click to explore</span>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
          </motion.div>

          {/* Detail Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="glass-card p-8 min-h-[400px] relative overflow-hidden">
              {/* Background decoration */}
              <div
                className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-3xl transition-colors duration-500"
                style={{
                  background: activeLayer
                    ? `radial-gradient(circle, ${activeLayer.color}, transparent)`
                    : 'radial-gradient(circle, #f97316, transparent)',
                }}
              />

              <AnimatePresence mode="wait">
                {activeLayer ? (
                  <motion.div
                    key={activeLayer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${activeLayer.color}20` }}
                      >
                        {activeLayer.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold" style={{ color: activeLayer.color }}>
                          {activeLayer.label}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: activeLayer.color }}
                          />
                          <span className="text-sm text-muted-foreground">Layer Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                      {activeLayer.description}
                    </p>

                    {/* Components */}
                    {activeLayer.components && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                          Components
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {activeLayer.components.map((component, i) => (
                            <motion.span
                              key={component}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2, delay: i * 0.05 }}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium"
                              style={{
                                backgroundColor: `${activeLayer.color}15`,
                                color: activeLayer.color,
                              }}
                            >
                              {component}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full min-h-[350px] text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center text-4xl mb-6 animate-pulse">
                      ⚓
                    </div>
                    <h3 className="text-xl font-bold mb-2">Explore the Stack</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Click on any layer on the left to see detailed information about its
                      components and functionality.
                    </p>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/5 w-full max-w-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gradient">5</div>
                        <div className="text-xs text-muted-foreground">Layers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gradient">15+</div>
                        <div className="text-xs text-muted-foreground">Services</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gradient">1</div>
                        <div className="text-xs text-muted-foreground">Command</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
