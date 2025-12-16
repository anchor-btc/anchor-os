"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchRoots, fetchStats, fetchPopularThreads, type Message, type PopularThread, detectImageMimeType, hexToImageDataUrl } from "@/lib/api";
import { MessageCard } from "@/components/message-card";
import Link from "next/link";
import {
  Loader2,
  Anchor,
  MessageSquare,
  Link2,
  RefreshCw,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Code,
  Users,
  TrendingUp,
  Hash,
  Layers,
  ArrowUpRight,
  Image as ImageIcon,
} from "lucide-react";

// Typewriter effect component - more organic timing
function Typewriter({ words, className }: { words: string[]; className?: string }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    
    // Organic typing speed - varies based on character
    const getTypingDelay = () => {
      const baseDelay = 80;
      const variance = Math.random() * 80; // 0-80ms variance
      return baseDelay + variance;
    };
    
    // Faster deletion
    const getDeletingDelay = () => {
      return 30 + Math.random() * 20;
    };

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < word.length) {
          setCurrentText(word.slice(0, currentText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2500);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(word.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? getDeletingDelay() : getTypingDelay());

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span className={className}>
      {currentText}
      <span className="ml-0.5 inline-block w-0.5 h-6 bg-orange-500 animate-blink" />
    </span>
  );
}

// Animated counter - animates only once
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (hasAnimated.current) {
      setCount(value);
      return;
    }
    hasAnimated.current = true;
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
}

