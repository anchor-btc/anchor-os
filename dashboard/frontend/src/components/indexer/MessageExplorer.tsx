"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Copy,
  ExternalLink,
  MessageSquare,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchIndexerMessages,
  fetchMessageDetail,
  MessageListItem,
  MessageDetail,
  MessageQuery,
} from "@/lib/api";

const KINDS = [
  { id: 1, name: "Text" },
  { id: 2, name: "Canvas" },
  { id: 3, name: "Image" },
  { id: 4, name: "Map" },
  { id: 5, name: "DNS" },
  { id: 6, name: "Proof" },
  { id: 10, name: "Token Deploy" },
  { id: 11, name: "Token Mint" },
  { id: 20, name: "Token Transfer" },
];

const CARRIERS = [
  { id: 0, name: "OP_RETURN" },
  { id: 1, name: "Inscription" },
  { id: 2, name: "Stamps" },
  { id: 3, name: "Taproot Annex" },
  { id: 4, name: "Witness Data" },
];

export function MessageExplorer() {
  const [query, setQuery] = useState<MessageQuery>({ limit: 20, offset: 0 });
  const [selectedMessage, setSelectedMessage] = useState<{ txid: string; vout: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["indexer-messages", query],
    queryFn: () => fetchIndexerMessages(query),
    refetchInterval: 10000,
  });

  const { data: messageDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["indexer-message-detail", selectedMessage],
    queryFn: () => selectedMessage ? fetchMessageDetail(selectedMessage.txid, selectedMessage.vout) : null,
    enabled: !!selectedMessage,
  });

  const handlePageChange = (direction: "prev" | "next") => {
    const limit = query.limit || 20;
    const currentOffset = query.offset || 0;
    const newOffset = direction === "next" ? currentOffset + limit : Math.max(0, currentOffset - limit);
    setQuery({ ...query, offset: newOffset });
  };

  const clearFilters = () => {
    setQuery({ limit: 20, offset: 0 });
  };

  const hasActiveFilters = query.kind !== undefined || query.carrier !== undefined || query.block !== undefined || query.search;

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search in body (hex)..."
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            value={query.search || ""}
            onChange={(e) => setQuery({ ...query, search: e.target.value || undefined, offset: 0 })}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showFilters || hasActiveFilters ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Filter className="w-4 h-4" />
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kind</label>
            <select
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground"
              value={query.kind ?? ""}
              onChange={(e) => setQuery({ ...query, kind: e.target.value ? Number(e.target.value) : undefined, offset: 0 })}
            >
              <option value="">All</option>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Carrier</label>
            <select
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground"
              value={query.carrier ?? ""}
              onChange={(e) => setQuery({ ...query, carrier: e.target.value ? Number(e.target.value) : undefined, offset: 0 })}
            >
              <option value="">All</option>
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Block Height</label>
            <input
              type="number"
              placeholder="Exact block"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground"
              value={query.block ?? ""}
              onChange={(e) => setQuery({ ...query, block: e.target.value ? Number(e.target.value) : undefined, offset: 0 })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sort</label>
            <select
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground"
              value={query.order || "desc"}
              onChange={(e) => setQuery({ ...query, order: e.target.value as "asc" | "desc" })}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Messages Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-400">Failed to load messages</div>
      ) : data?.messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No messages found</p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">TxID</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Block</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Kind</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Carrier</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Size</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Anchors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.messages.map((msg) => (
                  <tr
                    key={`${msg.txid}-${msg.vout}`}
                    onClick={() => setSelectedMessage({ txid: msg.txid, vout: msg.vout })}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {msg.txid.slice(0, 8)}...{msg.txid.slice(-8)}:{msg.vout}
                    </td>
                    <td className="px-4 py-3 text-foreground font-tabular">
                      {msg.block_height?.toLocaleString() ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
                        {msg.kind_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">
                        {msg.carrier_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-tabular">
                      {msg.body_size} B
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-tabular">
                      {msg.anchor_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(query.offset || 0) + 1}-{Math.min((query.offset || 0) + (query.limit || 20), data?.total || 0)} of {data?.total.toLocaleString()} messages
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange("prev")}
                disabled={(query.offset || 0) === 0}
                className="p-2 bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => handlePageChange("next")}
                disabled={!data?.has_more}
                className="p-2 bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageDetailModal
          message={messageDetail}
          isLoading={detailLoading}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}

function MessageDetailModal({
  message,
  isLoading,
  onClose,
}: {
  message: MessageDetail | null | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Message Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : message ? (
            <div className="space-y-4">
              {/* TxID */}
              <div>
                <label className="text-xs text-muted-foreground">Transaction ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono text-foreground overflow-x-auto">
                    {message.txid}:{message.vout}
                  </code>
                  <button
                    onClick={() => copyToClipboard(message.txid, "txid")}
                    className="p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                  >
                    <Copy className={cn("w-4 h-4", copied === "txid" ? "text-green-400" : "text-muted-foreground")} />
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Block Height</label>
                  <p className="text-foreground font-tabular">{message.block_height?.toLocaleString() ?? "Unconfirmed"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Created</label>
                  <p className="text-foreground">{message.created_at}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Kind</label>
                  <p className="text-foreground">{message.kind_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carrier</label>
                  <p className="text-foreground">{message.carrier_name}</p>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="text-xs text-muted-foreground">Body ({message.body_size} bytes)</label>
                {message.body_text ? (
                  <div className="mt-1 p-3 bg-muted rounded text-sm text-foreground whitespace-pre-wrap break-words">
                    {message.body_text}
                  </div>
                ) : (
                  <div className="mt-1 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-x-auto">
                    {message.body_hex}
                  </div>
                )}
              </div>

              {/* Anchors */}
              {message.anchors.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-2">
                    <Link2 className="w-3 h-3" />
                    Anchors ({message.anchors.length})
                  </label>
                  <div className="mt-1 space-y-2">
                    {message.anchors.map((anchor, i) => (
                      <div key={i} className="p-3 bg-muted rounded text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Prefix: <code className="text-foreground">{anchor.txid_prefix}</code></span>
                          <span className="text-muted-foreground">vout: {anchor.vout}</span>
                        </div>
                        {anchor.resolved_txid && (
                          <div className="mt-1 text-green-400">
                            Resolved: {anchor.resolved_txid.slice(0, 16)}...
                          </div>
                        )}
                        {anchor.is_orphan && <span className="text-red-400">Orphan</span>}
                        {anchor.is_ambiguous && <span className="text-yellow-400">Ambiguous</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replies */}
              {message.replies_count > 0 && (
                <div className="text-sm text-muted-foreground">
                  {message.replies_count} {message.replies_count === 1 ? "reply" : "replies"} to this message
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Message not found</div>
          )}
        </div>
      </div>
    </div>
  );
}

