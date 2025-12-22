"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWalletBalance,
  fetchNewAddress,
  fetchUtxos,
  fetchTransactions,
  fetchAssets,
  fetchLockedUtxos,
  fetchLockSettings,
  lockUtxos,
  unlockUtxos,
  syncLocks,
  setAutoLock,
  formatBtc,
  shortenHash,
  type Utxo,
  type Transaction,
  type AssetsOverview,
  type LockedUtxo,
  type LockSettings,
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
  Lock,
  Unlock,
  Globe,
  Gem,
  Shield,
  ShieldCheck,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

type Tab = "transactions" | "utxos" | "assets" | "locks" | "receive";
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

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["wallet-assets"],
    queryFn: fetchAssets,
    refetchInterval: 15000,
  });

  const { data: lockedUtxos, isLoading: lockedLoading } = useQuery({
    queryKey: ["locked-utxos"],
    queryFn: fetchLockedUtxos,
    refetchInterval: 10000,
  });

  const { data: lockSettings } = useQuery({
    queryKey: ["lock-settings"],
    queryFn: fetchLockSettings,
    refetchInterval: 10000,
  });

  const addressMutation = useMutation({
    mutationFn: fetchNewAddress,
  });

  const lockMutation = useMutation({
    mutationFn: (utxos: { txid: string; vout: number }[]) => lockUtxos(utxos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locked-utxos"] });
      queryClient.invalidateQueries({ queryKey: ["lock-settings"] });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (utxos: { txid: string; vout: number }[]) => unlockUtxos(utxos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locked-utxos"] });
      queryClient.invalidateQueries({ queryKey: ["lock-settings"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncLocks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locked-utxos"] });
      queryClient.invalidateQueries({ queryKey: ["lock-settings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-assets"] });
    },
  });

  const autoLockMutation = useMutation({
    mutationFn: (enabled: boolean) => setAutoLock(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lock-settings"] });
    },
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
    assets: t("wallet.assets") || "Assets",
    locks: t("wallet.locks") || "Locks",
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
        {(["transactions", "utxos", "assets", "locks", "receive"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "assets" && <Gem className="w-4 h-4" />}
            {tab === "locks" && <Lock className="w-4 h-4" />}
            {tabLabels[tab]}
            {tab === "locks" && lockSettings && lockSettings.total_locked > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                {lockSettings.total_locked}
              </span>
            )}
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
          lockedUtxos={lockedUtxos || []}
          onLock={(txid, vout) => lockMutation.mutate([{ txid, vout }])}
          onUnlock={(txid, vout) => unlockMutation.mutate([{ txid, vout }])}
          t={t}
        />
      )}

      {activeTab === "assets" && (
        <AssetsSection assets={assets} isLoading={assetsLoading} t={t} />
      )}

      {activeTab === "locks" && (
        <LocksSection
          lockedUtxos={lockedUtxos}
          lockSettings={lockSettings}
          isLoading={lockedLoading}
          onUnlock={(txid, vout) => unlockMutation.mutate([{ txid, vout }])}
          onSync={() => syncMutation.mutate()}
          onToggleAutoLock={(enabled) => autoLockMutation.mutate(enabled)}
          isSyncing={syncMutation.isPending}
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
  lockedUtxos,
  onLock,
  onUnlock,
  t,
}: {
  utxos?: Utxo[];
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  lockedUtxos: LockedUtxo[];
  onLock: (txid: string, vout: number) => void;
  onUnlock: (txid: string, vout: number) => void;
  t: (key: string) => string;
}) {
  const totalCount = utxos?.length || 0;
  const totalPages = Math.ceil(totalCount / UTXOS_PER_PAGE);

  const lockedSet = useMemo(() => {
    const set = new Set<string>();
    lockedUtxos.forEach((u) => set.add(`${u.txid}:${u.vout}`));
    return set;
  }, [lockedUtxos]);

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
              <UtxoRow
                key={`${utxo.txid}:${utxo.vout}`}
                utxo={utxo}
                isLocked={lockedSet.has(`${utxo.txid}:${utxo.vout}`)}
                onLock={() => onLock(utxo.txid, utxo.vout)}
                onUnlock={() => onUnlock(utxo.txid, utxo.vout)}
                t={t}
              />
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

function UtxoRow({
  utxo,
  isLocked,
  onLock,
  onUnlock,
  t,
}: {
  utxo: Utxo;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
      isLocked && "bg-primary/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isLocked ? "bg-warning/10" : "bg-primary/10"
        )}>
          {isLocked ? (
            <Lock className="w-5 h-5 text-warning" />
          ) : (
            <Coins className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-foreground">
              {shortenHash(utxo.txid, 8)}:{utxo.vout}
            </p>
            {isLocked && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-warning/20 text-warning rounded">
                LOCKED
              </span>
            )}
          </div>
          {utxo.address && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {utxo.address}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
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
        <button
          onClick={isLocked ? onUnlock : onLock}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isLocked
              ? "bg-warning/10 hover:bg-warning/20 text-warning"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          title={isLocked ? "Unlock UTXO" : "Lock UTXO"}
        >
          {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// Assets Section Component
function AssetsSection({
  assets,
  isLoading,
  t,
}: {
  assets?: AssetsOverview;
  isLoading: boolean;
  t: (key: string) => string;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assets || (assets.domains.length === 0 && assets.tokens.length === 0)) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <Gem className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No assets found in your wallet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Register domains or mint tokens to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Domains</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{assets.total_domains}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Gem className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Token Types</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{assets.total_token_types}</p>
        </div>
      </div>

      {/* Domains */}
      {assets.domains.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domains ({assets.domains.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {assets.domains.map((domain) => (
              <div
                key={domain.name}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    domain.is_locked ? "bg-success/10" : "bg-primary/10"
                  )}>
                    {domain.is_locked ? (
                      <ShieldCheck className="w-5 h-5 text-success" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{domain.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {domain.record_count} records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {domain.is_locked && (
                    <span className="px-2 py-1 text-xs bg-success/10 text-success rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Protected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tokens */}
      {assets.tokens.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Tokens ({assets.tokens.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {assets.tokens.map((token) => (
              <div
                key={token.ticker}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    token.is_locked ? "bg-success/10" : "bg-primary/10"
                  )}>
                    {token.is_locked ? (
                      <ShieldCheck className="w-5 h-5 text-success" />
                    ) : (
                      <Gem className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{token.ticker}</p>
                    <p className="text-xs text-muted-foreground">
                      {token.utxo_count} UTXOs
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium font-tabular text-foreground">{token.balance}</p>
                  {token.is_locked && (
                    <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded-full">
                      Protected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Locks Section Component
function LocksSection({
  lockedUtxos,
  lockSettings,
  isLoading,
  onUnlock,
  onSync,
  onToggleAutoLock,
  isSyncing,
  t,
}: {
  lockedUtxos?: LockedUtxo[];
  lockSettings?: LockSettings;
  isLoading: boolean;
  onUnlock: (txid: string, vout: number) => void;
  onSync: () => void;
  onToggleAutoLock: (enabled: boolean) => void;
  isSyncing: boolean;
  t: (key: string) => string;
}) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lock Settings Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">UTXO Lock Protection</h2>
              <p className="text-sm text-muted-foreground">
                Prevent accidental spending of ownership UTXOs
              </p>
            </div>
          </div>
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4" />
            )}
            Sync Locks
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Locked</p>
            <p className="text-2xl font-bold text-primary">
              {lockSettings?.total_locked || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Auto-Lock</p>
            <button
              onClick={() => onToggleAutoLock(!lockSettings?.auto_lock_enabled)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                lockSettings?.auto_lock_enabled
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lockSettings?.auto_lock_enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
            <p className="text-sm text-foreground">
              {lockSettings?.last_sync
                ? new Date(lockSettings.last_sync).toLocaleString()
                : "Never"}
            </p>
          </div>
        </div>
      </div>

      {/* Locked UTXOs List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Locked UTXOs
          </h2>
          <span className="text-sm text-muted-foreground">
            {lockedUtxos?.length || 0} locked
          </span>
        </div>
        {!lockedUtxos || lockedUtxos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No locked UTXOs</p>
            <p className="text-sm mt-2">
              Click "Sync Locks" to automatically detect ownership UTXOs
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-auto">
            {lockedUtxos.map((utxo) => (
              <div
                key={`${utxo.txid}:${utxo.vout}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-foreground">
                      {shortenHash(utxo.txid, 8)}:{utxo.vout}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{utxo.reason}</span>
                      {utxo.asset_id && utxo.asset_type === "domain" ? (
                        <a
                          href={`/?app=app-domains&url=${encodeURIComponent(`http://localhost:3400/domain/${utxo.asset_id}/manage`)}`}
                          className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                        >
                          • {utxo.asset_id}
                        </a>
                      ) : utxo.asset_id ? (
                        <span className="text-primary">• {utxo.asset_id}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onUnlock(utxo.txid, utxo.vout)}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  title="Unlock UTXO"
                >
                  <Unlock className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
