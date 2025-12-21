"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchTransactions, shortenHash, type Transaction } from "@/lib/api";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function RecentTransactions() {
  const { t } = useTranslation();
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm text-error">{t("transactions.loadError")}</p>
      </div>
    );
  }

  const recentTxs = (transactions || []).slice(0, 10);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{t("transactions.recentTransactions")}</h3>
        <Link href="/wallet" className="text-xs text-primary hover:underline">
          {t("transactions.viewAll")}
        </Link>
      </div>

      {recentTxs.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          <p className="text-xs">{t("transactions.noTransactions")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
          {recentTxs.map((tx) => (
            <TransactionRow key={tx.txid} transaction={tx} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ transaction, t }: { transaction: Transaction; t: (key: string) => string }) {
  const isReceive = transaction.category === "receive" || transaction.category === "generate" || transaction.category === "immature";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center",
            isReceive ? "bg-success/10 text-success" : "bg-error/10 text-error"
          )}
        >
          {isReceive ? (
            <ArrowDownLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5" />
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">
            {isReceive ? t("transactions.received") : t("transactions.sent")}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {shortenHash(transaction.txid, 6)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-xs font-medium font-tabular",
            isReceive ? "text-success" : "text-error"
          )}
        >
          {isReceive ? "+" : "-"}{Math.abs(transaction.amount).toFixed(8)} BTC
        </p>
        <p className="text-[10px] text-muted-foreground">
          {transaction.confirmations > 0 ? `${transaction.confirmations} ${t("transactions.confs")}` : t("transactions.pending")}
        </p>
      </div>
    </div>
  );
}
