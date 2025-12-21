"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchWalletBalance, formatNumber } from "@/lib/api";
import { Bitcoin, Blocks, BookOpen, Palette, Wallet, Zap } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 10000,
  });

  const { data: balance } = useQuery({
    queryKey: ["balance"],
    queryFn: fetchWalletBalance,
    refetchInterval: 30000,
  });

  return (
    <header className="bg-secondary/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-bitcoin rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-primary/50 transition-shadow">
                <Palette size={24} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                <Bitcoin size={10} className="text-black" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Anchor<span className="text-primary">Canvas</span>
              </h1>
              <p className="text-xs text-gray-500">Bitcoin Canvas</p>
            </div>
          </Link>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Palette size={16} className="text-primary" />
              <span className="text-gray-400">Painted:</span>
              <span className="font-mono text-white">
                {formatNumber(stats?.total_pixels_painted || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap size={16} className="text-accent" />
              <span className="text-gray-400">Transactions:</span>
              <span className="font-mono text-white">
                {formatNumber(stats?.total_transactions || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Blocks size={16} className="text-bitcoin" />
              <span className="text-gray-400">Block:</span>
              <span className="font-mono text-white">
                #{stats?.last_block_height?.toLocaleString() || "—"}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Docs Link */}
            <Link
              href="/docs"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
              title="Protocol Documentation"
            >
              <BookOpen size={18} className="text-primary" />
              <span className="text-sm text-gray-300 hidden sm:inline">Docs</span>
            </Link>
            
            {/* Wallet */}
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-4 py-2">
              <Wallet size={18} className="text-bitcoin" />
              <div className="text-sm">
                <span className="text-gray-400">Balance:</span>{" "}
                <span className="font-mono text-white">
                  {balance ? balance.total.toFixed(4) : "—"} BTC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

