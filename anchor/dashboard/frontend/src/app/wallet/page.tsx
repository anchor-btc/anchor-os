"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWalletBalance,
  fetchNewAddress,
  fetchUtxos,
  fetchTransactions,
  formatBtc,
  shortenHash,
  type Utxo,
  type Transaction,
} from "@/lib/api";
import {
  Wallet,
  Loader2,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  QrCode,
  Clock,
  Hash,
  Coins,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

type Tab = "transactions" | "utxos" | "receive";
const UTXOS_PER_PAGE = 50;

export default function WalletPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [copied, setCopied] = useState(false);
  const [utxoPage, setUtxoPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchWalletBalance,
    refetchInterval: 5000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    refetchInterval: 10000,
  });

  const { data: utxos, isLoading: utxosLoading } = useQuery({
    queryKey: ["utxos"],
    queryFn: fetchUtxos,
    refetchInterval: 10000,
  });

  const addressMutation = useMutation({
    mutationFn: fetchNewAddress,
  });

  const handleGenerateAddress = () => {
    addressMutation.mutate();
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Balance is already in BTC
  const totalBtc = balance ? balance.total : 0;

  const tabLabels: Record<Tab, string> = {
    transactions: t("wallet.transactions"),
    utxos: t("wallet.utxos"),
    receive: t("wallet.receive"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("wallet.title")}</h1>
        <p className="text-muted-foreground">{t("wallet.subtitle")}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("wallet.totalBalance")}</p>
            {balanceLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-tabular text-foreground">
                  {totalBtc.toFixed(8)}
                </span>
                <span className="text-xl text-muted-foreground">{t("units.btc")}</span>
              </div>
            )}
          </div>
        </div>

        {balance && (
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
            <BalanceItem
              label={t("wallet.confirmed")}
              value={formatBtc(balance.confirmed)}
              color="success"
              t={t}
            />
            <BalanceItem
              label={t("wallet.unconfirmed")}
              value={formatBtc(balance.unconfirmed)}
              color="warning"
              t={t}
            />
            <BalanceItem
              label={t("wallet.immature")}
              value={formatBtc(balance.immature || 0)}
              color="muted"
              t={t}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["transactions", "utxos", "receive"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{t("wallet.transactionHistory")}</h2>
          </div>
          {txLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>{t("wallet.noTransactions")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-auto">
              {transactions.map((tx, i) => (
                <TransactionRow key={`${tx.txid}-${i}`} transaction={tx} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "utxos" && (
        <UtxosSection
          utxos={utxos}
          isLoading={utxosLoading}
          page={utxoPage}
          setPage={setUtxoPage}
          t={t}
        />
      )}

      {activeTab === "receive" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">{t("wallet.receiveBitcoin")}</h2>

          {!addressMutation.data ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("wallet.generateToReceive")}</p>
              <button
                onClick={handleGenerateAddress}
                disabled={addressMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {addressMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t("wallet.generateAddress")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG
                  value={`bitcoin:${addressMutation.data.address}`}
                  size={200}
                  level="H"
                />
              </div>

              <div className="w-full max-w-md">
                <label className="text-sm text-muted-foreground block mb-2">
                  {t("wallet.bitcoinAddress")}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono text-foreground break-all">
                    {addressMutation.data.address}
                  </code>
                  <button
                    onClick={() => handleCopy(addressMutation.data!.address)}
                    className="p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateAddress}
                disabled={addressMutation.isPending}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("wallet.generateNewAddress")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BalanceItem({
  label,
  value,
  color,
  t,
}: {
  label: string;
  value: string;
  color: "success" | "warning" | "muted";
  t: (key: string) => string;
}) {
  const colorClasses = {
    success: "text-success",
    warning: "text-warning",
    muted: "text-muted-foreground",
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-medium font-tabular", colorClasses[color])}>
        {value} {t("units.btc")}
      </p>
    </div>
  );
}

function TransactionRow({
  transaction,
  t,
}: {
  transaction: Transaction;
  t: (key: string) => string;
}) {
  const isReceive =
    transaction.category === "receive" ||
    transaction.category === "generate" ||
    transaction.category === "immature";
  const isConfirmed = transaction.confirmations > 0;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isReceive ? "bg-success/10 text-success" : "bg-error/10 text-error"
          )}
        >
          {isReceive ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground">
            {isReceive ? t("wallet.received") : t("wallet.sent")}
            {transaction.category === "generate" && ` (${t("wallet.mined")})`}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {shortenHash(transaction.txid, 8)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "font-medium font-tabular",
            isReceive ? "text-success" : "text-error"
          )}
        >
          {isReceive ? "+" : "-"}
          {Math.abs(transaction.amount).toFixed(8)} {t("units.btc")}
        </p>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {isConfirmed ? (
            <span>
              {transaction.confirmations} {t("wallet.confirmations").toLowerCase()}
            </span>
          ) : (
            <span className="text-warning">{t("wallet.pending")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function UtxosSection({
  utxos,
  isLoading,
  page,
  setPage,
  t,
}: {
  utxos?: Utxo[];
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  t: (key: string) => string;
}) {
  const totalCount = utxos?.length || 0;
  const totalPages = Math.ceil(totalCount / UTXOS_PER_PAGE);

  const paginatedUtxos = useMemo(() => {
    if (!utxos) return [];
    const start = page * UTXOS_PER_PAGE;
    return utxos.slice(start, start + UTXOS_PER_PAGE);
  }, [utxos, page]);

  const startItem = page * UTXOS_PER_PAGE + 1;
  const endItem = Math.min((page + 1) * UTXOS_PER_PAGE, totalCount);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">{t("wallet.unspentOutputs")}</h2>
        <span className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} {t("wallet.utxos")}
        </span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !utxos || utxos.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>{t("wallet.noUtxos")}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border max-h-[500px] overflow-auto">
            {paginatedUtxos.map((utxo) => (
              <UtxoRow key={`${utxo.txid}:${utxo.vout}`} utxo={utxo} t={t} />
            ))}
          </div>
          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("wallet.showing")} {startItem.toLocaleString()}-{endItem.toLocaleString()}{" "}
              {t("wallet.of")} {totalCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-2">
                {t("wallet.page")} {page + 1} {t("wallet.of")} {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UtxoRow({ utxo, t }: { utxo: Utxo; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Coins className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-mono text-foreground">
            {shortenHash(utxo.txid, 8)}:{utxo.vout}
          </p>
          {utxo.address && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {utxo.address}
            </p>
          )}
        </div>
      </div>

      <div className="text-right">
        <p className="font-medium font-tabular text-foreground">
          {utxo.amount.toFixed(8)} {t("units.btc")}
        </p>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Hash className="w-3 h-3" />
          <span>
            {utxo.confirmations} {t("wallet.confs")}
          </span>
        </div>
      </div>
    </div>
  );
}
