'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getDomain,
  updateDomain,
  mineBlocks,
  getWalletIdentities,
  formatIdentityAsTxt,
  DnsRecordInput,
  getRecordTypeColor,
  type WalletIdentity,
} from '@/lib/api';
import {
  Globe,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Info,
  Fingerprint,
  Zap,
} from 'lucide-react';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV'];

// DNS carriers that create spendable UTXOs for ownership tracking
// OP_RETURN (0) is NOT allowed as it doesn't create spendable outputs
const DNS_CARRIERS = [
  { value: 1, name: 'Inscription', description: 'Commit/reveal with taproot (recommended)' },
  { value: 2, name: 'Witness Data', description: 'Data stored in witness' },
  { value: 3, name: 'Annex', description: 'Data stored in transaction annex' },
];

interface RecordForm {
  id: string;
  record_type: string;
  name: string; // Subdomain/prefix (e.g., "user._nostr", "www", "@" for root)
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  isNew: boolean;
}

export default function ManageDomainPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();

  const [records, setRecords] = useState<RecordForm[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(1); // Default to Inscription
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch domain data
  const { data: domain, isLoading } = useQuery({
    queryKey: ['domain', decodedName],
    queryFn: () => getDomain(decodedName),
  });

  // Fetch wallet identities
  const { data: identitiesData, isLoading: isLoadingIdentities } = useQuery({
    queryKey: ['walletIdentities'],
    queryFn: getWalletIdentities,
    staleTime: 30000,
  });

  const identities = identitiesData?.identities || [];

  // Add identity as a DNS record (instead of just selecting)
  const addIdentityAsRecord = (identity: WalletIdentity) => {
    const namePrefix = identity.identity_type === 'nostr' ? 'user._nostr' : 'user._pubky';
    const value = formatIdentityAsTxt(identity);

    // Check if this identity is already added
    const alreadyExists = records.some((r) => r.record_type === 'TXT' && r.value === value);

    if (alreadyExists) {
      // Remove if already exists
      setRecords(records.filter((r) => !(r.record_type === 'TXT' && r.value === value)));
    } else {
      // Add new record with pre-filled values
      setRecords([
        ...records,
        {
          id: `identity-${identity.id}-${Date.now()}`,
          record_type: 'TXT',
          name: namePrefix,
          value: value,
          ttl: 300,
          isNew: true,
        },
      ]);
    }
    setHasChanges(true);
  };

  // Check if an identity is already added as a record
  const isIdentityAdded = (identity: WalletIdentity) => {
    const value = formatIdentityAsTxt(identity);
    return records.some((r) => r.record_type === 'TXT' && r.value === value);
  };

  // Initialize records when domain data is loaded
  useEffect(() => {
    if (domain && !initialized) {
      setRecords(
        domain.records.map((r, i) => ({
          id: `existing-${i}`,
          record_type: r.record_type,
          name: r.name || '@', // Use "@" for root domain records
          value: r.value,
          ttl: r.ttl,
          priority: r.priority ?? undefined,
          weight: r.weight ?? undefined,
          port: r.port ?? undefined,
          isNew: false,
        }))
      );
      setInitialized(true);
    }
  }, [domain, initialized]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newRecords: DnsRecordInput[]) => {
      const result = await updateDomain(decodedName, newRecords, selectedCarrier);
      // Mine a block to confirm the transaction
      await mineBlocks(1);
      return result;
    },
    onSuccess: () => {
      setSuccess('Domain updated successfully! Changes will appear after block confirmation.');
      setHasChanges(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['domain', decodedName] });
      queryClient.invalidateQueries({ queryKey: ['my-domains'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const addRecord = () => {
    setRecords([
      ...records,
      {
        id: `new-${Date.now()}`,
        record_type: 'A',
        name: '@', // Default to root domain
        value: '',
        ttl: 300,
        isNew: true,
      },
    ]);
    setHasChanges(true);
  };

  const removeRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
    setHasChanges(true);
  };

  const updateRecord = (id: string, field: keyof RecordForm, value: string | number) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setHasChanges(true);
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    // Validate records
    for (const record of records) {
      if (!record.value.trim()) {
        setError('All records must have a value');
        return;
      }
    }

    // Convert to API format (identities are already in records list)
    const apiRecords: DnsRecordInput[] = records.map((r) => ({
      record_type: r.record_type,
      name: r.name === '@' ? undefined : r.name, // "@" means root, send as null/undefined
      value: r.value,
      ttl: r.ttl,
      priority: r.priority,
      weight: r.weight,
      port: r.port,
    }));

    updateMutation.mutate(apiRecords);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-bitcoin-orange animate-spin" />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Domain Not Found</h1>
        <p className="text-slate-400">The domain &quot;{decodedName}&quot; could not be found.</p>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <Link
        href={`/domain/${encodeURIComponent(decodedName)}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Domain
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-bitcoin-orange/10 rounded-xl flex items-center justify-center">
            <Globe className="h-7 w-7 text-bitcoin-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{domain.name}</h1>
            <p className="text-slate-400">Manage DNS Records</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-400">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Records List */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">DNS Records</h2>
          <button
            onClick={addRecord}
            className="flex items-center gap-2 px-3 py-2 bg-bitcoin-orange/10 hover:bg-bitcoin-orange/20 text-bitcoin-orange rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No records configured. Add a record to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50"
              >
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Type */}
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                      value={record.record_type}
                      onChange={(e) => updateRecord(record.id, 'record_type', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange text-sm"
                    >
                      {RECORD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name (subdomain/prefix) */}
                  <div className="col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">
                      Name <span className="text-slate-600">(@ = root)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={record.name}
                        onChange={(e) => updateRecord(record.id, 'name', e.target.value || '@')}
                        placeholder="@"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange text-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Value */}
                  <div className="col-span-4">
                    <label className="block text-xs text-slate-400 mb-1">Value</label>
                    <input
                      type="text"
                      value={record.value}
                      onChange={(e) => updateRecord(record.id, 'value', e.target.value)}
                      placeholder={
                        record.record_type === 'A'
                          ? '192.168.1.1'
                          : record.record_type === 'TXT'
                            ? 'npub1... or pk:...'
                            : record.record_type === 'CNAME'
                              ? 'target.example.com'
                              : 'Enter value'
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange text-sm"
                    />
                  </div>

                  {/* TTL */}
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">TTL</label>
                    <input
                      type="number"
                      value={record.ttl}
                      onChange={(e) =>
                        updateRecord(record.id, 'ttl', parseInt(e.target.value) || 300)
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange text-sm"
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex items-end justify-end">
                    <button
                      onClick={() => removeRecord(record.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Record"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Extra fields for MX/SRV */}
                {(record.record_type === 'MX' || record.record_type === 'SRV') && (
                  <div className="mt-4 pt-4 border-t border-slate-600/50 grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Priority</label>
                      <input
                        type="number"
                        value={record.priority ?? 10}
                        onChange={(e) =>
                          updateRecord(record.id, 'priority', parseInt(e.target.value) || 10)
                        }
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                      />
                    </div>
                    {record.record_type === 'SRV' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Weight</label>
                          <input
                            type="number"
                            value={record.weight ?? 0}
                            onChange={(e) =>
                              updateRecord(record.id, 'weight', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Port</label>
                          <input
                            type="number"
                            value={record.port ?? 0}
                            onChange={(e) =>
                              updateRecord(record.id, 'port', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Record Type Badge */}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${getRecordTypeColor(record.record_type)}`}
                  >
                    {record.record_type}
                  </span>
                  {record.isNew && (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Identity Records (Selfie Records) */}
      {identities.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Fingerprint className="h-4 w-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300">Quick Add Identity</label>
              <p className="text-xs text-slate-500">
                Click to add as TXT record - you can edit the name above
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoadingIdentities ? (
              <div className="col-span-2 flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              identities
                .filter((identity) => identity.identity_type === 'nostr') // Only Nostr for now
                .map((identity) => {
                  const isAdded = isIdentityAdded(identity);
                  const namePrefix = 'user._nostr';

                  return (
                    <button
                      type="button"
                      key={identity.id}
                      onClick={() => addIdentityAsRecord(identity)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isAdded
                          ? 'bg-purple-500/10 border-purple-500'
                          : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          isAdded ? 'border-purple-500 bg-purple-500' : 'border-slate-500'
                        }`}
                      >
                        {isAdded && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="p-1.5 rounded-lg flex-shrink-0 bg-purple-500/20">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm truncate">
                            {identity.label}
                          </span>
                          {identity.is_primary && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-bitcoin-orange/20 text-bitcoin-orange flex-shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{namePrefix}</p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          <div className="mt-3 p-2 bg-slate-700/30 rounded-lg">
            <p className="text-xs text-slate-500">
              💡 <span className="text-slate-400">Tip:</span> After adding, edit the{' '}
              <span className="text-purple-400 font-mono">Name</span> field above to use subdomains
              like <span className="font-mono text-slate-400">hello.user._nostr</span>
            </p>
          </div>
        </div>
      )}

      {/* Carrier Selection */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <label className="block text-sm font-medium text-slate-300">Data Carrier</label>
          <div className="group relative">
            <Info className="h-4 w-4 text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-xs text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Choose how your domain data is stored on Bitcoin
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {DNS_CARRIERS.map((carrier) => (
            <label
              key={carrier.value}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                selectedCarrier === carrier.value
                  ? 'bg-bitcoin-orange/10 border-bitcoin-orange'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
            >
              <input
                type="radio"
                name="carrier"
                value={carrier.value}
                checked={selectedCarrier === carrier.value}
                onChange={() => {
                  setSelectedCarrier(carrier.value);
                  setHasChanges(true);
                }}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedCarrier === carrier.value ? 'border-bitcoin-orange' : 'border-slate-500'
                }`}
              >
                {selectedCarrier === carrier.value && (
                  <div className="w-2 h-2 rounded-full bg-bitcoin-orange" />
                )}
              </div>
              <div>
                <div className="font-medium text-white text-sm">{carrier.name}</div>
                <div className="text-xs text-slate-400 hidden sm:block">{carrier.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {hasChanges ? (
            <span className="text-yellow-400">You have unsaved changes</span>
          ) : (
            <span>All changes saved</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 bg-bitcoin-orange hover:bg-bitcoin-orange/90 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How it works</h3>
        <p className="text-sm text-slate-500">
          When you save changes, a new Bitcoin transaction will be created that updates your
          domain&apos;s DNS records. The transaction will be broadcast and mined, making your
          changes permanent on the blockchain.
        </p>
      </div>
    </main>
  );
}
