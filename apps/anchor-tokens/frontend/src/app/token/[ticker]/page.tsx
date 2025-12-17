"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Users,
  Activity,
  ExternalLink,
  Copy,
  Check,
  Send,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/header";
import { MintForm } from "@/components/mint-form";
import { TransferForm } from "@/components/transfer-form";
import { getToken, getTokenHolders, getTokenHistory } from "@/lib/api";
import { truncateMiddle, formatNumber, copyToClipboard } from "@/lib/utils";

export default function TokenPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"holders" | "history" | "mint" | "transfer">("holders");

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["token", ticker] });
    queryClient.invalidateQueries({ queryKey: ["tokenHolders", ticker] });
    queryClient.invalidateQueries({ queryKey: ["tokenHistory", ticker] });
  };

  const { data: token, isLoading } = useQuery({
    queryKey: ["token", ticker],
    queryFn: () => getToken(ticker),
    enabled: !!ticker,
  });

  const { data: holders } = useQuery({
    queryKey: ["tokenHolders", ticker],
    queryFn: () => getTokenHolders(ticker),
    enabled: !!ticker && activeTab === "holders",
  });

  const { data: history } = useQuery({
    queryKey: ["tokenHistory", ticker],
    queryFn: () => getTokenHistory(ticker),
    enabled: !!ticker && activeTab === "history",
  });

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/4" />
            <div className="h-48 bg-gray-800 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">Token not found</p>
            <Link
              href="/tokens"
              className="inline-flex items-center gap-2 mt-4 text-orange-400 hover:text-orange-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to tokens
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/tokens"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tokens
        </Link>

        {/* Token Header */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-orange-400 mb-2">
                {token.ticker}
              </h1>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="font-mono text-sm">
                  {truncateMiddle(token.deployTxid, 8, 8)}
                </span>
                <button
                  onClick={() => handleCopy(token.deployTxid)}
                  className="p-1 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {token.isOpenMint && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  Open Mint
                </span>
              )}
              {token.isBurnable && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  Burnable
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Max Supply</p>
              <p className="text-xl font-semibold">
                {formatNumber(BigInt(token.maxSupply))}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Circulating</p>
              <p className="text-xl font-semibold">
                {formatNumber(BigInt(token.circulatingSupply))}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Holders</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {token.holderCount}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Transactions</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                {token.txCount}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-400 text-sm">Decimals</p>
              <p className="font-mono">{token.decimals}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Mint Limit</p>
              <p className="font-mono">
                {token.mintLimit ? formatNumber(BigInt(token.mintLimit)) : "None"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Minted</p>
              <p className="font-mono">{formatNumber(BigInt(token.mintedSupply))}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Burned</p>
              <p className="font-mono">{formatNumber(BigInt(token.burnedSupply))}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab("holders")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "holders"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Holders
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4 inline-block mr-2" />
            History
          </button>
          {token.isOpenMint && (
            <button
              onClick={() => setActiveTab("mint")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "mint"
                  ? "bg-green-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              Mint
            </button>
          )}
          <button
            onClick={() => setActiveTab("transfer")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "transfer"
                ? "bg-blue-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4 inline-block mr-2" />
            Transfer
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700">
          {activeTab === "holders" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">Rank</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Address</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Balance</th>
                    <th className="text-right p-4 text-gray-400 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {holders?.data?.length ? (
                    holders.data.map((holder, i) => (
                      <tr key={holder.address} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-4 text-gray-400">{i + 1}</td>
                        <td className="p-4 font-mono text-sm">
                          {truncateMiddle(holder.address, 10, 8)}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {formatNumber(BigInt(holder.balance))}
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          {holder.percentage.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No holders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left p-4 text-gray-400 font-medium">From/To</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.data?.length ? (
                    history.data.map((op) => (
                      <tr key={op.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              op.operation === "DEPLOY"
                                ? "bg-purple-500/20 text-purple-400"
                                : op.operation === "MINT"
                                ? "bg-green-500/20 text-green-400"
                                : op.operation === "TRANSFER"
                                ? "bg-blue-500/20 text-blue-400"
                                : op.operation === "BURN"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {op.operation}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          {op.amount ? formatNumber(BigInt(op.amount)) : "-"}
                        </td>
                        <td className="p-4 font-mono text-sm text-gray-400">
                          {op.toAddress ? truncateMiddle(op.toAddress, 8, 6) : "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          <a
                            href={`#${op.txid}`}
                            className="text-orange-400 hover:text-orange-300 flex items-center gap-1"
                          >
                            {truncateMiddle(op.txid, 8, 6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "mint" && (
            <div className="p-6">
              <MintForm token={token} onSuccess={refetchAll} />
            </div>
          )}

          {activeTab === "transfer" && (
            <div className="p-6">
              <TransferForm token={token} onSuccess={refetchAll} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
