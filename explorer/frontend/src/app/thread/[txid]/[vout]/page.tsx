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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function ThreadPage() {
  const params = useParams();
  const txid = params.txid as string;
  const vout = parseInt(params.vout as string);

  // Fetch the current message to get its anchors (parents)
  const { data: message, isLoading: messageLoading } = useQuery({
    queryKey: ["message", txid, vout],
    queryFn: () => fetchMessage(txid, vout),
  });

  // Fetch the thread (current message + all descendants)
  const {
    data: thread,
    isLoading: threadLoading,
    error,
  } = useQuery({
    queryKey: ["thread", txid, vout],
    queryFn: () => fetchThread(txid, vout),
  });

  // Fetch parent messages if they exist
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
          <Link
            href="/threads"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-orange-500" />
              Thread View
            </h1>
            <p className="text-sm text-gray-500">
              {thread.total_messages} message{thread.total_messages !== 1 ? "s" : ""} in this thread
              {hasParents && ` • ${parentMessages.length} parent${parentMessages.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Link
          href={`/compose?parent=${txid}&vout=${vout}`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Reply
        </Link>
      </div>

      {/* Parent Messages Section */}
      {hasParents && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowUp className="h-4 w-4" />
            <span className="text-sm font-medium">Parent Messages</span>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-orange-200">
            {parentMessages.map(({ anchor, message: parent }) => (
              <ParentMessageCard
                key={`${parent.txid}-${parent.vout}`}
                message={parent}
                anchorIndex={anchor.index}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-orange-500">
              <ArrowDown className="h-5 w-5" />
              <span className="text-sm font-medium">replies to</span>
              <ArrowDown className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Current Message (Root of this view) */}
      <div className="relative">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full" />
        <CurrentMessageCard message={thread.root} />
      </div>

      {/* Replies Section */}
      {thread.replies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Reply className="h-4 w-4" />
            <span className="text-sm font-medium">
              {totalReplies} {totalReplies === 1 ? "Reply" : "Replies"}
            </span>
          </div>
          <div className="space-y-0">
            {thread.replies.map((node, index) => (
              <ThreadNodeComponent
                key={`${node.message.txid}-${node.message.vout}`}
                node={node}
                depth={0}
                isLast={index === thread.replies.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* No replies */}
      {thread.replies.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
          <MessageSquare className="h-10 w-10 text-orange-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">No replies yet</h3>
          <p className="text-gray-500 mb-4">Be the first to reply to this message.</p>
          <Link
            href={`/compose?parent=${txid}&vout=${vout}`}
            className="inline-flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            <Reply className="h-4 w-4" />
            Reply to this message
          </Link>
        </div>
      )}
    </div>
  );
}

// Count total replies recursively
function countTotalReplies(nodes: ThreadNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + countTotalReplies(node.replies);
  }, 0);
}

// Parent message card
function ParentMessageCard({
  message,
  anchorIndex,
}: {
  message: Message;
  anchorIndex: number;
}) {
  return (
    <Link
      href={`/thread/${message.txid}/${message.vout}`}
      className="block bg-white border border-orange-100 rounded-lg p-4 hover:border-orange-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
              Parent #{anchorIndex + 1}
            </span>
            <span className="flex items-center gap-1">
              <Box className="h-3 w-3" />
              {formatBlockHeight(message.block_height)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-gray-800 line-clamp-2">
            {message.body_text || (
              <span className="font-mono text-sm text-gray-500">
                {truncateTxid(message.body_hex, 24)}
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="font-mono">{truncateTxid(message.txid)}:{message.vout}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {message.reply_count} replies
            </span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// Current/main message card
function CurrentMessageCard({ message }: { message: Message }) {
  return (
    <article className="bg-white border-2 border-orange-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-semibold">
            {message.kind_name}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Box className="h-4 w-4" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-4 w-4" />
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        <Link
          href={`/message/${message.txid}/${message.vout}`}
          className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 transition-colors"
        >
          Details
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-4">
        {message.body_text ? (
          <p className="text-lg whitespace-pre-wrap break-words">{message.body_text}</p>
        ) : (
          <p className="font-mono text-sm text-gray-500 bg-gray-50 p-3 rounded">
            {message.body_hex}
          </p>
        )}
      </div>

      {/* Anchors info */}
      {message.anchors && message.anchors.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-2">
            <Link2 className="h-4 w-4" />
            Anchors ({message.anchors.length})
          </div>
          <div className="space-y-1">
            {message.anchors.map((anchor, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">#{i + 1}</span>
                {anchor.resolved_txid ? (
                  <Link
                    href={`/thread/${anchor.resolved_txid}/${anchor.vout}`}
                    className="font-mono text-orange-600 hover:underline"
                  >
                    {truncateTxid(anchor.resolved_txid)}:{anchor.vout}
                  </Link>
                ) : (
                  <span className="font-mono text-gray-400">
                    {anchor.txid_prefix}...:{anchor.vout}
                    {anchor.is_orphan && <span className="ml-1 text-red-500">(orphan)</span>}
                    {anchor.is_ambiguous && <span className="ml-1 text-yellow-600">(ambiguous)</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {message.reply_count} direct {message.reply_count === 1 ? "reply" : "replies"}
        </span>
        <span className="font-mono text-xs">
          {truncateTxid(message.txid)}:{message.vout}
        </span>
      </div>
    </article>
  );
}

interface ThreadNodeComponentProps {
  node: ThreadNode;
  depth: number;
  isLast: boolean;
}

function ThreadNodeComponent({ node, depth, isLast }: ThreadNodeComponentProps) {
  const hasReplies = node.replies.length > 0;

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {depth > 0 && (
        <div
          className="absolute top-0 w-0.5 bg-gray-200"
          style={{
            left: `${depth * 24 - 12}px`,
            height: isLast && !hasReplies ? "24px" : "100%",
          }}
        />
      )}

      {/* Horizontal connector */}
      {depth > 0 && (
        <div
          className="absolute top-6 h-0.5 bg-gray-200"
          style={{
            left: `${depth * 24 - 12}px`,
            width: "12px",
          }}
        />
      )}

      <div style={{ marginLeft: `${depth * 24}px` }}>
        <ReplyCard message={node.message} depth={depth} />
      </div>

      {/* Nested replies */}
      {node.replies.map((reply, index) => (
        <ThreadNodeComponent
          key={`${reply.message.txid}-${reply.message.vout}`}
          node={reply}
          depth={depth + 1}
          isLast={index === node.replies.length - 1}
        />
      ))}
    </div>
  );
}

function ReplyCard({ message, depth }: { message: Message; depth: number }) {
  const bgColors = [
    "bg-white",
    "bg-gray-50",
    "bg-orange-50/50",
    "bg-amber-50/50",
    "bg-yellow-50/50",
  ];
  const bgColor = bgColors[Math.min(depth, bgColors.length - 1)];
  const hasReplies = message.reply_count > 0;

  return (
    <article
      className={`${bgColor} border border-gray-200 rounded-lg p-4 mb-2 hover:border-orange-300 transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
            {message.kind_name}
          </span>
          <span className="flex items-center gap-1">
            <Box className="h-3 w-3" />
            {formatBlockHeight(message.block_height)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/compose?parent=${message.txid}&vout=${message.vout}`}
            className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
          >
            Reply
          </Link>
          <Link
            href={`/thread/${message.txid}/${message.vout}`}
            className="text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-2">
        {message.body_text ? (
          <p className="whitespace-pre-wrap break-words">{message.body_text}</p>
        ) : (
          <p className="font-mono text-sm text-gray-500">
            {truncateTxid(message.body_hex, 32)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        {hasReplies ? (
          <Link
            href={`/thread/${message.txid}/${message.vout}`}
            className="flex items-center gap-1 hover:text-orange-500 hover:bg-orange-50 px-2 py-1 -ml-2 rounded transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
          </Link>
        ) : (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {message.reply_count} replies
          </span>
        )}
        <span className="font-mono">{truncateTxid(message.txid)}:{message.vout}</span>
      </div>
    </article>
  );
}