export default function Home() {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  const { data: popularThreads } = useQuery({
    queryKey: ["popular-threads"],
    queryFn: () => fetchPopularThreads(6),
    refetchInterval: 30000,
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
    <div className="space-y-16">
      {/* Hero Section - Centered */}
      <section className="pt-12 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Protocol badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full mb-6">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-orange-700">Bitcoin Metaprotocol</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Immutable threads on{" "}
            <span className="text-orange-500">Bitcoin</span>
          </h1>

          {/* Typewriter subtitle */}
          <div className="text-xl md:text-2xl mb-8 h-10 flex items-center justify-center">
            <span className="text-gray-500">Build </span>
            <Typewriter 
              words={["social graphs", "permanent conversations", "censorship-resistant apps", "decentralized protocols", "on-chain identities"]}
              className="text-orange-500 font-semibold ml-2"
            />
          </div>

          {/* Description */}
          <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
            A minimalist protocol for chaining messages on Bitcoin. 
            Just 9 bytes per anchor. No tokens, no fees, no gatekeepers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Link
              href="/compose"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
              <MessageSquare className="h-4 w-4" />
              Create Message
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Read Docs
            </Link>
          </div>

          {/* Stats Row - Centered */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-100">
              <StatItem
                value={<AnimatedCounter value={stats.total_messages} />}
                label="Messages"
              />
              <StatItem
                value={<AnimatedCounter value={stats.total_roots} />}
                label="Threads"
              />
              <StatItem
                value={<AnimatedCounter value={stats.total_replies} />}
                label="Replies"
              />
              <StatItem
                value={<AnimatedCounter value={stats.last_block_height} />}
                label="Last Block"
              />
            </div>
          )}
        </div>
      </section>

      {/* Features - Why ANCHOR - With better styling */}
      <section className="py-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Why ANCHOR?</h2>
          <p className="text-gray-500">A minimalist metaprotocol for Bitcoin</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Immutable"
            description="Anchored to Bitcoin forever. No censorship, no deletion."
            color="orange"
          />
          <FeatureCard
            icon={<Link2 className="h-5 w-5" />}
            title="Threaded"
            description="Cryptographic references chain conversations."
            color="blue"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Minimal"
            description="Just 9 bytes per anchor. Elegant and efficient."
            color="yellow"
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5" />}
            title="Open"
            description="MIT licensed. Build freely, no gatekeepers."
            color="green"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid md:grid-cols-3 gap-4">
        <QuickAction
          href="/developers"
          icon={<Code className="h-5 w-5" />}
          label="SDKs & API"
          description="Rust and TypeScript"
        />
        <QuickAction
          href="/stats"
          icon={<Layers className="h-5 w-5" />}
          label="Network Stats"
          description="Analytics & metrics"
        />
        <QuickAction
          href="https://github.com/AnchorProtocol/anchor"
          icon={<ArrowUpRight className="h-5 w-5" />}
          label="Source Code"
          description="GitHub repository"
          external
        />
      </section>

      {/* Popular Threads */}
      {popularThreads && popularThreads.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">Popular Threads</h2>
            </div>
            <Link
              href="/threads"
              className="text-sm text-gray-500 hover:text-orange-500 transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularThreads.slice(0, 6).map((thread) => (
              <ThreadCard key={`${thread.txid}-${thread.vout}`} thread={thread} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Threads */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Threads</h2>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sortedMessages.length > 0 ? (
          <div className="space-y-3">
            {sortedMessages.slice(0, 5).map((message) => (
              <MessageCard key={`${message.txid}-${message.vout}`} message={message} />
            ))}

            {sortedMessages.length > 5 && (
              <Link
                href="/threads"
                className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 hover:text-orange-500 transition-colors"
              >
                View all threads
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      {/* Community Section - Fixed width */}
      <section className="bg-gray-900 rounded-2xl p-8 md:p-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full mb-6">
            <Users className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium text-white/70">Community</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Join the conversation
          </h2>
          <p className="text-gray-400 mb-8">
            Connect with developers building on ANCHOR. Get help, share ideas, 
            and stay updated on protocol development.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://discord.gg/anchorprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] text-white rounded-lg font-medium hover:bg-[#4752C4] transition-colors"
            >
              <DiscordIcon className="h-5 w-5" />
              Discord
            </a>
            <a
              href="https://github.com/AnchorProtocol/anchor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              <GithubIcon className="h-5 w-5" />
              GitHub
            </a>
            <a
              href="https://twitter.com/AnchorProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              <XIcon className="h-5 w-5" />
              Twitter
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-8">
        <p className="text-gray-500 mb-6">
          Ready to anchor your first message to Bitcoin?
        </p>
        <Link
          href="/compose"
          className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
        >
          <Anchor className="h-5 w-5" />
          Create Message
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

// Stat item component - Bigger numbers, centered
function StatItem({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// Feature card component - With color variants
function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "orange" | "blue" | "yellow" | "green";
}) {
  const colorClasses = {
    orange: "bg-orange-50 border-orange-100 hover:border-orange-200 text-orange-600",
    blue: "bg-blue-50 border-blue-100 hover:border-blue-200 text-blue-600",
    yellow: "bg-amber-50 border-amber-100 hover:border-amber-200 text-amber-600",
    green: "bg-emerald-50 border-emerald-100 hover:border-emerald-200 text-emerald-600",
  };

  const iconBgClasses = {
    orange: "bg-orange-100",
    blue: "bg-blue-100",
    yellow: "bg-amber-100",
    green: "bg-emerald-100",
  };

  return (
    <div className={`p-5 rounded-xl border transition-all ${colorClasses[color]}`}>
      <div className={`w-10 h-10 rounded-lg ${iconBgClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Quick action component
function QuickAction({
  href,
  icon,
  label,
  description,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  external?: boolean;
}) {
  const Component = external ? "a" : Link;
  const props = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };

  return (
    <Component
      {...props}
      className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
    </Component>
  );
}

// Thread card component
function ThreadCard({ thread }: { thread: PopularThread }) {
  const isImage = thread.kind === 4 || thread.kind_name === "Image" || detectImageMimeType(thread.body_hex) !== null;
  const imageDataUrl = isImage ? hexToImageDataUrl(thread.body_hex) : null;

  return (
    <Link
      href={`/thread/${thread.txid}/${thread.vout}`}
      className="group block p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
          <Hash className="h-3 w-3" />
          {thread.total_thread_messages}
        </span>
        <span className="text-xs text-gray-400">
          Block {thread.block_height?.toLocaleString()}
        </span>
      </div>

      {isImage ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
            {imageDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageDataUrl} alt="" className="object-cover w-full h-full" style={{ imageRendering: "pixelated" }} />
            ) : (
              <ImageIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <span className="text-sm text-gray-500">Image</span>
        </div>
      ) : (
        <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900 transition-colors">
          {thread.body_text || `[Binary: ${thread.body_hex.slice(0, 16)}...]`}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2 font-mono">
        {thread.txid.slice(0, 8)}...{thread.txid.slice(-8)}
      </p>
    </Link>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
      <Anchor className="h-10 w-10 text-gray-300 mx-auto mb-4" />
      <h3 className="font-medium text-gray-900 mb-2">No messages yet</h3>
      <p className="text-sm text-gray-500 mb-6">
        Be the first to create an ANCHOR message.
      </p>
      <Link
        href="/compose"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Create Message
      </Link>
    </div>
  );
}

// Icons
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

