"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchThread,
  fetchMessage,
  ThreadNode,
  Message,
  truncateTxid,
  formatBlockHeight,
  CARRIER_INFO,
  isImageMessage,
  hexToImageDataUrl,
  BTC_EXPLORER_URL,
} from "@/lib/api";
import {
  Loader2,
  MessageSquare,
  AlertTriangle,
  Box,
  Clock,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Link2,
  Reply,
  ArrowLeft,
  Plus,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function ThreadPage() {
  const params = useParams();
  const txid = params.txid as string;
  const vout = parseInt(params.vout as string);

  const { data: message, isLoading: messageLoading } = useQuery({
    queryKey: ["message", txid, vout],
    queryFn: () => fetchMessage(txid, vout),
  });

  const {
    data: thread,
    isLoading: threadLoading,
    error,
  } = useQuery({
    queryKey: ["thread", txid, vout],
    queryFn: () => fetchThread(txid, vout),
  });

  const parentAnchors = message?.anchors?.filter(
    (a) => a.resolved_txid && !a.is_orphan
  ) || [];

  const { data: parentMessages, isLoading: parentsLoading } = useQuery({
    queryKey: ["parents", txid, vout, parentAnchors.map((a) => a.resolved_txid)],
    queryFn: async () => {
      const parents = await Promise.all(
        parentAnchors.map(async (anchor) => {
          if (!anchor.resolved_txid) return null;
          try {
            const parent = await fetchMessage(anchor.resolved_txid, anchor.vout);
            return { anchor, message: parent };
          } catch {
            return null;
          }
        })
      );
      return parents.filter(Boolean) as { anchor: typeof parentAnchors[0]; message: Message }[];
    },
    enabled: parentAnchors.length > 0,
  });

  const isLoading = messageLoading || threadLoading || parentsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Thread Not Found</h1>
        <p className="text-muted-foreground">
          The requested thread could not be found.
        </p>
      </div>
    );
  }

  const hasParents = parentMessages && parentMessages.length > 0;
  const totalReplies = countTotalReplies(thread.replies);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/threads" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-orange-500" />
              Thread View
            </h1>
            <p className="text-sm text-gray-500">
              {thread.total_messages} message{thread.total_messages !== 1 ? "s" : ""} in this thread
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${BTC_EXPLORER_URL}/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            title="View in BTC Explorer"
          >
            <ExternalLink className="h-4 w-4" />
            BTC Explorer
          </a>
          <Link
            href={`/compose?parent=${txid}&vout=${vout}`}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Reply
          </Link>
        </div>
      </div>

      {/* Parent Messages */}
      {hasParents && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <ArrowUp className="h-4 w-4" />
            <span>Parent Messages</span>
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-orange-200">
            {parentMessages.map(({ anchor, message: parent }) => (
              <ParentCard key={`${parent.txid}-${parent.vout}`} message={parent} index={anchor.index} />
            ))}
          </div>
          <div className="flex justify-center py-2">
            <ArrowDown className="h-5 w-5 text-orange-400" />
          </div>
        </div>
      )}

      {/* Root Message */}
      <RootCard message={thread.root} />

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Reply className="h-4 w-4" />
            <span>{totalReplies} {totalReplies === 1 ? "Reply" : "Replies"}</span>
          </div>
          <div className="space-y-2">
            {thread.replies.map((node, i) => (
              <ThreadNodeView key={`${node.message.txid}-${node.message.vout}`} node={node} depth={0} />
            ))}
          </div>
        </div>
      )}

      {/* No Replies */}
      {thread.replies.length === 0 && (
        <div className="text-center py-12 bg-orange-50 rounded-xl border border-orange-100">
          <MessageSquare className="h-10 w-10 text-orange-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">No replies yet</h3>
          <p className="text-gray-500 mb-4">Be the first to reply.</p>
          <Link
            href={`/compose?parent=${txid}&vout=${vout}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Reply className="h-4 w-4" />
            Reply
          </Link>
        </div>
      )}
    </div>
  );
}

function countTotalReplies(nodes: ThreadNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countTotalReplies(node.replies), 0);
}

// Message body renderer
function MessageBody({ message, size = "md" }: { message: Message; size?: "sm" | "md" | "lg" }) {
  const isImage = isImageMessage(message);
  const imageDataUrl = isImage ? hexToImageDataUrl(message.body_hex) : null;
  
  const imgSize = size === "lg" ? "w-20 h-20" : size === "md" ? "w-14 h-14" : "w-10 h-10";
  const textSize = size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm";

  if (isImage) {
    return (
      <div className="flex items-center gap-3">
        <div className={`${imgSize} rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0`}>
          {imageDataUrl ? (
            <img src={imageDataUrl} alt="" className="object-cover w-full h-full" style={{ imageRendering: "pixelated" }} />
          ) : (
            <ImageIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <span className="text-sm text-gray-500">Image ({Math.floor(message.body_hex.length / 2)} bytes)</span>
      </div>
    );
  }

  if (message.body_text) {
    return <p className={`${textSize} whitespace-pre-wrap break-words`}>{message.body_text}</p>;
  }

  return <p className="font-mono text-sm text-gray-400">{truncateTxid(message.body_hex, 32)}</p>;
}

// Root message card
function RootCard({ message }: { message: Message }) {
  const carrierInfo = message.carrier !== undefined ? CARRIER_INFO[message.carrier] : null;

  return (
    <article className="bg-white border-2 border-orange-300 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-medium">
            {message.kind_name}
          </span>
          {carrierInfo && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${carrierInfo.bgColor} ${carrierInfo.textColor}`}>
              {carrierInfo.icon} {carrierInfo.label}
            </span>
          )}
          <span className="text-gray-400 flex items-center gap-1">
            <Box className="h-3 w-3" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        <Link href={`/message/${message.txid}/${message.vout}`} className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
          Details <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-4">
        <MessageBody message={message} size="lg" />
      </div>

      {message.anchors?.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg text-sm">
          <div className="flex items-center gap-2 font-medium text-orange-700 mb-2">
            <Link2 className="h-4 w-4" />
            Anchors ({message.anchors.length})
          </div>
          {message.anchors.map((anchor, i) => (
            <div key={i} className="text-xs text-gray-600">
              #{i}: {anchor.resolved_txid ? (
                <Link href={`/thread/${anchor.resolved_txid}/${anchor.vout}`} className="text-orange-600 hover:underline font-mono">
                  {truncateTxid(anchor.resolved_txid)}:{anchor.vout}
                </Link>
              ) : (
                <span className="font-mono text-gray-400">{anchor.txid_prefix}...:{anchor.vout}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
        </span>
        <span className="font-mono text-xs">{truncateTxid(message.txid)}:{message.vout}</span>
      </div>
    </article>
  );
}

// Parent message card
function ParentCard({ message, index }: { message: Message; index: number }) {
  return (
    <Link
      href={`/thread/${message.txid}/${message.vout}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">Parent #{index + 1}</span>
        <span>{formatBlockHeight(message.block_height)}</span>
      </div>
      <MessageBody message={message} size="sm" />
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span className="font-mono">{truncateTxid(message.txid)}</span>
        <span>•</span>
        <span>{message.reply_count} replies</span>
        <ExternalLink className="h-3 w-3 ml-auto" />
      </div>
    </Link>
  );
}

// Thread node (recursive)
function ThreadNodeView({ node, depth }: { node: ThreadNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
      <ReplyCard message={node.message} />
      {node.replies.map((reply) => (
        <ThreadNodeView key={`${reply.message.txid}-${reply.message.vout}`} node={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

// Reply card
function ReplyCard({ message }: { message: Message }) {
  const carrierInfo = message.carrier !== undefined ? CARRIER_INFO[message.carrier] : null;

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-4 mb-2 hover:border-orange-200 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">{message.kind_name}</span>
          {carrierInfo && (
            <span className={`px-2 py-0.5 rounded font-medium ${carrierInfo.bgColor} ${carrierInfo.textColor}`}>
              {carrierInfo.icon} {carrierInfo.label}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Box className="h-3 w-3" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href={`/compose?parent=${message.txid}&vout=${message.vout}`} className="text-gray-400 hover:text-orange-500">
            Reply
          </Link>
          <Link href={`/thread/${message.txid}/${message.vout}`} className="text-gray-400 hover:text-orange-500">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-2">
        <MessageBody message={message} size="md" />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
        </span>
        <span className="font-mono">{truncateTxid(message.txid)}:{message.vout}</span>
      </div>
    </article>
  );
}
