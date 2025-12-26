'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkAvailability,
  registerDomain,
  mineBlocks,
  getWalletIdentities,
  formatIdentityAsTxt,
  type DnsRecordInput,
} from '@/lib/api';
import { SUPPORTED_TLDS, type SupportedTLD } from '@/lib/dns-encoder';
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Fingerprint,
  Zap,
  Key,
} from 'lucide-react';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV'];

// DNS carriers that create spendable UTXOs for ownership tracking
// OP_RETURN (0) is NOT allowed as it doesn't create spendable outputs
const DNS_CARRIERS = [
  { value: 1, name: 'Inscription', description: 'Commit/reveal with taproot (recommended)' },
  { value: 2, name: 'Witness Data', description: 'Data stored in witness' },
  { value: 3, name: 'Annex', description: 'Data stored in transaction annex' },
];

interface RecordFormData {
  id: number;
  record_type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

// Wrapper component for Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-bitcoin-orange" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [domainName, setDomainName] = useState('');
  const [selectedTld, setSelectedTld] = useState<SupportedTLD>('.btc');
  const [selectedCarrier, setSelectedCarrier] = useState(1); // Default to Inscription
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [records, setRecords] = useState<RecordFormData[]>([
    { id: 1, record_type: 'A', value: '', ttl: 300 },
  ]);
  const [nextId, setNextId] = useState(2);
  const [success, setSuccess] = useState<{ txid: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdentities, setSelectedIdentities] = useState<Set<string>>(new Set());

  // Fetch wallet identities
  const { data: identitiesData, isLoading: isLoadingIdentities } = useQuery({
    queryKey: ['walletIdentities'],
    queryFn: getWalletIdentities,
    staleTime: 30000,
  });

  const identities = identitiesData?.identities || [];

  const getFullDomainName = () => `${domainName}${selectedTld}`;

  // Auto-fill from URL query params (e.g., /register?domain=miguel.sat)
  useEffect(() => {
    const domainParam = searchParams.get('domain');
    if (domainParam) {
      // Parse the domain to extract name and TLD
      const tld = SUPPORTED_TLDS.find((t) => domainParam.endsWith(t));
      if (tld) {
        const name = domainParam.slice(0, -tld.length);
        setDomainName(name);
        setSelectedTld(tld);

        // Auto-check availability
        const checkDomain = async () => {
          setIsCheckingAvailability(true);
          try {
            const result = await checkAvailability(domainParam);
            setAvailability(result.available);
          } catch {
            setAvailability(null);
          } finally {
            setIsCheckingAvailability(false);
          }
        };
        checkDomain();
      }
    }
  }, [searchParams]);

