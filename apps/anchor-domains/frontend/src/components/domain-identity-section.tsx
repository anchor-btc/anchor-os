'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fingerprint, Copy, Check, Zap, Key, Info, Loader2, RefreshCw } from 'lucide-react';

interface IdentityRecord {
  identity_type: 'nostr' | 'pubky';
  subdomain?: string;
  public_key: string;
  record_name: string;
  published_at: string;
}

interface DomainIdentitiesResponse {
  domain: string;
  identities: IdentityRecord[];
}

interface DomainIdentitySectionProps {
  domainName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3401';

async function fetchDomainIdentities(domainName: string): Promise<DomainIdentitiesResponse> {
  const res = await fetch(`${API_URL}/domains/${domainName}/identities`);
  if (!res.ok) {
    throw new Error('Failed to fetch identities');
  }
  return res.json();
}

export function DomainIdentitySection({ domainName }: DomainIdentitySectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['domain-identities', domainName],
    queryFn: () => fetchDomainIdentities(domainName),
    enabled: !!domainName,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const identities = data?.identities || [];

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const nostrPreview = `user._nostr.${domainName}`;
  const pubkyPreview = `user._pubky.${domainName}`;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Fingerprint className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Identity Records</h2>
            <p className="text-sm text-slate-400">Selfie Records (BIP-353 extension)</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      )}

      {!isLoading && identities.length === 0 && (
        <div className="space-y-4">
          {/* Empty State */}
          <div className="text-center py-8 text-slate-500">
            <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-4">No identities published to this domain yet.</p>
            <p className="text-xs text-slate-600">
              Link your Nostr or Pubky identity from the Anchor Wallet.
            </p>
          </div>

          {/* Preview Section */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-500 mb-3">Publish identities to these DNS records:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <code className="text-xs text-slate-300 font-mono">{nostrPreview}</code>
                </div>
                <span className="text-xs text-purple-400">Nostr</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <code className="text-xs text-slate-300 font-mono">{pubkyPreview}</code>
                </div>
                <span className="text-xs text-cyan-400">Pubky</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && identities.length > 0 && (
        <div className="space-y-4">
          {identities.map((identity, index) => {
            const isNostr = identity.identity_type === 'nostr';
            return (
              <div key={index} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
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
                    <div>
                      <p className="font-medium text-white capitalize">{identity.identity_type}</p>
                      <p className="text-xs text-slate-500">
                        {identity.subdomain ? `${identity.subdomain}@` : ''}
                        {domainName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(identity.public_key, identity.record_name)}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title="Copy public key"
                  >
                    {copiedField === identity.record_name ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-3 p-2 bg-slate-800/50 rounded">
                  <p className="text-xs text-slate-500 mb-1">DNS Record</p>
                  <code className="text-xs text-green-400 font-mono break-all">
                    {identity.record_name}
                  </code>
                </div>

                <div className="mt-2 p-2 bg-slate-800/50 rounded">
                  <p className="text-xs text-slate-500 mb-1">Public Key</p>
                  <code className="text-xs text-blue-400 font-mono break-all">
                    {isNostr
                      ? `npub1${identity.public_key.slice(0, 20)}...`
                      : `pk:${identity.public_key.slice(0, 20)}...`}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">Selfie Records</p>
            <p className="text-blue-400/80">
              Identity DNS records allow anyone to resolve your Nostr or Pubky public key using your
              domain. Use <code className="text-blue-300">dig @1.1.1.1 txt {nostrPreview}</code> to
              verify.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
