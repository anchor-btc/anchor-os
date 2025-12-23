"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2, TrendingUp, BarChart3, Layers, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchIndexerTimeseries } from "@/lib/api";

// ============================
// Shared Types and Constants
// ============================

const PERIODS = [
  { id: "hour", label: "Hourly", count: 24 },
  { id: "day", label: "Daily", count: 30 },
  { id: "week", label: "Weekly", count: 12 },
] as const;

type PeriodType = "hour" | "day" | "week";

const KIND_COLORS: Record<string, string> = {
  "Text": "#f97316",
  "Canvas": "#a855f7",
  "Image": "#ec4899",
  "Map": "#3b82f6",
  "DNS": "#06b6d4",
  "Proof": "#10b981",
  "Token Deploy": "#f59e0b",
  "Token Mint": "#f59e0b",
  "Token Transfer": "#f59e0b",
};

const CARRIER_COLORS: Record<string, string> = {
  "OP_RETURN": "#3b82f6",
  "Inscription": "#f97316",
  "Stamps": "#ec4899",
  "Taproot Annex": "#22c55e",
  "Witness Data": "#a855f7",
};

// ============================
// Period Selector Component
// ============================
function PeriodSelector({ 
  period, 
  onChange 
}: { 
  period: PeriodType; 
  onChange: (p: PeriodType) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md transition-colors",
            period === p.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ============================
// 1. Total Messages Chart
// ============================
export function TotalMessagesChart() {
  const [period, setPeriod] = useState<PeriodType>("hour");
  const periodConfig = PERIODS.find((p) => p.id === period)!;

  const { data, isLoading } = useQuery({
    queryKey: ["indexer-timeseries", period, periodConfig.count],
    queryFn: () => fetchIndexerTimeseries(period, periodConfig.count),
    refetchInterval: 30000,
  });

  const chartData = data?.points.map((point) => {
    const date = new Date(point.timestamp);
    const formattedDate = period === "hour"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });

    return {
      date: formattedDate,
      total: point.total,
    };
  }) || [];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Total Messages</h2>
            <p className="text-sm text-muted-foreground">Messages over time</p>
          </div>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 opacity-50" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotalMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                tick={{ fill: "#ffffff" }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#ffffff" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [value as number, "Messages"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#colorTotalMessages)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ============================
// 2. Messages by Kind Chart
// ============================
export function MessagesByKindChart() {
  const [period, setPeriod] = useState<PeriodType>("hour");
  const periodConfig = PERIODS.find((p) => p.id === period)!;

  const { data, isLoading } = useQuery({
    queryKey: ["indexer-timeseries", period, periodConfig.count],
    queryFn: () => fetchIndexerTimeseries(period, periodConfig.count),
    refetchInterval: 30000,
  });

  const chartData = data?.points.map((point) => {
    const date = new Date(point.timestamp);
    const formattedDate = period === "hour"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });

    const result: Record<string, number | string> = {
      date: formattedDate,
    };

    point.by_kind.forEach((k) => {
      result[k.kind_name] = k.count;
    });

    return result;
  }) || [];

  // Get unique kinds from data
  const uniqueKinds = new Set<string>();
  data?.points.forEach((point) => {
    point.by_kind.forEach((k) => uniqueKinds.add(k.kind_name));
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Messages by Kind</h2>
            <p className="text-sm text-muted-foreground">By message type</p>
          </div>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 opacity-50" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                tick={{ fill: "#ffffff" }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#ffffff" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "11px" }}
                iconType="circle"
                iconSize={8}
              />
              {Array.from(uniqueKinds).map((kind) => (
                <Area
                  key={kind}
                  type="monotone"
                  dataKey={kind}
                  stackId="1"
                  stroke={KIND_COLORS[kind] || "#6b7280"}
                  fill={KIND_COLORS[kind] || "#6b7280"}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ============================
// 3. Messages by Carrier Chart
// ============================
export function MessagesByCarrierChart() {
  const [period, setPeriod] = useState<PeriodType>("hour");
  const periodConfig = PERIODS.find((p) => p.id === period)!;

  const { data, isLoading } = useQuery({
    queryKey: ["indexer-timeseries", period, periodConfig.count],
    queryFn: () => fetchIndexerTimeseries(period, periodConfig.count),
    refetchInterval: 30000,
  });

  const chartData = data?.points.map((point) => {
    const date = new Date(point.timestamp);
    const formattedDate = period === "hour"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });

    const result: Record<string, number | string> = {
      date: formattedDate,
    };

    point.by_carrier.forEach((c) => {
      result[c.carrier_name] = c.count;
    });

    return result;
  }) || [];

  // Get unique carriers from data
  const uniqueCarriers = new Set<string>();
  data?.points.forEach((point) => {
    point.by_carrier.forEach((c) => uniqueCarriers.add(c.carrier_name));
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Box className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Messages by Carrier</h2>
            <p className="text-sm text-muted-foreground">By carrier type</p>
          </div>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 opacity-50" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                tick={{ fill: "#ffffff" }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#ffffff"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#ffffff" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "11px" }}
                iconType="line"
                iconSize={12}
              />
              {Array.from(uniqueCarriers).map((carrier) => (
                <Line
                  key={carrier}
                  type="monotone"
                  dataKey={carrier}
                  stroke={CARRIER_COLORS[carrier] || "#6b7280"}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ============================
// Legacy exports for compatibility
// ============================
export function MessagesOverTimeChart() {
  return <TotalMessagesChart />;
}

export function TimeSeriesCharts() {
  return (
    <div className="space-y-6">
      <TotalMessagesChart />
      <MessagesByKindChart />
      <MessagesByCarrierChart />
    </div>
  );
}

