"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HardDrive,
  Cloud,
  Server,
  Play,
  RotateCcw,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  FolderArchive,
  Calendar,
  ArrowRight,
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

interface BackupStatus {
  running: boolean;
  current_job: BackupJob | null;
  last_backup: BackupJob | null;
  next_scheduled: string | null;
}

interface StorageTarget {
  name: string;
  storage_type: "local" | "s3" | "smb";
  configured: boolean;
  total_bytes: number | null;
  used_bytes: number | null;
  available_bytes: number | null;
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

function formatTimeAgo(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t("time.justNow");
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
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
      return <HardDrive className="w-5 h-5" />;
    case "s3":
      return <Cloud className="w-5 h-5" />;
    case "smb":
      return <Server className="w-5 h-5" />;
    default:
      return <FolderArchive className="w-5 h-5" />;
  }
}

export default function BackupPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<BackupStatus>({
    queryKey: ["backup-status"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: targets } = useQuery<{ targets: StorageTarget[] }>({
    queryKey: ["backup-targets"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/targets`);
      if (!res.ok) throw new Error("Failed to fetch targets");
      return res.json();
    },
  });

  const { data: history } = useQuery<HistoryResponse>({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const startBackup = useMutation({
    mutationFn: async (target: string) => {
      const res = await fetch(`${BACKUP_API_URL}/backup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          include_databases: true,
          include_volumes: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to start backup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-status"] });
    },
  });

  const isRunning = status?.running || false;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("backup.title")}</h1>
          <p className="text-muted-foreground">{t("backup.subtitle")}</p>
        </div>
        <Link
          href="/backup/settings"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          {t("nav.settings")}
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last Backup */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backup.lastBackup")}</span>
          </div>
          {status?.last_backup ? (
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatTimeAgo(
                  status.last_backup.completed_at || status.last_backup.started_at,
                  t
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon status={status.last_backup.status} />
                <span className="text-sm text-muted-foreground capitalize">
                  {t(`backup.${status.last_backup.status}`)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">{t("backup.noBackupsYet")}</p>
          )}
        </div>

        {/* Next Scheduled */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backup.nextScheduled")}</span>
          </div>
          {status?.next_scheduled ? (
            <div>
              <p className="text-xl font-bold text-foreground">
                {new Date(status.next_scheduled).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(status.next_scheduled).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">{t("backup.notScheduled")}</p>
          )}
        </div>

        {/* Storage Used */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backup.storageUsed")}</span>
          </div>
          {targets?.targets?.[0] ? (
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatBytes(targets.targets[0].used_bytes)}
              </p>
              {targets.targets[0].total_bytes && (
                <p className="text-sm text-muted-foreground">
                  {t("wallet.of")} {formatBytes(targets.targets[0].total_bytes)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">--</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => startBackup.mutate("local")}
          disabled={isRunning || startBackup.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning || startBackup.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? t("backup.backupInProgress") : t("backup.backupNow")}
        </button>
        <button
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("backup.restore")}
        </button>
      </div>

      {/* Current Backup Progress */}
      {status?.current_job && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <p className="font-medium text-foreground">{t("backup.backupProgress")}</p>
              <p className="text-sm text-muted-foreground">
                {t("backup.started")}{" "}
                {formatTimeAgo(status.current_job.started_at, t)} • {t("backup.target")}:{" "}
                {status.current_job.target}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Storage Targets */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("backup.backupTargets")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {targets?.targets?.map((target) => (
            <div
              key={target.storage_type}
              className={`bg-card border rounded-xl p-4 ${
                target.configured
                  ? "border-border"
                  : "border-dashed border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    target.configured
                      ? "bg-green-500/10 text-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <TargetIcon type={target.storage_type} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{target.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {target.configured ? t("backup.configured") : t("backup.notConfigured")}
                  </p>
                </div>
              </div>
              {target.configured && target.used_bytes !== null && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t("backup.used")}</span>
                    <span className="text-foreground">{formatBytes(target.used_bytes)}</span>
                  </div>
                  {target.total_bytes && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (target.used_bytes / target.total_bytes) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Backups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("backup.recentBackups")}
          </h2>
          <Link
            href="/backup/history"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {t("backup.viewAll")} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.date")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.type")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.target")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.size")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.status")}
                </th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {history?.backups?.slice(0, 5).map((backup) => (
                <tr
                  key={backup.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="p-3">
                    <span className="text-sm text-foreground">
                      {new Date(backup.started_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground capitalize">
                      {t(`backup.${backup.backup_type}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground capitalize">
                      {t(`backup.${backup.target}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-foreground">
                      {formatBytes(backup.size_bytes)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={backup.status} />
                      <span className="text-sm capitalize">
                        {t(`backup.${backup.status}`)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {backup.status === "completed" && (
                      <button className="text-sm text-primary hover:underline">
                        {t("backup.restore")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!history?.backups || history.backups.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {t("backup.noBackupsCreate")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
