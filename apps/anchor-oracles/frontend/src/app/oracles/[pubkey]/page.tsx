'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Star, CheckCircle, AlertCircle, Coins, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  fetchOracle,
  fetchOracleAttestations,
  fetchDefaultExplorer,
  buildExplorerTxUrl,
} from '@/lib/api';
import { shortenPubkey, formatSats } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function OracleDetailPage() {
  const params = useParams();
  const pubkey = params.pubkey as string;

  const { data: oracle, isLoading: loadingOracle } = useQuery({
    queryKey: ['oracle', pubkey],
    queryFn: () => fetchOracle(pubkey),
    enabled: !!pubkey,
  });

  const { data: attestations } = useQuery({
    queryKey: ['oracle-attestations', pubkey],
    queryFn: () => fetchOracleAttestations(pubkey, 20),
    enabled: !!pubkey,
  });

  const { data: explorer } = useQuery({
    queryKey: ['default-explorer'],
    queryFn: fetchDefaultExplorer,
    staleTime: 1000 * 60 * 5,
  });

  if (loadingOracle) {
    return <div className="text-center py-12 text-gray-400">Loading oracle...</div>;
  }

  if (!oracle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Oracle not found</p>
        <Link href="/oracles" className="text-purple-400 hover:underline">
          ← Back to oracles
        </Link>
      </div>
    );
  }

  const successRate =
    oracle.total_attestations > 0
      ? Math.round((oracle.successful_attestations / oracle.total_attestations) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <Link
        href="/oracles"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to oracles
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{oracle.name}</h1>
            <p className="text-gray-500 font-mono text-sm mt-1">{oracle.pubkey}</p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              oracle.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {oracle.status}
          </div>
        </div>

        {oracle.description && <p className="text-gray-400 mt-4">{oracle.description}</p>}

        <div className="flex flex-wrap gap-2 mt-4">
          {oracle.category_names.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Star className="w-5 h-5" />
              <span className="text-2xl font-bold">{oracle.reputation_score.toFixed(0)}</span>
            </div>
            <p className="text-sm text-gray-500">Reputation</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{successRate}%</span>
            </div>
            <p className="text-sm text-gray-500">Success Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{oracle.total_attestations}</span>
            </div>
            <p className="text-sm text-gray-500">Total Attestations</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-red-400">{oracle.disputed_attestations}</span>
            <p className="text-sm text-gray-500">Disputed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Coins className="w-5 h-5" />
              <span className="text-2xl font-bold">{formatSats(oracle.stake_sats)}</span>
            </div>
            <p className="text-sm text-gray-500">Staked</p>
          </div>
        </div>
      </div>

      {/* Attestation History */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Attestation History</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-sm text-gray-400">
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {attestations?.map((att) => (
              <tr key={att.id} className="text-sm hover:bg-white/5">
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                    {att.category_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {att.event_description || shortenPubkey(att.event_id, 8)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      att.status === 'valid'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {att.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{att.block_height ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  {explorer && (
                    <a
                      href={buildExplorerTxUrl(explorer, att.txid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {(!attestations || attestations.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No attestations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
