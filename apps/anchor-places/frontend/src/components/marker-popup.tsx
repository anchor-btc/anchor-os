"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  MessageCircle,
  Send,
  Loader2,
  ExternalLink,
  Clock,
  Bitcoin,
} from "lucide-react";
import {
  fetchMarkerDetail,
  createReply,
  truncateTxid,
  formatDate,
  mineBlocks,
  getExplorerTxUrl,
  type Marker,
} from "@/lib/api";
import { CategoryBadge } from "./category-filter";

interface MarkerPopupProps {
  marker: Marker;
  onClose: () => void;
}

export function MarkerPopup({ marker, onClose }: MarkerPopupProps) {
  const [replyText, setReplyText] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["marker-detail", marker.txid, marker.vout],
    queryFn: () => fetchMarkerDetail(marker.txid, marker.vout),
  });

  const replyMutation = useMutation({
    mutationFn: () => createReply(marker.txid, marker.vout, replyText),
    onSuccess: async () => {
      setReplyText("");
      setShowReplyForm(false);
      // Mine a block to confirm the transaction (regtest only)
      try {
        await mineBlocks(1);
      } catch {
        // Ignore mining errors in non-regtest environments
      }
      // Refetch after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["marker-detail", marker.txid, marker.vout],
        });
      }, 2000);
    },
  });

  const handleReply = () => {
    if (replyText.trim()) {
      replyMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-secondary border border-map-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-map-border">
          <div className="flex-1">
            <CategoryBadge category={marker.category} />
            <p className="mt-2 text-foreground">{marker.message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-secondary-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta info */}
        <div className="px-4 py-3 bg-map-bg border-b border-map-border">
          <div className="flex items-center gap-4 text-xs text-secondary-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(marker.created_at)}
            </div>
            <div className="flex items-center gap-1">
              <Bitcoin className="w-3.5 h-3.5 text-bitcoin" />
              <a
                href={getExplorerTxUrl(marker.txid)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-primary transition-colors"
              >
                {truncateTxid(marker.txid)}
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </div>
          </div>
          <div className="text-xs text-secondary-foreground mt-1">
            Coordinates: {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
          </div>
        </div>

        {/* Replies */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : detail?.replies && detail.replies.length > 0 ? (
            <div className="divide-y divide-map-border">
              {detail.replies.map((reply) => (
                <div
                  key={`${reply.txid}-${reply.vout}`}
                  className="px-4 py-3"
                >
                  <p className="text-sm text-foreground">{reply.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-secondary-foreground">
                    <span>{formatDate(reply.created_at)}</span>
                    <span className="font-mono">{truncateTxid(reply.txid)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-secondary-foreground text-sm">
              No replies yet
            </div>
          )}
        </div>

        {/* Reply form */}
        <div className="p-4 border-t border-map-border">
          {showReplyForm ? (
            <div className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                maxLength={255}
                rows={3}
                className="w-full px-3 py-2 bg-map-bg border border-map-border rounded-lg text-foreground placeholder:text-secondary-foreground resize-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary-foreground">
                  {replyText.length}/255
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReplyForm(false)}
                    className="px-3 py-1.5 text-sm text-secondary-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Reply
                  </button>
                </div>
              </div>
              {replyMutation.isError && (
                <p className="text-xs text-red-400">
                  {replyMutation.error instanceof Error
                    ? replyMutation.error.message
                    : "Failed to create reply"}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowReplyForm(true)}
              className="flex items-center gap-2 w-full justify-center py-2 text-sm text-secondary-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Add a reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

