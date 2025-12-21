"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchWalletBalance, formatBtc } from "@/lib/api";
import { Wallet, Loader2 } from "lucide-react";
import Link from "next/link";

export function WalletWidget() {
  const { t } = useTranslation();
  const { data: balance, isLoading, error } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchWalletBalance,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-14">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 text-error">
          <Wallet className="w-4 h-4" />
          <span className="text-sm">{t("walletWidget.unavailable")}</span>
        </div>
      </div>
    );
  }

  const totalBtc = balance.total;

  return (
    <Link href="/wallet" className="block">
      <div className="bg-card border border-border rounded-xl p-4 card-hover">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("walletWidget.balance")}</p>
              <p className="text-lg font-bold font-tabular text-foreground">
                {totalBtc.toFixed(4)} <span className="text-sm font-normal text-muted-foreground">BTC</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">{t("walletWidget.confirmed")}</p>
            <p className="text-xs font-medium font-tabular text-success">
              {formatBtc(balance.confirmed)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t("walletWidget.unconfirmed")}</p>
            <p className="text-xs font-medium font-tabular text-warning">
              {formatBtc(balance.unconfirmed)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t("walletWidget.immature")}</p>
            <p className="text-xs font-medium font-tabular text-muted-foreground">
              {formatBtc(balance.immature || 0)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
