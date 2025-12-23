"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Search,
  Loader2,
  RefreshCw,
  Activity,
  Blocks,
  Clock,
  MessageSquare,
  Grid3X3,
  Image,
  MapPin,
  Globe,
  FileCheck,
  Coins,
  Box,
  FileCode,
  Stamp,
  Leaf,
  Eye,
  TrendingUp,
  Zap,
  List,
  BarChart3,
  Radio,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContainers } from "@/lib/api";
import {
  MessageExplorer,
  TimeSeriesCharts,
  MessagesOverTimeChart,
  LiveFeed,
  PerformanceMetrics,
  AnchorStatsChart,
} from "@/components/indexer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011";

interface MessageKindCount {
  kind: number;
  kind_name: string;
  count: number;
}

interface CarrierCount {
  carrier: number;
  carrier_name: string;
  count: number;
}

interface IndexerStats {
  total_messages: number;
  total_blocks_with_messages: number;
  messages_by_kind: MessageKindCount[];
  messages_by_carrier: CarrierCount[];
  recent_messages_24h: number;
  last_indexed_block: number | null;
}

async function fetchIndexerStats(): Promise<IndexerStats> {
  const res = await fetch(`${API_URL}/indexer/stats`);
  if (!res.ok) throw new Error("Failed to fetch indexer stats");
  return res.json();
}

const kindIcons: Record<string, React.ElementType> = {
  Text: MessageSquare,
  Canvas: Grid3X3,
  Image: Image,
  Map: MapPin,
  DNS: Globe,
  Proof: FileCheck,
  "Token Deploy": Coins,
  "Token Mint": Coins,
  "Token Transfer": Coins,
};

const kindColors: Record<string, string> = {
  Text: "text-orange-500 bg-orange-500/10",
  Canvas: "text-purple-500 bg-purple-500/10",
  Image: "text-pink-500 bg-pink-500/10",
  Map: "text-blue-500 bg-blue-500/10",
  DNS: "text-cyan-500 bg-cyan-500/10",
  Proof: "text-emerald-500 bg-emerald-500/10",
  "Token Deploy": "text-amber-500 bg-amber-500/10",
  "Token Mint": "text-amber-500 bg-amber-500/10",
  "Token Transfer": "text-amber-500 bg-amber-500/10",
};

const carrierIcons: Record<string, React.ElementType> = {
  "OP_RETURN": Box,
  "Inscription": FileCode,
  "Stamps": Stamp,
  "Taproot Annex": Leaf,
  "Witness Data": Eye,
};

const carrierColors: Record<string, string> = {
  "OP_RETURN": "text-blue-500 bg-blue-500/10",
  "Inscription": "text-orange-500 bg-orange-500/10",
  "Stamps": "text-pink-500 bg-pink-500/10",
  "Taproot Annex": "text-green-500 bg-green-500/10",
  "Witness Data": "text-purple-500 bg-purple-500/10",
};

const carrierChartColors: Record<string, string> = {
  "OP_RETURN": "#3b82f6",
  "Inscription": "#f97316",
  "Stamps": "#ec4899",
  "Taproot Annex": "#22c55e",
  "Witness Data": "#a855f7",
};

type TabId = "overview" | "explorer" | "analytics" | "performance" | "live";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "explorer", label: "Explorer", icon: List },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "performance", label: "Performance", icon: Gauge },
  { id: "live", label: "Live Feed", icon: Radio },
];

export default function IndexerPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const {
    data: containersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["indexer-stats"],
    queryFn: fetchIndexerStats,
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];
  const indexerContainer = containers.find(
    (c) => c.name === "anchor-core-indexer"
  );
  const isRunning = indexerContainer?.state === "running";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Search className="w-7 h-7 text-cyan-500" />
            {t("indexer.title")}
          </h1>
          <p className="text-muted-foreground">
            {isRunning
              ? t("indexer.subtitle")
              : t("indexer.notRunning")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
              <Activity className="w-4 h-4 animate-pulse" />
              {t("indexer.live")}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-muted-foreground",
                isRefetching && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab stats={stats} statsLoading={statsLoading} t={t} />
      )}

      {activeTab === "explorer" && <MessageExplorer />}

      {activeTab === "analytics" && <TimeSeriesCharts />}

      {activeTab === "performance" && <PerformanceMetrics />}

      {activeTab === "live" && <LiveFeed />}

      {/* Not running message */}
      {!isRunning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("indexer.notRunningMsg")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("indexer.startWith")}:{" "}
            <code className="bg-muted px-2 py-1 rounded">
              docker compose up -d anchor-core-indexer
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  stats,
  statsLoading,
  t,
}: {
  stats: IndexerStats | undefined;
  statsLoading: boolean;
  t: (key: string) => string;
}) {
  if (statsLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t("indexer.loadingStats")}</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label={t("indexer.totalMessages")}
          value={stats.total_messages.toLocaleString()}
          color="cyan"
        />
        <StatCard
          icon={<Blocks className="w-5 h-5" />}
          label={t("indexer.blocksWithMessages")}
          value={stats.total_blocks_with_messages.toLocaleString()}
          color="orange"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t("indexer.lastIndexedBlock")}
          value={stats.last_indexed_block?.toLocaleString() || "-"}
          color="purple"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label={t("indexer.recentBlocks")}
          value={stats.recent_messages_24h.toLocaleString()}
          color="green"
        />
      </div>

      {/* Message Types, Carrier Types & Anchor Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Types */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("indexer.messageTypes")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("indexer.distributionByKind")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stats.messages_by_kind.map((kind) => {
              const Icon = kindIcons[kind.kind_name] || MessageSquare;
              const colorClass = kindColors[kind.kind_name] || "text-gray-500 bg-gray-500/10";
              const percentage = stats.total_messages > 0 
                ? ((kind.count / stats.total_messages) * 100).toFixed(1)
                : "0";
              
              return (
                <div key={kind.kind} className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{kind.kind_name}</span>
                      <span className="text-sm font-tabular text-foreground">{kind.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", colorClass.split(" ")[0].replace("text-", "bg-"))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrier Types - Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Box className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("indexer.carrierTypes")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("indexer.howEmbedded")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Pie Chart */}
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.messages_by_carrier.map((c) => ({
                      name: c.carrier_name,
                      value: c.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.messages_by_carrier.map((carrier, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={carrierChartColors[carrier.carrier_name] || "#6b7280"}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [(value as number).toLocaleString(), "Count"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {stats.messages_by_carrier.map((carrier) => {
                const Icon = carrierIcons[carrier.carrier_name] || Box;
                const colorClass = carrierColors[carrier.carrier_name] || "text-gray-500 bg-gray-500/10";
                const percentage = stats.total_messages > 0 
                  ? ((carrier.count / stats.total_messages) * 100).toFixed(1)
                  : "0";
                
                return (
                  <div key={carrier.carrier} className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: carrierChartColors[carrier.carrier_name] || "#6b7280" }}
                    />
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", colorClass)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-xs text-foreground flex-1">{carrier.carrier_name}</span>
                    <span className="text-xs font-tabular text-foreground">{carrier.count.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Over Time & Anchor Resolution - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessagesOverTimeChart />
        <AnchorStatsChart />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "cyan" | "orange" | "purple" | "green";
}) {
  const colorClasses = {
    cyan: "bg-cyan-500/10 text-cyan-500",
    orange: "bg-orange-500/10 text-orange-500",
    purple: "bg-purple-500/10 text-purple-500",
    green: "bg-green-500/10 text-green-500",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold font-tabular text-foreground">{value}</p>
    </div>
  );
}
