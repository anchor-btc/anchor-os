"use client";

import { useState } from "react";
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
  X,
  AlertTriangle,
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

interface Snapshot {
  id: string;
  short_id: string;
  time: string;
  hostname: string;
  tags: string[];
  paths: string[];
}

interface SnapshotsResponse {
  snapshots: Snapshot[];
}

interface RestoreResponse {
  success: boolean;
  message: string;
  job_id?: string;
  databases_restored?: string[];
  databases_failed?: string[];
  volumes_restored?: string[];
  volumes_failed?: string[];
  errors?: string[];
  duration_ms?: number;
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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResponse | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState<Snapshot | null>(null);

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

  const { data: snapshots, refetch: refetchSnapshots } = useQuery<SnapshotsResponse>({
    queryKey: ["backup-snapshots"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/snapshots/local`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const restoreBackup = useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await fetch(`${BACKUP_API_URL}/backup/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot_id: snapshotId,
          target: "local",
        }),
      });
      if (!res.ok) throw new Error("Failed to restore backup");
      return res.json() as Promise<RestoreResponse>;
    },
    onSuccess: (data) => {
      setRestoreResult(data);
      setIsRestoring(false);
      queryClient.invalidateQueries({ queryKey: ["backup-status"] });
    },
    onError: (error) => {
      setRestoreResult({ success: false, message: error.message, errors: [error.message] });
      setIsRestoring(false);
    },
  });

  const handleRestore = (snapshot: Snapshot) => {
    setPendingSnapshot(snapshot);
    setShowConfirmDialog(true);
  };

  const confirmRestore = () => {
    if (!pendingSnapshot) return;
    setSelectedSnapshot(pendingSnapshot);
    setIsRestoring(true);
    setRestoreResult(null);
    setShowConfirmDialog(false);
    restoreBackup.mutate(pendingSnapshot.id);
  };

  const cancelRestore = () => {
    setShowConfirmDialog(false);
    setPendingSnapshot(null);
  };

  const openRestoreModal = () => {
    setShowRestoreModal(true);
    setSelectedSnapshot(null);
    setRestoreResult(null);
    refetchSnapshots();
  };

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
          onClick={openRestoreModal}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("backup.restore")}
        </button>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {t("backup.restoreFromBackup")}
              </h2>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">{t("backup.restoreWarningTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("backup.restoreWarningMessage")}
                  </p>
                </div>
              </div>
            </div>

            {/* Restore Result */}
            {restoreResult && (
              <div className={`rounded-lg p-4 mb-4 ${
                restoreResult.success 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                <div className="flex items-start gap-3">
                  {restoreResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${restoreResult.success ? "text-green-500" : "text-red-500"}`}>
                      {restoreResult.message}
                    </p>
                    
                    {/* Duration */}
                    {restoreResult.duration_ms && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed in {(restoreResult.duration_ms / 1000).toFixed(1)}s
                      </p>
                    )}
                    
                    {/* Databases Restored */}
                    {restoreResult.databases_restored && restoreResult.databases_restored.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Database className="w-4 h-4" />
                          Databases Restored ({restoreResult.databases_restored.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {restoreResult.databases_restored.map((db) => (
                            <span key={db} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                              {db}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Databases Failed */}
                    {restoreResult.databases_failed && restoreResult.databases_failed.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-400 flex items-center gap-1">
                          <Database className="w-4 h-4" />
                          Databases Failed ({restoreResult.databases_failed.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {restoreResult.databases_failed.map((db) => (
                            <span key={db} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                              {db}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Volumes Restored */}
                    {restoreResult.volumes_restored && restoreResult.volumes_restored.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1">
                          <FolderArchive className="w-4 h-4" />
                          Volumes Restored ({restoreResult.volumes_restored.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {restoreResult.volumes_restored.map((vol) => (
                            <span key={vol} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              {vol}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Volumes Failed */}
                    {restoreResult.volumes_failed && restoreResult.volumes_failed.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-400 flex items-center gap-1">
                          <FolderArchive className="w-4 h-4" />
                          Volumes Failed ({restoreResult.volumes_failed.length})
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {restoreResult.volumes_failed.map((vol) => (
                            <span key={vol} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                              {vol}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Errors */}
                    {restoreResult.errors && restoreResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-400">Errors:</p>
                        <ul className="mt-1 space-y-1">
                          {restoreResult.errors.map((error, i) => (
                            <li key={i} className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Snapshots List */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                {t("backup.selectSnapshotToRestore")}
              </p>
              
              {!snapshots?.snapshots?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("backup.noSnapshotsFound")}
                </div>
              ) : (
                snapshots.snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedSnapshot?.id === snapshot.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary">
                            {snapshot.short_id}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(snapshot.time).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {snapshot.paths.length} {t("backup.files")} • {snapshot.hostname}
                        </p>
                        {snapshot.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {snapshot.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRestore(snapshot)}
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRestoring && selectedSnapshot?.id === snapshot.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        {t("backup.restore")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                {t("backup.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore In Progress Overlay */}
      {isRestoring && !restoreResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-card border border-border rounded-xl p-8 w-full max-w-md mx-4 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">
              Restoring from Backup
            </h3>
            <p className="text-muted-foreground mb-4">
              This may take several minutes. Please do not close this page.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Extracting snapshot...</p>
              <p>Stopping affected containers...</p>
              <p>Restoring databases and volumes...</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingSnapshot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Confirm Restore
              </h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground">
                You are about to restore from snapshot:
              </p>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-mono text-sm text-primary">{pendingSnapshot.short_id}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(pendingSnapshot.time).toLocaleString()}
                </p>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400 font-medium">Warning: This action will:</p>
                <ul className="text-sm text-red-400/80 mt-2 space-y-1 list-disc list-inside">
                  <li>Stop affected containers temporarily</li>
                  <li>Overwrite current database data</li>
                  <li>Replace Docker volume contents</li>
                  <li>Restart services after restore</li>
                </ul>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This operation may take several minutes. Do not close this page.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelRestore}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Yes, Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Recent Backup Jobs (from memory) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("backup.recentJobs")}
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
              {history?.backups?.slice(0, 5).map((backup) => {
                // Find matching snapshot for this backup job
                const backupTime = new Date(backup.started_at).getTime();
                const matchingSnapshot = snapshots?.snapshots?.find(s => {
                  const snapshotTime = new Date(s.time).getTime();
                  return Math.abs(snapshotTime - backupTime) < 5 * 60 * 1000;
                });
                
                return (
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
                      {backup.status === "completed" && matchingSnapshot && (
                        <button
                          onClick={() => handleRestore(matchingSnapshot)}
                          disabled={isRestoring}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t("backup.restore")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!history?.backups || history.backups.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {t("backup.noJobsYet")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshots (from Restic - for restore) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("backup.availableSnapshots")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {snapshots?.snapshots?.length || 0} {t("backup.snapshotsAvailable")}
          </span>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.snapshotId")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.date")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.hostname")}
                </th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.contents")}
                </th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                  {t("backup.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshots?.snapshots?.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="p-3">
                    <span className="text-sm font-mono text-primary">
                      {snapshot.short_id}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-foreground">
                      {new Date(snapshot.time).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {snapshot.hostname}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {snapshot.paths.some(p => p.includes('/databases/')) && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          Databases
                        </span>
                      )}
                      {snapshot.paths.some(p => p.includes('/volumes/')) && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          Volumes
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({snapshot.paths.length} {t("backup.files")})
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => handleRestore(snapshot)}
                      disabled={isRestoring}
                      className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 disabled:opacity-50 ml-auto"
                    >
                      {isRestoring && selectedSnapshot?.id === snapshot.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {t("backup.restoring")}
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          {t("backup.restore")}
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {(!snapshots?.snapshots || snapshots.snapshots.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {t("backup.noSnapshotsFound")}
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
