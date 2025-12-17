"use client";

import { useState } from "react";
import { Container, startContainer, stopContainer, restartContainer } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Play,
  Square,
  RotateCw,
  Loader2,
  Database,
  Bitcoin,
  Search,
  Box,
  Server,
  Pickaxe,
  Map,
  Grid3X3,
  Globe,
  FileCheck,
  Wallet,
  MessageSquare,
  Zap,
  Activity,
} from "lucide-react";

interface ServiceCardProps {
  container: Container;
  onAction?: () => void;
}

const serviceIcons: Record<string, React.ElementType> = {
  // Core
  "anchor-core-bitcoin": Bitcoin,
  "anchor-core-electrs": Zap,
  "anchor-core-postgres": Database,
  "anchor-core-indexer": Search,
  "anchor-core-wallet": Wallet,
  "anchor-core-testnet": Pickaxe,
  // Explorers
  "anchor-explorer-bitfeed-web": Activity,
  "anchor-explorer-bitfeed-api": Server,
  "anchor-explorer-mempool-web": Bitcoin,
  "anchor-explorer-mempool-api": Server,
  "anchor-explorer-mempool-db": Database,
  "anchor-explorer-btc-rpc": Search,
  // Dashboard
  "anchor-dashboard-backend": Server,
  "anchor-dashboard-frontend": Server,
  // Apps
  "anchor-app-threads-backend": Server,
  "anchor-app-threads-frontend": MessageSquare,
  "anchor-app-pixel-backend": Grid3X3,
  "anchor-app-pixel-frontend": Grid3X3,
  "anchor-app-map-backend": Map,
  "anchor-app-map-frontend": Map,
  "anchor-app-dns-backend": Globe,
  "anchor-app-dns-frontend": Globe,
  "anchor-app-proof-backend": FileCheck,
  "anchor-app-proof-frontend": FileCheck,
};

export function ServiceCard({ container, onAction }: ServiceCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isRunning = container.state === "running";
  const isRestarting = container.state === "restarting";
  
  const Icon = serviceIcons[container.name] || Box;

  const handleStart = async () => {
    setLoading("start");
    try {
      await startContainer(container.name);
      onAction?.();
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading("stop");
    try {
      await stopContainer(container.name);
      onAction?.();
    } finally {
      setLoading(null);
    }
  };

  const handleRestart = async () => {
    setLoading("restart");
    try {
      await restartContainer(container.name);
      onAction?.();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 card-hover",
        isRunning && "border-l-4 border-l-success",
        !isRunning && !isRestarting && "border-l-4 border-l-error",
        isRestarting && "border-l-4 border-l-warning"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isRunning ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              {container.name.replace("anchor-", "").replace(/^(infra|tool|app)-/, "")}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              {container.image.split(":")[0].split("/").pop()}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            isRunning && "status-running",
            !isRunning && !isRestarting && "status-stopped",
            isRestarting && "status-restarting"
          )}
        />
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        <p className="truncate">{container.status}</p>
        {container.ports.length > 0 && (
          <p className="mt-1 font-mono">
            Ports: {container.ports.join(", ")}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {isRunning ? (
          <>
            <button
              onClick={handleStop}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-error/20 hover:text-error text-muted-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === "stop" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop
            </button>
            <button
              onClick={handleRestart}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-warning/20 hover:text-warning text-muted-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === "restart" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCw className="w-4 h-4" />
              )}
              Restart
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-success/10 hover:bg-success/20 text-success rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === "start" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start
          </button>
        )}
      </div>
    </div>
  );
}

