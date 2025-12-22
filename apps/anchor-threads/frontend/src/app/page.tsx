"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchRoots, fetchStats, type Message } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import { Button, Card, Container } from "@AnchorProtocol/ui";
import Link from "next/link";
import {
  Loader2,
  Anchor,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  PenLine,
} from "lucide-react";

export default function Home() {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
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

  return (
    <Container className="space-y-8">
      {/* Hero Section - Simple */}
      <section className="text-center py-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
          Explore Threads on <span className="text-primary">Bitcoin</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
          Discover and create immutable, threaded messages anchored to the Bitcoin blockchain.
        </p>
        <Button asChild variant="accent" size="lg">
          <Link href="/compose" className="flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          Create Thread
        </Link>
        </Button>
      </section>

      {/* Stats Row */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Messages" value={stats.total_messages} />
          <StatCard label="Threads" value={stats.total_roots} />
          <StatCard label="Replies" value={stats.total_replies} />
          <StatCard label="Last Block" value={stats.last_block_height} />
        </section>
      )}

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
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
