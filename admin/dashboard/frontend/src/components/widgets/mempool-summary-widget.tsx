"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Layers, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const MEMPOOL_API = "http://localhost:4000/api";

interface MempoolInfo {
  count: number;
  vsize: number;
  total_fee: number;
}

interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

async function fetchMempoolInfo(): Promise<MempoolInfo> {
  const res = await fetch(`${MEMPOOL_API}/mempool`);
  if (!res.ok) throw new Error("Failed to fetch mempool info");
  return res.json();
}

async function fetchFeeEstimates(): Promise<FeeEstimates> {
  const res = await fetch(`${MEMPOOL_API}/v1/fees/recommended`);
  if (!res.ok) throw new Error("Failed to fetch fee estimates");
  return res.json();
}

function formatVsize(vsize: number): string {
  if (vsize < 1000) return `${vsize} vB`;
  if (vsize < 1000000) return `${(vsize / 1000).toFixed(1)} kvB`;
  return `${(vsize / 1000000).toFixed(2)} MvB`;
}

export function MempoolSummaryWidget() {
  const { t } = useTranslation();
  const { data: mempool, isLoading: mempoolLoading } = useQuery({
    queryKey: ["mempool-info"],
    queryFn: fetchMempoolInfo,
    refetchInterval: 10000,
  });

  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ["fee-estimates"],
    queryFn: fetchFeeEstimates,
    refetchInterval: 10000,
  });

  const isLoading = mempoolLoading || feesLoading;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-14">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!mempool || !fees) {
    return (
      <Link href="/?app=explorer-mempool" className="block">
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("widgets.mempool")}</p>
              <p className="text-sm text-muted-foreground">{t("widgets.unavailable")}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/?app=explorer-mempool" className="block">
      <div className="bg-card border border-border rounded-xl p-4 card-hover">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t("widgets.mempool")}</p>
            <p className="text-sm font-medium text-foreground">
              {mempool.count.toLocaleString()} txs • {formatVsize(mempool.vsize)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
          <div className="bg-success/10 rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold text-success">{fees.fastestFee}</p>
            <p className="text-[9px] text-muted-foreground">{t("widgets.fast")}</p>
          </div>
          <div className="bg-warning/10 rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold text-warning">{fees.halfHourFee}</p>
            <p className="text-[9px] text-muted-foreground">30m</p>
          </div>
          <div className="bg-muted rounded-lg py-1.5 px-2">
            <p className="text-sm font-bold text-foreground">{fees.hourFee}</p>
            <p className="text-[9px] text-muted-foreground">1hr</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
