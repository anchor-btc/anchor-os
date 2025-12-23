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
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchIndexerTimeseries } from "@/lib/api";

// ============================
// Mini Chart for Overview Tab
// ============================
export function MessagesOverTimeChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["indexer-timeseries", "hour", 24],
    queryFn: () => fetchIndexerTimeseries("hour", 24),
    refetchInterval: 30000,
  });

  const chartData = data?.points.map((point) => {
    const date = new Date(point.timestamp);
    return {
      date: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      total: point.total,
    };
  }) || [];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Messages Over Time</h2>
            <p className="text-sm text-muted-foreground">Last 24 hours</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Messages Over Time</h2>
            <p className="text-sm text-muted-foreground">Last 24 hours</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <BarChart3 className="w-8 h-8 opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-cyan-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Messages Over Time</h2>
          <p className="text-sm text-muted-foreground">Last 24 hours</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotalMini" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#colorTotalMini)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================
// Full Time Series Charts
// ============================

const PERIODS = [
  { id: "hour", label: "Hourly", count: 24 },
  { id: "day", label: "Daily", count: 30 },
  { id: "week", label: "Weekly", count: 12 },
] as const;

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

export function TimeSeriesCharts() {
  const [period, setPeriod] = useState<"hour" | "day" | "week">("hour");
  const [chartType, setChartType] = useState<"total" | "by_kind" | "by_carrier">("total");

  const periodConfig = PERIODS.find((p) => p.id === period)!;

  const { data, isLoading, error } = useQuery({
    queryKey: ["indexer-timeseries", period, periodConfig.count],
    queryFn: () => fetchIndexerTimeseries(period, periodConfig.count),
    refetchInterval: 30000,
  });

  // Transform data for charts
  const chartData = data?.points.map((point) => {
    const date = new Date(point.timestamp);
    const formattedDate = period === "hour"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : period === "day"
      ? date.toLocaleDateString([], { month: "short", day: "numeric" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });

    const result: Record<string, number | string> = {
      date: formattedDate,
      total: point.total,
    };

    // Add kind breakdowns
    point.by_kind.forEach((k) => {
      result[k.kind_name] = k.count;
    });

    // Add carrier breakdowns
    point.by_carrier.forEach((c) => {
      result[c.carrier_name] = c.count;
    });

    return result;
  }) || [];

  // Get unique kinds and carriers from data
  const uniqueKinds = new Set<string>();
  const uniqueCarriers = new Set<string>();
  data?.points.forEach((point) => {
    point.by_kind.forEach((k) => uniqueKinds.add(k.kind_name));
    point.by_carrier.forEach((c) => uniqueCarriers.add(c.carrier_name));
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">Failed to load time-series data</div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                period === p.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType("total")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              chartType === "total"
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Total
          </button>
          <button
            onClick={() => setChartType("by_kind")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              chartType === "by_kind"
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            By Kind
          </button>
          <button
            onClick={() => setChartType("by_carrier")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              chartType === "by_carrier"
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            By Carrier
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Messages Over Time</h2>
            <p className="text-sm text-muted-foreground">
              {chartType === "total" ? "Total messages" : chartType === "by_kind" ? "By message type" : "By carrier type"}
            </p>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "total" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <YAxis
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            ) : chartType === "by_kind" ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <YAxis
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
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
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <YAxis
                  stroke="#ffffff"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#ffffff" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
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
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

