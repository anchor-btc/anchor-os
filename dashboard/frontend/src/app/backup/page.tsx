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

// Import DS components
import {
  PageHeader,
  Section,
  Grid,
  StatCard,
  ActionButton,
  InfoBox,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/components/ds";

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
    refetchInterval: 30000,
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FolderArchive}
        iconColor="blue"
        title={t("backup.title")}
        subtitle={t("backup.subtitle")}
        actions={
          <Link
            href="/backup/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            {t("nav.settings")}
          </Link>
        }
      />

      {/* Status Cards */}
      <Grid cols={{ default: 1, md: 3 }} gap="md">
        <StatCard
          icon={Clock}
          label={t("backup.lastBackup")}
          value={
            status?.last_backup
              ? formatTimeAgo(
                  status.last_backup.completed_at || status.last_backup.started_at,
                  t
                )
              : t("backup.noBackupsYet")
          }
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label={t("backup.nextScheduled")}
          value={
            status?.next_scheduled
              ? new Date(status.next_scheduled).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : t("backup.notScheduled")
          }
          color="purple"
        />
        <StatCard
          icon={Database}
          label={t("backup.storageUsed")}
          value={
            targets?.targets?.[0]
              ? formatBytes(targets.targets[0].used_bytes)
              : "--"
          }
          color="emerald"
        />
      </Grid>

      {/* Actions */}
      <div className="flex gap-3">
        <ActionButton
          variant="primary"
          loading={isRunning || startBackup.isPending}
          onClick={() => startBackup.mutate("local")}
          disabled={isRunning || startBackup.isPending}
          icon={Play}
          label={isRunning ? t("backup.backupInProgress") : t("backup.backupNow")}
        />
        <ActionButton
          variant="secondary"
          onClick={openRestoreModal}
          disabled={isRunning}
          icon={RotateCcw}
          label={t("backup.restore")}
        />
      </div>

      {/* Current Backup Progress */}
      {status?.current_job && (
        <InfoBox variant="info" icon={Loader2} title={t("backup.backupProgress")}>
          {t("backup.started")} {formatTimeAgo(status.current_job.started_at, t)} • {t("backup.target")}: {status.current_job.target}
        </InfoBox>
      )}

      {/* Storage Targets */}
      <Section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("backup.backupTargets")}
        </h2>
        <Grid cols={{ default: 1, md: 3 }} gap="md">
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
        </Grid>
      </Section>

      {/* Recent Backup Jobs */}
      <Section>
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
        <div className="overflow-hidden rounded-lg border border-border">
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
      </Section>

      {/* Available Snapshots */}
      <Section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("backup.availableSnapshots")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {snapshots?.snapshots?.length || 0} {t("backup.snapshotsAvailable")}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
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
      </Section>

      {/* Restore Modal */}
      <Modal open={showRestoreModal} onClose={() => setShowRestoreModal(false)} className="max-w-2xl">
        <ModalHeader
          icon={RotateCcw}
          iconColor="blue"
          title={t("backup.restoreFromBackup")}
          onClose={() => setShowRestoreModal(false)}
        />
        <ModalContent className="max-h-[60vh] overflow-y-auto">
          <InfoBox variant="warning" icon={AlertTriangle} title={t("backup.restoreWarningTitle")} className="mb-4">
            {t("backup.restoreWarningMessage")}
          </InfoBox>

          {restoreResult && (
            <InfoBox 
              variant={restoreResult.success ? "success" : "error"} 
              className="mb-4"
              title={restoreResult.message}
            >
              {restoreResult.duration_ms && (
                <p className="text-xs mt-1">Completed in {(restoreResult.duration_ms / 1000).toFixed(1)}s</p>
              )}
              {restoreResult.databases_restored && restoreResult.databases_restored.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Databases Restored ({restoreResult.databases_restored.length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {restoreResult.databases_restored.map((db) => (
                      <span key={db} className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">{db}</span>
                    ))}
                  </div>
                </div>
              )}
              {restoreResult.errors && restoreResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Errors:</p>
                  <ul className="mt-1 space-y-1">
                    {restoreResult.errors.map((error, i) => (
                      <li key={i} className="text-xs bg-error/10 px-2 py-1 rounded">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </InfoBox>
          )}

          <p className="text-sm text-muted-foreground mb-2">
            {t("backup.selectSnapshotToRestore")}
          </p>
          
          {!snapshots?.snapshots?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("backup.noSnapshotsFound")}
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.snapshots.map((snapshot) => (
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
                        <span className="font-mono text-sm text-primary">{snapshot.short_id}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(snapshot.time).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {snapshot.paths.length} {t("backup.files")} • {snapshot.hostname}
                      </p>
                    </div>
                    <ActionButton
                      variant="primary"
                      loading={isRestoring && selectedSnapshot?.id === snapshot.id}
                      onClick={() => handleRestore(snapshot)}
                      disabled={isRestoring}
                      icon={RotateCcw}
                      label={t("backup.restore")}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <ActionButton variant="secondary" onClick={() => setShowRestoreModal(false)} label={t("backup.close")} />
        </ModalFooter>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal open={showConfirmDialog} onClose={cancelRestore}>
        <ModalHeader
          icon={AlertTriangle}
          iconColor="red"
          title="Confirm Restore"
          onClose={cancelRestore}
        />
        <ModalContent>
          <p className="text-muted-foreground mb-4">You are about to restore from snapshot:</p>
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="font-mono text-sm text-primary">{pendingSnapshot?.short_id}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingSnapshot && new Date(pendingSnapshot.time).toLocaleString()}
            </p>
          </div>
          
          <InfoBox variant="error" title="Warning: This action will:" className="mb-4">
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Stop affected containers temporarily</li>
              <li>Overwrite current database data</li>
              <li>Replace Docker volume contents</li>
              <li>Restart services after restore</li>
            </ul>
          </InfoBox>
          
          <p className="text-sm text-muted-foreground">
            This operation may take several minutes. Do not close this page.
          </p>
        </ModalContent>
        <ModalFooter>
          <ActionButton variant="secondary" onClick={cancelRestore} label="Cancel" />
          <ActionButton variant="destructive" onClick={confirmRestore} icon={RotateCcw} label="Yes, Restore Now" />
        </ModalFooter>
      </Modal>

      {/* Restore In Progress Overlay */}
      {isRestoring && !restoreResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <Section className="w-full max-w-md mx-4 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Restoring from Backup</h3>
            <p className="text-muted-foreground mb-4">
              This may take several minutes. Please do not close this page.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Extracting snapshot...</p>
              <p>Stopping affected containers...</p>
              <p>Restoring databases and volumes...</p>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
