'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Star,
  Globe,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Zap,
  CloudDownload,
  Pencil,
  X,
  Download,
  Shield,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react';
import {
  fetchIdentities,
  fetchIdentityDefaults,
  generateKeypair,
  createIdentity,
  deleteIdentity,
  setIdentityPrimary,
  syncIdentitiesFromDns,
  updateIdentity,
  exportIdentityKey,
  Identity,
  IdentityDefaults,
  IdentityType,
  ExportKeyResult,
} from '@/lib/api';
import { PublishDnsModal } from '@/components/identity/publish-dns-modal';
import {
  PageHeader,
  StatGrid,
  Section,
  SectionHeader,
  ActionButton,
  RefreshButton,
} from '@/components/ds';

// ============================================================================
// Identity Card Component
// ============================================================================

interface IdentityCardProps {
  identity: Identity;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  onPublishDns: (identity: Identity) => void;
  onUpdate: () => void;
  onBackup: (identity: Identity) => void;
}

function IdentityCard({
  identity,
  onSetPrimary,
  onDelete,
  onPublishDns,
  onUpdate,
  onBackup,
}: IdentityCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(identity.label);
  const [isSaving, setIsSaving] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(identity.formatted_public_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLabel = async () => {
    if (!editLabel.trim() || editLabel === identity.label) {
      setIsEditing(false);
      setEditLabel(identity.label);
      return;
    }
    setIsSaving(true);
    try {
      await updateIdentity(identity.id, { label: editLabel.trim() });
      onUpdate();
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update label:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const metadata = identity.metadata;
  const relaysCount = metadata.type === 'nostr' ? metadata.relays?.length || 0 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLabel();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditLabel(identity.label);
                    }
                  }}
                  className="px-2 py-1 bg-muted border border-border rounded text-sm text-foreground w-full focus:outline-none focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleSaveLabel}
                  disabled={isSaving}
                  className="p-1 text-success hover:bg-success/10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditLabel(identity.label);
                  }}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{identity.label}</h3>
                {identity.is_primary && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit label"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-purple-500 font-medium uppercase">Nostr</span>
              {relaysCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  {relaysCount} relays
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Edit label"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onBackup(identity)}
            className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
            title="Backup private key"
          >
            <Download className="w-4 h-4" />
          </button>
          {!identity.is_primary && (
            <button
              onClick={() => onSetPrimary(identity.id)}
              className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
              title="Set as primary"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onPublishDns(identity)}
            className="p-2 text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg transition-colors"
            title="Publish to DNS"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(identity.id)}
            className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Public Key - Full display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">Public Key (npub)</p>
          <button
            onClick={copyToClipboard}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-success" />
                <span className="text-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 bg-muted rounded-lg border border-border">
          <code className="text-xs text-purple-500 font-mono break-all leading-relaxed">
            {identity.formatted_public_key}
          </code>
        </div>
      </div>

      {/* DNS Status */}
      {identity.dns_published ? (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2 text-success text-sm">
            <Globe className="w-4 h-4" />
            <span className="font-medium">Published to DNS</span>
          </div>
          <code className="text-xs text-success/70 font-mono mt-1 block">
            {identity.dns_published.record_name}
          </code>
        </div>
      ) : (
        <button
          onClick={() => onPublishDns(identity)}
          className="w-full p-3 bg-muted hover:bg-muted/80 border border-border hover:border-success/30 rounded-lg text-muted-foreground hover:text-success text-sm transition-all flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4" />
          Publish to DNS
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Backup Key Modal
// ============================================================================

interface BackupKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: Identity | null;
}

function BackupKeyModal({ isOpen, onClose, identity }: BackupKeyModalProps) {
  const [keyData, setKeyData] = useState<ExportKeyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadKey = useCallback(async () => {
    if (!identity) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await exportIdentityKey(identity.id);
      setKeyData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to export key');
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    if (isOpen && identity) {
      loadKey();
    } else {
      setKeyData(null);
      setShowKey(false);
      setError(null);
    }
  }, [isOpen, identity, loadKey]);

  const copyKey = () => {
    if (keyData) {
      navigator.clipboard.writeText(keyData.private_key_hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">Backup Private Key</h2>
              <p className="text-xs text-muted-foreground">{identity?.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning */}
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
            <div className="flex items-start gap-2 text-error text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Never share your private key!</p>
                <p className="text-error/70 text-xs mt-1">
                  Anyone with this key has full control of your Nostr identity. Store it securely
                  offline.
                </p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          {keyData && (
            <>
              {/* Public Key */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Public Key (npub)</p>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs text-purple-500 font-mono break-all">
                    {keyData.public_key}
                  </code>
                </div>
              </div>

              {/* Private Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Private Key (hex)</p>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <div className="p-3 bg-muted rounded-lg relative">
                  {showKey ? (
                    <code className="text-xs text-orange-500 font-mono break-all">
                      {keyData.private_key_hex}
                    </code>
                  ) : (
                    <div className="text-xs text-muted-foreground font-mono">
                      ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                    </div>
                  )}
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={copyKey}
                disabled={!showKey}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {showKey ? 'Copy Private Key' : 'Reveal key first to copy'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Add Identity Modal
// ============================================================================

interface AddIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaults: IdentityDefaults | null;
  onSuccess: () => void;
}

function AddIdentityModal({ isOpen, onClose, defaults, onSuccess }: AddIdentityModalProps) {
  const [step, setStep] = useState(1);
  const [identityType, setIdentityType] = useState<IdentityType>('nostr');
  const [label, setLabel] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [selectedRelays, setSelectedRelays] = useState<string[]>([]);
  const [homeserver, setHomeserver] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [, setInviteToken] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentityType('nostr');
      setLabel('');
      setPublicKey('');
      setPrivateKey('');
      setSelectedRelays(defaults?.nostr.relays || []);
      setHomeserver(defaults?.pubky.homeservers[0]?.url || '');
      setInviteToken('');
      setError(null);
      setImportMode(false);
      setImportKey('');
    }
  }, [isOpen, defaults]);

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const keypair = await generateKeypair(identityType);
      setPublicKey(keypair.public_key);
      setPrivateKey(keypair.private_key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate keypair');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportKey = () => {
    // Parse the import key - could be hex or npub/pk format
    // For now, assume hex format
    if (importKey.length === 64) {
      setPrivateKey(importKey);
      // TODO: Derive public key from private key
      setError('Key imported - public key derivation not yet implemented');
    } else {
      setError('Invalid key format. Please enter a 64-character hex private key.');
    }
  };

  const handleCreate = async () => {
    if (!label.trim()) {
      setError('Please enter a label for this identity');
      return;
    }
    if (!publicKey || !privateKey) {
      setError('Please generate or import a keypair first');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createIdentity({
        identity_type: identityType,
        label: label.trim(),
        public_key: publicKey,
        private_key_encrypted: privateKey, // TODO: Encrypt with wallet password
        metadata:
          identityType === 'nostr'
            ? { type: 'nostr', relays: selectedRelays }
            : { type: 'pubky', homeserver: homeserver || undefined },
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create identity');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Add Identity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step {step} of 3 — {step === 1 ? 'Choose Type' : step === 2 ? 'Configure' : 'Confirm'}
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-3 p-2.5 bg-error/10 border border-error/20 rounded flex items-center gap-2 text-error text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Generate or Import */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Nostr Info */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-foreground">Nostr Identity</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a secp256k1 keypair for Nostr protocol. Your npub can be published to DNS
                  for discovery.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={async () => {
                    await handleGenerateKey();
                    setStep(2);
                  }}
                  disabled={isGenerating}
                  className="w-full py-2.5 bg-purple-500 hover:bg-purple-400 disabled:bg-purple-500/50 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Generate New Nostr Key
                </button>
                <button
                  onClick={() => {
                    setImportMode(true);
                    setStep(2);
                  }}
                  className="w-full py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground text-sm rounded-lg font-medium transition-colors"
                >
                  Import Existing nsec
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-3">
              {importMode && !publicKey && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Private Key (hex)
                  </label>
                  <input
                    type="password"
                    value={importKey}
                    onChange={(e) => setImportKey(e.target.value)}
                    placeholder="Enter 64-character hex private key"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleImportKey}
                    className="mt-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded text-xs"
                  >
                    Import
                  </button>
                </div>
              )}

              {publicKey && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Generated Public Key
                  </label>
                  <code className="block p-2.5 bg-muted rounded text-success text-xs font-mono break-all">
                    {publicKey}
                  </code>
                </div>
              )}

              {identityType === 'nostr' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Relays</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-muted rounded">
                    {defaults?.nostr.relays.map((relay) => (
                      <label key={relay} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRelays.includes(relay)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRelays([...selectedRelays, relay]);
                            } else {
                              setSelectedRelays(selectedRelays.filter((r) => r !== relay));
                            }
                          }}
                          className="rounded border-border bg-card text-primary w-3.5 h-3.5"
                        />
                        <span className="text-muted-foreground truncate">{relay}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Pubky configuration removed - will be added later */}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={`My ${identityType === 'nostr' ? 'Nostr' : 'Pubky'} Identity`}
                  className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="p-3 bg-muted rounded space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{identityType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Public Key</span>
                  <code className="text-success font-mono">{publicKey.slice(0, 16)}...</code>
                </div>
                {identityType === 'nostr' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Relays</span>
                    <span className="text-foreground">{selectedRelays.length} selected</span>
                  </div>
                )}
                {/* Pubky homeserver info removed - will be added later */}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !publicKey}
              className="px-4 py-1.5 bg-primary hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm rounded font-medium transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating || !label.trim()}
              className="px-4 py-1.5 bg-success hover:bg-success/80 disabled:bg-muted disabled:text-muted-foreground text-white text-sm rounded font-medium transition-colors flex items-center gap-1.5"
            >
              {isCreating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Identity
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [defaults, setDefaults] = useState<IdentityDefaults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [publishIdentity, setPublishIdentity] = useState<Identity | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [identitiesRes, defaultsRes] = await Promise.all([
        fetchIdentities(),
        fetchIdentityDefaults(),
      ]);
      setIdentities(identitiesRes.identities);
      setDefaults(defaultsRes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load identities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetPrimary = async (id: string) => {
    try {
      await setIdentityPrimary(id);
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to set primary');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this identity?')) return;
    try {
      await deleteIdentity(id);
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete identity');
    }
  };

  const handlePublishDns = (identity: Identity) => {
    setPublishIdentity(identity);
  };

  const [backupIdentity, setBackupIdentity] = useState<Identity | null>(null);

  const handleBackup = (identity: Identity) => {
    setBackupIdentity(identity);
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncFromDns = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const result = await syncIdentitiesFromDns();
      if (result.synced_count > 0) {
        setSyncMessage(
          `Synced ${result.synced_count} identity(ies) from ${result.checked_domains} domain(s)`
        );
        loadData(); // Refresh the list
      } else {
        setSyncMessage(`Checked ${result.checked_domains} domain(s), no new identities found`);
      }
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to sync from DNS');
    } finally {
      setIsSyncing(false);
    }
  };

  const nostrCount = identities.filter((i) => i.identity_type === 'nostr').length;
  const publishedCount = identities.filter((i) => i.dns_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Zap}
        iconColor="purple"
        title="Identities"
        subtitle="Manage your Nostr keypairs and DNS records"
        actions={
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={handleSyncFromDns}
              disabled={isSyncing}
              variant="secondary"
              icon={CloudDownload}
              label="Sync DNS"
              className={isSyncing ? 'animate-pulse' : ''}
            />
            <RefreshButton onClick={loadData} loading={isLoading} />
            <ActionButton
              onClick={() => setShowAddModal(true)}
              variant="primary"
              icon={Plus}
              label="New Identity"
            />
          </div>
        }
      />

      {/* Stats Row */}
      <StatGrid
        items={[
          { icon: Key, value: identities.length, label: 'Total Identities', color: 'purple' },
          { icon: Zap, value: nostrCount, label: 'Nostr Keys', color: 'purple' },
          { icon: Globe, value: publishedCount, label: 'Published to DNS', color: 'success' },
        ]}
        columns={{ default: 3 }}
        isLoading={isLoading && identities.length === 0}
      />

      {/* Sync Message */}
      {syncMessage && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2 text-success text-sm">
          <CloudDownload className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{syncMessage}</span>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-success hover:text-success/80 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-xl flex items-center gap-2 text-error text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-error hover:text-error/80 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && identities.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nostrCount === 0 && (
        <Section className="text-center py-16">
          <div className="p-4 bg-purple-500/20 rounded-2xl w-fit mx-auto mb-6">
            <Zap className="w-12 h-12 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Nostr Identity Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first Nostr identity keypair. You can then publish it to DNS using Selfie
            Records.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Identity
          </button>
        </Section>
      )}

      {/* Identity Grid - Only showing Nostr identities for now */}
      {identities.filter((i) => i.identity_type === 'nostr').length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {identities
            .filter((identity) => identity.identity_type === 'nostr')
            .map((identity) => (
              <IdentityCard
                key={identity.id}
                identity={identity}
                onSetPrimary={handleSetPrimary}
                onDelete={handleDelete}
                onPublishDns={handlePublishDns}
                onUpdate={loadData}
                onBackup={handleBackup}
              />
            ))}
        </div>
      )}

      {/* Other Identity Protocols Section */}
      <Section>
        <SectionHeader
          icon={Radio}
          iconColor="cyan"
          title="Other Identity Protocols"
          subtitle="More identity protocols coming soon"
        />

        {/* Pubky Coming Soon Card */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5 relative overflow-hidden">
          <div className="relative flex items-start gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <Radio className="w-6 h-6 text-cyan-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Pubky</h3>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-500 text-xs font-medium rounded-full">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Pubky is a decentralized identity protocol using Ed25519 keys. Create and manage
                your Pubky identity with DNS integration for easy discovery.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg border border-border">
                  Ed25519 Keys
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg border border-border">
                  DNS Publishing
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg border border-border">
                  Homeserver Support
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Add Modal */}
      <AddIdentityModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaults={defaults}
        onSuccess={loadData}
      />

      {/* Publish DNS Modal */}
      <PublishDnsModal
        isOpen={!!publishIdentity}
        onClose={() => setPublishIdentity(null)}
        identity={publishIdentity}
        onSuccess={loadData}
      />

      {/* Backup Key Modal */}
      <BackupKeyModal
        isOpen={!!backupIdentity}
        onClose={() => setBackupIdentity(null)}
        identity={backupIdentity}
      />
    </div>
  );
}
