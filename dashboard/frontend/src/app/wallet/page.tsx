"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { UtxoProtocolInfo } from "@/lib/api";

// Session storage key for protocol info cache
const PROTOCOL_CACHE_KEY = "protocolInfoCache";

// Helper to load cache from sessionStorage
function loadCacheFromStorage(): Map<string, UtxoProtocolInfo> {
  if (typeof window === "undefined") return new Map();
  try {
    const stored = sessionStorage.getItem(PROTOCOL_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, UtxoProtocolInfo>;
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn("Failed to load protocol cache from storage:", e);
  }
  return new Map();
}

// Helper to save cache to sessionStorage
function saveCacheToStorage(cache: Map<string, UtxoProtocolInfo>) {
  if (typeof window === "undefined") return;
  try {
    const obj = Object.fromEntries(cache);
    sessionStorage.setItem(PROTOCOL_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn("Failed to save protocol cache to storage:", e);
  }
}

// Global cache for protocol info that persists between navigations
// Initialize from sessionStorage if available
let protocolInfoCache: Map<string, UtxoProtocolInfo> = new Map();
if (typeof window !== "undefined") {
  protocolInfoCache = loadCacheFromStorage();
}
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWalletBalance,
  fetchNewAddress,
  fetchUtxos,
  fetchTransactions,
  fetchLockedUtxos,
  fetchLockSettings,
  lockUtxos,
  unlockUtxos,
  syncLocks,
  setAutoLock,
  formatBtc,
  shortenHash,
  fetchUtxoProtocolInfo,
  type Utxo,
  type Transaction,
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
  Gem,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { BackupSection } from "@/components/wallet/backup-section";
import { LockedAssetsSection } from "@/components/wallet/locked-assets-section";
import { ProtocolTag } from "@/components/wallet/protocol-tag";

// Import DS components
import {
  PageHeader,
  Section,
  SectionHeader,
  Tabs,
  Tab,
  ActionButton,
} from "@/components/ds";

type TabId = "transactions" | "utxos" | "assets" | "receive" | "backup";
const UTXOS_PER_PAGE = 50;

export default function WalletPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("transactions");
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

  // Collect all txids from utxos and transactions for protocol info lookup
  const allTxids = useMemo(() => {
    const txids = new Set<string>();
    utxos?.forEach(u => txids.add(u.txid));
    transactions?.forEach(tx => txids.add(tx.txid));
    return Array.from(txids).sort(); // Sort for stable key
  }, [utxos, transactions]);

  // Stable key for protocol info query (prevent unnecessary refetches)
  const protocolInfoQueryKey = useMemo(() => allTxids.join(","), [allTxids]);

  // Fetch protocol info for all txids
  const { data: protocolInfoData } = useQuery({
    queryKey: ["protocol-info", protocolInfoQueryKey],
    queryFn: () => fetchUtxoProtocolInfo(allTxids),
    enabled: allTxids.length > 0,
    staleTime: 120000, // Keep data fresh for 2 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Counter to trigger re-renders when cache updates
  const [cacheVersion, setCacheVersion] = useState(0);

  // Update the global cache when new data arrives (merge, don't replace)
  useEffect(() => {
    if (protocolInfoData?.items && protocolInfoData.items.length > 0) {
      let hasNewItems = false;
      protocolInfoData.items.forEach(item => {
        if (!protocolInfoCache.has(item.original_txid)) {
          protocolInfoCache.set(item.original_txid, item);
          hasNewItems = true;
        }
      });
      // Save to sessionStorage and trigger re-render if new items were added
      if (hasNewItems) {
        saveCacheToStorage(protocolInfoCache);
        setCacheVersion(v => v + 1);
      }
    }
  }, [protocolInfoData]);

  // Load cache from sessionStorage on mount
  useEffect(() => {
    const loadedCache = loadCacheFromStorage();
    if (loadedCache.size > 0 && protocolInfoCache.size === 0) {
      loadedCache.forEach((value, key) => {
        protocolInfoCache.set(key, value);
      });
      setCacheVersion(v => v + 1);
    }
  }, []);

  // Create a stable reference to the cache for lookups
  const protocolInfoMap = useMemo(() => {
    // This depends on cacheVersion to re-create when cache updates
    return protocolInfoCache;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheVersion]);

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

  const totalBtc = balance ? balance.total : 0;

  const tabLabels: Record<TabId, string> = {
    transactions: t("wallet.transactions"),
    utxos: t("wallet.utxos"),
    assets: t("wallet.assets") || "Assets",
    receive: t("wallet.receive"),
    backup: t("wallet.backup", "Backup"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Wallet}
        iconColor="purple"
        title={t("wallet.title")}
        subtitle={t("wallet.subtitle")}
      />

      {/* Balance Card */}
      <Section className="p-6">
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
      </Section>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabId)}>
        <Tab value="transactions">{tabLabels.transactions}</Tab>
        <Tab value="utxos">{tabLabels.utxos}</Tab>
        <Tab value="assets" icon={Gem}>
          {tabLabels.assets}
          {lockSettings && lockSettings.total_locked > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
              {lockSettings.total_locked}
            </span>
          )}
        </Tab>
        <Tab value="receive">{tabLabels.receive}</Tab>
        <Tab value="backup" icon={Shield}>{tabLabels.backup}</Tab>
      </Tabs>

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <Section className="p-0 overflow-hidden">
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
                <TransactionRow 
                  key={`${tx.txid}-${i}`} 
                  transaction={tx} 
                  t={t} 
                  protocolInfo={protocolInfoMap.get(tx.txid)}
                />
              ))}
            </div>
          )}
        </Section>
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
          protocolInfoMap={protocolInfoMap}
        />
      )}

      {activeTab === "assets" && (
        <LockedAssetsSection t={t} />
      )}

      {activeTab === "receive" && (
        <Section>
          <SectionHeader
            icon={QrCode}
            iconColor="primary"
            title={t("wallet.receiveBitcoin")}
          />

          {!addressMutation.data ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("wallet.generateToReceive")}</p>
              <ActionButton
                variant="primary"
                loading={addressMutation.isPending}
                onClick={handleGenerateAddress}
                icon={RefreshCw}
                label={t("wallet.generateAddress")}
              />
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
        </Section>
      )}

      {activeTab === "backup" && (
        <BackupSection t={t} />
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
  protocolInfo,
}: {
  transaction: Transaction;
  t: (key: string) => string;
  protocolInfo?: UtxoProtocolInfo;
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
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">
              {isReceive ? t("wallet.received") : t("wallet.sent")}
              {transaction.category === "generate" && ` (${t("wallet.mined")})`}
            </p>
            {protocolInfo && <ProtocolTag protocolInfo={protocolInfo} size="sm" />}
          </div>
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
  protocolInfoMap,
}: {
  utxos?: Utxo[];
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  lockedUtxos: LockedUtxo[];
  onLock: (txid: string, vout: number) => void;
  onUnlock: (txid: string, vout: number) => void;
  t: (key: string) => string;
  protocolInfoMap: Map<string, UtxoProtocolInfo>;
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
    <Section className="p-0 overflow-hidden">
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
                protocolInfo={protocolInfoMap.get(utxo.txid)}
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
    </Section>
  );
}

function UtxoRow({
  utxo,
  isLocked,
  onLock,
  onUnlock,
  t,
  protocolInfo,
}: {
  utxo: Utxo;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  t: (key: string) => string;
  protocolInfo?: UtxoProtocolInfo;
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-mono text-foreground">
              {shortenHash(utxo.txid, 8)}:{utxo.vout}
            </p>
            {protocolInfo && <ProtocolTag protocolInfo={protocolInfo} size="sm" />}
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
