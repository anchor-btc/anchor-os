'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLockedAssets, unlockUtxos, syncLocks, type LockedAssetItem } from '@/lib/api';
import {
  Lock,
  Unlock,
  Globe,
  Coins,
  Hand,
  RefreshCw,
  Loader2,
  ExternalLink,
  Filter,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Section, ActionButton } from '@/components/ds';

interface LockedAssetsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any; // i18next TFunction
}

type FilterType = 'all' | 'domains' | 'tokens' | 'manual';

export function LockedAssetsSection({ t }: LockedAssetsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['locked-assets', activeFilter],
    queryFn: () => fetchLockedAssets(activeFilter === 'all' ? undefined : activeFilter),
    refetchInterval: 10000,
  });

  const syncMutation = useMutation({
    mutationFn: syncLocks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-assets'] });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (utxos: { txid: string; vout: number }[]) => unlockUtxos(utxos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-assets'] });
      setSelectedUtxos(new Set());
    },
  });

  const handleSelectUtxo = (txid: string, vout: number) => {
    const key = `${txid}:${vout}`;
    const newSelected = new Set(selectedUtxos);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedUtxos(newSelected);
  };

  const handleUnlockSelected = () => {
    const utxos = Array.from(selectedUtxos).map((key) => {
      const [txid, vout] = key.split(':');
      return { txid, vout: parseInt(vout) };
    });
    unlockMutation.mutate(utxos);
  };

  const filters: { id: FilterType; label: string; icon: typeof Lock }[] = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'tokens', label: 'Tokens', icon: Coins },
    { id: 'manual', label: 'Manual', icon: Hand },
  ];

  const formatSats = (sats: number) => {
    if (sats >= 100_000_000) {
      return `${(sats / 100_000_000).toFixed(8)} BTC`;
    } else if (sats >= 1_000) {
      return `${(sats / 1_000).toFixed(0)}k sats`;
    }
    return `${sats} sats`;
  };

  const shortenTxid = (txid: string) => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={Globe}
            label="Domains"
            count={data.summary.domains.count}
            sats={data.summary.domains.total_sats}
            color="primary"
            formatSats={formatSats}
          />
          <SummaryCard
            icon={Coins}
            label="Tokens"
            count={data.summary.tokens.count}
            sats={data.summary.tokens.total_sats}
            color="accent"
            formatSats={formatSats}
          />
          <SummaryCard
            icon={Hand}
            label="Manual"
            count={data.summary.manual.count}
            sats={data.summary.manual.total_sats}
            color="purple"
            formatSats={formatSats}
          />
          <SummaryCard
            icon={Lock}
            label="Total Locked"
            count={data.summary.total.count}
            sats={data.summary.total.total_sats}
            color="success"
            formatSats={formatSats}
          />
        </div>
      )}

      {/* Actions Bar */}
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  activeFilter === filter.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
                {data?.summary && (
                  <span className="text-xs opacity-75">
                    (
                    {filter.id === 'all'
                      ? data.summary.total.count
                      : filter.id === 'domains'
                        ? data.summary.domains.count
                        : filter.id === 'tokens'
                          ? data.summary.tokens.count
                          : data.summary.manual.count}
                    )
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {selectedUtxos.size > 0 && (
              <ActionButton
                variant="secondary"
                onClick={handleUnlockSelected}
                loading={unlockMutation.isPending}
                icon={Unlock}
                label={`Unlock (${selectedUtxos.size})`}
              />
            )}
            <ActionButton
              variant="primary"
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
              icon={RefreshCw}
              label="Sync"
            />
          </div>
        </div>
      </Section>

      {/* Locked Assets List */}
      <Section className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {t('wallet.lockedAssets', 'Locked Assets')}
          </h2>
          <span className="text-sm text-muted-foreground">{data?.items.length ?? 0} items</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.items.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No locked assets found</p>
            <p className="text-sm mt-2">
              Lock UTXOs to protect them from being spent accidentally.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((item) => (
              <LockedAssetRow
                key={`${item.txid}:${item.vout}`}
                item={item}
                selected={selectedUtxos.has(`${item.txid}:${item.vout}`)}
                onSelect={() => handleSelectUtxo(item.txid, item.vout)}
                formatSats={formatSats}
                shortenTxid={shortenTxid}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  count,
  sats,
  color,
  formatSats,
}: {
  icon: typeof Lock;
  label: string;
  count: number;
  sats: number;
  color: 'primary' | 'accent' | 'purple' | 'success';
  formatSats: (sats: number) => string;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    success: 'bg-success/10 text-success border-success/20',
  };

  return (
    <div className={cn('rounded-xl border p-4', colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs opacity-75">{formatSats(sats)}</div>
    </div>
  );
}

function LockedAssetRow({
  item,
  selected,
  onSelect,
  formatSats,
  shortenTxid,
}: {
  item: LockedAssetItem;
  selected: boolean;
  onSelect: () => void;
  formatSats: (sats: number) => string;
  shortenTxid: (txid: string) => string;
}) {
  const getTypeIcon = () => {
    switch (item.lock_type) {
      case 'domain':
        return <Globe className="w-5 h-5 text-primary" />;
      case 'token':
        return <Coins className="w-5 h-5 text-accent" />;
      default:
        return <Hand className="w-5 h-5 text-purple-500" />;
    }
  };

  const getTypeColor = () => {
    switch (item.lock_type) {
      case 'domain':
        return 'bg-primary/10';
      case 'token':
        return 'bg-accent/10';
      default:
        return 'bg-purple-500/10';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer',
        selected && 'bg-primary/5'
      )}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
          selected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'
        )}
      >
        {selected && <Check className="w-3 h-3" />}
      </div>

      {/* Type Icon */}
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getTypeColor())}>
        {getTypeIcon()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {item.asset_name ||
              `${item.lock_type.charAt(0).toUpperCase() + item.lock_type.slice(1)} Lock`}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {item.lock_type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">
            {shortenTxid(item.txid)}:{item.vout}
          </span>
          <span>•</span>
          <span>{new Date(item.locked_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <div className="font-medium text-foreground font-tabular">
          {formatSats(item.amount_sats)}
        </div>
      </div>

      {/* External Link */}
      <a
        href={`https://mempool.space/tx/${item.txid}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </a>
    </div>
  );
}
