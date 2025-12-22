"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ServiceDefinition } from "@/lib/api";
import { Terminal, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || "http://localhost:8010";

interface InstallingStepProps {
  progress: number;
  selectedServices: string[];
  availableServices: ServiceDefinition[];
  onComplete?: () => void;
  onError?: (error: string) => void;
}

type LogLine = {
  id: number;
  text: string;
  type: "info" | "build" | "success" | "error" | "cmd" | "out" | "warn";
};

export function InstallingStep({
  selectedServices,
  availableServices,
  onComplete,
  onError,
}: InstallingStepProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<"running" | "success" | "error">("running");
  const [isConnected, setIsConnected] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  
  // Store callbacks in refs to avoid dependency issues
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const selectedServiceDetails = availableServices.filter((s) =>
    selectedServices.includes(s.id)
  );

  // Add a log line
  const addLog = useCallback((text: string, type: LogLine["type"] = "info") => {
    const id = logIdRef.current++;
    setLogs((prev) => [...prev, { id, text, type }]);
  }, []);

  // Parse log line type from prefix
  const parseLogType = useCallback((text: string): { type: LogLine["type"]; cleanText: string } => {
    if (text.startsWith("[SUCCESS]")) return { type: "success", cleanText: text.replace("[SUCCESS] ", "") };
    if (text.startsWith("[ERROR]")) return { type: "error", cleanText: text.replace("[ERROR] ", "") };
    if (text.startsWith("[WARN]")) return { type: "warn", cleanText: text.replace("[WARN] ", "") };
    if (text.startsWith("[CMD]")) return { type: "cmd", cleanText: text.replace("[CMD] ", "") };
    if (text.startsWith("[BUILD]")) return { type: "build", cleanText: text.replace("[BUILD] ", "") };
    if (text.startsWith("[OUT]")) return { type: "out", cleanText: text.replace("[OUT] ", "") };
    if (text.startsWith("[INFO]")) return { type: "info", cleanText: text.replace("[INFO] ", "") };
    return { type: "info", cleanText: text };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Connect to SSE stream
  useEffect(() => {
    let isMounted = true;
    
    addLog("Connecting to installation service...", "info");
    
    const eventSource = new EventSource(`${API_URL}/installation/stream`);
    
    eventSource.onopen = () => {
      if (isMounted) {
        setIsConnected(true);
        addLog("Connected to installation stream", "info");
      }
    };

    eventSource.onmessage = (event) => {
      if (isMounted) {
        const { type, cleanText } = parseLogType(event.data);
        addLog(cleanText, type);
      }
    };

    const handleComplete = (event: Event) => {
      if (!isMounted) return;
      
      const data = (event as MessageEvent).data;
      if (data === "success") {
        setStatus("success");
        addLog("", "info");
        addLog("═══════════════════════════════════════════", "success");
        addLog("  Installation completed successfully! 🎉", "success");
        addLog("═══════════════════════════════════════════", "success");
        addLog("", "info");
        addLog("Redirecting to dashboard in 3 seconds...", "info");
        
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 3000);
      } else {
        setStatus("error");
        addLog("Installation failed. Please check the logs above.", "error");
        onErrorRef.current?.("Installation failed");
      }
      eventSource.close();
    };

    eventSource.addEventListener("complete", handleComplete);

    eventSource.onerror = () => {
      if (isMounted) {
        addLog("Connection error. Retrying...", "warn");
      }
    };

    return () => {
      isMounted = false;
      eventSource.removeEventListener("complete", handleComplete);
      eventSource.close();
    };
  }, [addLog, parseLogType]);

  const getLogColor = (type: LogLine["type"]) => {
    switch (type) {
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "warn": return "text-yellow-400";
      case "cmd": return "text-cyan-400";
      case "build": return "text-blue-300";
      case "out": return "text-gray-300";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          {status === "running" ? (
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          ) : (
            <XCircle className="w-7 h-7 text-red-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold">
          {status === "running" 
            ? t("setup.installing.title", "Installing...") 
            : status === "success"
            ? t("setup.installing.complete", "Installation Complete!")
            : t("setup.installing.failed", "Installation Failed")}
        </h2>
        <p className="text-muted-foreground">
          {status === "running"
            ? t("setup.installing.description", "Building and starting your selected services")
            : status === "success"
            ? t("setup.installing.successDesc", "All services have been configured successfully")
            : t("setup.installing.errorDesc", "There was an error during installation")}
        </p>
      </div>

      {/* Services being installed */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {selectedServiceDetails.slice(0, 8).map((service) => (
          <span
            key={service.id}
            className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
          >
            {service.name}
          </span>
        ))}
        {selectedServiceDetails.length > 8 && (
          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
            +{selectedServiceDetails.length - 8} more
          </span>
        )}
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-border overflow-hidden bg-[#1a1a2e]">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#16162a] border-b border-border/50">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-mono">Installation Log</span>
          <div className="ml-auto flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Terminal content */}
        <div
          ref={terminalRef}
          className="h-[350px] overflow-y-auto p-4 font-mono text-sm"
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className={cn("leading-relaxed", getLogColor(log.type))}
            >
              {log.type === "cmd" && <span className="text-gray-500">$ </span>}
              {log.text}
            </div>
          ))}
          {status === "running" && (
            <div className="flex items-center gap-2 text-primary mt-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="animate-pulse">_</span>
            </div>
          )}
        </div>
      </div>

      {/* Status footer */}
      {status === "success" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {t("setup.installing.redirecting", "Redirecting to dashboard...")}
          </div>
        </div>
      )}
    </div>
  );
}
