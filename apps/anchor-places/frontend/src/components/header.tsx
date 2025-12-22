"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Bitcoin, Activity, BookOpen, User } from "lucide-react";
import { fetchStats, fetchWalletBalance, formatNumber } from "@/lib/api";

export function Header() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  const { data: balance } = useQuery({
    queryKey: ["balance"],
    queryFn: fetchWalletBalance,
    refetchInterval: 10000,
  });

  return (
    <header className="h-16 bg-secondary/80 backdrop-blur-sm border-b border-map-border flex items-center px-6 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-xl text-foreground tracking-wide">
            Anchor Places
          </h1>
          <p className="text-xs text-secondary-foreground">
            Pin on Bitcoin
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 ml-auto">
        {stats && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">
                {formatNumber(stats.total_markers)}
              </span>
              <span className="text-secondary-foreground">markers</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-foreground font-medium">
                {formatNumber(stats.total_replies)}
              </span>
              <span className="text-secondary-foreground">replies</span>
            </div>
            {stats.last_block_height && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-secondary-foreground">Block</span>
                <span className="text-foreground font-mono">
                  #{stats.last_block_height}
                </span>
              </div>
            )}
          </>
        )}

        {/* My Places Link */}
        <Link
          href="/my-places"
          className="flex items-center gap-2 px-3 py-1.5 text-secondary-foreground hover:text-primary transition-colors"
        >
          <User className="w-4 h-4" />
          <span className="text-sm hidden md:inline">My Places</span>
        </Link>

        {/* Docs Link */}
        <Link
          href="/docs"
          className="flex items-center gap-2 px-3 py-1.5 text-secondary-foreground hover:text-primary transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-sm hidden md:inline">Docs</span>
        </Link>

        {/* Wallet Balance */}
        {balance && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bitcoin/10 rounded-lg border border-bitcoin/20">
            <Bitcoin className="w-4 h-4 text-bitcoin" />
            <span className="text-bitcoin font-mono text-sm">
              {formatNumber(balance.total)} sats
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

