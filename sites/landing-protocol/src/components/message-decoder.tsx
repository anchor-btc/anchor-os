"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { parseAnchorMessage, EXAMPLE_HEX, createTextMessage } from "@/lib/anchor-parser";
import { cn } from "@/lib/utils";

interface ByteSegment {
  label: string;
  hex: string;
  description: string;
  color: string;
  startIndex: number;
  endIndex: number;
}

export function MessageDecoder() {
  const [hexInput, setHexInput] = useState(EXAMPLE_HEX);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const parsed = useMemo(() => parseAnchorMessage(hexInput), [hexInput]);

  const segments: ByteSegment[] = useMemo(() => {
    const result: ByteSegment[] = [];
    let offset = 0;

    // Magic bytes
    result.push({
      label: "Magic",
      hex: parsed.magic.hex.toUpperCase(),
      description: "Protocol identifier: 0xA11C = 'ANCH', 0x0001 = version 1",
      color: "bg-purple-500/20 border-purple-500/50 text-purple-400",
      startIndex: offset,
      endIndex: offset + 8,
    });
    offset += 8;

    if (parsed.kind) {
      result.push({
        label: "Kind",
        hex: parsed.kind.hex.toUpperCase(),
        description: `Message type: ${parsed.kind.name} (${parsed.kind.value})`,
        color: "bg-blue-500/20 border-blue-500/50 text-blue-400",
        startIndex: offset,
        endIndex: offset + 2,
      });
      offset += 2;
    }

    if (parsed.anchorCount) {
      result.push({
        label: "Anchors",
        hex: parsed.anchorCount.hex.toUpperCase(),
        description: `Number of parent references: ${parsed.anchorCount.value}`,
        color: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
        startIndex: offset,
        endIndex: offset + 2,
      });
      offset += 2;

      parsed.anchors.forEach((anchor, i) => {
        result.push({
          label: `Anchor ${i + 1}`,
          hex: anchor.hex.toUpperCase(),
          description: `Parent: ${anchor.txidPrefix}... vout:${anchor.vout}`,
          color: "bg-teal-500/20 border-teal-500/50 text-teal-400",
          startIndex: offset,
          endIndex: offset + 18,
        });
        offset += 18;
      });
    }

    if (parsed.body && parsed.body.hex) {
      result.push({
        label: "Body",
        hex: parsed.body.hex.toUpperCase(),
        description: `Payload: "${parsed.body.text}"`,
        color: "bg-accent/20 border-accent/50 text-accent",
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

  const formatHexWithHighlight = () => {
    const cleanHex = hexInput.replace(/\s/g, "").toUpperCase();
    const chars: React.ReactNode[] = [];

    for (let i = 0; i < cleanHex.length; i++) {
      const segment = segments.find(
        (s) => i >= s.startIndex && i < s.endIndex
      );
      const isHovered = segment && hoveredSegment === segment.label;

      chars.push(
        <span
          key={i}
          className={cn(
            "transition-all duration-150",
            segment && !isHovered && "opacity-70",
            isHovered && "opacity-100 scale-110"
          )}
          style={{
            color: segment
              ? segment.color.includes("purple")
                ? "#a855f7"
                : segment.color.includes("blue")
                ? "#3b82f6"
                : segment.color.includes("cyan")
                ? "#06b6d4"
                : segment.color.includes("teal")
                ? "#14b8a6"
                : "#f59e0b"
              : "#a1a1aa",
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
            Paste any Anchor Protocol message in hex format to see its structure.
            Hover over segments to understand each part.
          </p>
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
              onChange={(e) => setHexInput(e.target.value.replace(/[^0-9a-fA-F\s]/g, ""))}
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
              {customText.trim() ? "Encode" : "Load Example"}
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
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    segment.color,
                    hoveredSegment === segment.label && "scale-105 shadow-lg"
                  )}
                >
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {segment.label}
                  </div>
                  <div className="font-mono text-xs truncate">
                    {segment.hex}
                  </div>
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
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-accent">Decoded Message</span>
              </div>
              <div className="font-mono text-lg text-foreground">
                &quot;{parsed.body.text}&quot;
              </div>
            </div>
          )}

          {/* Error Display */}
          {parsed.error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{parsed.error}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

