"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchMnemonic,
  fetchWalletInfo,
  fetchDescriptors,
  exportBackup,
  verifyBackup,
  type MnemonicResponse,
  type WalletInfoResponse,
  type EncryptedBackup,
} from "@/lib/api";
import {
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Upload,
  AlertTriangle,
  Key,
  FileKey,
  Fingerprint,
  RefreshCw,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, SectionHeader, ActionButton } from "@/components/ds";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BackupSectionProps {
  t: any; // i18next TFunction
}

export function BackupSection({ t }: BackupSectionProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedWord, setCopiedWord] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [uploadedBackup, setUploadedBackup] = useState<EncryptedBackup | null>(null);

  const { data: walletInfo, isLoading: infoLoading } = useQuery({
    queryKey: ["wallet-info"],
    queryFn: fetchWalletInfo,
    refetchInterval: 30000,
  });

  const { data: mnemonicData, isLoading: mnemonicLoading, refetch: refetchMnemonic } = useQuery({
    queryKey: ["wallet-mnemonic"],
    queryFn: fetchMnemonic,
    enabled: showMnemonic,
  });

  const { data: descriptors } = useQuery({
    queryKey: ["wallet-descriptors"],
    queryFn: fetchDescriptors,
    enabled: walletInfo?.bdk_enabled ?? false,
  });

  const exportMutation = useMutation({
    mutationFn: (password: string) => exportBackup(password),
    onSuccess: (data) => {
      if (data.success && data.backup) {
        // Download the backup as JSON file
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `anchor-wallet-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
        setExportPassword("");
      }
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ backup, password }: { backup: EncryptedBackup; password: string }) =>
      verifyBackup(backup, password),
  });

  const handleCopyWord = async (word: string, index: number) => {
    await navigator.clipboard.writeText(word);
    setCopiedWord(index);
    setTimeout(() => setCopiedWord(null), 2000);
  };

  const handleCopyAll = async () => {
    if (mnemonicData?.words) {
      await navigator.clipboard.writeText(mnemonicData.words.join(" "));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backup = JSON.parse(event.target?.result as string);
          setUploadedBackup(backup);
          setShowVerifyModal(true);
        } catch {
          alert("Invalid backup file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleVerify = () => {
    if (uploadedBackup && verifyPassword) {
      verifyMutation.mutate({ backup: uploadedBackup, password: verifyPassword });
    }
  };

  if (infoLoading) {
    return (
      <Section className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Info Card */}
      <Section>
        <SectionHeader
          icon={Fingerprint}
          iconColor="primary"
          title={t("wallet.backup.walletInfo", "Wallet Information")}
        />

        {walletInfo ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <InfoItem
              label="Fingerprint"
              value={walletInfo.fingerprint}
              mono
            />
            <InfoItem
              label="Network"
              value={walletInfo.network}
            />
            <InfoItem
              label="Address Type"
              value={walletInfo.address_type}
            />
            <InfoItem
              label="Derivation Path"
              value={walletInfo.derivation_path}
              mono
            />
            <InfoItem
              label="Addresses Used"
              value={walletInfo.addresses_used.toString()}
            />
            <InfoItem
              label="BDK Enabled"
              value={walletInfo.bdk_enabled ? "Yes" : "No"}
              color={walletInfo.bdk_enabled ? "text-success" : "text-muted-foreground"}
            />
            <InfoItem
              label="Has Mnemonic"
              value={walletInfo.has_mnemonic ? "Yes" : "No"}
              color={walletInfo.has_mnemonic ? "text-success" : "text-warning"}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">Wallet information not available</p>
        )}
      </Section>

      {/* Seed Phrase Section */}
      {walletInfo?.has_mnemonic && (
        <Section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              icon={Key}
              iconColor="warning"
              title={t("wallet.backup.seedPhrase", "Seed Phrase")}
            />
            <ActionButton
              variant={showMnemonic ? "secondary" : "primary"}
              onClick={() => setShowMnemonic(!showMnemonic)}
              icon={showMnemonic ? EyeOff : Eye}
              label={showMnemonic ? "Hide" : "Reveal"}
            />
          </div>

          {showMnemonic ? (
            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {t("wallet.backup.warning", "Never share your seed phrase!")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Anyone with these words can steal your Bitcoin. Store them securely offline.
                  </p>
                </div>
              </div>

              {/* Seed Words Grid */}
              {mnemonicLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : mnemonicData?.words ? (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {mnemonicData.words.map((word, index) => (
                      <button
                        key={index}
                        onClick={() => handleCopyWord(word, index)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                          "bg-muted/50 hover:bg-muted border-border",
                          copiedWord === index && "bg-success/10 border-success/30"
                        )}
                      >
                        <span className="text-xs text-muted-foreground w-5 text-right">
                          {index + 1}.
                        </span>
                        <span className="font-mono text-sm text-foreground">{word}</span>
                        {copiedWord === index && (
                          <Check className="w-3 h-3 text-success ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCopyAll}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedAll ? (
                        <>
                          <Check className="w-4 h-4 text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy All Words
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Mnemonic not available</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Click "Reveal" to show your 24-word recovery phrase. Make sure no one is watching.
            </p>
          )}
        </Section>
      )}

      {/* Descriptors Section */}
      {descriptors && (
        <Section>
          <SectionHeader
            icon={FileKey}
            iconColor="blue"
            title={t("wallet.backup.descriptors", "Wallet Descriptors")}
          />
          <p className="text-sm text-muted-foreground mb-4">
            Use these descriptors to create a watch-only wallet in other software.
          </p>

          <div className="space-y-4">
            <DescriptorItem label="External (Receiving)" value={descriptors.external} />
            <DescriptorItem label="Internal (Change)" value={descriptors.internal} />
          </div>
        </Section>
      )}

      {/* Export/Import Section */}
      <Section>
        <SectionHeader
          icon={Shield}
          iconColor="success"
          title={t("wallet.backup.exportImport", "Backup & Restore")}
        />
        <p className="text-sm text-muted-foreground mb-4">
          Create an encrypted backup file or verify an existing backup.
        </p>

        <div className="flex flex-wrap gap-4">
          <ActionButton
            variant="primary"
            onClick={() => setShowExportModal(true)}
            icon={Download}
            label="Export Backup"
            disabled={!walletInfo?.has_mnemonic}
          />

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors">
              <Upload className="w-4 h-4" />
              Verify Backup
            </div>
          </label>
        </div>
      </Section>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Export Encrypted Backup
              </h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportPassword("");
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Enter a strong password to encrypt your backup. You will need this password to restore your wallet.
            </p>

            <input
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="Enter encryption password"
              className="w-full p-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportPassword("");
                }}
                className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => exportMutation.mutate(exportPassword)}
                disabled={!exportPassword || exportMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </button>
            </div>

            {exportMutation.isError && (
              <p className="text-sm text-error mt-4">
                Failed to export backup. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                Verify Backup
              </h3>
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyPassword("");
                  setUploadedBackup(null);
                  verifyMutation.reset();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadedBackup && (
              <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                <p><span className="text-muted-foreground">Network:</span> {uploadedBackup.network}</p>
                <p><span className="text-muted-foreground">Created:</span> {new Date(uploadedBackup.created_at).toLocaleString()}</p>
                <p><span className="text-muted-foreground">Locked UTXOs:</span> {uploadedBackup.locked_utxos.length}</p>
              </div>
            )}

            <input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Enter backup password"
              className="w-full p-3 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyPassword("");
                  setUploadedBackup(null);
                  verifyMutation.reset();
                }}
                className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={!verifyPassword || verifyMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-success hover:bg-success/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Verify
              </button>
            </div>

            {verifyMutation.data && (
              <div className={cn(
                "mt-4 p-3 rounded-lg",
                verifyMutation.data.valid ? "bg-success/10" : "bg-error/10"
              )}>
                {verifyMutation.data.valid ? (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Backup is valid!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">
                      {verifyMutation.data.error || "Backup is invalid"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components

function InfoItem({
  label,
  value,
  mono = false,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "text-sm truncate",
        mono && "font-mono",
        color || "text-foreground"
      )}>
        {value}
      </p>
    </div>
  );
}

function DescriptorItem({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 p-2 bg-muted rounded text-xs font-mono text-foreground overflow-x-auto">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-muted rounded transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

