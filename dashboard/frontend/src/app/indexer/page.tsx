"use client";

import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContainers } from "@/lib/api";
import {
  MessageExplorer,
  TotalMessagesChart,
  MessagesByKindChart,
  MessagesByCarrierChart,
  LiveFeed,
  PerformanceMetrics,
  AnchorStatsChart,
  IndexerGridLayout,
  useIndexerLayout,
  type IndexerCardDefinition,
} from "@/components/indexer";

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Section,
  SectionHeader,
  StatCard,
} from "@/components/ds";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

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

export default function IndexerPage() {
  const { t } = useTranslation();

  const {
    layout,
    isEditMode,
    reorderCards,
    changeCardSize,
    resetToDefaults,
    toggleEditMode,
  } = useIndexerLayout();

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

  // Define all card components
  const cardDefinitions: IndexerCardDefinition[] = [
    {
      id: "stats",
      name: t("indexer.overview", "Overview Stats"),
      defaultSize: 4,
      minSize: 2,
      maxSize: 4,
      render: () => <StatsCards stats={stats} statsLoading={statsLoading} t={t} />,
    },
    {
      id: "message-types",
      name: t("indexer.messageTypes", "Message Types"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <MessageTypesCard stats={stats} t={t} />,
    },
    {
      id: "carrier-types",
      name: t("indexer.carrierTypes", "Carrier Types"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <CarrierTypesCard stats={stats} t={t} />,
    },
    {
      id: "anchor-resolution",
      name: t("indexer.anchorResolution", "Anchor Resolution"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <AnchorStatsChart />,
    },
    {
      id: "live-feed",
      name: t("indexer.liveFeed", "Live Feed"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <LiveFeed />,
    },
    {
      id: "total-messages",
      name: t("indexer.totalMessagesChart", "Total Messages"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <TotalMessagesChart />,
    },
    {
      id: "messages-by-kind",
      name: t("indexer.messagesByKind", "By Kind"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <MessagesByKindChart />,
    },
    {
      id: "messages-by-carrier",
      name: t("indexer.messagesByCarrier", "By Carrier"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <MessagesByCarrierChart />,
    },
    {
      id: "performance",
      name: t("indexer.performance", "Performance"),
      defaultSize: 2,
      minSize: 1,
      maxSize: 4,
      render: () => <PerformanceMetrics />,
    },
    {
      id: "message-explorer",
      name: t("indexer.messageExplorer", "Message Explorer"),
      defaultSize: 4,
      minSize: 2,
      maxSize: 4,
      render: () => <MessageExplorer />,
    },
  ];

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
      <PageHeader
        icon={Search}
        iconColor="cyan"
        title={t("indexer.title")}
        subtitle={isRunning ? t("indexer.subtitle") : t("indexer.notRunning")}
        actions={
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
                <Activity className="w-4 h-4 animate-pulse" />
                {t("indexer.live")}
              </span>
            )}
            <RefreshButton loading={isRefetching} onClick={() => refetch()} />
          </div>
        }
      />

      {/* Draggable Grid Layout */}
      <IndexerGridLayout
        cardDefinitions={cardDefinitions}
        layout={layout}
        isEditMode={isEditMode}
        onReorder={reorderCards}
        onChangeSize={changeCardSize}
        onResetToDefaults={resetToDefaults}
        onToggleEditMode={toggleEditMode}
      />

      {/* Not running message */}
      {!isRunning && (
        <Section className="text-center py-8">
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
        </Section>
      )}
    </div>
  );
}

// ============================
// Stats Cards Component
// ============================
function StatsCards({
  stats,
  statsLoading,
  t,
}: {
  stats: IndexerStats | undefined;
  statsLoading: boolean;
  t: TFunction;
}) {
  if (statsLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="h-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        icon={MessageSquare}
        label={t("indexer.totalMessages")}
        value={stats.total_messages.toLocaleString()}
        color="cyan"
      />
      <StatCard
        icon={Blocks}
        label={t("indexer.blocksWithMessages")}
        value={stats.total_blocks_with_messages.toLocaleString()}
        color="orange"
      />
      <StatCard
        icon={Clock}
        label={t("indexer.lastIndexedBlock")}
        value={stats.last_indexed_block?.toLocaleString() || "-"}
        color="purple"
      />
      <StatCard
        icon={Zap}
        label={t("indexer.recentBlocks")}
        value={stats.recent_messages_24h.toLocaleString()}
        color="emerald"
      />
    </div>
  );
}

// ============================
// Message Types Card Component
// ============================
function MessageTypesCard({
  stats,
  t,
}: {
  stats: IndexerStats | undefined;
  t: TFunction;
}) {
  if (!stats) {
    return (
      <Section>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        icon={TrendingUp}
        iconColor="orange"
        title={t("indexer.messageTypes")}
        subtitle={t("indexer.distributionByKind")}
      />

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
                <Icon className="w-4 h-4" />
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
    </Section>
  );
}

// ============================
// Carrier Types Card Component
// ============================
function CarrierTypesCard({
  stats,
  t,
}: {
  stats: IndexerStats | undefined;
  t: TFunction;
}) {
  if (!stats) {
    return (
      <Section>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        icon={Box}
        iconColor="blue"
        title={t("indexer.carrierTypes")}
        subtitle={t("indexer.howEmbedded")}
      />

      {/* Pie Chart - Centered and larger */}
      <div className="flex justify-center mb-4">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.messages_by_carrier.map((c) => ({
                  name: c.carrier_name,
                  value: c.count,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
      </div>

      {/* Legend - Below chart in single column */}
      <div className="space-y-2">
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
              <span className="text-sm text-foreground flex-1">{carrier.carrier_name}</span>
              <span className="text-sm font-tabular text-foreground">{carrier.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground w-14 text-right">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
