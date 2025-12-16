"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContainerLogs } from "@/lib/api";
import { Loader2, Terminal, X, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

interface LogsModalProps {
  containerName: string | null;
  onClose: () => void;
}

export function LogsModal({ containerName, onClose }: LogsModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: logsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["logs", containerName],
    queryFn: () => fetchContainerLogs(containerName!, 500),
    enabled: !!containerName,
    refetchInterval: 3000,
  });

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logsData]);

  if (!containerName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{containerName}</h3>
              <p className="text-xs text-muted-foreground">Container logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Logs content - terminal style dark background */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs leading-relaxed">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !logsData?.logs || logsData.logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No logs available
            </div>
          ) : (
            <div className="space-y-0.5">
              {logsData.logs.map((line, index) => (
                <LogLine key={index} line={line} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary text-xs text-muted-foreground">
          Showing last 500 lines • Auto-refreshing every 3s
        </div>
      </div>
    </div>
  );
}

function LogLine({ line }: { line: string }) {
  // Color code based on log level
  const isError = /error|err|fail|fatal/i.test(line);
  const isWarning = /warn|warning/i.test(line);
  const isInfo = /info/i.test(line);
  const isDebug = /debug|trace/i.test(line);

  let colorClass = "text-slate-300";
  if (isError) colorClass = "text-red-400";
  else if (isWarning) colorClass = "text-amber-400";
  else if (isInfo) colorClass = "text-emerald-400";
  else if (isDebug) colorClass = "text-sky-400";

  // Clean up ANSI codes and format
  const cleanLine = line
    .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
    .replace(/^\s+/, ""); // Trim leading whitespace

  return (
    <div className={`${colorClass} hover:bg-white/10 px-2 py-0.5 rounded whitespace-pre-wrap break-all`}>
      {cleanLine || " "}
    </div>
  );
}

