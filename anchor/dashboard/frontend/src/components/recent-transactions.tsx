"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, formatBtc, shortenHash, type Transaction } from "@/lib/api";
import { ArrowDownLeft, ArrowUpRight, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function RecentTransactions() {
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-error">Failed to load transactions</p>
      </div>
    );
  }

  const recentTxs = (transactions || []).slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        <Link
          href="/wallet"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {recentTxs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recentTxs.map((tx) => (
            <TransactionRow key={tx.txid} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isReceive = transaction.category === "receive" || transaction.category === "generate" || transaction.category === "immature";
  const isConfirmed = transaction.confirmations > 0;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isReceive ? "bg-success/10 text-success" : "bg-error/10 text-error"
          )}
        >
          {isReceive ? (
            <ArrowDownLeft className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isReceive ? "Received" : "Sent"}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {shortenHash(transaction.txid, 6)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-medium font-tabular",
            isReceive ? "text-success" : "text-error"
          )}
        >
          {isReceive ? "+" : "-"}{Math.abs(transaction.amount).toFixed(8)} BTC
        </p>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {isConfirmed ? (
            <span>{transaction.confirmations} confs</span>
          ) : (
            <span className="text-warning">Pending</span>
          )}
        </div>
      </div>
    </div>
  );
}

