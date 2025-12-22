"use client";

import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchWalletInfo, fetchMessagesByAddress, type Message } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import { Button, Card, Container } from "@AnchorProtocol/ui";
import Link from "next/link";
import {
  Loader2,
  User,
  MessageSquare,
  Reply,
  Wallet,
  RefreshCw,
  PenLine,
} from "lucide-react";

type TabType = "threads" | "replies";

export default function MyThreadsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("threads");

  // Fetch wallet info
  const { 
    data: walletInfo, 
    isLoading: isLoadingWallet,
    error: walletError,
    refetch: refetchWallet 
  } = useQuery({
    queryKey: ["wallet-info"],
    queryFn: fetchWalletInfo,
    retry: 1,
  });

  // Fetch messages by address
  const {
    data,
    isLoading: isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchMessages,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["my-messages", walletInfo?.address],
    queryFn: ({ pageParam = 1 }) => 
      fetchMessagesByAddress(walletInfo!.address, pageParam, 20),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!walletInfo?.address,
  });

  // Flatten and filter messages
  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  
  // Filter based on active tab
  const filteredMessages = allMessages.filter((msg) => {
    if (activeTab === "threads") {
      // Root messages (no anchors or first in chain)
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

  // Loading state
  if (isLoadingWallet) {
    return (
      <Container className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Connecting to wallet...</p>
      </Container>
    );
  }

  // Wallet not connected
  if (walletError || !walletInfo) {
    return (
      <Container className="text-center py-16">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Wallet Not Connected</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Connect your wallet to view your threads and replies. Make sure the Anchor Wallet service is running.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => refetchWallet()}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="accent">
            <Link href="/compose" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Create Thread
          </Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <User className="h-6 w-6 text-primary" />
            My Threads
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {walletInfo.address.slice(0, 12)}...{walletInfo.address.slice(-8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchMessages()}
            disabled={isRefetching}
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
          My Threads
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
          My Replies
        </button>
      </div>

      {/* Content */}
      {isLoadingMessages ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedMessages.length > 0 ? (
        <div className="space-y-3">
          {sortedMessages.map((message) => (
            <MessageCard key={`${message.txid}-${message.vout}`} message={message} />
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="py-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                loading={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState type={activeTab} />
      )}
    </Container>
  );
}

function EmptyState({ type }: { type: TabType }) {
  return (
    <Card className="text-center py-16 bg-secondary/50">
      {type === "threads" ? (
        <>
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No threads yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven&apos;t created any threads. Start a new conversation!
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
          <h3 className="font-medium text-foreground mb-2">No replies yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven&apos;t replied to any threads. Join a conversation!
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
