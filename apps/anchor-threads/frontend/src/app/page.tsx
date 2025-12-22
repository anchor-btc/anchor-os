"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchRoots, fetchStats, type Message } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import { Button, Card, Container, HeroSection, HowItWorks, StatsGrid } from "@AnchorProtocol/ui";
import {
  Loader2,
  Anchor,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  PenLine,
  Search,
  MessagesSquare,
  Reply,
  Blocks,
} from "lucide-react";

export default function Home() {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["roots-infinite"],
    queryFn: ({ pageParam = 1 }) => fetchRoots(pageParam, 10),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: 10000,
  });

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];
  const messages = allMessages.reduce<Message[]>((acc, msg) => {
    const key = `${msg.txid}:${msg.vout}`;
    if (!acc.some((m) => `${m.txid}:${m.vout}` === key)) {
      acc.push(msg);
    }
    return acc;
  }, []);

  const sortedMessages = [...messages].sort((a, b) => {
    const heightA = a.block_height ?? Infinity;
    const heightB = b.block_height ?? Infinity;
    if (heightA === heightB) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return heightB - heightA;
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [handleObserver]);

  const statsItems = [
    {
      icon: MessageSquare,
      value: stats?.total_messages ?? 0,
      label: "Messages",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/20",
    },
    {
      icon: MessagesSquare,
      value: stats?.total_roots ?? 0,
      label: "Threads",
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: Reply,
      value: stats?.total_replies ?? 0,
      label: "Replies",
      color: "text-green-400",
      bgColor: "bg-green-400/20",
    },
    {
      icon: Blocks,
      value: stats?.last_block_height ?? 0,
      label: "Last Block",
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Create Thread",
      description: "Write your message and anchor it permanently to the Bitcoin blockchain.",
    },
    {
      step: "2",
      title: "Share & Discuss",
      description: "Others can reply to your thread, creating a chain of immutable messages.",
    },
    {
      step: "3",
      title: "Verified Forever",
      description: "Every message is timestamped and cryptographically verified on Bitcoin.",
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="Explore Threads on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Discover and create immutable, threaded messages anchored to the Bitcoin blockchain."
        accentColor="cyan"
        actions={[
          { href: "/compose", label: "Create Thread", icon: PenLine, variant: "primary" },
          { href: "/threads", label: "Browse Threads", icon: Search, variant: "secondary" },
        ]}
      />

      {/* How It Works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="cyan"
        columns={{ default: 1, md: 3 }}
      />

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsGrid
          items={statsItems}
          columns={{ default: 2, md: 4 }}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Threads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Recent Threads</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <Button asChild variant="link">
              <Link href="/threads" className="flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedMessages.length > 0 ? (
          <div className="space-y-3">
            {sortedMessages.slice(0, 10).map((message) => (
              <MessageCard key={`${message.txid}-${message.vout}`} message={message} />
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </Container>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-16 bg-secondary/50">
      <Anchor className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-medium text-foreground mb-2">No threads yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Be the first to create a thread on the network.
      </p>
      <Button asChild variant="accent">
        <Link href="/compose" className="flex items-center gap-2">
        <PenLine className="h-4 w-4" />
        Create Thread
      </Link>
      </Button>
    </Card>
  );
}