  // Toggle identity selection
  const toggleIdentity = (identityId: string) => {
    setSelectedIdentities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(identityId)) {
        newSet.delete(identityId);
      } else {
        newSet.add(identityId);
      }
      return newSet;
    });
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      // User-defined DNS records
      const dnsRecords: DnsRecordInput[] = records
        .filter((r) => r.value.trim())
        .map((r) => ({
          record_type: r.record_type,
          value: r.value,
          ttl: r.ttl,
          priority: r.priority,
          weight: r.weight,
          port: r.port,
        }));

      // Add identity TXT records (Selfie Records format)
      identities
        .filter((id) => selectedIdentities.has(id.id))
        .forEach((identity) => {
          dnsRecords.push({
            record_type: 'TXT',
            value: formatIdentityAsTxt(identity),
            ttl: 300,
          });
        });

      return registerDomain(getFullDomainName(), dnsRecords, selectedCarrier);
    },
    onSuccess: async (data) => {
      setSuccess({ txid: data.txid });
      setError(null);
      // Mine a block to confirm the transaction
      try {
        await mineBlocks(1);
      } catch {
        // Ignore mining errors (might be on mainnet)
      }
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-domains'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSuccess(null);
    },
  });

  const handleCheckAvailability = async () => {
    if (!domainName.trim()) return;

    setIsCheckingAvailability(true);
    setAvailability(null);

    try {
      const result = await checkAvailability(getFullDomainName());
      setAvailability(result.available);
    } catch {
      setAvailability(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const addRecord = () => {
    setRecords([...records, { id: nextId, record_type: 'A', value: '', ttl: 300 }]);
    setNextId(nextId + 1);
  };

  const removeRecord = (id: number) => {
    if (records.length > 1) {
      setRecords(records.filter((r) => r.id !== id));
    }
  };

  const updateRecord = (id: number, field: string, value: string | number) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim() || !availability) return;
    registerMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Register a Domain</h1>
        <p className="text-slate-400 mb-8">
          Secure your domain on the Bitcoin blockchain. Supports {SUPPORTED_TLDS.join(', ')} TLDs.
        </p>

        {success ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Domain Registered!</h2>
            </div>
            <p className="text-slate-300 mb-4">Your domain has been registered successfully.</p>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Transaction ID:</p>
              <p className="font-mono text-white break-all">{success.txid}</p>
            </div>
            <button
              onClick={() => {
                setSuccess(null);
                setDomainName('');
                setSelectedTld('.btc');
                setRecords([{ id: 1, record_type: 'A', value: '', ttl: 300 }]);
                setAvailability(null);
                setSelectedIdentities(new Set());
              }}
              className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Register Another Domain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Domain Name */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Domain Name</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={domainName}
                    onChange={(e) => {
                      setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setAvailability(null);
                    }}
                    placeholder="mysite"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                  />
                </div>
                <select
                  value={selectedTld}
                  onChange={(e) => {
                    setSelectedTld(e.target.value as SupportedTLD);
                    setAvailability(null);
                  }}
                  className="px-3 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                >
                  {SUPPORTED_TLDS.map((tld) => (
                    <option key={tld} value={tld}>
                      {tld}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={!domainName.trim() || isCheckingAvailability}
                  className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {isCheckingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Check'}
                </button>
              </div>

              {/* Availability Status */}
              {availability !== null && (
                <div
                  className={`mt-3 flex items-center gap-2 ${
                    availability ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {availability ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Domain is available!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Domain is already registered</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* DNS Records */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-300">DNS Records</label>
                <button
                  type="button"
                  onClick={addRecord}
                  className="flex items-center gap-1 text-bitcoin-orange hover:text-orange-400 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Record
                </button>
              </div>

              <div className="space-y-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex gap-3 items-start p-4 bg-slate-700/30 rounded-lg"
                  >
                    {/* Record Type */}
                    <select
                      value={record.record_type}
                      onChange={(e) => updateRecord(record.id, 'record_type', e.target.value)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                    >
                      {RECORD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    <input
                      type="text"
                      value={record.value}
                      onChange={(e) => updateRecord(record.id, 'value', e.target.value)}
                      placeholder={
                        record.record_type === 'A'
                          ? '93.184.216.34'
                          : record.record_type === 'AAAA'
                            ? '2001:db8::1'
                            : 'value'
                      }
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                    />

                    {/* TTL */}
                    <input
                      type="number"
                      value={record.ttl}
                      onChange={(e) => updateRecord(record.id, 'ttl', parseInt(e.target.value))}
                      className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                      placeholder="TTL"
                    />

                    {/* Priority (for MX/SRV) */}
                    {(record.record_type === 'MX' || record.record_type === 'SRV') && (
                      <input
                        type="number"
                        value={record.priority || ''}
                        onChange={(e) =>
                          updateRecord(record.id, 'priority', parseInt(e.target.value))
                        }
                        className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
                        placeholder="Pri"
                      />
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeRecord(record.id)}
                      disabled={records.length === 1}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Identity Records (Selfie Records) */}
            {identities.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Fingerprint className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300">
                      Link Identities
                    </label>
                    <p className="text-xs text-slate-500">
                      Selfie Records - Add your Nostr/Pubky identity to this domain
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {isLoadingIdentities ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    identities.map((identity) => {
                      const isSelected = selectedIdentities.has(identity.id);
                      const isNostr = identity.identity_type === 'nostr';

                      return (
                        <label
                          key={identity.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? isNostr
                                ? 'bg-purple-500/10 border-purple-500'
                                : 'bg-cyan-500/10 border-cyan-500'
                              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleIdentity(identity.id)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? isNostr
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-cyan-500 bg-cyan-500'
                                : 'border-slate-500'
                            }`}
                          >
                            {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <div
                            className={`p-2 rounded-lg ${
                              isNostr ? 'bg-purple-500/20' : 'bg-cyan-500/20'
                            }`}
                          >
                            {isNostr ? (
                              <Zap className="h-4 w-4 text-purple-400" />
                            ) : (
                              <Key className="h-4 w-4 text-cyan-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{identity.label}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  isNostr
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-cyan-500/20 text-cyan-300'
                                }`}
                              >
                                {identity.identity_type}
                              </span>
                              {identity.is_primary && (
                                <span className="text-xs px-2 py-0.5 rounded bg-bitcoin-orange/20 text-bitcoin-orange">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono truncate mt-1">
                              {identity.formatted_public_key}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedIdentities.size > 0 && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {selectedIdentities.size} identit{selectedIdentities.size > 1 ? 'ies' : 'y'}{' '}
                        will be linked as TXT records
                      </span>
                    </div>
                  </div>
                )}
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
              <div className="grid gap-3">
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
                      onChange={() => setSelectedCarrier(carrier.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCarrier === carrier.value
                          ? 'border-bitcoin-orange'
                          : 'border-slate-500'
                      }`}
                    >
                      {selectedCarrier === carrier.value && (
                        <div className="w-2 h-2 rounded-full bg-bitcoin-orange" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">{carrier.name}</div>
                      <div className="text-sm text-slate-400">{carrier.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!domainName.trim() || !availability || registerMutation.isPending}
              className="w-full py-4 bg-bitcoin-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Domain'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
