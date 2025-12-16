"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContainers,
  startContainer,
  stopContainer,
  restartContainer,
  fetchContainerLogs,
  type Container,
} from "@/lib/api";
import { ServiceCard } from "@/components/service-card";
import {
  Loader2,
  RefreshCw,
  Play,
  Square,
  Terminal,
  X,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FilterType = "all" | "running" | "stopped";

export default function ServicesPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["logs", selectedContainer],
    queryFn: () => fetchContainerLogs(selectedContainer!, 200),
    enabled: !!selectedContainer,
    refetchInterval: 3000,
  });

  const containers = containersData?.containers || [];

  const filteredContainers = containers.filter((c) => {
    if (filter === "running") return c.state === "running";
    if (filter === "stopped") return c.state !== "running";
    return true;
  });

  const runningCount = containers.filter((c) => c.state === "running").length;
  const stoppedCount = containers.filter((c) => c.state !== "running").length;

  // Batch operations
  const startAllMutation = useMutation({
    mutationFn: async () => {
      const stopped = containers.filter((c) => c.state !== "running");
      for (const container of stopped) {
        await startContainer(container.name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  const stopAllMutation = useMutation({
    mutationFn: async () => {
      const running = containers.filter((c) => c.state === "running");
      for (const container of running) {
        await stopContainer(container.name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/apps"
            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            title="Back to Apps"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Advanced Services</h1>
            <p className="text-muted-foreground">
              Manage individual Docker containers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">
              {runningCount} running
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error" />
            <span className="text-sm text-muted-foreground">
              {stoppedCount} stopped
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => startAllMutation.mutate()}
            disabled={startAllMutation.isPending || stoppedCount === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {startAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start All
          </button>
          <button
            onClick={() => stopAllMutation.mutate()}
            disabled={stopAllMutation.isPending || runningCount === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {stopAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Stop All
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(["all", "running", "stopped"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize",
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Containers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContainers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No containers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContainers.map((container) => (
            <div key={container.id} className="relative">
              <ServiceCard
                container={container}
                onAction={() => refetch()}
              />
              <button
                onClick={() => setSelectedContainer(container.name)}
                className="absolute top-2 right-2 p-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                title="View logs"
              >
                <Terminal className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Logs Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-4xl max-h-[80vh] bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">
                  {selectedContainer} logs
                </h3>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="h-[60vh] overflow-auto p-4 bg-black font-mono text-xs">
              {logsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-green-400">
                  {logsData?.logs.join("") || "No logs available"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

