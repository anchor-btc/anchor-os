'use client';

import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2, Link2, AlertTriangle, HelpCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAnchorStats, fetchOrphanAnchors } from '@/lib/api';

const CHART_COLORS = {
  resolved: '#22c55e',
  orphaned: '#ef4444',
  ambiguous: '#f59e0b',
  pending: '#6b7280',
};

export function AnchorStatsChart() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['indexer-anchor-stats'],
    queryFn: fetchAnchorStats,
    refetchInterval: 10000,
  });

  const { data: orphans } = useQuery({
    queryKey: ['indexer-orphan-anchors'],
    queryFn: () => fetchOrphanAnchors(5),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No anchor data available</p>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No anchors yet</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Resolved', value: stats.resolved, color: CHART_COLORS.resolved },
    { name: 'Orphaned', value: stats.orphaned, color: CHART_COLORS.orphaned },
    { name: 'Ambiguous', value: stats.ambiguous, color: CHART_COLORS.ambiguous },
    { name: 'Pending', value: stats.pending, color: CHART_COLORS.pending },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Anchor Resolution</h2>
          <p className="text-sm text-muted-foreground">
            {stats.resolution_rate.toFixed(1)}% resolved
          </p>
        </div>
      </div>

      {/* Donut Chart - Centered and larger */}
      <div className="flex justify-center mb-4">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [(value as number).toLocaleString(), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend & Stats - Below chart in single column */}
      <div className="space-y-2">
        <StatRow
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          label="Resolved"
          value={stats.resolved}
          total={stats.total}
          color="green"
        />
        <StatRow
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Orphaned"
          value={stats.orphaned}
          total={stats.total}
          color="red"
        />
        <StatRow
          icon={<HelpCircle className="w-3.5 h-3.5" />}
          label="Ambiguous"
          value={stats.ambiguous}
          total={stats.total}
          color="yellow"
        />
        <StatRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Pending"
          value={stats.pending}
          total={stats.total}
          color="gray"
        />
      </div>

      {/* Recent Orphans */}
      {orphans && orphans.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Recent Orphans</p>
          <div className="space-y-1">
            {orphans.slice(0, 3).map((orphan) => (
              <div key={orphan.id} className="text-xs font-mono text-red-400/70 truncate">
                {orphan.txid_prefix}... → {orphan.message_txid.slice(0, 12)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: 'green' | 'red' | 'yellow' | 'gray';
}) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

  const colorClasses = {
    green: 'text-green-500 bg-green-500/10',
    red: 'text-red-500 bg-red-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    gray: 'text-gray-500 bg-gray-500/10',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-6 h-6 rounded flex items-center justify-center', colorClasses[color])}>
        {icon}
      </div>
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className="text-sm font-tabular text-foreground">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
    </div>
  );
}
