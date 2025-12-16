"use client";

import { useState, useMemo } from "react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your Bitcoin wallet
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            {balanceLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-tabular text-foreground">
                  {totalBtc.toFixed(8)}
                </span>
                <span className="text-xl text-muted-foreground">BTC</span>
              </div>
            )}
          </div>
        </div>

        {balance && (
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
            <BalanceItem
              label="Confirmed"
              value={formatBtc(balance.confirmed)}
              color="success"
            />
            <BalanceItem
              label="Unconfirmed"
              value={formatBtc(balance.unconfirmed)}
              color="warning"
            />
            <BalanceItem
              label="Immature"
              value={formatBtc(balance.immature || 0)}
              color="muted"
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
              "px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "transactions" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Transaction History</h2>
          </div>
          {txLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-auto">
              {transactions.map((tx, i) => (
                <TransactionRow key={`${tx.txid}-${i}`} transaction={tx} />
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
        />
      )}

      {activeTab === "receive" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">
            Receive Bitcoin
          </h2>

          {!addressMutation.data ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Generate a new address to receive Bitcoin
              </p>
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
                Generate Address
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
                  Bitcoin Address
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
                Generate new address
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
}: {
  label: string;
  value: string;
  color: "success" | "warning" | "muted";
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
        {value} BTC
      </p>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
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
            {isReceive ? "Received" : "Sent"}
            {transaction.category === "generate" && " (Mined)"}
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
          {Math.abs(transaction.amount).toFixed(8)} BTC
        </p>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {isConfirmed ? (
            <span>{transaction.confirmations} confirmations</span>
          ) : (
            <span className="text-warning">Pending</span>
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
  setPage 
}: { 
  utxos?: Utxo[]; 
  isLoading: boolean; 
  page: number; 
  setPage: (page: number) => void;
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
        <h2 className="font-semibold text-foreground">Unspent Outputs</h2>
        <span className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} UTXOs
        </span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !utxos || utxos.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No UTXOs available</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border max-h-[500px] overflow-auto">
            {paginatedUtxos.map((utxo) => (
              <UtxoRow key={`${utxo.txid}:${utxo.vout}`} utxo={utxo} />
            ))}
          </div>
          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalCount.toLocaleString()}
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
                Page {page + 1} of {totalPages}
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

function UtxoRow({ utxo }: { utxo: Utxo }) {
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
          {utxo.amount.toFixed(8)} BTC
        </p>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Hash className="w-3 h-3" />
          <span>{utxo.confirmations} confs</span>
        </div>
      </div>
    </div>
  );
}

