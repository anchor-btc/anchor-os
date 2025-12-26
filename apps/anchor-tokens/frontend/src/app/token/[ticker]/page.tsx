'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
  Flame,
  TrendingUp,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { MintForm } from '@/components/mint-form';
import { TransferForm } from '@/components/transfer-form';
import { getToken, getTokenHolders, getTokenHistory } from '@/lib/api';
import {
  truncateMiddle,
  copyToClipboard,
  formatTokenAmount,
  formatRelativeTime,
} from '@/lib/utils';

export default function TokenPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'holders' | 'history' | 'mint' | 'transfer'>(
    'history'
  );

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['token', ticker] });
    queryClient.invalidateQueries({ queryKey: ['tokenHolders', ticker] });
    queryClient.invalidateQueries({ queryKey: ['tokenHistory', ticker] });
  };

  const { data: token, isLoading } = useQuery({
    queryKey: ['token', ticker],
    queryFn: () => getToken(ticker),
    enabled: !!ticker,
  });

  const { data: holders } = useQuery({
    queryKey: ['tokenHolders', ticker],
    queryFn: () => getTokenHolders(ticker),
    enabled: !!ticker && activeTab === 'holders',
  });

  const { data: history } = useQuery({
    queryKey: ['tokenHistory', ticker],
    queryFn: () => getTokenHistory(ticker),
    enabled: !!ticker && activeTab === 'history',
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-32" />
          <div className="h-64 bg-gray-800 rounded-2xl" />
          <div className="h-96 bg-gray-800 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
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
    );
  }

  // Calculate stats
  const maxSupply = BigInt(token.maxSupply);
  const mintedSupply = BigInt(token.mintedSupply);
  const burnedSupply = BigInt(token.burnedSupply);
  const circulatingSupply = BigInt(token.circulatingSupply);
  const remainingSupply = maxSupply - mintedSupply;
  const mintProgress = maxSupply > 0n ? Number((mintedSupply * 10000n) / maxSupply) / 100 : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/tokens"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tokens
      </Link>

      {/* Token Header Card */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 p-8 mb-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {token.ticker.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{token.ticker}</h1>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="font-mono text-sm">{truncateMiddle(token.deployTxid, 8, 8)}</span>
                <button
                  onClick={() => handleCopy(token.deployTxid)}
                  className="p-1 hover:text-white transition-colors"
                  title="Copy Deploy TX"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {token.isOpenMint && (
              <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                ✓ Open Mint
              </span>
            )}
            {token.isBurnable && (
              <span className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium border border-red-500/30">
                <Flame className="w-3 h-3 inline mr-1" />
                Burnable
              </span>
            )}
            <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium border border-blue-500/30">
              {token.decimals} decimals
            </span>
          </div>
        </div>

        {/* Mint Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Mint Progress</span>
            <span className="font-medium text-white">{mintProgress.toFixed(2)}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(mintProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTokenAmount(mintedSupply, token.decimals)} minted</span>
            <span>{formatTokenAmount(maxSupply, token.decimals)} max</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            iconColor="text-green-400"
            label="Circulating"
            value={formatTokenAmount(circulatingSupply, token.decimals, 4)}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5" />}
            iconColor="text-blue-400"
            label="Remaining"
            value={formatTokenAmount(remainingSupply, token.decimals, 4)}
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            iconColor="text-purple-400"
            label="Holders"
            value={token.holderCount.toString()}
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            iconColor="text-orange-400"
            label="Transactions"
            value={token.txCount.toString()}
          />
        </div>

        {/* Burned Amount */}
        {burnedSupply > 0n && (
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-2 text-red-400">
            <Flame className="w-4 h-4" />
            <span className="text-sm">
              {formatTokenAmount(burnedSupply, token.decimals)} burned
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          icon={<Activity className="w-4 h-4" />}
          label="History"
          color="orange"
        />
        <TabButton
          active={activeTab === 'holders'}
          onClick={() => setActiveTab('holders')}
          icon={<Users className="w-4 h-4" />}
          label="Holders"
          badge={token.holderCount > 0 ? token.holderCount.toString() : undefined}
          color="purple"
        />
        {token.isOpenMint && remainingSupply > 0n && (
          <TabButton
            active={activeTab === 'mint'}
            onClick={() => setActiveTab('mint')}
            icon={<Plus className="w-4 h-4" />}
            label="Mint"
            color="green"
          />
        )}
        <TabButton
          active={activeTab === 'transfer'}
          onClick={() => setActiveTab('transfer')}
          icon={<Send className="w-4 h-4" />}
          label="Transfer"
          color="blue"
        />
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        {activeTab === 'holders' && (
          <HoldersTab holders={holders?.data} decimals={token.decimals} />
        )}

        {activeTab === 'history' && (
          <HistoryTab history={history?.data} decimals={token.decimals} />
        )}

        {activeTab === 'mint' && (
          <div className="p-6 md:p-8 max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Coins className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Mint {token.ticker}</h2>
              <p className="text-gray-400 text-sm">Create new tokens and add them to your wallet</p>
            </div>
            <MintForm token={token} onSuccess={refetchAll} />
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="p-6 md:p-8 max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Transfer {token.ticker}</h2>
              <p className="text-gray-400 text-sm">Send tokens to one or more recipients</p>
            </div>
            <TransferForm token={token} onSuccess={refetchAll} />
          </div>
        )}
      </div>
    </main>
  );
}

// Stat Card Component
function StatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <p className="text-xl font-semibold text-white font-mono">{value}</p>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  color: 'orange' | 'purple' | 'green' | 'blue';
}) {
  const colorClasses = {
    orange: active
      ? 'bg-orange-500 text-white'
      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
    purple: active
      ? 'bg-purple-500 text-white'
      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
    green: active
      ? 'bg-green-500 text-white'
      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
    blue: active
      ? 'bg-blue-500 text-white'
      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${colorClasses[color]}`}
    >
      {icon}
      {label}
      {badge && (
        <span
          className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-white/20' : 'bg-gray-700'}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Holders Tab Component
function HoldersTab({
  holders,
  decimals,
}: {
  holders?: Array<{
    address: string;
    balance: string;
    percentage: number;
    utxoCount: number;
    txid?: string;
    vout?: number;
  }>;
  decimals: number;
}) {
  // Get explorer URL from environment or use default
  const explorerUrl = process.env.NEXT_PUBLIC_BTC_EXPLORER_URL || 'http://localhost:4000';

  if (!holders?.length) {
    return (
      <div className="p-12 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">No holders yet</p>
        <p className="text-gray-500 text-sm">Mint or transfer tokens to see holder distribution</p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-gray-700/50">
        <p className="text-sm text-gray-400">
          {holders.length} UTXO{holders.length !== 1 ? 's' : ''} holding tokens
        </p>
      </div>
      <div className="divide-y divide-gray-700/30">
        {holders.map((holder, i) => (
          <div
            key={holder.txid ? `${holder.txid}:${holder.vout}` : holder.address}
            className="flex items-center gap-4 p-4 hover:bg-gray-700/20 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              {holder.txid ? (
                <a
                  href={`${explorerUrl}/tx/${holder.txid}#output-${holder.vout}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <span className="font-mono text-sm">
                    {truncateMiddle(holder.txid, 8, 6)}:{holder.vout}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="font-mono text-sm truncate">{holder.address}</p>
              )}
              <p className="text-xs text-gray-500">
                {holder.utxoCount} UTXO{holder.utxoCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-medium">
                {formatTokenAmount(holder.balance, decimals, 4)}
              </p>
              <p className="text-xs text-gray-500">{holder.percentage.toFixed(2)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({
  history,
  decimals,
}: {
  history?: Array<{
    id: number;
    operation: string;
    amount: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    txid: string;
    createdAt: string;
  }>;
  decimals: number;
}) {
  if (!history?.length) {
    return (
      <div className="p-12 text-center">
        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No transaction history yet</p>
      </div>
    );
  }

  const opStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    DEPLOY: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      icon: <Coins className="w-3 h-3" />,
    },
    MINT: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      icon: <Plus className="w-3 h-3" />,
    },
    TRANSFER: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      icon: <Send className="w-3 h-3" />,
    },
    BURN: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      icon: <Flame className="w-3 h-3" />,
    },
  };

  return (
    <div>
      <div className="p-4 border-b border-gray-700/50">
        <p className="text-sm text-gray-400">
          {history.length} transaction{history.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="divide-y divide-gray-700/30">
        {history.map((op) => {
          const style = opStyles[op.operation] || {
            bg: 'bg-gray-500/20',
            text: 'text-gray-400',
            icon: null,
          };

          return (
            <div
              key={op.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-700/20 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center ${style.text}`}
              >
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {op.operation}
                  </span>
                  {op.amount && (
                    <span className="font-mono text-sm">
                      {op.operation === 'BURN' ? '-' : '+'}
                      {formatTokenAmount(op.amount, decimals, 4)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(op.createdAt)}</span>
                  {op.toAddress && (
                    <>
                      <span>→</span>
                      <span className="font-mono">{truncateMiddle(op.toAddress, 6, 4)}</span>
                    </>
                  )}
                </div>
              </div>
              <a
                href={`#${op.txid}`}
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors text-sm"
              >
                <span className="font-mono">{truncateMiddle(op.txid, 6, 4)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
