"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

interface TxStructureProps {
  txid: string;
  vout: number;
  carrier: number;
  carrierName: string;
  bodyHex: string;
  anchors: Array<{
    index: number;
    txid_prefix: string;
    vout: number;
  }>;
}

interface DecodedTx {
  txid: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<{
    txid?: string;
    vout?: number;
    scriptSig?: { hex: string };
    txinwitness?: string[];
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      hex: string;
      type: string;
      address?: string;
    };
  }>;
}

type PartType = "structure" | "input" | "output" | "witness" | "anchor";

interface HexPart {
  hex: string;
  type: PartType;
  label: string;
}

const MAGIC_BYTES = "a11c0001";

const CATEGORIES: { id: PartType; label: string }[] = [
  { id: "structure", label: "Structure" },
  { id: "input", label: "Inputs" },
  { id: "output", label: "Outputs" },
  { id: "witness", label: "Witness" },
  { id: "anchor", label: "ANCHOR" },
];

export function TxStructure({ txid, carrierName }: TxStructureProps) {
  const [txHex, setTxHex] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedTx | null>(null);
  const [feeSats, setFeeSats] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDecoded, setShowDecoded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PartType | null>(null);
  const [hoveredPart, setHoveredPart] = useState<HexPart | null>(null);
  const [parsedParts, setParsedParts] = useState<HexPart[]>([]);

  useEffect(() => {
    async function fetchTx() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/wallet/rawtx/${txid}`);
        if (res.ok) {
          const data = await res.json();
          setTxHex(data.hex);
          setDecoded(data.decoded);
          setFeeSats(data.fee_sats ?? null);
          setParsedParts(parseHexIntoParts(data.hex));
        } else {
          setError("Transaction not found");
        }
      } catch {
        setError("Could not fetch transaction");
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, [txid]);

  const handleCopy = () => {
    if (txHex) {
      navigator.clipboard.writeText(txHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  function parseHexIntoParts(hex: string): HexPart[] {
    const parts: HexPart[] = [];
    let pos = 0;

    const addPart = (length: number, type: PartType, label: string) => {
      if (pos + length <= hex.length) {
        parts.push({ hex: hex.slice(pos, pos + length), type, label });
        pos += length;
      }
    };

    addPart(8, "structure", "Version");
    const isSegwit = hex.slice(pos, pos + 4) === "0001";
    if (isSegwit) addPart(4, "structure", "SegWit Flag");

    const inputCount = parseInt(hex.slice(pos, pos + 2), 16);
    addPart(2, "input", `Input Count: ${inputCount}`);

    for (let i = 0; i < inputCount && pos < hex.length - 16; i++) {
      addPart(64, "input", `Input ${i}: Previous TXID`);
      addPart(8, "input", `Input ${i}: Vout`);
      const scriptLen = parseInt(hex.slice(pos, pos + 2), 16) * 2;
      addPart(2, "input", `Input ${i}: Script Length`);
      if (scriptLen > 0) addPart(scriptLen, "input", `Input ${i}: ScriptSig`);
      addPart(8, "input", `Input ${i}: Sequence`);
    }

    if (pos < hex.length) {
      const outputCount = parseInt(hex.slice(pos, pos + 2), 16);
      addPart(2, "output", `Output Count: ${outputCount}`);

      for (let i = 0; i < outputCount && pos < hex.length - 8; i++) {
        addPart(16, "output", `Output ${i}: Value`);
        const scriptLen = parseInt(hex.slice(pos, pos + 2), 16) * 2;
        addPart(2, "output", `Output ${i}: Script Length`);
        const script = hex.slice(pos, pos + scriptLen);
        const isAnchor = script.includes(MAGIC_BYTES) || script.startsWith("6a");
        addPart(scriptLen, isAnchor ? "anchor" : "output", 
          isAnchor ? `Output ${i}: ANCHOR Data` : `Output ${i}: ScriptPubKey`);
      }
    }

    if (isSegwit && pos < hex.length - 8) {
      const remaining = hex.slice(pos, -8);
      if (remaining.length > 0) {
        const hasAnchor = remaining.toLowerCase().includes("414e43484f52") || remaining.includes(MAGIC_BYTES);
        parts.push({ hex: remaining, type: hasAnchor ? "anchor" : "witness", label: "Witness Data" });
        pos = hex.length - 8;
      }
    }

    if (pos < hex.length) {
      parts.push({ hex: hex.slice(-8), type: "structure", label: "Locktime" });
    }

    return parts;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500 gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          Raw transaction structure using <strong>{carrierName.replace(/_/g, " ")}</strong> carrier.
        </p>
      </div>

      {/* Fee Stats */}
      {decoded && feeSats !== null && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Fee: </span>
            <span className="font-medium">{feeSats} sats</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rate: </span>
            <span className="font-medium">{(feeSats / decoded.vsize).toFixed(1)} sat/vB</span>
          </div>
          <div>
            <span className="text-muted-foreground">Size: </span>
            <span className="font-medium">{decoded.vsize} vB</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              selectedCategory === cat.id
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:border-foreground/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
        {selectedCategory && (
          <button onClick={() => setSelectedCategory(null)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Raw Hex */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b text-sm">
          <span className="text-muted-foreground">Raw Hex ({txHex ? txHex.length / 2 : 0} bytes)</span>
          <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        
        <div className="p-3 font-mono text-xs leading-relaxed break-all bg-muted/20">
          {parsedParts.map((part, i) => {
            const isVisible = !selectedCategory || part.type === selectedCategory;
            const isHovered = hoveredPart === part;
            
            return (
              <span
                key={i}
                className={`cursor-default transition-opacity ${
                  isVisible ? (isHovered ? "bg-foreground/10 rounded" : "") : "opacity-20"
                } ${part.type === "anchor" ? "text-orange-600 dark:text-orange-400 font-medium" : ""}`}
                onMouseEnter={() => setHoveredPart(part)}
                onMouseLeave={() => setHoveredPart(null)}
              >
                {part.hex}
              </span>
            );
          })}
        </div>

        {/* Hover info - fixed height to prevent layout shift */}
        <div className="px-3 py-2 border-t bg-muted/30 text-xs h-8 flex items-center">
          {hoveredPart ? (
            <>
              <span className="font-medium text-foreground">{hoveredPart.label}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-muted-foreground">{hoveredPart.hex.length / 2} bytes</span>
              {hoveredPart.type === "anchor" && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">⚓ ANCHOR data</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/50">Hover over hex to see details</span>
          )}
        </div>
      </div>

      {/* Decoded Structure */}
      {decoded && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowDecoded(!showDecoded)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 text-sm hover:bg-muted/70"
          >
            <span>Decoded Structure</span>
            {showDecoded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDecoded && (
            <div className="p-3 text-sm space-y-4">
              {/* Inputs */}
              <div>
                <div className="text-xs text-muted-foreground mb-2 font-medium">Inputs ({decoded.vin.length})</div>
                <div className="space-y-2">
                  {decoded.vin.map((inp, i) => (
                    <div key={i} className="bg-muted/30 rounded p-2">
                      <div className="font-mono text-xs text-muted-foreground truncate">
                        {inp.txid ? `${inp.txid}:${inp.vout}` : "Coinbase"}
                      </div>
                      {inp.txinwitness && inp.txinwitness.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="text-xs text-muted-foreground mb-1">
                            Witness ({inp.txinwitness.length} elements)
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {inp.txinwitness.map((w, wi) => {
                              const hasAnchor = w.toLowerCase().includes("414e43484f52") || w.includes("a11c0001");
                              return (
                                <div key={wi} className="font-mono text-xs break-all">
                                  <span className="text-muted-foreground/70">[{wi}] </span>
                                  <span className={hasAnchor ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                                    {w.length > 80 ? `${w.slice(0, 80)}...` : w}
                                  </span>
                                  {hasAnchor && <span className="ml-1 text-orange-600 dark:text-orange-400">⚓</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div>
                <div className="text-xs text-muted-foreground mb-2 font-medium">Outputs ({decoded.vout.length})</div>
                <div className="space-y-1">
                  {decoded.vout.map((out, i) => {
                    const isAnchor = out.scriptPubKey.type === "nulldata" || out.scriptPubKey.hex.includes("a11c0001");
                    return (
                      <div key={i} className="flex justify-between text-xs bg-muted/30 rounded p-2">
                        <div>
                          <span className={isAnchor ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}>
                            {isAnchor ? "⚓ ANCHOR" : out.scriptPubKey.type}
                          </span>
                          {out.scriptPubKey.address && (
                            <div className="font-mono text-muted-foreground/70 truncate max-w-[300px]">
                              {out.scriptPubKey.address}
                            </div>
                          )}
                        </div>
                        <span className="font-mono font-medium">{out.value.toFixed(8)} BTC</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
