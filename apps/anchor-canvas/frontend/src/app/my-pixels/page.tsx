"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Palette,
  Clock,
  Zap,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

import {
  fetchMyPixels,
  rgbToHex,
  truncateTxid,
  formatNumber,
  type UserPixel,
} from "@/lib/api";

interface TransactionGroup {
  txid: string;
  pixels: UserPixel[];
  createdAt: string;
  activeCount: number;
  overwrittenCount: number;
}

export default function MyPixelsPage() {
  const [expandedTxs, setExpandedTxs] = useState<Set<string>>(new Set());
  const [copiedTxid, setCopiedTxid] = useState<string | null>(null);

  // Fetch all pixels from the connected wallet
  const {
    data: pixelsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-pixels"],
    queryFn: () => fetchMyPixels(50000),
    staleTime: 30000,
  });

  // Group pixels by transaction and calculate active/overwritten status
  const transactionGroups = useMemo(() => {
    if (!pixelsData?.pixels) return [];

    // First, group by transaction
    const txMap = new Map<string, UserPixel[]>();
    for (const pixel of pixelsData.pixels) {
      const existing = txMap.get(pixel.txid) || [];
      existing.push(pixel);
      txMap.set(pixel.txid, existing);
    }

    // Track which positions have been seen (most recent wins)
    // Pixels are already sorted by created_at DESC
    const seenPositions = new Set<string>();
    const pixelStatus = new Map<string, boolean>(); // key -> isActive

    for (const pixel of pixelsData.pixels) {
      const posKey = `${pixel.x},${pixel.y}`;
      const pixelKey = `${pixel.txid}-${pixel.x}-${pixel.y}`;
      
      if (!seenPositions.has(posKey)) {
        // First time seeing this position = active (most recent)
        pixelStatus.set(pixelKey, true);
        seenPositions.add(posKey);
      } else {
        // Already seen = overwritten
        pixelStatus.set(pixelKey, false);
      }
    }

    // Build transaction groups with active/overwritten counts
    const groups: TransactionGroup[] = [];
    for (const [txid, pixels] of txMap.entries()) {
      let activeCount = 0;
      let overwrittenCount = 0;

      for (const pixel of pixels) {
        const pixelKey = `${pixel.txid}-${pixel.x}-${pixel.y}`;
        if (pixelStatus.get(pixelKey)) {
          activeCount++;
        } else {
          overwrittenCount++;
        }
      }

      groups.push({
        txid,
        pixels,
        createdAt: pixels[0].created_at,
        activeCount,
        overwrittenCount,
      });
    }

    // Sort by date descending (most recent first)
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return groups;
  }, [pixelsData]);

  // Check if a pixel is active (most recent for its position)
  const isPixelActive = useCallback((pixel: UserPixel, allPixels: UserPixel[]) => {
    // Find the most recent pixel at this position
    const pixelsAtPosition = allPixels
      .filter(p => p.x === pixel.x && p.y === pixel.y)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return pixelsAtPosition[0]?.txid === pixel.txid && 
           pixelsAtPosition[0]?.created_at === pixel.created_at;
  }, []);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Toggle transaction expansion
  const toggleTx = useCallback((txid: string) => {
    setExpandedTxs(prev => {
      const next = new Set(prev);
      if (next.has(txid)) {
        next.delete(txid);
      } else {
        next.add(txid);
      }
      return next;
    });
  }, []);

  // Copy txid to clipboard
  const copyTxid = useCallback(async (txid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(txid);
    setCopiedTxid(txid);
    setTimeout(() => setCopiedTxid(null), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Canvas</span>
            </Link>
            <div className="flex items-center gap-3">
              <Palette size={24} className="text-primary" />
              <h1 className="text-xl font-bold text-white">My Pixels</h1>
            </div>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Stats */}
        {pixelsData && pixelsData.total_pixels > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Zap size={16} className="text-accent" />
                Transactions
              </div>
              <div className="text-2xl font-bold text-white">
                {transactionGroups.length}
              </div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Palette size={16} className="text-primary" />
                Total Pixels
              </div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(pixelsData.total_pixels)}
              </div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <CheckCircle2 size={16} className="text-green-500" />
                Active
              </div>
              <div className="text-2xl font-bold text-green-500">
                {pixelsData.unique_positions}
              </div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <XCircle size={16} className="text-gray-500" />
                Overwritten
              </div>
              <div className="text-2xl font-bold text-gray-500">
                {pixelsData.total_pixels - pixelsData.unique_positions}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading your pixels...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={40} className="text-red-500 mb-4" />
            <p className="text-gray-400">
              Failed to load pixels: {(error as Error).message}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!pixelsData || pixelsData.total_pixels === 0) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Palette size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No pixels painted yet
            </h3>
            <p className="text-gray-400 mb-6 text-center max-w-md">
              Start painting on the canvas and your pixels will appear here!
              <br />
              Each transaction you make is linked to your wallet address.
            </p>
            <Link
              href="/"
              className="bg-primary hover:bg-primary/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Open Canvas
            </Link>
          </div>
        )}

        {/* Transaction list */}
        {!isLoading && !error && transactionGroups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">
              Your Transactions ({transactionGroups.length})
            </h2>
            
            {transactionGroups.map((group) => {
              const isExpanded = expandedTxs.has(group.txid);
              
              return (
                <div
                  key={group.txid}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Transaction header - clickable */}
                  <button
                    onClick={() => toggleTx(group.txid)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
                      )}
                      <Zap size={16} className="text-accent" />
                      <span className="font-mono text-sm text-gray-300">
                        {truncateTxid(group.txid, 10)}
                      </span>
                      <button
                        onClick={(e) => copyTxid(group.txid, e)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Copy full txid"
                      >
                        {copiedTxid === group.txid ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} className="text-gray-500" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Pixel counts */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 size={14} />
                          {group.activeCount}
                        </span>
                        {group.overwrittenCount > 0 && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <XCircle size={14} />
                            {group.overwrittenCount}
                          </span>
                        )}
                        <span className="text-gray-600">
                          ({group.pixels.length} total)
                        </span>
                      </div>
                      
                      {/* Color preview strip */}
                      <div className="flex gap-0.5">
                        {group.pixels.slice(0, 8).map((pixel, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: rgbToHex(pixel.r, pixel.g, pixel.b) }}
                          />
                        ))}
                        {group.pixels.length > 8 && (
                          <div className="w-4 h-4 rounded-sm bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                            +
                          </div>
                        )}
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 min-w-[100px] justify-end">
                        <Clock size={12} />
                        {formatDate(group.createdAt)}
                      </div>
                    </div>
                  </button>

                  {/* Expanded pixel details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 bg-gray-850">
                      <div className="flex flex-wrap gap-2">
                        {group.pixels.map((pixel, idx) => {
                          const active = isPixelActive(pixel, pixelsData?.pixels || []);
                          
                          return (
                            <Link
                              key={`${pixel.x}-${pixel.y}-${idx}`}
                              href={`/?x=${pixel.x}&y=${pixel.y}`}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors group ${
                                active 
                                  ? "bg-gray-900 hover:bg-gray-700 border border-green-900/50" 
                                  : "bg-gray-900/50 hover:bg-gray-800 border border-gray-700 opacity-60"
                              }`}
                              title={active ? "Active pixel" : "Overwritten by another pixel"}
                            >
                              <div
                                className={`w-5 h-5 rounded border ${
                                  active ? "border-green-700" : "border-gray-600"
                                }`}
                                style={{
                                  backgroundColor: rgbToHex(pixel.r, pixel.g, pixel.b),
                                }}
                              />
                              <span className="font-mono text-xs text-gray-400">
                                ({pixel.x}, {pixel.y})
                              </span>
                              {active ? (
                                <CheckCircle2 size={12} className="text-green-600" />
                              ) : (
                                <XCircle size={12} className="text-gray-600" />
                              )}
                              <ExternalLink
                                size={12}
                                className="text-gray-600 group-hover:text-primary transition-colors"
                              />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
