"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWalletBalance, formatBtc } from "@/lib/api";
import { Wallet, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";

export function WalletWidget() {
  const { data: balance, isLoading, error } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchWalletBalance,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 card-hover">
        <div className="flex items-center gap-3 text-error">
          <Wallet className="w-5 h-5" />
          <span className="text-sm">Wallet unavailable</span>
        </div>
      </div>
    );
  }

  // Balance is already in BTC
  const totalBtc = balance.total;

  return (
    <Link href="/wallet" className="block">
      <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-6 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-xs text-success">Available</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-tabular text-foreground">
              {totalBtc.toFixed(4)}
            </span>
            <span className="text-lg text-muted-foreground">BTC</span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-sm font-medium font-tabular text-success">
                {formatBtc(balance.confirmed)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unconfirmed</p>
              <p className="text-sm font-medium font-tabular text-warning">
                {formatBtc(balance.unconfirmed)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Immature</p>
              <p className="text-sm font-medium font-tabular text-muted-foreground">
                {formatBtc(balance.immature || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

