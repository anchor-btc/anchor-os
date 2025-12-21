"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchWalletBalance, formatNumber } from "@/lib/api";
import { BookOpen, Palette, Wallet, Grid3X3, Zap, Box } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  
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
    <header className="h-14 bg-[#0a0a0a] border-b border-white/[0.08] flex items-center px-4 gap-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Palette size={18} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-white tracking-tight">
          Anchor <span className="text-orange-500">Canvas</span>
        </span>
      </Link>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Stats - Compact pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Grid3X3 size={13} className="text-orange-500" />
          <span className="text-xs font-medium text-white/80 font-mono">
            {formatNumber(stats?.total_pixels_painted || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Zap size={13} className="text-cyan-400" />
          <span className="text-xs font-medium text-white/80 font-mono">
            {formatNumber(stats?.total_transactions || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Box size={13} className="text-amber-500" />
          <span className="text-xs font-medium text-white/80 font-mono">
            #{stats?.last_block_height?.toLocaleString() || "—"}
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        <Link
          href="/my-pixels"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            pathname === "/my-pixels"
              ? "bg-orange-500/15 text-orange-500"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Palette size={16} />
          <span>My Pixels</span>
        </Link>
        <a
          href={process.env.NEXT_PUBLIC_DOCS_URL ? `${process.env.NEXT_PUBLIC_DOCS_URL}/kinds/state.html` : "http://localhost:3900/kinds/state.html"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <BookOpen size={16} />
          <span>Docs</span>
        </a>
      </nav>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Wallet */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        <Wallet size={16} className="text-amber-500" />
        <span className="text-sm font-mono text-white/90">
          {balance ? balance.total.toFixed(4) : "—"}
        </span>
        <span className="text-xs text-white/40">BTC</span>
      </div>
    </header>
  );
}
