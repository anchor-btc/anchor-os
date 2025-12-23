"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertTriangle,
  X,
  Database,
  FolderArchive,
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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResponse | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState<Snapshot | null>(null);

  const { data: history, isLoading } = useQuery<HistoryResponse>({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: snapshots } = useQuery<SnapshotsResponse>({
    queryKey: ["backup-snapshots"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/snapshots/local`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
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

  const handleRestoreClick = (backupId: string) => {
    // Find the corresponding snapshot by matching time (approximate)
    // Backup jobs and snapshots are created at roughly the same time
    const backup = history?.backups?.find(b => b.id === backupId);
    if (!backup) return;
    
    // Try to find a snapshot that was created around the same time
    const backupTime = new Date(backup.started_at).getTime();
    const matchingSnapshot = snapshots?.snapshots?.find(s => {
      const snapshotTime = new Date(s.time).getTime();
      // Match if within 5 minutes
      return Math.abs(snapshotTime - backupTime) < 5 * 60 * 1000;
    });
    
    if (matchingSnapshot) {
      setPendingSnapshot(matchingSnapshot);
      setShowConfirmDialog(true);
    } else {
      // If no matching snapshot, show the restore modal to pick one
      setShowRestoreModal(true);
    }
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

  const handleRestoreFromModal = (snapshot: Snapshot) => {
    setPendingSnapshot(snapshot);
    setShowRestoreModal(false);
    setShowConfirmDialog(true);
  };

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
                            onClick={() => handleRestoreClick(backup.id)}
                            disabled={isRestoring}
                            className="p-1.5 hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50"
                            title={t("backupHistory.restore")}
                          >
                            {isRestoring && selectedSnapshot ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-primary" />
                            )}
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
          </div>
        </div>
      )}

      {/* Restore Result Modal */}
      {restoreResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Restore {restoreResult.success ? "Complete" : "Failed"}
              </h3>
              <button
                onClick={() => setRestoreResult(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`rounded-lg p-4 ${
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
                  
                  {restoreResult.duration_ms && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed in {(restoreResult.duration_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                  
                  {restoreResult.databases_restored && restoreResult.databases_restored.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Database className="w-4 h-4" />
                        Databases Restored
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
                  
                  {restoreResult.volumes_restored && restoreResult.volumes_restored.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        <FolderArchive className="w-4 h-4" />
                        Volumes Restored
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
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setRestoreResult(null)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
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

      {/* Snapshot Selection Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Select Snapshot to Restore
              </h2>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              No matching snapshot found for this backup job. Please select a snapshot manually:
            </p>

            <div className="space-y-2">
              {!snapshots?.snapshots?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No snapshots available
                </div>
              ) : (
                snapshots.snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
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
                          {snapshot.paths.length} paths • {snapshot.hostname}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreFromModal(snapshot)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
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
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
