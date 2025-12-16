"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Message, truncateTxid, formatBlockHeight, hexToImageDataUrl, isImageMessage, CARRIER_INFO } from "@/lib/api";
import {
  MessageSquare,
  Link2,
  Clock,
  Box,
  AlertTriangle,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

interface MessageCardProps {
  message: Message;
  showParent?: boolean;
  isReply?: boolean;
}

export function MessageCard({
  message,
  showParent = false,
  isReply = false,
}: MessageCardProps) {
  const router = useRouter();
  const hasText = message.body_text && message.body_text.trim().length > 0;
  const parentAnchor = message.anchors.find((a) => a.index === 0);
  
  // Check if this is an image message (by kind or magic bytes)
  const isImage = isImageMessage(message);
  const imageDataUrl = isImage ? hexToImageDataUrl(message.body_hex) : null;

  const handleCardClick = () => {
    router.push(`/message/${message.txid}/${message.vout}`);
  };

  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <article
      onClick={handleCardClick}
      className={`bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group ${
        isReply ? "ml-6 border-l-2 border-l-primary/30" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
            {message.kind_name}
          </span>
          {message.carrier !== undefined && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                CARRIER_INFO[message.carrier]?.bgColor || "bg-gray-100"
              } ${CARRIER_INFO[message.carrier]?.textColor || "text-gray-700"}`}
              title={CARRIER_INFO[message.carrier]?.description || `Carrier: ${message.carrier_name}`}
            >
              {CARRIER_INFO[message.carrier]?.icon}{" "}
              {CARRIER_INFO[message.carrier]?.label || message.carrier_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Box className="h-3 w-3" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Parent Reference */}
      {showParent && parentAnchor && (
        <div className="mb-3 text-sm" onClick={handleInteractiveClick}>
          {parentAnchor.is_orphan ? (
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
              Parent not found
            </span>
          ) : parentAnchor.is_ambiguous ? (
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
              Ambiguous parent reference
            </span>
          ) : parentAnchor.resolved_txid ? (
            <Link
              href={`/message/${parentAnchor.resolved_txid}/${parentAnchor.vout}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <Link2 className="h-3 w-3" />
              Replying to {truncateTxid(parentAnchor.resolved_txid)}
            </Link>
          ) : null}
        </div>
      )}

      {/* Body */}
      <div className="mb-3">
        {isImage ? (
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex items-center justify-center">
              {imageDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageDataUrl}
                  alt="ANCHOR Image"
                  className="object-cover w-full h-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Image ({Math.floor(message.body_hex.length / 2)} bytes)</span>
            </div>
          </div>
        ) : hasText ? (
          <p className="text-foreground whitespace-pre-wrap break-words">
            {message.body_text}
          </p>
        ) : (
          <p className="text-muted-foreground font-mono text-sm">
            {truncateTxid(message.body_hex, 32)}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link
          href={`/thread/${message.txid}/${message.vout}`}
          onClick={handleInteractiveClick}
          className="flex items-center gap-1 hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 -ml-2 rounded"
        >
          <MessageSquare className="h-4 w-4" />
          {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
        </Link>

        <span className="font-mono text-xs">
          {truncateTxid(message.txid)}:{message.vout}
        </span>
      </div>

      {/* Additional Anchors */}
      {message.anchors.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            References {message.anchors.length - 1} other message
            {message.anchors.length > 2 ? "s" : ""}
          </span>
        </div>
      )}
    </article>
  );
}
