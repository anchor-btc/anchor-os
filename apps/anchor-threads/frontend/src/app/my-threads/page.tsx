"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  getMyMessageRefs, 
  fetchMyMessages,
  clearMyMessageRefs,
  type Message 
} from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import { Button, Card, Container } from "@AnchorProtocol/ui";
import Link from "next/link";
import {
  Loader2,
  User,
  MessageSquare,
  Reply,
  RefreshCw,
  PenLine,
  Trash2,
} from "lucide-react";

type TabType = "threads" | "replies";

export default function MyThreadsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("threads");

  // Get message refs from localStorage
  const messageRefs = useMemo(() => getMyMessageRefs(), []);

  // Fetch actual messages from the refs
  const {
    data: messages,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-messages", messageRefs.map(r => `${r.txid}:${r.vout}`).join(",")],
    queryFn: () => fetchMyMessages(messageRefs),
    enabled: messageRefs.length > 0,
  });

  // Filter based on active tab
  const filteredMessages = (messages ?? []).filter((msg) => {
    if (activeTab === "threads") {
      // Root messages (no anchors)
      return msg.anchors.length === 0;
    } else {
      // Replies (has anchors)
      return msg.anchors.length > 0;
    }
  });

  // Sort by newest first
  const sortedMessages = [...filteredMessages].sort((a, b) => {
    const heightA = a.block_height ?? Infinity;
    const heightB = b.block_height ?? Infinity;
    if (heightA === heightB) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return heightB - heightA;
  });

  // Handle clear history
  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your message history? This cannot be undone.")) {
      clearMyMessageRefs();
      window.location.reload();
    }
  };

  // Count threads and replies
  const threadCount = (messages ?? []).filter(m => m.anchors.length === 0).length;
  const replyCount = (messages ?? []).filter(m => m.anchors.length > 0).length;

  return (
    <Container className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <User className="h-6 w-6 text-primary" />
            My Threads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {messageRefs.length} message{messageRefs.length !== 1 ? "s" : ""} saved locally
          </p>
        </div>
        <div className="flex items-center gap-3">
          {messageRefs.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              title="Clear history"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching || messageRefs.length === 0}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild variant="accent">
            <Link href="/compose" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              New Thread
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("threads")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "threads"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          My Threads ({threadCount})
        </button>
        <button
          onClick={() => setActiveTab("replies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "replies"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Reply className="h-4 w-4" />
          My Replies ({replyCount})
        </button>
      </div>

      {/* Content */}
      {messageRefs.length === 0 ? (
        <EmptyState type={activeTab} isNew />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedMessages.length > 0 ? (
        <div className="space-y-3">
          {sortedMessages.map((message) => (
            <MessageCard key={`${message.txid}-${message.vout}`} message={message} />
          ))}
        </div>
      ) : (
        <EmptyState type={activeTab} />
      )}
    </Container>
  );
}

function EmptyState({ type, isNew = false }: { type: TabType; isNew?: boolean }) {
  if (isNew) {
    return (
      <Card className="text-center py-16 bg-secondary/50">
        <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Messages you create will appear here. Your history is stored locally in this browser.
        </p>
        <Button asChild variant="accent">
          <Link href="/compose" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Create Your First Thread
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="text-center py-16 bg-secondary/50">
      {type === "threads" ? (
        <>
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No threads in this tab</h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven&apos;t created any root threads yet.
          </p>
          <Button asChild variant="accent">
            <Link href="/compose" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Create Thread
            </Link>
          </Button>
        </>
      ) : (
        <>
          <Reply className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No replies in this tab</h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven&apos;t replied to any threads yet.
          </p>
          <Button asChild variant="default">
            <Link href="/threads" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Browse Threads
            </Link>
          </Button>
        </>
      )}
    </Card>
  );
}
