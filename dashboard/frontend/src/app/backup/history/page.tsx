"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  HardDrive,
  Cloud,
  Server,
  Download,
  RotateCcw,
  Trash2,
  Search,
  Calendar,
} from "lucide-react";
import Link from "next/link";

const BACKUP_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

interface BackupJob {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  backup_type: "full" | "incremental";
  target: "local" | "s3" | "smb";
  size_bytes: number | null;
  files_count: number | null;
  error_message: string | null;
}

interface HistoryResponse {
  backups: BackupJob[];
  total: number;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDuration(startStr: string, endStr: string | null, t: (key: string) => string): string {
  if (!endStr) return t("backupHistory.inProgress");
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
  return `${Math.round(diffMs / 3600000)}h`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function TargetIcon({ type }: { type: string }) {
  switch (type) {
    case "local":
      return <HardDrive className="w-4 h-4" />;
    case "s3":
      return <Cloud className="w-4 h-4" />;
    case "smb":
      return <Server className="w-4 h-4" />;
    default:
      return <HardDrive className="w-4 h-4" />;
  }
}

export default function BackupHistoryPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: history, isLoading } = useQuery<HistoryResponse>({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const filteredBackups = history?.backups?.filter((backup) => {
    if (filter === "completed" && backup.status !== "completed") return false;
    if (filter === "failed" && backup.status !== "failed") return false;
    if (searchTerm && !backup.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const stats = {
    total: history?.total || 0,
    completed: history?.backups?.filter((b) => b.status === "completed").length || 0,
    failed: history?.backups?.filter((b) => b.status === "failed").length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/backup"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("backupHistory.title")}</h1>
          <p className="text-muted-foreground">
            {t("backupHistory.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backupHistory.totalBackups")}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backupHistory.successful")}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backupHistory.failed")}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("backupHistory.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("backupHistory.all")}
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("backupHistory.completed")}
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "failed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("backupHistory.failed")}
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.status")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.dateTime")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.id")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.type")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.target")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.size")}
              </th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.duration")}
              </th>
              <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                {t("backupHistory.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : filteredBackups && filteredBackups.length > 0 ? (
              filteredBackups.map((backup) => (
                <tr
                  key={backup.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={backup.status} />
                      <span className="text-sm capitalize">{backup.status}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-foreground">
                      {new Date(backup.started_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {backup.id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground capitalize">
                      {backup.backup_type}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TargetIcon type={backup.target} />
                      <span className="text-sm capitalize">{backup.target}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-foreground">
                      {formatBytes(backup.size_bytes)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(backup.started_at, backup.completed_at, t)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {backup.status === "completed" && (
                        <>
                          <button
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            title={t("backupHistory.restore")}
                          >
                            <RotateCcw className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            title={t("backupHistory.download")}
                          >
                            <Download className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </>
                      )}
                      <button
                        className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors"
                        title={t("backupHistory.delete")}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  {filter !== "all"
                    ? t("backupHistory.noFilteredBackups", { filter: t(`backupHistory.${filter}`) })
                    : t("backupHistory.noBackupsYet")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination placeholder */}
      {filteredBackups && filteredBackups.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("backupHistory.showing", { count: filteredBackups.length, total: history?.total || 0 })}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="px-3 py-1.5 bg-muted rounded-md disabled:opacity-50"
            >
              {t("backupHistory.previous")}
            </button>
            <button
              disabled
              className="px-3 py-1.5 bg-muted rounded-md disabled:opacity-50"
            >
              {t("backupHistory.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
