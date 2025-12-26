'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Coins, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { fetchDisputes, fetchDefaultExplorer, buildExplorerTxUrl } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { formatSats, shortenPubkey } from '@/lib/utils';

export default function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes', statusFilter],
    queryFn: () => fetchDisputes(statusFilter === 'all' ? undefined : statusFilter, 50),
  });

  const { data: explorer } = useQuery({
    queryKey: ['default-explorer'],
    queryFn: fetchDefaultExplorer,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Disputes</h1>
        <p className="text-gray-400 mt-2">Challenged oracle attestations awaiting resolution</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['pending', 'resolved', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
              statusFilter === status
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading disputes...</div>
      ) : (
        <div className="space-y-3">
          {disputes?.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-red-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-white">{dispute.reason_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        dispute.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : dispute.resolution === 'upheld'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {dispute.status === 'resolved' ? dispute.resolution : dispute.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Attestation: <span className="font-mono">{dispute.txid.slice(0, 16)}...</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Disputed by: {shortenPubkey(dispute.disputer_pubkey)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Coins className="w-4 h-4" />
                    <span className="font-medium">{formatSats(dispute.stake_sats)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Stake at risk</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-sm text-gray-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                  </div>
                  {dispute.block_height && <span>Block {dispute.block_height}</span>}
                  {dispute.resolution === 'upheld' && (
                    <div className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-4 h-4" />
                      Oracle slashed
                    </div>
                  )}
                  {dispute.resolution === 'rejected' && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Dispute rejected
                    </div>
                  )}
                </div>
                {explorer && (
                  <a
                    href={buildExplorerTxUrl(explorer, dispute.txid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                    title="View Transaction"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {(!disputes || disputes.length === 0) && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No disputes found</p>
              <p className="text-sm text-gray-500">
                Disputes appear here when attestations are challenged
              </p>
              <Link
                href="/attestations"
                className="inline-block mt-4 text-purple-400 hover:text-purple-300"
              >
                View attestations to dispute →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <h3 className="font-medium text-yellow-300 mb-2">How disputes work</h3>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Anyone can challenge an oracle attestation by staking funds</li>
          <li>If the dispute is upheld, the oracle&apos;s stake is slashed</li>
          <li>If the dispute is rejected, the challenger loses their stake</li>
          <li>Dispute resolution uses a reputation-weighted voting system</li>
        </ul>
      </div>
    </div>
  );
}
