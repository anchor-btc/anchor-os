"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchContainerLogs } from "@/lib/api";
import {
  FileText,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Search,
  ChevronDown,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Section,
  SectionHeader,
  ActionButton,
} from "@/components/ds";

const CONTAINER_NAME = "anchor-core-bitcoin";

export function NodeLogsTab() {
  const { t } = useTranslation();
  const [tailLines, setTailLines] = useState(200);
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: logsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["node-logs", tailLines],
    queryFn: () => fetchContainerLogs(CONTAINER_NAME, tailLines),
    refetchInterval: 3000,
  });

  const logs = logsData?.logs || [];

  // Filter logs by search
  const filteredLogs = search
    ? logs.filter((log) => log.toLowerCase().includes(search.toLowerCase()))
    : logs;

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
  };

  const downloadLogs = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitcoin-node-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section className="h-[calc(100vh-300px)] min-h-[500px] flex flex-col">
      <SectionHeader
        icon={FileText}
        iconColor="cyan"
        title={t("node.logs", "Logs")}
        subtitle={`${CONTAINER_NAME} - ${t("node.lastNLines", { count: tailLines })}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Tail lines selector */}
            <select
              value={tailLines}
              onChange={(e) => setTailLines(parseInt(e.target.value))}
              className="px-2 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={50}>50 {t("node.lines", "lines")}</option>
              <option value={100}>100 {t("node.lines", "lines")}</option>
              <option value={200}>200 {t("node.lines", "lines")}</option>
              <option value={500}>500 {t("node.lines", "lines")}</option>
              <option value={1000}>1000 {t("node.lines", "lines")}</option>
            </select>

            <ActionButton
              variant="secondary"
              onClick={downloadLogs}
              icon={Download}
              showLabel={false}
            />
            <ActionButton
              variant="refresh"
              onClick={() => refetch()}
              loading={isRefetching}
              showLabel={false}
            />
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("node.searchLogs", "Search logs...")}
          className="w-full pl-10 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {filteredLogs.length} {t("node.matches", "matches")}
          </span>
        )}
      </div>

      {/* Logs Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 bg-[#0d1117] rounded-lg overflow-auto font-mono text-xs"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-12 h-12 mb-2 opacity-50" />
            <p>{search ? t("node.noLogsMatch", "No logs match your search") : t("node.noLogs", "No logs available")}</p>
          </div>
        ) : (
          <div className="p-4 space-y-0.5">
            {filteredLogs.map((line, index) => (
              <LogLine key={index} line={line} search={search} lineNumber={index + 1} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-8 right-8 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </Section>
  );
}

function LogLine({
  line,
  search,
  lineNumber,
}: {
  line: string;
  search: string;
  lineNumber: number;
}) {
  // Determine log level/color
  const getLineColor = () => {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("err:")) return "text-red-400";
    if (lower.includes("warning") || lower.includes("warn:")) return "text-yellow-400";
    if (lower.includes("info:") || lower.includes("[info]")) return "text-blue-400";
    if (lower.includes("debug:") || lower.includes("[debug]")) return "text-gray-500";
    return "text-gray-300";
  };

  // Highlight search term
  const highlightSearch = (text: string) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className={cn("flex hover:bg-white/5 group", getLineColor())}>
      <span className="w-12 text-right pr-4 text-gray-600 select-none shrink-0 group-hover:text-gray-500">
        {lineNumber}
      </span>
      <span className="whitespace-pre-wrap break-all">
        {highlightSearch(line)}
      </span>
    </div>
  );
}

