'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import {
  parseAnchorMessage,
  EXAMPLE_HEX,
  createTextMessage,
  bytesToHex,
} from '@/lib/anchor-parser';
import { cn } from '@/lib/utils';

interface ByteSegment {
  label: string;
  hex: string;
  description: string;
  color: string;
  startIndex: number;
  endIndex: number;
}

interface ExampleMessage {
  id: string;
  name: string;
  kind: string;
  kindColor: string;
  hex: string;
  description: string;
}

const ANCHOR_MAGIC = [0xa1, 0x1c, 0x00, 0x01];

// Pre-built example messages for different kinds
const EXAMPLE_MESSAGES: ExampleMessage[] = [
  {
    id: 'text',
    name: 'Text Message',
    kind: 'Kind 1',
    kindColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    hex: EXAMPLE_HEX,
    description: 'Simple text message: "Hello, Bitcoin! ⚡"',
  },
  {
    id: 'state',
    name: 'State Update',
    kind: 'Kind 2',
    kindColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      2,
      0,
      ...Array.from(new TextEncoder().encode('{"status":"online","version":"1.0.0"}')),
    ]),
    description: 'JSON state object for app configuration',
  },
  {
    id: 'dns',
    name: 'DNS Record',
    kind: 'Kind 4',
    kindColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    hex: bytesToHex([...ANCHOR_MAGIC, 4, 0, ...Array.from(new TextEncoder().encode('anchor.btc'))]),
    description: 'Bitcoin-native domain name registration',
  },
  {
    id: 'geomarker',
    name: 'Geomarker',
    kind: 'Kind 5',
    kindColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      5,
      0,
      ...Array.from(new TextEncoder().encode('-23.5505,-46.6333')),
    ]),
    description: 'Geographic location marker (São Paulo)',
  },
  {
    id: 'token',
    name: 'Token',
    kind: 'Kind 6',
    kindColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      6,
      0,
      ...Array.from(new TextEncoder().encode('ANCH:1000000')),
    ]),
    description: 'Token issuance or transfer metadata',
  },
  {
    id: 'vote',
    name: 'Vote',
    kind: 'Kind 7',
    kindColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      7,
      0,
      ...Array.from(new TextEncoder().encode('proposal:123:yes')),
    ]),
    description: 'On-chain voting action',
  },
  {
    id: 'proof',
    name: 'Proof',
    kind: 'Kind 8',
    kindColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      8,
      0,
      ...Array.from(new TextEncoder().encode('sha256:abc123')),
    ]),
    description: 'Cryptographic proof of existence',
  },
  {
    id: 'threaded',
    name: 'Reply (1 Anchor)',
    kind: 'Kind 1',
    kindColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      1, // Kind: Text
      1, // 1 anchor
      0xde,
      0xad,
      0xbe,
      0xef,
      0x12,
      0x34,
      0x56,
      0x78, // txid prefix (8 bytes)
      0, // vout
      ...Array.from(new TextEncoder().encode('This is a reply!')),
    ]),
    description: 'Reply to a single parent transaction',
  },
  {
    id: 'multi-anchor-2',
    name: 'Multi-Anchor (2)',
    kind: 'Kind 1',
    kindColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      1, // Kind: Text
      2, // 2 anchors!
      // Anchor 1: First parent tx
      0xab,
      0xcd,
      0xef,
      0x12,
      0x34,
      0x56,
      0x78,
      0x9a, // txid prefix
      0, // vout 0
      // Anchor 2: Second parent tx
      0x11,
      0x22,
      0x33,
      0x44,
      0x55,
      0x66,
      0x77,
      0x88, // txid prefix
      1, // vout 1
      ...Array.from(new TextEncoder().encode('Merged thread!')),
    ]),
    description: 'Message linking 2 parent transactions',
  },
  {
    id: 'multi-anchor-3',
    name: 'Multi-Anchor (3)',
    kind: 'Kind 1',
    kindColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    hex: bytesToHex([
      ...ANCHOR_MAGIC,
      1, // Kind: Text
      3, // 3 anchors!
      // Anchor 1
      0xaa,
      0xbb,
      0xcc,
      0xdd,
      0xee,
      0xff,
      0x00,
      0x11,
      0,
      // Anchor 2
      0x22,
      0x33,
      0x44,
      0x55,
      0x66,
      0x77,
      0x88,
      0x99,
      1,
      // Anchor 3
      0xff,
      0xee,
      0xdd,
      0xcc,
      0xbb,
      0xaa,
      0x99,
      0x88,
      2,
      ...Array.from(new TextEncoder().encode('Three parents!')),
    ]),
    description: 'Chain linking 3 different parent txs',
  },
];

