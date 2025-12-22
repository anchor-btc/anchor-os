"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Cpu, HardDrive, Wifi, Database, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011";

interface ContainerStats {
  name: string;
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  memory_percent: number;
  network_rx: number;
  network_tx: number;
  block_read: number;
  block_write: number;
}

interface AggregateStats {
  timestamp: number;
  total_cpu_percent: number;
  total_memory_usage: number;
  total_memory_limit: number;
  total_memory_percent: number;
  total_network_rx: number;
  total_network_tx: number;
  total_block_read: number;
  total_block_write: number;
  container_count: number;
  containers: ContainerStats[];
}

interface HistoryPoint {
  cpu: number;
  memory: number;
}

async function fetchDockerStats(): Promise<AggregateStats> {
  const res = await fetch(`${API_URL}/docker/stats`);
  if (!res.ok) throw new Error("Failed to fetch docker stats");
  return res.json();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const MAX_HISTORY = 20;

// Mini sparkline component using pure CSS/divs
function Sparkline({ 
  data, 
  color, 
  maxValue = 100 
}: { 
  data: number[]; 
  color: string;
  maxValue?: number;
}) {
  const normalizedData = data.map(v => Math.min((v / maxValue) * 100, 100));
  
  return (
    <div className="flex items-end gap-[2px] h-8 w-full">
      {normalizedData.map((value, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all duration-300",
            color
          )}
          style={{ 
            height: `${Math.max(value, 2)}%`,
            opacity: 0.3 + (i / normalizedData.length) * 0.7
          }}
        />
      ))}
    </div>
  );
}

export function ResourceCharts() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const { data: stats } = useQuery({
    queryKey: ["docker-stats"],
    queryFn: fetchDockerStats,
    refetchInterval: 2000,
  });

  const updateHistory = useCallback(() => {
    if (!stats) return;

    const newPoint: HistoryPoint = {
      cpu: Math.min(stats.total_cpu_percent, 100),
      memory: stats.total_memory_percent,
    };

    setHistory((prev) => {
      const updated = [...prev, newPoint];
      return updated.slice(-MAX_HISTORY);
    });
  }, [stats]);

  useEffect(() => {
    if (stats) {
      updateHistory();
    }
  }, [stats?.timestamp]);

  if (!stats) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t("resourceMonitor.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("resourceMonitor.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  const cpuHistory = history.map(h => h.cpu);
  const memoryHistory = history.map(h => h.memory);

  // Top 5 containers by CPU
  const topContainers = stats.containers
    .sort((a, b) => b.cpu_percent - a.cpu_percent)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t("resourceMonitor.title")}</h2>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {stats.container_count} {t("resourceMonitor.containers")}
        </span>
      </div>

      {/* Main Grid - 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* CPU */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <span className="text-xs text-muted-foreground">{t("resourceMonitor.cpu")}</span>
          </div>
          <p className="text-xl font-bold font-tabular text-foreground">
            {stats.total_cpu_percent.toFixed(1)}%
          </p>
          <Sparkline data={cpuHistory} color="bg-orange-500" />
        </div>

        {/* Memory */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground">{t("resourceMonitor.memory")}</span>
          </div>
          <p className="text-xl font-bold font-tabular text-foreground">
            {formatBytes(stats.total_memory_usage)}
          </p>
          <Sparkline data={memoryHistory} color="bg-blue-500" />
        </div>

        {/* Network */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            </div>
            <span className="text-xs text-muted-foreground">{t("resourceMonitor.network")}</span>
          </div>
          <div>
            <p className="text-sm font-semibold font-tabular text-foreground">
              ↓ {formatBytes(stats.total_network_rx)}
            </p>
            <p className="text-sm font-semibold font-tabular text-muted-foreground">
              ↑ {formatBytes(stats.total_network_tx)}
            </p>
          </div>
        </div>

        {/* Disk */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
              <HardDrive className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <span className="text-xs text-muted-foreground">{t("resourceMonitor.diskIO")}</span>
          </div>
          <div>
            <p className="text-sm font-semibold font-tabular text-foreground">
              R: {formatBytes(stats.total_block_read)}
            </p>
            <p className="text-sm font-semibold font-tabular text-muted-foreground">
              W: {formatBytes(stats.total_block_write)}
            </p>
          </div>
        </div>

        {/* Top Containers */}
        <div className="col-span-2 md:col-span-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground">{t("resourceMonitor.topCpu")}</span>
          </div>
          <div className="space-y-1">
            {topContainers.slice(0, 3).map((container) => (
              <div key={container.name} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[80px]">
                  {container.name.replace("anchor-", "").replace(/-/g, " ").split(" ")[0]}
                </span>
                <span className="font-tabular text-foreground">
                  {container.cpu_percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
