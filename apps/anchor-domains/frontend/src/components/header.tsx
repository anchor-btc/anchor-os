"use client";

import Link from "next/link";
import { Globe, Search, PlusCircle, FileText, Wallet, User, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWalletBalance, formatSats } from "@/lib/api";

export function Header() {
  const { data: balance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: getWalletBalance,
    refetchInterval: 10000,
  });

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Globe className="h-8 w-8 text-bitcoin-orange" />
            <span className="text-2xl font-bold text-white">
              Anchor<span className="text-bitcoin-orange">Domains</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Register</span>
            </Link>
            <Link
              href="/domains"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Browse</span>
            </Link>
            <Link
              href="/my-domains"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              <span>My Domains</span>
            </Link>
            <a
              href="http://localhost:3900/kinds/dns.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Docs</span>
            </a>
          </nav>

          {/* Wallet Balance */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg">
            <Wallet className="h-4 w-4 text-bitcoin-orange" />
            <span className="text-white font-mono text-sm">
              {balance ? formatSats(balance.total) : "Loading..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
