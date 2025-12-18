"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDrive, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

const BACKUP_URL = process.env.NEXT_PUBLIC_BACKUP_URL || "http://localhost:8003";

interface BackupStatus {
  running: boolean;
  last_backup: {
    id: string;
    started_at: string;
    completed_at: string;
    status: string;
    size_bytes: number;
  } | null;
  next_scheduled: string | null;
}

async function fetchBackupStatus(): Promise<BackupStatus> {
  const res = await fetch(`${BACKUP_URL}/backup/status`);
  if (!res.ok) throw new Error("Failed to fetch backup status");
  return res.json();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function BackupStatusWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["backup-status"],
    queryFn: fetchBackupStatus,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-14">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Link href="/backup" className="block">
        <div className="bg-card border border-border rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Backup</p>
              <p className="text-sm text-muted-foreground">Unavailable</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const lastBackup = data.last_backup;
  const isHealthy = lastBackup?.status === "completed";

  return (
    <Link href="/backup" className="block">
      <div className="bg-card border border-border rounded-xl p-4 card-hover">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isHealthy ? "bg-success/10" : "bg-warning/10"}`}>
              <HardDrive className={`w-4 h-4 ${isHealthy ? "text-success" : "text-warning"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Backup Status</p>
              {lastBackup ? (
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span>{formatTimeAgo(lastBackup.completed_at)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground font-normal">{formatBytes(lastBackup.size_bytes)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No backups yet</p>
              )}
            </div>
          </div>

          {data.running && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
