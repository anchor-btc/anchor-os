"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPixelInfo, rgbToHex, truncateTxid, type PixelInfo as PixelInfoType } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, History, MapPin } from "lucide-react";

interface PixelInfoProps {
  x: number;
  y: number;
}

export function PixelInfo({ x, y }: PixelInfoProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pixel", x, y],
    queryFn: () => fetchPixelInfo(x, y),
    enabled: x >= 0 && y >= 0,
  });

  if (isLoading) {
    return (
      <div className="stats-card animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-700 rounded w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-card text-red-400 text-sm">
        Failed to load pixel info
      </div>
    );
  }

  if (!data) return null;

  const { current, history } = data;

  return (
    <div className="stats-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          <span className="font-mono text-lg">
            ({x}, {y})
          </span>
        </div>
        {current && (
          <div
            className="w-8 h-8 rounded-lg border-2 border-gray-600 shadow-md"
            style={{
              backgroundColor: rgbToHex(current.r, current.g, current.b),
            }}
          />
        )}
      </div>

      {/* Current state */}
      {current ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Color</span>
            <span className="font-mono">
              {rgbToHex(current.r, current.g, current.b).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">RGB</span>
            <span className="font-mono">
              {current.r}, {current.g}, {current.b}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Block</span>
            <span className="font-mono text-accent">
              #{current.last_block_height?.toLocaleString() || "Pending"}
            </span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-400">Transaction</span>
            <a
              href={`#`}
              className="flex items-center gap-1 font-mono text-primary hover:text-primary-dark"
            >
              {truncateTxid(current.last_txid, 6)}
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Updated</span>
            <span className="text-gray-300">
              {formatDistanceToNow(new Date(current.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>This pixel has never been painted</p>
          <p className="text-sm mt-1">Be the first to claim it!</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <History size={14} />
            <span>History ({history.length})</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {history.slice(0, 10).map((entry, i) => (
              <div
                key={`${entry.txid}-${i}`}
                className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-lg text-sm"
              >
                <div
                  className="w-5 h-5 rounded border border-gray-700"
                  style={{
                    backgroundColor: rgbToHex(entry.r, entry.g, entry.b),
                  }}
                />
                <span className="font-mono text-xs text-gray-500">
                  {truncateTxid(entry.txid, 4)}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