export function MessageDecoder() {
  const [hexInput, setHexInput] = useState(EXAMPLE_HEX);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  const parsed = useMemo(() => parseAnchorMessage(hexInput), [hexInput]);

  const segments: ByteSegment[] = useMemo(() => {
    const result: ByteSegment[] = [];
    let offset = 0;

    // Magic bytes
    result.push({
      label: 'Magic',
      hex: parsed.magic.hex.toUpperCase(),
      description: "Protocol identifier: 0xA11C = 'ANCH', 0x0001 = version 1",
      color: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
      startIndex: offset,
      endIndex: offset + 8,
    });
    offset += 8;

    if (parsed.kind) {
      result.push({
        label: 'Kind',
        hex: parsed.kind.hex.toUpperCase(),
        description: `Message type: ${parsed.kind.name} (${parsed.kind.value})`,
        color: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
        startIndex: offset,
        endIndex: offset + 2,
      });
      offset += 2;
    }

    if (parsed.anchorCount) {
      result.push({
        label: 'Anchor Count',
        hex: parsed.anchorCount.hex.toUpperCase(),
        description: `Number of parent references: ${parsed.anchorCount.value} (supports 0-255)`,
        color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
        startIndex: offset,
        endIndex: offset + 2,
      });
      offset += 2;

      parsed.anchors.forEach((anchor, i) => {
        result.push({
          label: `Anchor ${i + 1}`,
          hex: anchor.hex.toUpperCase(),
          description: `Parent: ${anchor.txidPrefix}... vout:${anchor.vout}`,
          color: 'bg-teal-500/20 border-teal-500/50 text-teal-400',
          startIndex: offset,
          endIndex: offset + 18,
        });
        offset += 18;
      });
    }

    if (parsed.body && parsed.body.hex) {
      result.push({
        label: 'Body',
        hex: parsed.body.hex.toUpperCase(),
        description: `Payload: "${parsed.body.text}"`,
        color: 'bg-accent/20 border-accent/50 text-accent',
        startIndex: offset,
        endIndex: offset + parsed.body.hex.length,
      });
    }

    return result;
  }, [parsed]);

  const handleTryExample = () => {
    if (customText.trim()) {
      setHexInput(createTextMessage(customText));
    } else {
      setHexInput(EXAMPLE_HEX);
    }
  };

  const handleExampleClick = (example: ExampleMessage) => {
    setHexInput(example.hex);
    setCustomText('');
  };

  const formatHexWithHighlight = () => {
    const cleanHex = hexInput.replace(/\s/g, '').toUpperCase();
    const chars: React.ReactNode[] = [];

    for (let i = 0; i < cleanHex.length; i++) {
      const segment = segments.find((s) => i >= s.startIndex && i < s.endIndex);
      const isHovered = segment && hoveredSegment === segment.label;

      chars.push(
        <span
          key={i}
          className={cn(
            'transition-all duration-150',
            segment && !isHovered && 'opacity-70',
            isHovered && 'opacity-100 scale-110'
          )}
          style={{
            color: segment
              ? segment.color.includes('purple')
                ? '#a855f7'
                : segment.color.includes('blue')
                  ? '#3b82f6'
                  : segment.color.includes('cyan')
                    ? '#06b6d4'
                    : segment.color.includes('teal')
                      ? '#14b8a6'
                      : '#f59e0b'
              : '#a1a1aa',
          }}
        >
          {cleanHex[i]}
        </span>
      );

      // Add space every 2 characters
      if (i % 2 === 1 && i < cleanHex.length - 1) {
        chars.push(<span key={`space-${i}`}> </span>);
      }
    }

    return chars;
  };

  return (
    <section id="decoder" className="py-24 px-6">
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
            <span className="text-gradient">Message Decoder</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore different message kinds! Click an example below or paste your own hex. Hover
            over segments to understand each part.
          </p>
        </motion.div>

        {/* Protocol Format Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-10 p-5 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
              ⚓
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Multiple Anchors per Transaction
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Each ANCHOR message can reference{' '}
                <span className="text-cyan-400 font-semibold">0-255 parent transactions</span>. This
                enables powerful use cases like thread merging, cross-referencing, and complex
                dependency chains.
              </p>
              <div className="font-mono text-xs bg-background/50 p-3 rounded-lg border border-muted overflow-x-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Magic (4B)
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Kind (1B)
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                    Anchor Count (1B)
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    Anchors (9B × N)
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="px-2 py-1 rounded bg-accent/20 text-accent border border-accent/30">
                    Body (var)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Example Messages Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <label className="block text-sm font-medium text-muted-foreground mb-3">
            Quick Examples
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXAMPLE_MESSAGES.map((example) => (
              <button
                key={example.id}
                onClick={() => handleExampleClick(example)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02]',
                  hexInput === example.hex
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
                    : 'border-muted bg-muted/20 hover:border-accent/40 hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-mono border',
                      example.kindColor
                    )}
                  >
                    {example.kind}
                  </span>
                </div>
                <div className="font-medium text-sm text-foreground mb-1">{example.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {example.description}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Decoder Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-muted/30 border border-muted rounded-2xl p-6 sm:p-8"
        >
          {/* Hex Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Hex Input
            </label>
            <textarea
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.replace(/[^0-9a-fA-F\s]/g, ''))}
              placeholder="Paste hex-encoded message..."
              className="w-full h-24 px-4 py-3 bg-background border border-muted rounded-xl font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Quick Create */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type a message to encode..."
              className="flex-1 px-4 py-2 bg-background border border-muted rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={handleTryExample}
              className="px-6 py-2 bg-accent hover:bg-accent-dark text-background font-semibold rounded-lg transition-colors"
            >
              {customText.trim() ? 'Encode' : 'Load Example'}
            </button>
          </div>

          {/* Formatted Hex Display */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Formatted Bytes
            </label>
            <div className="p-4 bg-background rounded-xl border border-muted font-mono text-lg tracking-wider overflow-x-auto code-scroll">
              {formatHexWithHighlight()}
            </div>
          </div>

          {/* Structure Breakdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Message Structure
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {segments.map((segment) => (
                <div
                  key={segment.label}
                  onMouseEnter={() => setHoveredSegment(segment.label)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                    segment.color,
                    hoveredSegment === segment.label && 'scale-105 shadow-lg'
                  )}
                >
                  <div className="text-xs font-medium mb-1 opacity-70">{segment.label}</div>
                  <div className="font-mono text-xs truncate">{segment.hex}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip / Description */}
          <div className="min-h-[60px] p-4 bg-background/50 rounded-xl border border-muted">
            {hoveredSegment ? (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 animate-pulse" />
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {segments.find((s) => s.label === hoveredSegment)?.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {segments.find((s) => s.label === hoveredSegment)?.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Hover over a segment above to see its description
              </div>
            )}
          </div>

          {/* Decoded Result */}
          {parsed.isValid && parsed.body && (
            <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-accent" />
                <span className="font-semibold text-accent">Decoded Message</span>
                {parsed.kind && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono ml-auto">
                    {parsed.kind.name}
                  </span>
                )}
              </div>
              <div className="font-mono text-lg text-foreground break-all">
                &quot;{parsed.body.text}&quot;
              </div>
              {parsed.anchors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-accent/20">
                  <div className="text-xs text-accent mb-2 font-medium">ANCHORED TO:</div>
                  {parsed.anchors.map((anchor, i) => (
                    <div key={i} className="font-mono text-sm text-muted-foreground">
                      {anchor.txidPrefix}... (vout: {anchor.vout})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {parsed.error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{parsed.error}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
