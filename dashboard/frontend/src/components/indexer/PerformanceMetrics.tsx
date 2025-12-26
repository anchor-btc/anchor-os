'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Activity, Zap, Clock, CheckCircle2, AlertCircle, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPerformanceStats } from '@/lib/api';

export function PerformanceMetrics() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['indexer-performance'],
    queryFn: fetchPerformanceStats,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-center py-8 text-red-400">Failed to load performance stats</div>;
  }

  const statusColor = stats.is_synced ? 'green' : stats.blocks_behind > 10 ? 'red' : 'yellow';
  const statusText = stats.is_synced ? 'Synced' : stats.blocks_behind > 10 ? 'Lagging' : 'Syncing';

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center',
                statusColor === 'green'
                  ? 'bg-green-500/10'
                  : statusColor === 'yellow'
                    ? 'bg-yellow-500/10'
                    : 'bg-red-500/10'
              )}
            >
              {statusColor === 'green' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : statusColor === 'yellow' ? (
                <Activity className="w-8 h-8 text-yellow-500 animate-pulse" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{statusText}</h2>
              <p className="text-muted-foreground">
                {stats.is_synced
                  ? 'Indexer is up to date with the blockchain'
                  : `${stats.blocks_behind} blocks behind`}
              </p>
            </div>
          </div>
          <div
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              stats.indexer_status === 'running'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {stats.indexer_status === 'running' ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Gauge className="w-5 h-5" />}
          label="Last Indexed Block"
          value={stats.last_indexed_block.toLocaleString()}
          color="cyan"
        />
        <MetricCard
          icon={<Zap className="w-5 h-5" />}
          label="Total Messages"
          value={stats.total_messages.toLocaleString()}
          color="purple"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Messages/Block"
          value={stats.messages_per_block.toFixed(2)}
          color="orange"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Last Update"
          value={formatTime(stats.last_update)}
          color="green"
        />
      </div>

      {/* Chain Height Info */}
      {stats.current_chain_height && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Chain Height</span>
            <span className="font-tabular text-foreground">
              {stats.current_chain_height.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{
                width: `${(stats.last_indexed_block / stats.current_chain_height) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'cyan' | 'purple' | 'orange' | 'green';
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    green: 'bg-green-500/10 text-green-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClasses[color])}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold font-tabular text-foreground">{value}</p>
    </div>
  );
}

function formatTime(timestamp: string): string {
  if (!timestamp) return '-';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return timestamp;
  }
}
