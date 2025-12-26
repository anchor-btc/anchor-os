'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRecentPixels, rgbToHex, truncateTxid } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';

interface RecentActivityProps {
  onPixelClick?: (x: number, y: number) => void;
}

export function RecentActivity({ onPixelClick }: RecentActivityProps) {
  const { data: pixels, isLoading } = useQuery({
    queryKey: ['recent-pixels'],
    queryFn: () => fetchRecentPixels(20),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="stats-card">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent" />
          <span className="font-medium">Recent Activity</span>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-accent" />
        <span className="font-medium">Recent Activity</span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {pixels?.map((pixel, i) => (
          <div
            key={`${pixel.txid}-${i}`}
            onClick={() => onPixelClick?.(pixel.x, pixel.y)}
            className="activity-item"
          >
            <div
              className="w-8 h-8 rounded-lg border-2 border-gray-700 shadow-sm flex-shrink-0"
              style={{
                backgroundColor: rgbToHex(pixel.r, pixel.g, pixel.b),
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  ({pixel.x}, {pixel.y})
                </span>
                <span className="text-xs text-gray-500">
                  {rgbToHex(pixel.r, pixel.g, pixel.b).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{truncateTxid(pixel.txid, 4)}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(pixel.updated_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}

        {(!pixels || pixels.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>No activity yet</p>
            <p className="text-sm mt-1">Be the first to paint!</p>
          </div>
        )}
      </div>
    </div>
  );
}
