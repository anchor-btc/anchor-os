"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  HardDrive,
  Cloud,
  Server,
  Save,
  Clock,
  Database,
  FolderArchive,
  Check,
  X,
  Loader2,
  Folder,
  File,
  RefreshCw,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const BACKUP_API_URL = process.env.NEXT_PUBLIC_BACKUP_URL || "http://localhost:8003";

interface StorageTarget {
  name: string;
  storage_type: "local" | "s3" | "smb";
  configured: boolean;
  total_bytes: number | null;
  used_bytes: number | null;
  available_bytes: number | null;
}

interface BackupSettings {
  schedule: {
    enabled: boolean;
    cron_expression: string;
    target: string;
    include_databases: boolean;
    include_volumes: boolean;
    retention_days: number;
    keep_last: number;
  };
  s3: {
    endpoint: string;
    bucket: string;
    access_key: string;
    secret_key: string;
    region: string;
  };
  smb: {
    host: string;
    share: string;
    username: string;
    password: string;
    mount_point: string;
  };
}

interface LocalFile {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  modified: string | null;
}

interface LocalFilesResponse {
  path: string;
  host_path: string | null;
  files: LocalFile[];
  total_size: number;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString();
}

export default function BackupSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery<BackupSettings>({
    queryKey: ["backup-settings"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const { data: targets } = useQuery<{ targets: StorageTarget[] }>({
    queryKey: ["backup-targets"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/targets`);
      if (!res.ok) throw new Error("Failed to fetch targets");
      return res.json();
    },
  });

  const { data: localFiles, isLoading: filesLoading, refetch: refetchFiles } = useQuery<LocalFilesResponse>({
    queryKey: ["backup-local-files"],
    queryFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/local/files`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
  });

  const [schedule, setSchedule] = useState({
    enabled: false,
    cron_expression: "0 3 * * *",
    target: "local",
    include_databases: true,
    include_volumes: true,
    retention_days: 30,
    keep_last: 10,
  });

  const [s3Config, setS3Config] = useState({
    endpoint: "",
    bucket: "",
    access_key: "",
    secret_key: "",
    region: "us-east-1",
  });

  const [smbConfig, setSmbConfig] = useState({
    host: "",
    share: "",
    username: "",
    password: "",
    mount_point: "/mnt/nas",
  });

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      setSchedule(settings.schedule);
      setS3Config(settings.s3);
      setSmbConfig(settings.smb);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BACKUP_API_URL}/backup/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule,
          s3: s3Config,
          smb: smbConfig,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-settings"] });
      queryClient.invalidateQueries({ queryKey: ["backup-targets"] });
    },
  });

  const schedulePresets = [
    { label: "Daily at 3 AM", value: "0 3 * * *" },
    { label: "Daily at midnight", value: "0 0 * * *" },
    { label: "Every 6 hours", value: "0 */6 * * *" },
    { label: "Every 12 hours", value: "0 */12 * * *" },
    { label: "Weekly (Sunday)", value: "0 3 * * 0" },
    { label: "Monthly (1st)", value: "0 3 1 * *" },
  ];

  if (settingsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-foreground">Backup Settings</h1>
          <p className="text-muted-foreground">
            Configure backup targets and scheduling
          </p>
        </div>
      </div>

      {/* Local Storage Files */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Local Storage
              </h2>
              <p className="text-sm text-muted-foreground font-mono">
                {localFiles?.host_path || localFiles?.path || "/backups"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Total: {formatBytes(localFiles?.total_size || 0)}
            </span>
            {localFiles?.host_path && (
              <button
                onClick={() => {
                  // Copy path to clipboard and show instruction
                  navigator.clipboard.writeText(localFiles.host_path!);
                  // Open file:// URL (works on some browsers)
                  window.open(`file://${localFiles.host_path}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors"
                title="Open in Finder"
              >
                <FolderOpen className="w-4 h-4" />
                Open Folder
              </button>
            )}
            <button
              onClick={() => refetchFiles()}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${filesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Size</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Modified</th>
              </tr>
            </thead>
            <tbody>
              {filesLoading ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : localFiles?.files && localFiles.files.length > 0 ? (
                localFiles.files.map((file) => (
                  <tr key={file.path} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {file.is_dir ? (
                          <Folder className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <File className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-foreground font-mono">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">{formatBytes(file.size)}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground">{formatDate(file.modified)}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">
                    No backup files yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Automatic Backups
            </h2>
            <p className="text-sm text-muted-foreground">
              Schedule regular backups
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Enable scheduled backups
            </label>
            <button
              onClick={() =>
                setSchedule((s) => ({ ...s, enabled: !s.enabled }))
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                schedule.enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  schedule.enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Schedule preset */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Schedule
            </label>
            <select
              value={schedule.cron_expression}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, cron_expression: e.target.value }))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            >
              {schedulePresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Backup target
            </label>
            <select
              value={schedule.target}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, target: e.target.value }))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            >
              <option value="local">Local Storage</option>
              <option value="s3">Amazon S3</option>
              <option value="smb">NAS / SMB</option>
            </select>
          </div>

          {/* What to backup */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.include_databases}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    include_databases: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-border"
              />
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Databases</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.include_volumes}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    include_volumes: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-border"
              />
              <FolderArchive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Docker Volumes</span>
            </label>
          </div>

          {/* Retention */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Keep backups for (days)
              </label>
              <input
                type="number"
                value={schedule.retention_days}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    retention_days: parseInt(e.target.value) || 30,
                  }))
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Keep last N backups
              </label>
              <input
                type="number"
                value={schedule.keep_last}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    keep_last: parseInt(e.target.value) || 10,
                  }))
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* S3 Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Amazon S3 / S3-Compatible
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure S3 bucket for cloud backups
            </p>
          </div>
          {targets?.targets?.find((t) => t.storage_type === "s3")?.configured ? (
            <span className="flex items-center gap-1 text-sm text-green-500">
              <Check className="w-4 h-4" /> Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <X className="w-4 h-4" /> Not configured
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Endpoint URL
            </label>
            <input
              type="text"
              value={s3Config.endpoint}
              onChange={(e) =>
                setS3Config((s) => ({ ...s, endpoint: e.target.value }))
              }
              placeholder="s3.amazonaws.com"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Bucket Name
            </label>
            <input
              type="text"
              value={s3Config.bucket}
              onChange={(e) =>
                setS3Config((s) => ({ ...s, bucket: e.target.value }))
              }
              placeholder="my-backup-bucket"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Access Key ID
            </label>
            <input
              type="text"
              value={s3Config.access_key}
              onChange={(e) =>
                setS3Config((s) => ({ ...s, access_key: e.target.value }))
              }
              placeholder="AKIA..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Secret Access Key
            </label>
            <input
              type="password"
              value={s3Config.secret_key}
              onChange={(e) =>
                setS3Config((s) => ({ ...s, secret_key: e.target.value }))
              }
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* SMB Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              NAS / SMB Share
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure network storage (Synology, QNAP, etc.)
            </p>
          </div>
          {targets?.targets?.find((t) => t.storage_type === "smb")?.configured ? (
            <span className="flex items-center gap-1 text-sm text-green-500">
              <Check className="w-4 h-4" /> Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <X className="w-4 h-4" /> Not configured
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Host / IP
            </label>
            <input
              type="text"
              value={smbConfig.host}
              onChange={(e) =>
                setSmbConfig((s) => ({ ...s, host: e.target.value }))
              }
              placeholder="192.168.1.100"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Share Name
            </label>
            <input
              type="text"
              value={smbConfig.share}
              onChange={(e) =>
                setSmbConfig((s) => ({ ...s, share: e.target.value }))
              }
              placeholder="backups"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={smbConfig.username}
              onChange={(e) =>
                setSmbConfig((s) => ({ ...s, username: e.target.value }))
              }
              placeholder="admin"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={smbConfig.password}
              onChange={(e) =>
                setSmbConfig((s) => ({ ...s, password: e.target.value }))
              }
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        {saveSettings.isSuccess && (
          <span className="flex items-center gap-2 text-sm text-green-500">
            <Check className="w-4 h-4" />
            Settings saved!
          </span>
        )}
        <button
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saveSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
