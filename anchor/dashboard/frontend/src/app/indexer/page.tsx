"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  RefreshCw,
  Activity,
  Database,
  Blocks,
  Clock,
  FileText,
  Terminal,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContainers, fetchContainerLogs } from "@/lib/api";
import { useState } from "react";

export default function IndexerPage() {
  const [showFullLogs, setShowFullLogs] = useState(false);

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

  const {
    data: logsData,
    isLoading: logsLoading,
  } = useQuery({
    queryKey: ["indexer-logs"],
    queryFn: () => fetchContainerLogs("anchor-core-indexer"),
    refetchInterval: 5000,
  });

  const containers = containersData?.containers || [];
  const indexerContainer = containers.find(
    (c) => c.name === "anchor-core-indexer"
  );
  const isRunning = indexerContainer?.state === "running";

  // Parse recent logs to extract useful info
  const logLines = logsData?.logs || [];
  const recentLogs = logLines.slice(-50); // Last 50 lines

  // Try to extract some stats from logs
  const logsText = logLines.join("\n");
  const lastProcessedBlock = extractLastBlock(logsText);
  const lastActivity = extractLastActivity(logsText);

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
          <h1 className="text-2xl font-bold text-foreground">Anchor Indexer</h1>
          <p className="text-muted-foreground">
            {isRunning
              ? "Indexing ANCHOR protocol messages from the blockchain"
              : "Indexer not running"}
          </p>
        </div>
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

      {/* Status Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              isRunning ? "bg-cyan-500/10" : "bg-muted"
            )}
          >
            <Search
              className={cn(
                "w-6 h-6",
                isRunning ? "text-cyan-500" : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">Indexer Status</h2>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  isRunning
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitors the Bitcoin blockchain for ANCHOR messages
            </p>
          </div>
        </div>

        {isRunning && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Status"
              value="Active"
              color="cyan"
            />
            <StatCard
              icon={<Blocks className="w-5 h-5" />}
              label="Last Block Processed"
              value={lastProcessedBlock || "Scanning..."}
              color="orange"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Last Activity"
              value={lastActivity || "Just now"}
              color="purple"
            />
          </div>
        )}
      </div>

      {/* What it does */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">What the Indexer Does</h2>
            <p className="text-sm text-muted-foreground">
              Core component of the ANCHOR protocol stack
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">🔍 Scans Blocks</h3>
            <p className="text-sm text-muted-foreground">
              Continuously monitors new Bitcoin blocks for transactions containing ANCHOR protocol messages.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">📝 Parses Messages</h3>
            <p className="text-sm text-muted-foreground">
              Extracts and decodes ANCHOR messages from transaction witness data (OP_RETURN and Taproot).
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">💾 Stores Data</h3>
            <p className="text-sm text-muted-foreground">
              Saves indexed messages to PostgreSQL database for fast querying by applications.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">🔄 Real-time Updates</h3>
            <p className="text-sm text-muted-foreground">
              Processes new blocks as they are mined, keeping all ANCHOR apps up-to-date.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">
                Latest indexer logs
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFullLogs(!showFullLogs)}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            {showFullLogs ? "Show Less" : "Show More"}
          </button>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentLogs.length > 0 ? (
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-80 overflow-y-auto">
            {(showFullLogs ? recentLogs : recentLogs.slice(-10)).map((line, i) => (
              <div key={i} className="text-slate-300 py-0.5 whitespace-pre-wrap">
                {formatLogLine(line)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent logs available</p>
          </div>
        )}
      </div>

      {/* Not running message */}
      {!isRunning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Indexer Not Running
          </h2>
          <p className="text-muted-foreground mb-4">
            Start the indexer with:{" "}
            <code className="bg-muted px-2 py-1 rounded">
              docker compose up -d infra-indexer
            </code>
          </p>
        </div>
      )}
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
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-tabular text-foreground">{value}</p>
    </div>
  );
}

// Helper functions to parse log output
function extractLastBlock(logs: string): string | null {
  // Look for patterns like "block 123" or "height: 123" in logs
  const matches = logs.match(/block[:\s]+(\d+)/gi);
  if (matches && matches.length > 0) {
    const last = matches[matches.length - 1];
    const num = last.match(/\d+/);
    return num ? `Block ${num[0]}` : null;
  }
  return null;
}

function extractLastActivity(logs: string): string | null {
  const lines = logs.split("\n").filter(Boolean);
  if (lines.length > 0) {
    return "Active";
  }
  return null;
}

function formatLogLine(line: string): string {
  // Clean up ANSI codes if any and format nicely
  return line.replace(/\x1b\[[0-9;]*m/g, "").trim();
}
